<script setup lang="ts">
import { Check, ChevronDown, CircleAlert, Download, Eye, FileDown, Image as ImageIcon, Info, Link2, Maximize, Minus, PanelRightOpen, PenLine, Plus, Presentation, TriangleAlert, X } from '@lucide/vue'
import { ZOOM } from '~/composables/useTimeline'
import { EXEMPLE } from '~/utils/exemples'
import { downloadJson } from '~/utils/export'
import { slideReadability } from '~/utils/layout'
import { menuKeys, place } from '~/utils/popover'
import { encodeTimeline, HASH_PREFIX } from '~/utils/share'
import { shape, track } from '~/utils/track'
import { normalizeTimeline } from '~/utils/timeline'

const tl = useTimeline()
const { doc, notice, zoom, selection } = tl
// Titre fixe : la mesure d'audience remonte le titre de l'onglet, qui ne doit
// pas porter celui d'une timeline.
useHead({ title: 'Éditeur | Timeline' })
const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

// Large écran : rail à gauche, panneau à droite. Petit écran : rail en bas, panneau en feuille.
const wide = ref(true)
let media: MediaQueryList | undefined
const onMedia = () => { wide.value = media!.matches }
onMounted(async () => {
  tl.start()
  window.addEventListener('keydown', keys)
  window.addEventListener('hashchange', onHash)
  media = matchMedia('(min-width: 768px)')
  onMedia()
  // Sur petit écran, le panneau couvrirait la timeline : il s'ouvre à la sélection.
  panelOpen.value = wide.value
  media.addEventListener('change', onMedia)
  await openTimeline()
  syncAddress()
  track('editeur_ouvert', shape(doc.value))
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', keys)
  window.removeEventListener('hashchange', onHash)
  media?.removeEventListener('change', onMedia)
})

// La timeline à ouvrir : un lien de partage, sinon celle préparée par l'accueil ou un
// exemple, sinon celle de l'adresse ou déjà ouverte, sinon la plus récente, sinon l'exemple.
const route = useRoute()
const router = useRouter()
async function openTimeline() {
  if (await tl.openHash() || tl.openIncoming()) return
  const id = typeof route.query.id === 'string' ? route.query.id : tl.current.value
  if (id && (id === tl.current.value || tl.openId(id))) return
  if (id) notice.value = { tone: 'info', text: 'Cette timeline n\'est pas enregistrée dans ce navigateur. Voici la plus récente.' }
  const latest = tl.recent()[0]
  if (!latest || !tl.openId(latest.id)) tl.openNew(structuredClone(EXEMPLE))
}
// L'adresse porte l'identifiant, jamais le lien qui a servi : un rechargement rouvre la même timeline.
const syncAddress = () => router.replace({ query: tl.current.value ? { id: tl.current.value } : {}, hash: '' })
watch(tl.current, syncAddress)
async function onHash() {
  await tl.openHash()
  syncAddress()
}

// Modifier : la timeline en plein cadre avec ses outils. Aperçu : la slide telle qu'elle sortira.
const mode = ref<'modifier' | 'apercu'>('modifier')
const MODES = [{ v: 'modifier', label: 'Modifier', icon: PenLine }, { v: 'apercu', label: 'Aperçu', icon: Eye }] as const
watch(mode, m => track('mode_change', { mode: m }))
const panelOpen = ref(true)
watch(selection, (s) => { if (s) panelOpen.value = true })
// Le panneau se masque depuis son coin haut droit, et se rouvre au même endroit ; le focus suit.
const inspector = ref<{ focusClose: () => void }>()
const reopenButton = ref<HTMLButtonElement>()
async function togglePanel(open: boolean) {
  panelOpen.value = open
  track('panneau', { ouvert: open ? 'oui' : 'non' })
  await nextTick()
  if (open) inspector.value?.focusClose()
  else reopenButton.value?.focus()
}
const RAIL = 50, PANEL = 320, EDGE = 12, GAP = 16
const inset = computed(() => wide.value
  // Panneau masqué, son bouton de réouverture garde une colonne à droite, comme le rail à gauche.
  ? { top: GAP, left: EDGE + RAIL + GAP, right: EDGE + (panelOpen.value ? PANEL : RAIL) + GAP, bottom: 64 }
  : { top: EDGE + 40 + EDGE, left: EDGE, right: EDGE, bottom: EDGE + RAIL + EDGE })

