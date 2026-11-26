<script setup lang="ts">
import { ArrowRight } from '@lucide/vue'
import type { Exemple } from '~/utils/exemples'

/*
 * Un exemple en aperçu : le haut de sa frise dans son cadre, puis le texte posé sur
 * le fond. Le titre est le lien ; son ::after couvre la carte pour qu'un clic n'importe
 * où l'ouvre, sans que le lecteur d'écran lise tout le bloc comme nom du lien.
 */
const props = defineProps<{ exemple: Exemple }>()
const tl = useTimeline()
onMounted(() => tl.loadFonts())
const html = computed(() => tl.thumb(props.exemple.timeline))
// Le haut à gauche de la frise : ses trois premiers projets font environ 300 de haut,
// et 768 de large laisse le texte lisible dans une colonne de 520 px.
const FRAME = [768, 320] as const
const ratio = `${FRAME[0]} / ${FRAME[1]}`
</script>

<template>
  <article class="group relative">
    <div class="overflow-hidden rounded-xl border border-line shadow-(--shadow-float) transition-colors group-hover:border-line-strong" :style="{ background: exemple.timeline.fond ?? '#ffffff' }">
      <ClientOnly>
        <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
        <svg class="block w-full" :style="{ aspectRatio: ratio }" :viewBox="`0 0 ${FRAME[0]} ${FRAME[1]}`" preserveAspectRatio="xMinYMin slice" aria-hidden="true" v-html="html" />
        <template #fallback>
          <div :style="{ aspectRatio: ratio }" />
        </template>
      </ClientOnly>
    </div>
    <p class="mt-4 text-sm text-muted">{{ exemple.public }}</p>
    <h3 class="mt-1 text-lg leading-snug font-semibold text-balance">
      <NuxtLink :to="`/exemples/${exemple.slug}`" class="after:absolute after:-inset-2 after:rounded-2xl group-hover:text-accent focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent">
        {{ exemple.titre }}
        <ArrowRight :size="18" class="inline-block align-[-3px] text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
      </NuxtLink>
    </h3>
    <p class="mt-1.5 leading-relaxed text-muted">{{ exemple.accroche }}</p>
  </article>
</template>
