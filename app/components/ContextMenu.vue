<script lang="ts">
import type { ItemRef } from '~/utils/layout'

/** Ce que vise le menu : un élément de la timeline, une partie vide d'une ligne à une date, ou le fond. */
export type MenuTarget = { kind: 'element', ref: ItemRef } | { kind: 'row', row: number, date: string } | { kind: 'fond' }
</script>

<script setup lang="ts">
import { ArrowDown, ArrowUp, Check, Maximize, Pencil, Plus, Redo2, SlidersHorizontal, Trash2, Undo2 } from '@lucide/vue'
import { markPrim } from '~/utils/layout'
import { SHORTCUTS as K } from '~/utils/keys'
import { menuKeys, placeAt } from '~/utils/popover'
import { markStyle, STYLE_DEFS } from '~/utils/styles'
import { prim } from '~/utils/svg'
import { COULEUR_LABELS, COULEURS, type Couleur, TYPES, type TypeJalon, typeLabel } from '~/utils/timeline'
import { track } from '~/utils/track'

/*
 * Le menu du clic droit (ou de l'appui long, ou de la touche Menu) : les gestes courants
 * sur l'élément visé, sans passer par le panneau ; sur le fond, ceux de la timeline.
 * Chaque action prend un instantané : Ctrl+Z l'annule.
 */

const emit = defineEmits<{ fit: [], settings: [] }>()
const tl = useTimeline()
const { doc, selection, canUndo, canRedo } = tl
const menu = ref<HTMLElement>()
const target = ref<MenuTarget | null>(null)

const item = computed(() => (target.value?.kind === 'element' ? target.value.ref : null))
const projet = computed(() => (item.value ? doc.value.projets[item.value.projet] : undefined))
const phase = computed(() => (item.value?.kind === 'phase' ? projet.value?.phases[item.value.index] : undefined))
const jalon = computed(() => (item.value?.kind === 'jalon' ? projet.value?.jalons[item.value.index] : undefined))
const label = computed(() => {
  if (target.value?.kind === 'fond') return 'Actions sur la timeline'
  if (!item.value) return 'Actions sur la ligne'
  return `Actions sur ${item.value.kind === 'projet' ? 'le projet' : item.value.kind === 'phase' ? 'la phase' : 'le jalon'}`
})
const palette = computed(() => STYLE_DEFS[doc.value.style ?? 'tableau'].palette)
function mark(k: TypeJalon) {
  const { forme, fill, stroke } = markStyle(STYLE_DEFS[doc.value.style ?? 'tableau'], k, doc.value.marques?.[k])
  return prim(markPrim(forme, 0, 0, 8.5, fill, stroke === '#ffffff' ? '#d6cdc2' : stroke))
}

/*
 * Un popover « manual », fermé ici : un appui hors du menu, Échap, ou une entrée choisie.
 * En « auto », le navigateur le fermait au relâchement du bouton quand le menu s'ouvre
 * bouton enfoncé (clic droit sous macOS, Ctrl+clic, appui long) : le relâchement tombe
 * hors du menu et compte comme un clic à l'extérieur.
 */
let back: HTMLElement | null = null
async function open(t: MenuTarget, x: number, y: number) {
  target.value = t
  if (t.kind === 'element') selection.value = t.ref
  if (!menu.value?.matches(':popover-open')) back = document.activeElement as HTMLElement | null
  await nextTick()
  placeAt(menu.value!, x, y)
  addEventListener('pointerdown', outside, true)
  addEventListener('keydown', escape, true)
  track('menu_contextuel', { element: t.kind === 'element' ? t.ref.kind : t.kind === 'row' ? 'ligne' : 'fond' })
}
defineExpose({ open })

/** Ferme le menu ; au clavier ou par une entrée, le focus revient où il était. */
function close(refocus: boolean) {
  menu.value?.hidePopover()
  if (refocus) back?.focus()
}
function outside(e: PointerEvent) {
  if (!menu.value?.contains(e.target as Node)) close(false)
}
function escape(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  e.stopPropagation()
  close(true)
}
function closed(e: Event) {
  if ((e as ToggleEvent).newState === 'open') return
  removeEventListener('pointerdown', outside, true)
  removeEventListener('keydown', escape, true)
}
onBeforeUnmount(() => close(false))

function act(action: string, fn: () => void) {
  close(true)
  fn()
  track('menu_contextuel_action', { action })
}
const rename = () => act('renommer', () => { tl.created.value++ })
const remove = () => act('supprimer', () => tl.removeSelected())
const setColor = (c: Couleur) => act('couleur', () => tl.change(() => { phase.value!.couleur = c }))
const setType = (k: TypeJalon) => act('type', () => tl.change(() => { jalon.value!.type = k }))
const move = (delta: number) => act(delta < 0 ? 'monter' : 'descendre', () => tl.moveProjet(item.value!.projet, delta))
function addJalon() {
  const t = target.value
  if (t?.kind !== 'row') return
  act('jalon', () => tl.addJalon(t.row, t.date))
  track('jalon_ajoute', { depuis: 'menu' })
}
const addProjet = () => act('projet', () => tl.addProjet())
</script>

