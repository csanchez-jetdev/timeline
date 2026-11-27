import { layout, type Measure, type ItemRef as Sel } from '~/utils/layout'
import { decodeTimeline, HASH_PREFIX } from '~/utils/share'
import { svgInner } from '~/utils/svg'
import { shape, track } from '~/utils/track'
import { EXEMPLE } from '~/utils/exemples'
import { bounds, endOfMonth, fromDay, normalizeTimeline, type Periode, type Style, type Timeline, toDay } from '~/utils/timeline'

/*
 * L'état de l'éditeur, partagé par tous les composants : le document, la
 * sélection, l'historique, le brouillon. Un seul éditeur par onglet, donc un
 * état de module suffit.
 */
const DRAFT_KEY = 'timeline:brouillon'
const HISTORY = 100

const doc = ref<Timeline>(structuredClone(EXEMPLE))
const selection = ref<Sel | null>(null)
const notice = ref<{ text: string, tone: 'info' | 'error' } | null>(null)
/** Le texte d'un brouillon qui n'a pas pu se relire, proposé dans le panneau JSON. */
const brokenDraft = ref<string | null>(null)
/** Incrémenté à chaque création : le panneau place le curseur dans le premier champ. */
const created = ref(0)
/** Période figée pendant un geste, pour que l'échelle ne bouge pas sous le pointeur. */
const frozenPeriod = ref<Periode | null>(null)
/** L'échelle de la page dans le canevas : 1 = 100 %, la timeline à sa taille d'export. */
const zoom = ref(1)
export const ZOOM = { min: 0.1, max: 4 }
/** Incrémenté quand le document est remplacé en entier : le canevas recadre la page. */
const replaced = ref(0)
// En heure locale : toISOString() donnerait la date UTC, donc la veille entre 0 h et 2 h à Paris.
const now = new Date()
const today = fromDay(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5)

const past: string[] = []
const future: string[] = []
const canUndo = ref(false)
const canRedo = ref(false)
const syncHistory = () => { canUndo.value = past.length > 0; canRedo.value = future.length > 0 }

/** À appeler une fois avant chaque modification ou chaque geste : c'est l'état que rendra Annuler. */
function snapshot() {
  past.push(JSON.stringify(doc.value))
  if (past.length > HISTORY) past.shift()
  future.length = 0
  syncHistory()
}
function change(fn: (t: Timeline) => void) {
  snapshot()
  fn(doc.value)
}
// Une saisie au clavier ne prend qu'un instantané : Annuler rend le champ d'avant la saisie.
let typing = false
/** Au focus d'un champ texte. */
const beginTyping = () => { typing = false }
/** À chaque frappe. */
function typed(fn: () => void) {
  if (!typing) { snapshot(); typing = true }
  fn()
}
function replace(t: Timeline) {
  snapshot()
  doc.value = t
  selection.value = null
  replaced.value++
}
function travel(from: string[], to: string[]) {
  const s = from.pop()
  if (!s) return
  track(from === past ? 'annuler' : 'retablir')
  to.push(JSON.stringify(doc.value))
  doc.value = JSON.parse(s)
  if (!selectedItem()) selection.value = null
  syncHistory()
}
const undo = () => travel(past, future)
const redo = () => travel(future, past)

function selectedItem() {
  const s = selection.value
  const p = s && doc.value.projets[s.projet]
  if (!s || !p) return null
  return s.kind === 'projet' ? p : s.kind === 'phase' ? p.phases[s.index] ?? null : p.jalons[s.index] ?? null
}

/** Une date ramenée dans la période fixée par la timeline, s'il y en a une. */
function clampDate(s: string) {
  const p = doc.value.periode
  return !p ? s : s < p.debut ? p.debut : s > p.fin ? p.fin : s
}
const dayAfter = (s: string) => fromDay(toDay(s) + 1)

function addProjet() {
  change(t => t.projets.push({ nom: 'Nouveau projet', phases: [], jalons: [] }))
  track('projet_ajoute')
  selection.value = { kind: 'projet', projet: doc.value.projets.length - 1, index: doc.value.projets.length - 1 }
  created.value++
}
function addJalon(projet: number, date: string) {
  change(t => t.projets[projet]!.jalons.push({ date: clampDate(date), type: 'atelier' }))
  selection.value = { kind: 'jalon', projet, index: doc.value.projets[projet]!.jalons.length - 1 }
  created.value++
}
/** Sans `snapshot` : appelé au milieu d'un geste qui a déjà pris le sien. */
function pushPhase(projet: number, debut: string, fin: string) {
  doc.value.projets[projet]!.phases.push({ nom: 'Nouvelle phase', debut, fin, couleur: 'bleu' })
  selection.value = { kind: 'phase', projet, index: doc.value.projets[projet]!.phases.length - 1 }
}
function removeSelected() {
  const s = selection.value
  if (!s || !selectedItem()) return
  track('element_supprime', { element: s.kind })
  change((t) => {
    if (s.kind === 'projet') t.projets.splice(s.projet, 1)
    else if (s.kind === 'phase') t.projets[s.projet]!.phases.splice(s.index, 1)
    else t.projets[s.projet]!.jalons.splice(s.index, 1)
  })
  selection.value = null
}
function moveProjet(from: number, delta: number) {
  const to = from + delta
  if (to < 0 || to >= doc.value.projets.length) return
  change(t => t.projets.splice(to, 0, t.projets.splice(from, 1)[0]!))
  track('projet_deplace', { sens: delta < 0 ? 'haut' : 'bas' })
  selection.value = { kind: 'projet', projet: to, index: to }
}
function newTimeline() {
  const fin = endOfMonth(fromDay(toDay(`${today.slice(0, 7)}-01`) + 160))
  replace({ titre: 'Nouvelle timeline', periode: { debut: `${today.slice(0, 7)}-01`, fin }, projets: [{ nom: 'Projet 1', phases: [], jalons: [] }] })
  track('nouvelle_timeline')
}

