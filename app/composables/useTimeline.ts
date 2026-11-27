import { layout, type Measure, type ItemRef as Sel } from '~/utils/layout'
import { decodeTimeline, HASH_PREFIX } from '~/utils/share'
import { svgInner } from '~/utils/svg'
import { shape, track } from '~/utils/track'
import { EXEMPLE } from '~/utils/exemples'
import { create, docKey, type Entry, list, load, migrate, save } from '~/utils/store'
import { bounds, endOfMonth, fromDay, normalizeTimeline, type Periode, type Style, type Timeline, toDay } from '~/utils/timeline'

/*
 * L'état de l'éditeur, partagé par tous les composants : le document, la
 * sélection, l'historique, l'enregistrement. Un seul éditeur par onglet, donc un
 * état de module suffit.
 */
const HISTORY = 100

const doc = ref<Timeline>(structuredClone(EXEMPLE))
const selection = ref<Sel | null>(null)
const notice = ref<{ text: string, tone: 'info' | 'error' } | null>(null)
/** Le texte d'une timeline enregistrée qui n'a pas pu se relire, proposé dans le panneau JSON. */
const brokenDraft = ref<string | null>(null)
/** L'identifiant de la timeline ouverte dans ce navigateur ; null si elle n'a pas pu s'enregistrer. */
const current = ref<string | null>(null)
/** L'état de la dernière écriture dans le navigateur. */
const saved = ref<'ok' | 'erreur'>('ok')
/** Incrémenté à chaque création ou demande de renommage : le panneau place le curseur dans le premier champ. */
const created = ref(0)
let focused = 0
/** Vrai une fois par demande : un panneau monté après la demande la traite encore. */
const takeFocus = () => {
  const pending = created.value !== focused
  focused = created.value
  return pending
}
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
function blank(): Timeline {
  const fin = endOfMonth(fromDay(toDay(`${today.slice(0, 7)}-01`) + 160))
  return { titre: 'Nouvelle timeline', periode: { debut: `${today.slice(0, 7)}-01`, fin }, projets: [{ nom: 'Projet 1', phases: [], jalons: [] }] }
}
function newTimeline() {
  openNew(blank())
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

// L'enregistrement : chaque modification de la timeline ouverte s'écrit dans le
// navigateur. `written` est son dernier texte connu (lu ou écrit) : une ouverture
// ou un rechargement venu d'un autre onglet ne réécrit rien.
let written = ''
const storage = () => {
  try { return localStorage }
  catch { return null } // stockage bloqué
}
let migrated = false
/** Le stockage, après reprise de l'ancien brouillon unique. */
function store() {
  const s = storage()
  if (s && !migrated) {
    migrated = true
    try { migrate(s) }
    catch { /* stockage plein : le brouillon reste sous son ancienne clé */ }
  }
  return s
}
function persist(t: Timeline) {
  const json = JSON.stringify(t)
  if (!current.value || brokenDraft.value !== null || json === written) return
  try {
    save(store()!, current.value, t)
    written = json
    saved.value = 'ok'
  }
  catch {
    if (saved.value === 'ok') notice.value = { tone: 'error', text: REFUSED }
    saved.value = 'erreur'
  }
}
const REFUSED = 'Le navigateur refuse d\'enregistrer cette timeline (stockage plein ou bloqué). Téléchargez son fichier JSON pour ne pas la perdre.'

/** Les timelines de ce navigateur, de la plus récente à la plus ancienne. */
function recent(): Entry[] {
  const s = store()
  try { return s ? list(s) : [] }
  catch { return [] }
}

/** Affiche une autre timeline : historique vide, rien de sélectionné, vue recadrée. */
function show(id: string | null, t: Timeline) {
  current.value = id
  past.length = future.length = 0
  syncHistory()
  selection.value = null
  doc.value = t
  written = JSON.stringify(t)
  saved.value = id ? 'ok' : 'erreur'
  replaced.value++
}

/** Ouvre une timeline enregistrée. Faux si elle n'existe pas dans ce navigateur. */
function openId(id: string) {
  const s = store()
  const raw = s && load(s, id)
  if (!raw) return false
  brokenDraft.value = null
  try { show(id, normalizeTimeline(JSON.parse(raw))) }
  catch (err) {
    track('brouillon_illisible')
    // Le texte reste enregistré tel quel jusqu'à ce que le panneau JSON le corrige.
    brokenDraft.value = raw
    show(id, { titre: 'Sans titre', projets: [] })
    notice.value = { tone: 'error', text: `Timeline illisible (${err instanceof Error ? err.message : err}) : son texte est dans le panneau JSON.` }
  }
  return true
}

/** Ajoute une timeline à celles du navigateur et l'ouvre. Si le navigateur refuse, elle s'ouvre sans être enregistrée. */
function openNew(t: Timeline, text?: string) {
  try {
    openId(create(store()!, t))
    if (text) notice.value = { tone: 'info', text }
  }
  catch {
    show(null, structuredClone(t))
    notice.value = { tone: 'error', text: REFUSED }
  }
}

/** Le lien de partage de l'adresse devient une nouvelle timeline. Vrai si elle s'est ouverte. */
async function openHash() {
  if (!location.hash.startsWith(HASH_PREFIX)) return false
  try {
    const t = await decodeTimeline(location.hash.slice(HASH_PREFIX.length))
    openNew(t, 'Timeline ouverte depuis un lien. Cette copie est enregistrée dans votre navigateur.')
    track('lien_ouvert', { resultat: 'ok', ...shape(t) })
    return true
  }
  catch (err) {
    track('lien_ouvert', { resultat: 'erreur' })
    notice.value = { tone: 'error', text: err instanceof Error ? err.message : String(err) }
    return false
  }
}

// Une autre page de cet onglet (accueil, exemple) prépare la timeline ; l'éditeur l'ouvre à son montage.
let incoming: { t: Timeline, text?: string } | null = null
function openExample(t: Timeline) {
  incoming = { t: structuredClone(t), text: 'Exemple ouvert : cette copie est à vous, modifiez-la librement.' }
}
function createNew() {
  incoming = { t: blank() }
  track('nouvelle_timeline')
}
/** À l'ouverture de l'éditeur : la timeline préparée par une autre page, s'il y en a une. */
function openIncoming() {
  const i = incoming
  incoming = null
  if (i) openNew(i.t, i.text)
  return !!i
}

let started = false
function start() {
  if (started) return
  started = true
  watch(doc, persist, { deep: true })
  // Un autre onglet a modifié la timeline ouverte : la dernière écriture l'emporte.
  window.addEventListener('storage', (e) => {
    if (!current.value || e.key !== docKey(current.value) || e.newValue === null || e.newValue === written) return
    openId(current.value)
    notice.value = { tone: 'info', text: 'Cette timeline a été modifiée dans un autre onglet. Sa dernière version est affichée.' }
  })
  loadFonts()
}

/** Charge les polices du rendu, puis fait recalculer les mises en page. Une seule fois. */
let fontsLoading: Promise<void> | undefined
function loadFonts() {
  fontsLoading ||= Promise.allSettled(['700 15px Carlito', '400 13px Carlito', '600 16px Montserrat', '700 14px Montserrat'].map(f => document.fonts.load(f)))
    .then(() => { fontsTick.value++ })
  return fontsLoading
}

export function useTimeline() {
  return {
    doc, selection, notice, brokenDraft, current, saved, created, takeFocus, frozenPeriod, zoom, replaced, canUndo, canRedo, fontsTick, slideLayout,
    measure, today, start, snapshot, change, beginTyping, typed, replace, undo, redo, selectedItem, clampDate, dayAfter,
    addProjet, addJalon, pushPhase, removeSelected, moveProjet, newTimeline, openNew, openId, openHash, openIncoming, openExample, createNew, recent,
    loadFonts, styleThumb, thumb,
    period: () => frozenPeriod.value ?? bounds(doc.value),
  }
}
