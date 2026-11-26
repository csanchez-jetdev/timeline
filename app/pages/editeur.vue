<script setup lang="ts">
import { CircleAlert, Download, Eye, Info, Link2, Maximize, Minus, PanelRight, PenLine, Plus, TriangleAlert, X } from '@lucide/vue'
import { ZOOM } from '~/composables/useTimeline'
import { download, fileName } from '~/utils/export'
import { slideReadability } from '~/utils/layout'
import { place } from '~/utils/popover'
import { encodeTimeline, HASH_PREFIX } from '~/utils/share'
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
onMounted(() => {
  tl.start()
  window.addEventListener('keydown', keys)
  media = matchMedia('(min-width: 768px)')
  onMedia()
  // Sur petit écran, le panneau couvrirait la timeline : il s'ouvre à la sélection.
  panelOpen.value = wide.value
  media.addEventListener('change', onMedia)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', keys)
  media?.removeEventListener('change', onMedia)
})

// Modifier : la timeline en plein cadre avec ses outils. Aperçu : la slide telle qu'elle sortira.
const mode = ref<'modifier' | 'apercu'>('modifier')
const MODES = [{ v: 'modifier', label: 'Modifier', icon: PenLine }, { v: 'apercu', label: 'Aperçu', icon: Eye }] as const
const panelOpen = ref(true)
watch(selection, (s) => { if (s) panelOpen.value = true })
const RAIL = 50, PANEL = 320, EDGE = 12, GAP = 16
const inset = computed(() => wide.value
  ? { top: GAP, left: EDGE + RAIL + GAP, right: panelOpen.value ? EDGE + PANEL + GAP : GAP, bottom: 64 }
  : { top: EDGE + 40 + EDGE, left: EDGE, right: EDGE, bottom: EDGE + RAIL + EDGE })

function keys(e: KeyboardEvent) {
  const inField = !!(e.target as HTMLElement).closest('input, textarea, select')
  const mod = e.ctrlKey || e.metaKey
  if (inField || mode.value === 'apercu' || document.querySelector('dialog[open], :popover-open')) return
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) tl.redo(); else tl.undo() }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); tl.redo() }
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); tl.removeSelected() }
  else if (e.key === 'Escape') selection.value = null
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
    tl.replace(normalizeTimeline(JSON.parse(await file.text())))
    notice.value = { tone: 'info', text: `${file.name} ouvert. Annuler (Ctrl+Z) rend la timeline d'avant.` }
  }
  catch (err) {
    notice.value = { tone: 'error', text: `${file.name} : ${err instanceof SyntaxError ? `JSON invalide (${err.message})` : message(err)}` }
  }
}
function saveFile() {
  download(new Blob([`${JSON.stringify(doc.value, null, 2)}\n`], { type: 'application/json' }), `${fileName(doc.value.titre)}.json`)
}

async function share() {
  const url = `${location.origin}${location.pathname}${HASH_PREFIX}${await encodeTimeline(doc.value)}`
  try {
    await navigator.clipboard.writeText(url)
    notice.value = { tone: 'info', text: `Lien copié (${url.length} caractères). Il contient toute la timeline : toute personne qui le reçoit peut la lire.` }
  }
  catch {
    window.prompt('Copiez le lien de la timeline', url)
  }
}

const canvas = ref<{ fit: () => void, zoomTo: (s: number) => void, zoomBy: (k: number) => void }>()
const exportDialog = ref<{ open: () => void }>()
const jsonDialog = ref<{ open: () => void }>()
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
        class="min-w-0 flex-1 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-[15px] font-medium hover:border-line focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/25 md:max-w-md"
        :value="doc.titre"
        aria-label="Titre de la timeline"
        @focus="tl.beginTyping"
        @input="tl.typed(() => { doc.titre = ($event.target as HTMLInputElement).value })"
        @change="doc.titre = doc.titre.trim() || 'Sans titre'"
      >
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
          <div id="warnings" popover class="menu w-96 p-4" @beforetoggle="place($event, 'below-end')">
            <h2 class="mb-2 text-sm font-semibold">Sur la slide exportée</h2>
            <ul class="flex flex-col gap-1.5 text-[13px] text-muted">
              <li v-for="w in warnings" :key="w">{{ w }}</li>
            </ul>
          </div>
        </template>
        <button v-if="mode === 'modifier'" class="btn btn-icon max-md:hidden" type="button" :aria-pressed="panelOpen" aria-label="Propriétés" title="Propriétés" @click="panelOpen = !panelOpen">
          <PanelRight :size="18" :stroke-width="1.75" />
        </button>
        <button class="btn" type="button" @click="share"><Link2 :size="16" /><span class="max-sm:sr-only">Partager</span></button>
        <button class="btn btn-primary" type="button" @click="exportDialog!.open()"><Download :size="16" /><span class="max-sm:sr-only">Exporter</span></button>
      </div>
    </header>

    <main class="relative min-h-0 flex-1">
      <!-- Le canevas reste monté pendant l'aperçu : on y revient avec le même zoom, au même endroit. -->
      <TimelineCanvas ref="canvas" class="absolute inset-0" :inset="inset" :inert="mode === 'apercu' || undefined" />

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
        />

        <Inspector
          v-if="panelOpen"
          class="absolute"
          :class="wide ? 'top-3 right-3 bottom-3 w-80' : 'inset-x-3 bottom-[74px] max-h-[55%]'"
          @close="panelOpen = false"
        />

        <div
          class="float absolute flex items-center p-1"
          :class="wide ? 'bottom-3' : 'top-3 right-3'"
          :style="wide ? { right: `${panelOpen ? EDGE + PANEL + EDGE : EDGE}px` } : {}"
          role="group"
          aria-label="Zoom"
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
