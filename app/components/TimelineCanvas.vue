<script setup lang="ts">
import { ZOOM } from '~/composables/useTimeline'
import { layout, type ItemRef as Sel } from '~/utils/layout'
import { svgInner } from '~/utils/svg'
import { track } from '~/utils/track'
import { ddmmyyyy, fromDay, toDay } from '~/utils/timeline'

/*
 * La timeline est une page posée sur un fond, à sa taille d'export (1 600 px) :
 * ce qu'on modifie est ce qu'on exporte. Le zoom l'agrandit en entier, texte
 * compris ; molette, deux doigts, glisser le fond ou Espace + glisser la déplacent.
 * Sur la page : clic pour sélectionner, glisser un jalon ou une phase pour changer
 * ses dates, glisser sur une ligne vide pour dessiner une phase, double-clic pour
 * poser un jalon.
 */
// Les marges que laissent le rail, le panneau et la pastille qui flottent au-dessus :
// la zone libre, où la page s'ajuste et se centre.
const props = defineProps<{ inset: { top: number, right: number, bottom: number, left: number } }>()
const tl = useTimeline()
const { doc, selection, zoom, frozenPeriod } = tl

const scroller = ref<HTMLElement>()
const content = ref<HTMLElement>()
const svg = ref<SVGSVGElement>()
const view = ref({ w: 0, h: 0 })
// Une demi-fenêtre de fond autour de la page : on la pousse jusqu'au milieu de l'écran, pas au-delà.
const pad = computed(() => ({ x: Math.round(view.value.w / 2), y: Math.round(view.value.h / 2) }))

const l = computed(() => {
  void tl.fontsTick.value
  return layout(doc.value, { measure: tl.measure, period: tl.period(), today: tl.today })
})
const html = computed(() => svgInner(l.value, { interactive: true, selected: selection.value }))

// --- Zoom et cadrage ---

const clamp = (s: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, s))
const free = () => ({
  x: props.inset.left,
  y: props.inset.top,
  w: view.value.w - props.inset.left - props.inset.right,
  h: view.value.h - props.inset.top - props.inset.bottom,
})

/** Zoome en gardant sous (px, py), coordonnées dans le canevas, le même point de la page. */
async function zoomAt(next: number, px: number, py: number) {
  const box = scroller.value!
  const s0 = zoom.value
  const ax = (box.scrollLeft + px - pad.value.x) / s0
  const ay = (box.scrollTop + py - pad.value.y) / s0
  zoom.value = clamp(next)
  await nextTick()
  box.scrollLeft = pad.value.x + ax * zoom.value - px
  box.scrollTop = pad.value.y + ay * zoom.value - py
}
function zoomTo(s: number) {
  const f = free()
  return zoomAt(s, f.x + f.w / 2, f.y + f.h / 2)
}
const zoomBy = (k: number) => zoomTo(zoom.value * k)

/** Toute la page dans la zone libre, centrée. */
async function fit() {
  const f = free()
  zoom.value = clamp(Math.min(f.w / l.value.width, f.h / l.value.height))
  await nextTick()
  const box = scroller.value!
  box.scrollLeft = pad.value.x + (l.value.width * zoom.value) / 2 - (f.x + f.w / 2)
  box.scrollTop = pad.value.y + (l.value.height * zoom.value) / 2 - (f.y + f.h / 2)
}
watch(tl.replaced, () => fit())
defineExpose({ fit, zoomTo, zoomBy })

const local = (e: { clientX: number, clientY: number }) => {
  const r = scroller.value!.getBoundingClientRect()
  return [e.clientX - r.left, e.clientY - r.top] as const
}

// Ctrl (ou Cmd) + molette, et le pincement du trackpad que Chrome et Firefox livrent ainsi.
let pinchWheel = 0
function wheel(e: WheelEvent) {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  pinchWheel = performance.now()
  // Un cran de souris (deltaY ≈ 100, borné à 25) zoome d'environ ×1,28 ; le pincement, à petits deltas, reste progressif.
  const dy = Math.max(-25, Math.min(25, e.deltaY * (e.deltaMode === 1 ? 16 : 1)))
  zoomAt(zoom.value * Math.exp(-dy / 100), ...local(e))
}
// Safari peut livrer le pincement en événements gesture* : sans preventDefault, il zoome toute la
// page. On n'en tient compte que si aucune molette avec Ctrl ne vient d'arriver, pour ne pas zoomer deux fois.
let gestureFrom = 1
function gesture(e: Event) {
  e.preventDefault()
  const g = e as Event & { scale: number, clientX?: number, clientY?: number }
  if (e.type === 'gesturestart') gestureFrom = zoom.value
  else if (performance.now() - pinchWheel > 200) {
    const f = free()
    const [px, py] = g.clientX === undefined ? [f.x + f.w / 2, f.y + f.h / 2] : local(g as { clientX: number, clientY: number })
    zoomAt(gestureFrom * g.scale, px, py)
  }
}