function keys(e: KeyboardEvent) {
  const inField = !!(e.target as HTMLElement).closest('input, textarea, select')
  const mod = e.ctrlKey || e.metaKey
  if (inField || mode.value === 'apercu' || document.querySelector('dialog[open], :popover-open')) return
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) tl.redo(); else tl.undo(); track('raccourci', { touche: e.shiftKey ? 'retablir' : 'annuler' }) }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); tl.redo(); track('raccourci', { touche: 'retablir' }) }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); tl.removeSelected(); track('raccourci', { touche: 'supprimer' }) }
  else if (e.key === 'Escape') { selection.value = null; track('raccourci', { touche: 'echap' }) }
  else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); canvas.value?.menuOnSelection(); track('raccourci', { touche: 'menu' }) }
}

const warnings = computed(() => {
  const r = slideReadability(tl.slideLayout.value)
  return [...tl.slideLayout.value.warnings, ...(r.warning ? [r.warning] : [])]
})

// Avis : une information disparaît seule, une erreur reste jusqu'à ce qu'on la ferme.
let timer: ReturnType<typeof setTimeout> | undefined
watch(notice, (n) => {
  clearTimeout(timer)
  if (n?.tone === 'info') timer = setTimeout(() => { notice.value = null }, 8000)
})

// Fichier
const fileInput = ref<HTMLInputElement>()
async function openFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    tl.openNew(normalizeTimeline(JSON.parse(await file.text())), `${file.name} ouvert : il s'ajoute à vos timelines.`)
    track('fichier_ouvert', { resultat: 'ok', ...shape(doc.value) })
  }
  catch (err) {
    track('fichier_ouvert', { resultat: err instanceof SyntaxError ? 'json_invalide' : 'schema_invalide' })
    notice.value = { tone: 'error', text: `${file.name} : ${err instanceof SyntaxError ? `JSON invalide (${err.message})` : message(err)}` }
  }
}
function saveFile() {
  track('fichier_enregistre', shape(doc.value))
  downloadJson(doc.value)
}

async function share() {
  const url = `${location.origin}${location.pathname}${HASH_PREFIX}${await encodeTimeline(doc.value)}`
  const props = { caracteres: url.length, ...shape(doc.value) }
  try {
    await navigator.clipboard.writeText(url)
    track('lien_copie', { resultat: 'presse_papiers', ...props })
    notice.value = { tone: 'info', text: `Lien copié (${url.length} caractères). Il contient toute la timeline : toute personne qui le reçoit peut la lire.` }
  }
  catch {
    track('lien_copie', { resultat: 'invite', ...props })
    window.prompt('Copiez le lien de la timeline', url)
  }
}

const canvas = ref<{ fit: () => void, zoomTo: (s: number) => void, zoomBy: (k: number) => void, menuOnSelection: () => void }>()
type Format = 'png' | 'pptx' | 'gslides'
const exportDialog = ref<{ open: (f?: Format) => void }>()
const EXPORTS = [
  { value: 'png', label: 'Image PNG', icon: ImageIcon },
  { value: 'pptx', label: 'PowerPoint', icon: Presentation },
  { value: 'gslides', label: 'Google Slides', icon: Presentation },
] as const
const closeMenu = () => document.getElementById('export-menu')?.hidePopover()
const jsonDialog = ref<{ open: () => void }>()
const tour = ref<{ start: () => void }>()
// Les boutons de zoom ; la molette et le pincement, trop bavards, ne remontent pas.
function zoomClick(e: MouseEvent) {
  const b = (e.target as Element).closest('button')
  if (b) track('zoom', { bouton: b.title })
}
function settings() {
  selection.value = null
  panelOpen.value = true
}
</script>

