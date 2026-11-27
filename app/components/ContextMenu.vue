<script lang="ts">
import type { ItemRef } from '~/utils/layout'

/** Ce que vise le menu : un élément de la timeline, ou une partie vide d'une ligne à une date. */
export type MenuTarget = { kind: 'element', ref: ItemRef } | { kind: 'row', row: number, date: string }
</script>

<script setup lang="ts">
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2 } from '@lucide/vue'
import { markPrim } from '~/utils/layout'
import { menuKeys, placeAt } from '~/utils/popover'
import { markStyle, STYLE_DEFS } from '~/utils/styles'
import { prim } from '~/utils/svg'
import { COULEUR_LABELS, COULEURS, type Couleur, TYPES, type TypeJalon, typeLabel } from '~/utils/timeline'
import { track } from '~/utils/track'

/*
 * Le menu du clic droit (ou de l'appui long, ou de la touche Menu) : les gestes courants
 * sur l'élément visé, sans passer par le panneau. Chaque action prend un instantané :
 * Ctrl+Z l'annule.
 */

const tl = useTimeline()
const { doc, selection } = tl
const menu = ref<HTMLElement>()
const target = ref<MenuTarget | null>(null)

const item = computed(() => (target.value?.kind === 'element' ? target.value.ref : null))
const projet = computed(() => (item.value ? doc.value.projets[item.value.projet] : undefined))
const phase = computed(() => (item.value?.kind === 'phase' ? projet.value?.phases[item.value.index] : undefined))
const jalon = computed(() => (item.value?.kind === 'jalon' ? projet.value?.jalons[item.value.index] : undefined))
const palette = computed(() => STYLE_DEFS[doc.value.style ?? 'tableau'].palette)
function mark(k: TypeJalon) {
  const { forme, fill, stroke } = markStyle(STYLE_DEFS[doc.value.style ?? 'tableau'], k, doc.value.marques?.[k])
  return prim(markPrim(forme, 0, 0, 8.5, fill, stroke === '#ffffff' ? '#d6cdc2' : stroke))
}

async function open(t: MenuTarget, x: number, y: number) {
  target.value = t
  if (t.kind === 'element') selection.value = t.ref
  await nextTick()
  placeAt(menu.value!, x, y)
  track('menu_contextuel', { element: t.kind === 'element' ? t.ref.kind : 'ligne' })
}
defineExpose({ open })

// Fermer le menu rend le focus là où il était (comportement natif du popover).
function act(action: string, fn: () => void) {
  menu.value?.hidePopover()
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
</script>

<template>
  <div ref="menu" popover class="menu" role="menu" :aria-label="item ? `Actions sur ${item.kind === 'projet' ? 'le projet' : item.kind === 'phase' ? 'la phase' : 'le jalon'}` : 'Actions sur la ligne'" @keydown="menuKeys">
    <template v-if="item && projet">
      <button class="menu-item" type="button" role="menuitem" @click="rename"><Pencil :size="16" /> Renommer</button>

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
        <button class="menu-item" type="button" role="menuitem" :disabled="item.projet === 0" @click="move(-1)"><ArrowUp :size="16" /> Monter</button>
        <button class="menu-item" type="button" role="menuitem" :disabled="item.projet === doc.projets.length - 1" @click="move(1)"><ArrowDown :size="16" /> Descendre</button>
      </template>

      <div class="mx-1 my-1.5 h-px bg-line" role="separator" />
      <button class="menu-item text-alert [&_svg]:text-alert!" type="button" role="menuitem" @click="remove"><Trash2 :size="16" /> Supprimer</button>
    </template>

    <button v-else class="menu-item" type="button" role="menuitem" @click="addJalon"><Plus :size="16" /> Ajouter un jalon ici</button>
  </div>
</template>