// --- Déplacer la vue ---

const space = ref(false)
const panning = ref(false)
let pan: { x: number, y: number, left: number, top: number } | null = null

// Bouton du milieu, Espace + bouton gauche, ou bouton gauche sur le fond (au doigt, le défilement
// natif s'en charge). Un appui sur le fond désélectionne : retour aux réglages de la timeline.
function panStart(e: PointerEvent) {
  const ground = e.target === scroller.value || e.target === content.value
  if (ground) selection.value = null
  if (!(e.button === 1 || (e.button === 0 && (space.value || (ground && e.pointerType !== 'touch'))))) return
  e.preventDefault()
  e.stopPropagation()
  const box = scroller.value!
  pan = { x: e.clientX, y: e.clientY, left: box.scrollLeft, top: box.scrollTop }
  panning.value = true
  box.setPointerCapture(e.pointerId)
}
function panMove(e: PointerEvent) {
  if (!pan) return
  scroller.value!.scrollLeft = pan.left - (e.clientX - pan.x)
  scroller.value!.scrollTop = pan.top - (e.clientY - pan.y)
}
function panEnd() {
  pan = null
  panning.value = false
}

// Espace reste aux champs et aux boutons atteints au clavier (Tab). Un bouton cliqué à la souris
// garde le focus : Espace le lui retire et déplace la vue, au lieu de relancer le bouton.
let byPointer = false
function spaceKey(e: KeyboardEvent) {
  if (e.key === 'Tab') byPointer = false
  if (e.code !== 'Space') return
  const el = e.target as HTMLElement
  const busy = el.closest('input, textarea, select, [contenteditable]')
    || (el.closest('button, a') && !byPointer)
    || document.querySelector('dialog[open], :popover-open')
    || scroller.value?.closest('[inert]')
  if (busy) { space.value = false; return }
  e.preventDefault()
  if (el.closest('button, a')) el.blur()
  space.value = e.type === 'keydown'
}
const pointed = () => { byPointer = true }
const release = () => { space.value = false }

let observer: ResizeObserver | undefined
onMounted(() => {
  const box = scroller.value!
  observer = new ResizeObserver(async ([entry]) => {
    const { width: w, height: h } = entry!.contentRect
    if (!w || !h) return
    const first = !view.value.w
    const before = pad.value
    view.value = { w, h }
    await nextTick()
    if (first) return fit()
    // La page reste où elle était quand la fenêtre change de taille.
    box.scrollLeft += pad.value.x - before.x
    box.scrollTop += pad.value.y - before.y
  })
  observer.observe(box)
  box.addEventListener('gesturestart', gesture)
  box.addEventListener('gesturechange', gesture)
  window.addEventListener('keydown', spaceKey)
  window.addEventListener('keyup', spaceKey)
  window.addEventListener('blur', release)
  window.addEventListener('pointerdown', pointed, true)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', spaceKey)
  window.removeEventListener('keyup', spaceKey)
  window.removeEventListener('blur', release)
  window.removeEventListener('pointerdown', pointed, true)
})

// --- Modifier sur la page ---

type Drag =
  | { kind: 'jalon', projet: number, index: number, x0: number, moved: boolean }
  | { kind: 'phase', projet: number, index: number, mode: 'move' | 'start' | 'end', x0: number, debut0: number, fin0?: number, moved: boolean }
  | { kind: 'create', projet: number, x0: number, moved: boolean }
let drag: Drag | null = null
const tip = ref<{ x: number, y: number, text: string } | null>(null)
const cursor = ref('default')
const svgCursor = computed(() => (panning.value ? 'grabbing' : space.value ? 'grab' : cursor.value))
const scrollLeft = ref(0)
// Toute la cellule d'un projet le sélectionne, pas seulement les lettres de son nom.
const selectRow = (row: number) => { selection.value = row >= 0 ? { kind: 'projet', projet: row, index: row } : null }
// La colonne épinglée commence sous le titre dessiné dans l'image (y0), à l'échelle du zoom.
const pick = (e: MouseEvent) => selectRow(rowAt((e.clientY - (e.currentTarget as Element).getBoundingClientRect().top) / zoom.value + l.value.y0))
const columnHeight = computed(() => l.value.rows.at(-1)?.bottom ?? 0)
// La colonne des projets reste visible quand la moitié de la vraie colonne passe sous le rail, tant
// qu'elle ne prend pas plus du quart du canevas (au-delà, le zoom la rendrait envahissante).
const pinned = computed(() => {
  const left = pad.value.x - scrollLeft.value
  return left + (l.value.x0 * zoom.value) / 2 < props.inset.left
    && left + (l.value.width - l.value.x0) * zoom.value > props.inset.left
    && l.value.x0 * zoom.value <= view.value.w / 4
})

