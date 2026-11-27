<script setup lang="ts">
import { Download, Image as ImageIcon, Presentation, X } from '@lucide/vue'
import { exportPng, exportPptx, fileName } from '~/utils/export'
import { layout, slideReadability } from '~/utils/layout'
import { svgInner } from '~/utils/svg'
import { shape, track, trackError } from '~/utils/track'
import type { Style } from '~/utils/timeline'

/* Format, style, aperçu exact de ce qui sera téléchargé. Rien ne se calcule tant que la boîte est fermée. */
const tl = useTimeline()
const { doc } = tl
const dialog = ref<HTMLDialogElement>()
const isOpen = ref(false)
const format = ref<'png' | 'pptx' | 'gslides'>('png')
const style = ref<Style>('tableau')
const busy = ref(false)
const error = ref('')

const FORMATS = [
  { value: 'png', label: 'Image PNG', hint: 'Pour un document ou un message', icon: ImageIcon },
  { value: 'pptx', label: 'PowerPoint', hint: 'Une slide aux formes modifiables', icon: Presentation },
  { value: 'gslides', label: 'Google Slides', hint: 'Le même fichier, à importer', icon: Presentation },
] as const

const preview = computed(() => {
  if (!isOpen.value) return null
  void tl.fontsTick.value
  // Le PowerPoint porte le titre sur sa slide : pas de titre dans l'image.
  const t = format.value === 'png' ? doc.value : { ...doc.value, affichage: { ...doc.value.affichage, titre: false } }
  return layout(t, { measure: tl.measure, style: style.value, today: tl.today })
})
const readability = computed(() => preview.value && slideReadability(preview.value))

function open() {
  style.value = doc.value.style ?? 'tableau'
  error.value = ''
  isOpen.value = true
  dialog.value!.showModal()
  track('export_ouvert', shape(doc.value))
}
async function run() {
  if (!preview.value) return
  busy.value = true
  error.value = ''
  const name = `${fileName(doc.value.titre)}-${style.value}`
  const props = { ...shape(doc.value), format: format.value, style: style.value, style_timeline: doc.value.style ?? 'tableau', pt: Math.round(readability.value!.pt * 10) / 10 }
  try {
    if (format.value === 'png') await exportPng(preview.value, name)
    else await exportPptx(preview.value, doc.value, name)
    track('export_telecharge', props)
    dialog.value!.close()
  }
  catch (err) {
    track('export_erreur', { ...props, erreur: err instanceof Error ? err.name : 'inconnue' })
    trackError(err, { format: format.value })
    error.value = `Export impossible : ${err instanceof Error ? err.message : String(err)}`
  }
  finally {
    busy.value = false
  }
}
defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="export-title" @close="isOpen = false">
    <form class="grid gap-6 lg:grid-cols-[300px_1fr]" @submit.prevent="run">
      <div class="flex flex-col gap-5">
        <h2 id="export-title" class="text-lg font-semibold">Exporter</h2>
        <fieldset class="flex flex-col gap-2">
          <legend class="panel-title mb-2">Format</legend>
          <label v-for="f in FORMATS" :key="f.value" class="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 hover:border-line-strong has-checked:border-accent has-checked:ring-2 has-checked:ring-accent/25 has-focus-visible:ring-2 has-focus-visible:ring-accent">
            <input v-model="format" type="radio" name="format" :value="f.value" class="sr-only">
            <component :is="f.icon" :size="20" :stroke-width="1.75" class="shrink-0 text-muted" aria-hidden="true" />
            <span class="flex flex-col">
              <span class="text-sm font-medium">{{ f.label }}</span>
              <span class="text-xs text-muted">{{ f.hint }}</span>
            </span>
          </label>
        </fieldset>
        <fieldset>
          <legend class="panel-title mb-2">Style</legend>
          <StylePicker v-if="isOpen" v-model="style" :columns="3" />
        </fieldset>
      </div>

      <div class="flex min-w-0 flex-col gap-4">
        <div class="flex justify-end">
          <button class="btn btn-icon size-8" type="button" aria-label="Fermer" @click="dialog!.close()"><X :size="18" /></button>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
        <svg v-if="preview" class="w-full rounded-lg border border-line" :viewBox="`0 0 ${preview.width} ${preview.height}`" role="img" aria-label="Aperçu de l'export" v-html="svgInner(preview)" />
        <p v-if="readability" class="text-sm" :class="readability.warning ? 'text-alert' : 'text-muted'">
          Sur une slide 16:9, libellés à {{ readability.pt.toFixed(1).replace('.', ',') }} pt.
          <template v-if="readability.warning">Sous 7,5 pt, ils deviennent difficiles à lire : raccourcissez des titres ou retirez des jalons.</template>
        </p>
        <p v-if="format === 'gslides'" class="text-sm text-muted">
          Téléchargez le fichier PowerPoint, puis dans Google Slides : <b class="font-medium text-ink">Fichier, Importer des diapositives</b>. Ou déposez-le dans Drive et ouvrez-le avec Slides.
        </p>
        <p v-if="error" role="alert" class="text-sm text-alert">{{ error }}</p>
        <div class="mt-auto flex justify-end gap-2">
          <button class="btn" type="button" @click="dialog!.close()">Annuler</button>
          <button class="btn btn-primary" type="submit" :disabled="busy">
            <Download :size="16" />
            {{ busy ? 'Export…' : format === 'png' ? 'Télécharger le PNG' : 'Télécharger le PowerPoint' }}
          </button>
        </div>
      </div>
    </form>
  </dialog>
</template>
