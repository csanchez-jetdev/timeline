<script setup lang="ts">
import { X } from '@lucide/vue'
import { normalizeTimeline } from '~/utils/timeline'

/* La timeline en JSON, modifiable ; une erreur nomme le champ fautif. */
const tl = useTimeline()
const dialog = ref<HTMLDialogElement>()
const text = ref('')
const error = ref('')

function open() {
  text.value = tl.brokenDraft.value ?? JSON.stringify(tl.doc.value, null, 2)
  error.value = ''
  dialog.value!.showModal()
}
function apply() {
  try {
    tl.replace(normalizeTimeline(JSON.parse(text.value)))
    tl.brokenDraft.value = null
    dialog.value!.close()
  }
  catch (err) {
    error.value = err instanceof SyntaxError ? `JSON invalide : ${err.message}` : err instanceof Error ? err.message : String(err)
  }
}
defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="dialog max-w-3xl" aria-labelledby="json-title">
    <form class="flex flex-col gap-3" @submit.prevent="apply">
      <div class="flex items-start gap-3">
        <div class="flex-1">
          <h2 id="json-title" class="text-lg font-semibold">La timeline en JSON</h2>
          <p class="mt-1 text-sm text-muted">Modifiez puis appliquez. Une erreur nomme le champ fautif ; Annuler (Ctrl+Z) revient à l'état d'avant.</p>
        </div>
        <button class="btn btn-icon size-8" type="button" aria-label="Fermer" @click="dialog!.close()"><X :size="18" /></button>
      </div>
      <textarea v-model="text" class="h-[55dvh] w-full rounded-lg border border-line bg-wash p-3 font-mono text-xs leading-relaxed text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/25" spellcheck="false" aria-label="JSON de la timeline" />
      <p v-if="error" role="alert" class="text-sm text-alert">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button class="btn" type="button" @click="dialog!.close()">Fermer</button>
        <button class="btn btn-primary" type="submit">Appliquer</button>
      </div>
    </form>
  </dialog>
</template>