function point(e: MouseEvent) {
  return new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.value!.getScreenCTM()!.inverse())
}
function refOf(target: EventTarget | null): Sel | null {
  const el = (target as Element | null)?.closest<SVGElement>('[data-kind]')
  if (!el) return null
  return { kind: el.dataset.kind as Sel['kind'], projet: Number(el.dataset.projet), index: Number(el.dataset.index) }
}
const rowAt = (y: number) => l.value.rows.findIndex(r => y >= r.top && y < r.bottom)
const inAxis = (x: number) => x >= l.value.x0 && x <= l.value.x1
// Environ 7 px d'écran pour attraper le bord d'une phase, quel que soit le zoom.
const edge = () => Math.min(10, 7 / zoom.value)

function phaseMode(ref: Sel, x: number): 'move' | 'start' | 'end' {
  const ph = doc.value.projets[ref.projet]!.phases[ref.index]!
  if (Math.abs(x - l.value.x(ph.debut, 0)) < edge()) return 'start'
  if (ph.fin && Math.abs(x - l.value.x(ph.fin, 1)) < edge()) return 'end'
  return 'move'
}

function down(e: PointerEvent) {
  if (e.button !== 0) return
  const p = point(e)
  const ref = refOf(e.target)
  if (ref) selection.value = ref
  if (ref?.kind === 'jalon') {
    drag = { kind: 'jalon', projet: ref.projet, index: ref.index, x0: p.x, moved: false }
  }
  else if (ref?.kind === 'phase') {
    const ph = doc.value.projets[ref.projet]!.phases[ref.index]!
    drag = { kind: 'phase', projet: ref.projet, index: ref.index, mode: phaseMode(ref, p.x), x0: p.x, debut0: toDay(ph.debut), fin0: ph.fin ? toDay(ph.fin) : undefined, moved: false }
  }
  else if (!ref) {
    const row = rowAt(p.y)
    if (row >= 0 && inAxis(p.x)) drag = { kind: 'create', projet: row, x0: p.x, moved: false }
    else selectRow(p.x < l.value.x0 ? row : -1)
  }
  if (drag) {
    frozenPeriod.value = tl.period()
    svg.value!.setPointerCapture(e.pointerId)
  }
}

function hover(e: PointerEvent) {
  const ref = refOf(e.target)
  const p = point(e)
  cursor.value = ref?.kind === 'jalon'
    ? 'grab'
    : ref?.kind === 'phase'
      ? (phaseMode(ref, p.x) === 'move' ? 'move' : 'ew-resize')
      : rowAt(p.y) < 0 ? 'default' : inAxis(p.x) && ref?.kind !== 'projet' ? 'crosshair' : 'pointer'
}

function move(e: PointerEvent) {
  if (!drag) return hover(e)
  const p = point(e)
  if (!drag.moved) {
    if (Math.abs(p.x - drag.x0) < 4 / zoom.value) return
    drag.moved = true
    tl.snapshot()
    if (drag.kind === 'create') {
      const d = tl.clampDate(l.value.dateAt(drag.x0))
      tl.pushPhase(drag.projet, d, tl.dayAfter(d))
    }
  }
  const date = tl.clampDate(l.value.dateAt(p.x))
  const projet = doc.value.projets[drag.projet]!
  let label = ddmmyyyy(date)
  if (drag.kind === 'jalon') {
    projet.jalons[drag.index]!.date = date
  }
  else if (drag.kind === 'create') {
    const ph = projet.phases.at(-1)!
    const a = tl.clampDate(l.value.dateAt(drag.x0))
    const [debut, fin] = date < a ? [date, a] : [a, date]
    ph.debut = debut
    ph.fin = fin > debut ? fin : tl.dayAfter(debut)
    label = `${ddmmyyyy(ph.debut)} → ${ddmmyyyy(ph.fin)}`
  }
  else {
    const ph = projet.phases[drag.index]!
    if (drag.mode === 'start') {
      ph.debut = ph.fin && date >= ph.fin ? fromDay(toDay(ph.fin) - 1) : date
      label = ddmmyyyy(ph.debut)
    }
    else if (drag.mode === 'end') {
      ph.fin = date <= ph.debut ? tl.dayAfter(ph.debut) : date
      label = ddmmyyyy(ph.fin)
    }
    else {
      // Décalage borné à la période : la phase garde sa durée.
      const { debut, fin } = frozenPeriod.value!
      const delta = Math.min(Math.max(toDay(date) - toDay(l.value.dateAt(drag.x0)), toDay(debut) - drag.debut0), toDay(fin) - (drag.fin0 ?? drag.debut0))
      ph.debut = fromDay(drag.debut0 + delta)
      if (drag.fin0 !== undefined) ph.fin = fromDay(drag.fin0 + delta)
      label = ph.fin ? `${ddmmyyyy(ph.debut)} → ${ddmmyyyy(ph.fin)}` : ddmmyyyy(ph.debut)
    }
  }
  tip.value = { x: e.clientX + 14, y: e.clientY + 16, text: label }
}