<template>
  <div ref="menu" popover="manual" class="menu" role="menu" :aria-label="label" @keydown="menuKeys" @toggle="closed" @contextmenu.prevent>
    <template v-if="item && projet">
      <button class="menu-item" type="button" role="menuitem" :aria-keyshortcuts="K.renommer.aria" @click="rename"><Pencil :size="16" /> Renommer<kbd>{{ K.renommer.label }}</kbd></button>

      <template v-if="phase">
        <div class="mx-1 my-1.5 h-px bg-line" role="separator" />
        <div role="group" aria-labelledby="menu-couleur">
          <p id="menu-couleur" class="px-2.5 pt-1 pb-1.5 text-xs font-medium text-muted">Couleur</p>
          <div class="flex gap-1 px-2 pb-1">
            <!-- Cochée ou au focus clavier, l'anneau brique des sélections. -->
            <button
              v-for="c in COULEURS"
              :key="c"
              class="rounded-full p-0.5 ring-accent outline-none hover:ring-2 hover:ring-line-strong focus-visible:ring-2 aria-checked:ring-2 aria-checked:ring-accent"
              type="button"
              role="menuitemradio"
              :aria-checked="phase.couleur === c"
              :aria-label="COULEUR_LABELS[c]"
              :title="COULEUR_LABELS[c]"
              @click="setColor(c)"
            >
              <span class="block size-6 rounded-full border border-black/10" :style="{ background: palette.phases[c] }" />
            </button>
          </div>
        </div>
      </template>

      <template v-else-if="jalon">
        <div class="mx-1 my-1.5 h-px bg-line" role="separator" />
        <div role="group" aria-labelledby="menu-type">
          <p id="menu-type" class="px-2.5 pt-1 pb-1 text-xs font-medium text-muted">Type</p>
          <button v-for="k in TYPES" :key="k" class="menu-item" type="button" role="menuitemradio" :aria-checked="jalon.type === k" @click="setType(k)">
            <svg viewBox="-12 -12 24 24" class="size-4 shrink-0" aria-hidden="true" v-html="mark(k)" />
            <span class="flex-1">{{ typeLabel(doc, k) }}</span>
            <Check v-if="jalon.type === k" :size="15" class="text-ink!" aria-hidden="true" />
          </button>
        </div>
      </template>

      <template v-else>
        <button class="menu-item" type="button" role="menuitem" :disabled="item.projet === 0" :aria-keyshortcuts="K.monter.aria" @click="move(-1)"><ArrowUp :size="16" /> Monter<kbd>{{ K.monter.label }}</kbd></button>
        <button class="menu-item" type="button" role="menuitem" :disabled="item.projet === doc.projets.length - 1" :aria-keyshortcuts="K.descendre.aria" @click="move(1)"><ArrowDown :size="16" /> Descendre<kbd>{{ K.descendre.label }}</kbd></button>
      </template>

      <div class="mx-1 my-1.5 h-px bg-line" role="separator" />
      <button class="menu-item text-alert [&_svg]:text-alert!" type="button" role="menuitem" :aria-keyshortcuts="K.supprimer.aria" @click="remove"><Trash2 :size="16" /> Supprimer<kbd>{{ K.supprimer.label }}</kbd></button>
    </template>

    <button v-else-if="target?.kind === 'row'" class="menu-item" type="button" role="menuitem" @click="addJalon"><Plus :size="16" /> Ajouter un jalon ici</button>

    <template v-else>
      <button class="menu-item" type="button" role="menuitem" @click="addProjet"><Plus :size="16" /> Ajouter un projet</button>
      <div class="mx-1 my-1.5 h-px bg-line" role="separator" />
      <button class="menu-item" type="button" role="menuitem" :disabled="!canUndo" :aria-keyshortcuts="K.annuler.aria" @click="act('annuler', tl.undo)"><Undo2 :size="16" /> Annuler<kbd>{{ K.annuler.label }}</kbd></button>
      <button class="menu-item" type="button" role="menuitem" :disabled="!canRedo" :aria-keyshortcuts="K.retablir.aria" @click="act('retablir', tl.redo)"><Redo2 :size="16" /> Rétablir<kbd>{{ K.retablir.label }}</kbd></button>
      <div class="mx-1 my-1.5 h-px bg-line" role="separator" />
      <button class="menu-item" type="button" role="menuitem" @click="act('ajuster', () => emit('fit'))"><Maximize :size="16" /> Ajuster la vue</button>
      <button class="menu-item" type="button" role="menuitem" @click="act('reglages', () => emit('settings'))"><SlidersHorizontal :size="16" /> Réglages de la timeline</button>
    </template>
  </div>
</template>
