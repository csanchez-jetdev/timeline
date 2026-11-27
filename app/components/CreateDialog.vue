<script setup lang="ts">
import { ArrowLeft, Plus } from '@lucide/vue'
import { EXEMPLE_OUVERT, EXEMPLES } from '~/utils/exemples'
import { isDate, type Style, type Timeline } from '~/utils/timeline'
import { track } from '~/utils/track'

/*
 * L'assistant de création, en deux étapes : un point de départ (vide ou un exemple), puis
 * le titre, la période d'une timeline vide et le style. La timeline créée s'ajoute à celles
 * du navigateur et s'ouvre dans l'éditeur. Rien ne se calcule tant que la boîte est fermée.
 */
const tl = useTimeline()
const route = useRoute()
const dialog = ref<HTMLDialogElement>()
const titleInput = ref<HTMLInputElement>()
const isOpen = ref(false)
const step = ref<1 | 2>(1)
const depart = ref('vide') // ou le slug d'un exemple
const titre = ref('')
const debut = ref('')
const fin = ref('')
const style = ref<Style>('tableau')
let created = false

// Le haut à gauche de la timeline, au cadrage des vignettes de Mes timelines.
const FRAME = [768, 320] as const
// Une carte de point de départ : la vignette, le titre, le public.
const CARD = 'flex cursor-pointer flex-col rounded-xl border border-line p-2 hover:border-line-strong has-checked:border-accent has-checked:ring-2 has-checked:ring-accent/25 has-focus-visible:ring-2 has-focus-visible:ring-accent'
const exemple = computed(() => EXEMPLES.find(e => e.slug === depart.value))
// Une timeline vide n'a rien à montrer : les styles s'essaient sur le premier exemple.
const sample = computed(() => exemple.value?.timeline ?? EXEMPLES[0]!.timeline)
const periodOk = computed(() => isDate(debut.value) && isDate(fin.value) && debut.value < fin.value)

async function open() {
  const b = tl.blank()
  step.value = 1
  depart.value = 'vide'
  debut.value = b.periode!.debut
  fin.value = b.periode!.fin
  created = false
  isOpen.value = true
  // Le contenu d'abord : la boîte donne le focus à son premier champ, la timeline vide cochée.
  await nextTick()
  dialog.value!.showModal()
}
defineExpose({ open })

async function next() {
  if (step.value === 2) return create()
  titre.value = exemple.value?.timeline.titre ?? 'Nouvelle timeline'
  style.value = exemple.value?.timeline.style ?? 'tableau'
  step.value = 2
  await nextTick()
  titleInput.value?.select()
}
async function back() {
  step.value = 1
  await nextTick()
  dialog.value!.querySelector<HTMLInputElement>('input[name="depart"]:checked')?.focus()
}

function create() {
  if (!exemple.value && !periodOk.value) return
  const base: Timeline = exemple.value ? structuredClone(exemple.value.timeline) : { ...tl.blank(), periode: { debut: debut.value, fin: fin.value } }
  // Le style par défaut sort du fichier, comme dans le panneau.
  const t: Timeline = { ...base, titre: titre.value.trim() || 'Sans titre', style: style.value === 'tableau' ? undefined : style.value }
  const text = exemple.value ? EXEMPLE_OUVERT : undefined
  created = true
  track('nouvelle_timeline', { depart: depart.value, style: style.value })
  dialog.value!.close()
  if (route.path === '/editeur') tl.openNew(t, text)
  else {
    tl.createNew(t, text)
    navigateTo('/editeur')
  }
}
// Annuler, Échap ou la croix : rien n'est créé, le focus revient au bouton d'ouverture.
function closed() {
  isOpen.value = false
  if (!created) track('assistant_annule', { etape: step.value })
}
</script>

<template>
  <dialog ref="dialog" class="dialog w-[min(880px,calc(100vw-32px))] max-sm:p-4" aria-labelledby="create-title" @close="closed">
    <form v-if="isOpen" class="flex flex-col gap-5" @submit.prevent="next">
      <div>
        <h2 id="create-title" class="text-lg font-semibold">Nouvelle timeline</h2>
        <p class="mt-0.5 text-sm text-muted">Étape {{ step }} sur 2&nbsp;: {{ step === 1 ? 'point de départ' : 'réglages' }}</p>
      </div>

      <fieldset v-if="step === 1">
        <legend class="sr-only">Point de départ</legend>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label :class="CARD">
            <input v-model="depart" type="radio" name="depart" value="vide" class="sr-only">
            <span class="grid place-items-center rounded-lg border border-dashed border-line-strong text-muted" :style="{ aspectRatio: `${FRAME[0]} / ${FRAME[1]}` }">
              <Plus :size="22" :stroke-width="1.75" aria-hidden="true" />
            </span>
            <span class="mt-2 text-sm font-medium">Timeline vide</span>
            <span class="text-xs text-muted">Un projet, six mois à partir de ce mois-ci</span>
          </label>
          <label v-for="e in EXEMPLES" :key="e.slug" :class="CARD">
            <input v-model="depart" type="radio" name="depart" :value="e.slug" class="sr-only">
            <span class="overflow-hidden rounded-lg border border-line" :style="{ background: e.timeline.fond ?? '#ffffff', aspectRatio: `${FRAME[0]} / ${FRAME[1]}` }">
              <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
              <svg class="block size-full" :viewBox="`0 0 ${FRAME[0]} ${FRAME[1]}`" preserveAspectRatio="xMinYMin slice" aria-hidden="true" v-html="tl.thumb(e.timeline)" />
            </span>
            <span class="mt-2 text-sm font-medium">{{ e.timeline.titre }}</span>
            <span class="text-xs text-muted">{{ e.public }}</span>
          </label>
        </div>
      </fieldset>

      <div v-else class="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
        <div class="flex flex-col gap-4">
          <label class="field">Titre
            <input ref="titleInput" v-model="titre" name="titre">
          </label>
          <fieldset v-if="!exemple" class="field">
            <legend class="mb-1.5">Période</legend>
            <div class="grid grid-cols-2 gap-3">
              <label class="field">Du
                <input v-model="debut" type="date" name="debut" :max="fin" :aria-invalid="!periodOk">
              </label>
              <label class="field">Au
                <input v-model="fin" type="date" name="fin" :min="debut" :aria-invalid="!periodOk">
              </label>
            </div>
            <p v-if="!periodOk" class="hint mt-1.5 text-alert!" role="alert">La date de début doit précéder la date de fin.</p>
          </fieldset>
          <p v-else class="hint">La période de l'exemple contient toutes ses dates. Elle se règle ensuite dans le panneau Propriétés.</p>
        </div>
        <fieldset class="field">
          <legend class="mb-1.5">Style <span v-if="!exemple" class="hint">: aperçu sur un exemple</span></legend>
          <StylePicker v-model="style" :timeline="sample" :columns="3" />
        </fieldset>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button v-if="step === 2" class="btn btn-quiet -ml-2" type="button" @click="back"><ArrowLeft :size="16" /><span class="max-sm:sr-only">Précédent</span></button>
        <span class="flex-1" />
        <button class="btn" type="button" @click="dialog!.close()">Annuler</button>
        <button class="btn btn-primary" type="submit" :disabled="step === 2 && !exemple && !periodOk">{{ step === 1 ? 'Suivant' : 'Créer la timeline' }}</button>
      </div>
    </form>
  </dialog>
</template>