function up(e: PointerEvent) {
  if (drag?.kind === 'create' && !drag.moved) selection.value = null
  if (drag?.moved) {
    if (drag.kind === 'create') track('phase_ajoutee', { depuis: 'glisser' })
    else if (drag.kind === 'jalon') track('jalon_deplace')
    else track('phase_glissee', { geste: drag.mode })
  }
  drag = null
  tip.value = null
  frozenPeriod.value = null
  if (svg.value?.hasPointerCapture(e.pointerId)) svg.value.releasePointerCapture(e.pointerId)
}

// Double-clic sur une ligne, y compris sur une phase : un jalon à cette date.
function dbl(e: MouseEvent) {
  const p = point(e)
  const row = rowAt(p.y)
  if (row < 0 || !inAxis(p.x) || refOf(e.target)?.kind === 'jalon') return
  tl.addJalon(row, l.value.dateAt(p.x))
  track('jalon_ajoute', { depuis: 'double_clic' })
}
</script>

<template>
  <!-- Le fond du canevas, à points ; la page de la timeline posée dessus, rail et panneau flottant au-dessus. -->
  <div
    ref="scroller"
    class="canvas-ground relative h-full overflow-auto"
    :style="{ cursor: panning ? 'grabbing' : 'grab' }"
    @pointerdown.capture="panStart"
    @pointermove="panMove"
    @pointerup="panEnd"
    @pointercancel="panEnd"
    @mousedown="$event.button === 1 && $event.preventDefault()"
    @wheel="wheel"
    @scroll="scrollLeft = scroller!.scrollLeft"
  >
    <div ref="content" class="w-max" :style="{ padding: `${pad.y}px ${pad.x}px` }">
      <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
      <svg
        ref="svg"
        class="timeline block select-none shadow-(--shadow-float)"
        :viewBox="`0 0 ${l.width} ${l.height}`"
        :width="l.width * zoom"
        :height="l.height * zoom"
        :style="{ cursor: svgCursor }"
        role="img"
        :aria-label="`Timeline ${doc.titre}`"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
        @dblclick="dbl"
        v-html="html"
      />
    </div>
    <!-- La colonne des projets, le même dessin cadré sur ses premiers pixels : elle reste en place
         quand la page défile vers la gauche, depuis le bord du canevas, sous le rail. -->
    <div
      v-if="pinned"
      class="absolute shadow-[6px_0_8px_-6px_rgb(43_38_34/0.25)]"
      :style="{ left: `${scrollLeft}px`, top: `${pad.y + l.y0 * zoom}px`, paddingLeft: `${inset.left}px`, background: l.background }"
    >
      <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
      <svg
        class="timeline block"
        :viewBox="`0 ${l.y0} ${l.x0} ${columnHeight - l.y0}`"
        :width="l.x0 * zoom"
        :height="(columnHeight - l.y0) * zoom"
        :style="{ cursor: panning ? 'grabbing' : space ? 'grab' : 'pointer' }"
        aria-hidden="true"
        @click="pick"
        v-html="html"
      />
    </div>
    <div
      v-if="tip"
      class="pointer-events-none fixed z-10 rounded-md bg-ink px-2 py-1 text-xs font-medium text-white tabular-nums shadow"
      :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
    >
      {{ tip.text }}
    </div>
  </div>
</template>

<style>
.timeline .sel { filter: drop-shadow(0 0 1.5px #cf4329) drop-shadow(0 0 3px rgb(207 67 41 / 0.7)); }
/* Des points tous les 20 px, qui suivent le défilement. */
.canvas-ground {
  background-color: var(--color-ground);
  background-image: radial-gradient(circle, var(--color-line-strong) 1px, transparent 1.5px);
  background-size: 20px 20px;
  background-attachment: local;
}
</style>
