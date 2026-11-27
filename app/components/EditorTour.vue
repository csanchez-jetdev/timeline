<script setup lang="ts">
import { placeNear } from '~/utils/popover'
import { track } from '~/utils/track'

/*
 * La visite guidée : cinq bulles posées sur les vrais éléments de l'éditeur. Proposée une
 * fois, à la première ouverture, puis relancée depuis le menu Aide. Elle ne touche pas à la
 * timeline : tant qu'une bulle est ouverte, les raccourcis de l'éditeur se taisent.
 */
defineProps<{ wide: boolean, editing: boolean }>()

// Chaque étape vise le premier de ses éléments présent à l'écran : le panneau, ou le bouton
// qui le rouvre, ou sur petit écran le bouton Réglages.
const STEPS = [
  { at: ['main svg.timeline'], titre: 'La timeline', texte: 'Cliquez sur un élément pour le modifier, double-cliquez dessus pour le renommer. Double-cliquez ailleurs sur une ligne pour poser un jalon, glissez sur une ligne vide pour dessiner une phase.' },
  { at: ['main .add-row'], titre: 'Ajouter un projet', texte: 'Chaque projet est une ligne. Ajoutez-en un ici, puis donnez-lui un nom.' },
  { at: ['#proprietes', '[aria-label="Afficher les propriétés"]', '[aria-label="Réglages de la timeline"]'], titre: 'Le panneau Propriétés', texte: 'Ce que vous sélectionnez se modifie ici : nom, dates, couleur. Sans sélection, il règle la timeline : style, fond, légende.' },
  { at: ['[role="radiogroup"][aria-label="Mode"]'], titre: 'Le mode Aperçu', texte: 'Il montre la slide telle qu\'elle sortira, au format 16:9.' },
  { at: ['[popovertarget="export-menu"]'], titre: 'Exporter', texte: 'Image PNG, PowerPoint ou Google Slides. Le même menu copie le lien de partage et télécharge le fichier JSON. Votre travail s\'enregistre seul dans ce navigateur.' },
]
const SEEN = 'timeline:visite'

const invite = ref(false)
const step = ref(-1)
const bubble = ref<HTMLElement>()
let back: HTMLElement | null = null
let target: Element | null = null

onMounted(() => {
  try { invite.value = !localStorage.getItem(SEEN) }
  catch { /* stockage bloqué : pas d'invitation, la visite reste dans le menu Aide */ }
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', show)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', show)
  target?.classList.remove('tour-target')
})

function seen() {
  invite.value = false
  try { localStorage.setItem(SEEN, 'vue') }
  catch { /* l'invitation reviendra : sans conséquence */ }
}
function later() {
  seen()
  track('visite_reportee')
}

function start(depuis: 'invitation' | 'aide') {
  seen()
  back = document.activeElement as HTMLElement | null
  step.value = 0
  track('visite_commencee', { depuis })
  show()
}
defineExpose({ start: () => start('aide') })

async function show() {
  if (step.value < 0) return
  await nextTick()
  target?.classList.remove('tour-target')
  target = STEPS[step.value]!.at.map(s => document.querySelector(s)).find(el => el && el.getBoundingClientRect().width > 0) ?? null
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  target?.classList.add('tour-target')
  placeNear(bubble.value!, target?.getBoundingClientRect() ?? new DOMRect(innerWidth / 2, innerHeight / 2, 0, 0))
}
function go(delta: number) {
  if (step.value + delta >= STEPS.length) return finish('terminee')
  step.value += delta
  show()
}
function finish(fin: 'terminee' | 'passee') {
  track(`visite_${fin}`, { etape: step.value + 1 })
  step.value = -1
  target?.classList.remove('tour-target')
  target = null
  bubble.value?.hidePopover()
  // Lancée depuis l'invitation, qui a disparu : le focus va au bouton Aide, qui la relance.
  const to = back?.isConnected ? back : document.querySelector<HTMLElement>('[aria-label="Aide"]')
  to?.focus()
}
function onKey(e: KeyboardEvent) {
  if (step.value >= 0 && e.key === 'Escape') finish('passee')
}
</script>

<template>
  <section
    v-if="invite && editing && step < 0"
    class="float absolute z-10 flex flex-wrap items-center gap-x-3 gap-y-2 py-2 pr-2 pl-3.5 text-sm"
    :class="wide ? 'top-3 left-[78px]' : 'inset-x-3 top-[60px]'"
    aria-label="Visite guidée"
  >
    <span class="mr-auto">Découvrir l'éditeur en une minute&nbsp;?</span>
    <span class="flex gap-1">
      <button class="btn" type="button" @click="start('invitation')">Commencer</button>
      <button class="btn btn-quiet text-muted" type="button" @click="later">Plus tard</button>
    </span>
  </section>

  <div ref="bubble" popover="manual" class="menu w-80 max-w-[calc(100vw-16px)] p-4" role="dialog" aria-labelledby="tour-title" aria-describedby="tour-text">
    <template v-if="step >= 0">
      <p class="text-xs text-muted tabular-nums">Étape {{ step + 1 }} sur {{ STEPS.length }}</p>
      <h2 id="tour-title" class="mt-1 text-sm font-semibold">{{ STEPS[step]!.titre }}</h2>
      <p id="tour-text" class="mt-1.5 text-[13px] leading-relaxed text-muted">{{ STEPS[step]!.texte }}</p>
      <div class="mt-4 flex items-center gap-1.5">
        <button class="btn btn-quiet -ml-2 mr-auto text-muted" type="button" @click="finish('passee')">Passer</button>
        <button v-if="step > 0" class="btn" type="button" @click="go(-1)">Précédent</button>
        <button :key="step" class="btn font-semibold" type="button" autofocus @click="go(1)">{{ step === STEPS.length - 1 ? 'Terminer' : 'Suivant' }}</button>
      </div>
    </template>
  </div>
</template>

<style>
/* L'élément que montre la bulle : le contour brique du focus, un peu détaché. */
.tour-target { outline: 2px solid var(--color-accent); outline-offset: 4px; border-radius: 8px; }
</style>