// Mesure du texte : celle du canvas, avec les polices de la page. Les mises en
// page se recalculent quand les polices arrivent (fontsTick).
const fontsTick = ref(0)
let ctx: CanvasRenderingContext2D | null = null
const measure: Measure = (text, weight, size, family) => {
  ctx ||= document.createElement('canvas').getContext('2d')!
  ctx.font = `${weight} ${size}px ${family}`
  return ctx.measureText(text).width
}

/**
 * La vignette d'une timeline : ses trois premiers projets, sans titre ni légende, à
 * l'échelle de la timeline entière, dans son style ou dans `style`. Balisage SVG intérieur.
 */
function thumb(t: Timeline, style?: Style, period = bounds(t)) {
  void fontsTick.value
  const top = { ...t, projets: t.projets.slice(0, 3), affichage: { ...t.affichage, titre: false, legende: false } }
  return svgInner(layout(top, { measure, style, period, today }))
}
/** La vignette d'un style sur la timeline en cours. */
const styleThumb = (style: Style) => thumb(doc.value, style, frozenPeriod.value ?? bounds(doc.value))

/** Les avertissements de la mise en page d'export (1 600 px), quelle que soit la largeur affichée. */
const slideLayout = computed(() => {
  void fontsTick.value
  return layout(doc.value, { measure, today })
})

async function loadHash() {
  if (!location.hash.startsWith(HASH_PREFIX)) return
  try {
    replace(await decodeTimeline(location.hash.slice(HASH_PREFIX.length)))
    track('lien_ouvert', { resultat: 'ok', ...shape(doc.value) })
    notice.value = { tone: 'info', text: 'Timeline ouverte depuis un lien. Votre brouillon précédent revient avec Annuler (Ctrl+Z).' }
  }
  catch (err) {
    track('lien_ouvert', { resultat: 'erreur' })
    notice.value = { tone: 'error', text: err instanceof Error ? err.message : String(err) }
  }
  // Le lien a servi : un rechargement doit rouvrir le brouillon, pas écraser les modifications.
  history.replaceState(null, '', location.pathname + location.search)
}

let started = false
function start() {
  if (started) return
  started = true
  let raw: string | null = null
  try { raw = localStorage.getItem(DRAFT_KEY) }
  catch { /* stockage bloqué : on part de l'exemple */ }
  if (raw) {
    try { doc.value = normalizeTimeline(JSON.parse(raw)) }
    catch (err) {
      track('brouillon_illisible')
      brokenDraft.value = raw
      notice.value = { tone: 'error', text: `Brouillon illisible (${err instanceof Error ? err.message : err}) : son texte est dans le panneau JSON.` }
    }
  }
  watch(doc, (t) => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(t)) }
    catch { /* stockage plein ou bloqué : le brouillon n'est pas gardé */ }
  }, { deep: true })
  loadHash()
  window.addEventListener('hashchange', loadHash)
  loadFonts()
}

/** Charge les polices du rendu, puis fait recalculer les mises en page. Une seule fois. */
let fontsLoading: Promise<void> | undefined
function loadFonts() {
  fontsLoading ||= Promise.allSettled(['700 15px Carlito', '400 13px Carlito', '600 16px Montserrat', '700 14px Montserrat'].map(f => document.fonts.load(f)))
    .then(() => { fontsTick.value++ })
  return fontsLoading
}

/** Ouvre une timeline venue d'une page publique (exemple, nouvelle) ; le brouillon reste derrière Annuler. */
function open(t: Timeline, text: string) {
  start()
  replace(structuredClone(t))
  notice.value = { tone: 'info', text }
}

/** Depuis une page publique : un exemple, ou une timeline vierge ; le brouillon reste derrière Annuler. */
function openExample(t: Timeline) {
  const had = draftTitle()
  open(t, had ? `Exemple ouvert. Votre brouillon « ${had} » revient avec Annuler (Ctrl+Z).` : 'Exemple ouvert : il est à vous, modifiez-le librement.')
}
function createNew() {
  const had = draftTitle()
  start()
  newTimeline()
  if (had) notice.value = { tone: 'info', text: `Nouvelle timeline. Votre brouillon « ${had} » revient avec Annuler (Ctrl+Z).` }
}

/** Le titre du brouillon enregistré, s'il y en a un, sans charger l'éditeur. */
function draftTitle(): string | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw).titre ?? 'Sans titre') : null
  }
  catch { return null }
}

export function useTimeline() {
  return {
    doc, selection, notice, brokenDraft, created, frozenPeriod, zoom, replaced, canUndo, canRedo, fontsTick, slideLayout,
    measure, today, start, snapshot, change, beginTyping, typed, replace, undo, redo, selectedItem, clampDate, dayAfter,
    addProjet, addJalon, pushPhase, removeSelected, moveProjet, newTimeline, open, openExample, createNew, draftTitle, loadFonts, styleThumb, thumb,
    period: () => frozenPeriod.value ?? bounds(doc.value),
  }
}