<template>
  <div class="flex h-dvh flex-col bg-ground font-sans text-ink antialiased">
    <header class="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-paper px-3">
      <NuxtLink to="/" class="flex shrink-0 items-center gap-2 rounded-lg px-2 py-1.5 text-[15px] font-semibold hover:bg-wash focus-visible:outline-2 focus-visible:outline-accent">
        <BrandMark class="size-6" />
        <span class="max-sm:sr-only">Timeline</span>
      </NuxtLink>
      <span class="h-5 w-px shrink-0 bg-line" aria-hidden="true" />
      <input
        class="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-[15px] font-medium hover:border-line focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/25 supports-[field-sizing:content]:flex-initial supports-[field-sizing:content]:field-sizing-content md:max-w-md"
        :value="doc.titre"
        aria-label="Titre de la timeline"
        @focus="tl.beginTyping"
        @input="tl.typed(() => { doc.titre = ($event.target as HTMLInputElement).value })"
        @change="doc.titre = doc.titre.trim() || 'Sans titre'; track('champ_modifie', { element: 'timeline', champ: 'titre' })"
      >
      <!-- L'enregistrement est automatique : on le montre, plutôt qu'un bouton Enregistrer. -->
      <span v-if="tl.saved.value === 'ok'" class="flex shrink-0 items-center gap-1 text-xs text-muted max-lg:hidden">
        <Check :size="14" aria-hidden="true" /> Enregistré dans ce navigateur
      </span>
      <span v-else class="flex shrink-0 items-center gap-1 text-xs text-alert max-lg:hidden" title="Le navigateur refuse d'enregistrer : téléchargez le fichier JSON depuis le menu Exporter.">
        <CircleAlert :size="14" aria-hidden="true" /> Non enregistré
      </span>
      <div class="ml-auto flex shrink-0 items-center gap-1.5">
        <div class="flex rounded-lg bg-wash p-0.5" role="radiogroup" aria-label="Mode">
          <label v-for="m in MODES" :key="m.v" class="flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-muted has-checked:bg-paper has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent">
            <input v-model="mode" type="radio" name="mode" :value="m.v" class="sr-only">
            <component :is="m.icon" :size="15" aria-hidden="true" />
            <span class="max-md:sr-only">{{ m.label }}</span>
          </label>
        </div>
        <span class="mx-1 h-5 w-px bg-line max-sm:hidden" aria-hidden="true" />
        <template v-if="warnings.length">
          <button class="btn btn-quiet text-muted" type="button" popovertarget="warnings">
            <TriangleAlert :size="16" class="text-alert" />
            <span class="max-lg:sr-only">{{ warnings.length }} alerte{{ warnings.length > 1 ? 's' : '' }}</span>
          </button>
          <div id="warnings" popover class="menu w-96 p-4" @beforetoggle="place($event, 'below-end')" @toggle="($event as ToggleEvent).newState === 'open' && track('alertes_vues', { alertes: warnings.length })">
            <h2 class="mb-2 text-sm font-semibold">Sur la slide exportée</h2>
            <ul class="flex flex-col gap-1.5 text-[13px] text-muted">
              <li v-for="w in warnings" :key="w">{{ w }}</li>
            </ul>
          </div>
        </template>
        <!-- Une seule action pour sortir la timeline de l'outil : une slide, un lien ou le fichier. -->
        <button class="btn btn-primary" type="button" popovertarget="export-menu" aria-haspopup="menu">
          <Download :size="16" /><span class="max-sm:sr-only">Exporter</span><ChevronDown :size="14" class="-mr-0.5" aria-hidden="true" />
        </button>
        <div id="export-menu" popover class="menu" role="menu" aria-label="Exporter" @beforetoggle="place($event, 'below-end')" @keydown="menuKeys">
          <div role="group" aria-labelledby="export-menu-slide">
            <p id="export-menu-slide" class="px-2.5 pt-1.5 pb-1 text-xs font-medium text-muted">Exporter</p>
            <button v-for="f in EXPORTS" :key="f.value" class="menu-item" type="button" role="menuitem" @click="closeMenu(); exportDialog!.open(f.value)">
              <component :is="f.icon" :size="16" /> {{ f.label }}…
            </button>
          </div>
          <div class="mx-1 my-1.5 h-px bg-line" role="separator" />
          <div role="group" aria-labelledby="export-menu-lien">
            <p id="export-menu-lien" class="px-2.5 pt-1 pb-1 text-xs font-medium text-muted">Partager</p>
            <button class="menu-item" type="button" role="menuitem" @click="closeMenu(); share()"><Link2 :size="16" /> Copier le lien</button>
          </div>
          <div class="mx-1 my-1.5 h-px bg-line" role="separator" />
          <div role="group" aria-labelledby="export-menu-copie">
            <p id="export-menu-copie" class="px-2.5 pt-1 pb-1 text-xs font-medium text-muted">Garder une copie</p>
            <button class="menu-item" type="button" role="menuitem" @click="closeMenu(); saveFile()"><FileDown :size="16" /> Télécharger le fichier JSON</button>
          </div>
        </div>
      </div>
    </header>

    <main class="relative min-h-0 flex-1">
      <!-- Le canevas reste monté pendant l'aperçu : on y revient avec le même zoom, au même endroit. -->
      <TimelineCanvas ref="canvas" class="absolute inset-0" :inset="inset" :inert="mode === 'apercu' || undefined" />
      <EditorTour ref="tour" :wide="wide" :editing="mode === 'modifier'" />

      <SlidePreview v-if="mode === 'apercu'" class="absolute inset-0 bg-ground" />
      <template v-else>
        <EditorRail
          class="absolute"
          :class="wide ? 'top-3 left-3' : 'bottom-3 left-3'"
          :horizontal="!wide"
          @open="fileInput!.click()"
          @save="saveFile"
          @json="jsonDialog!.open()"
          @settings="settings"
          @tour="tour!.start()"
        />

        <Inspector
          v-if="panelOpen"
          ref="inspector"
          class="absolute"
          :class="wide ? 'top-3 right-3 bottom-3 w-80' : 'inset-x-3 bottom-[74px] max-h-[55%]'"
          @close="togglePanel(false)"
        />
        <!-- Sur petit écran, la sélection et les réglages rouvrent le panneau. -->
        <div v-else-if="wide" class="float absolute top-3 right-3 p-2">
          <button ref="reopenButton" class="btn btn-icon size-8" type="button" aria-expanded="false" aria-label="Afficher les propriétés" title="Afficher les propriétés" @click="togglePanel(true)">
            <PanelRightOpen :size="18" :stroke-width="1.75" />
          </button>
        </div>

        <div
          class="float absolute flex items-center p-1"
          :class="wide ? 'bottom-3' : 'top-3 right-3'"
          :style="wide ? { right: `${panelOpen ? EDGE + PANEL + EDGE : EDGE}px` } : {}"
          role="group"
          aria-label="Zoom"
          @click="zoomClick"
        >
          <button class="btn btn-icon size-8" type="button" :disabled="zoom <= ZOOM.min" aria-label="Dézoomer" title="Dézoomer" @click="canvas!.zoomBy(1 / 1.25)"><Minus :size="16" /></button>
          <button class="btn btn-quiet h-8 w-16 px-0 tabular-nums" type="button" :disabled="Math.round(zoom * 100) === 100" title="Revenir à 100 %" @click="canvas!.zoomTo(1)">{{ Math.round(zoom * 100) }} %</button>
          <button class="btn btn-icon size-8" type="button" :disabled="zoom >= ZOOM.max" aria-label="Zoomer" title="Zoomer" @click="canvas!.zoomBy(1.25)"><Plus :size="16" /></button>
          <span class="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
          <button class="btn btn-icon size-8" type="button" aria-label="Ajuster à l'écran" title="Ajuster à l'écran" @click="canvas!.fit()"><Maximize :size="16" /></button>
        </div>
      </template>

      <Transition enter-from-class="translate-y-2 opacity-0" leave-to-class="translate-y-2 opacity-0" enter-active-class="transition duration-200 ease-out" leave-active-class="transition duration-150 ease-in">
        <p
          v-if="notice"
          :role="notice.tone === 'error' ? 'alert' : 'status'"
          class="float absolute left-1/2 z-20 flex w-max max-w-[min(560px,calc(100%-24px))] -translate-x-1/2 items-start gap-2.5 py-2.5 pr-2 pl-3 text-sm"
          :class="wide ? 'bottom-16' : 'bottom-[74px]'"
        >
          <CircleAlert v-if="notice.tone === 'error'" :size="18" class="mt-px shrink-0 text-alert" />
          <Info v-else :size="18" class="mt-px shrink-0 text-muted" />
          <span class="flex-1">{{ notice.text }}</span>
          <button class="btn btn-icon -my-1 size-7" type="button" aria-label="Fermer" @click="notice = null"><X :size="15" /></button>
        </p>
      </Transition>
    </main>

    <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="openFile">
    <ExportDialog ref="exportDialog" />
    <JsonDialog ref="jsonDialog" />
  </div>
</template>
