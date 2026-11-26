<script setup lang="ts">
import { STYLE_DEFS, THUMB_FRAME as FRAME } from '~/utils/styles'
import { type Style, STYLES } from '~/utils/timeline'

/*
 * Le choix du style sur la timeline de la personne : chaque vignette rend ses
 * trois premiers projets dans un style, à la même échelle (même largeur, même
 * cadrage), pour comparer d'un coup d'œil. Monté seulement quand il est visible.
 */
const model = defineModel<Style>({ required: true })
defineProps<{ columns?: number }>()
const tl = useTimeline()

const thumbs = computed(() => STYLES.map(style => ({ style, html: tl.styleThumb(style) })))
</script>

<template>
  <div role="radiogroup" aria-label="Style" class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${columns ?? 2}, minmax(0, 1fr))` }">
    <label v-for="th in thumbs" :key="th.style" class="group cursor-pointer">
      <input v-model="model" type="radio" name="style" :value="th.style" class="peer sr-only">
      <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
      <svg
        class="block w-full rounded-lg border border-line bg-paper transition-shadow group-hover:border-line-strong peer-checked:border-accent peer-checked:ring-2 peer-checked:ring-accent/30 peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
        :viewBox="`0 0 ${FRAME[0]} ${FRAME[1]}`"
        preserveAspectRatio="xMinYMin slice"
        aria-hidden="true"
        v-html="th.html"
      />
      <span class="mt-1.5 block text-xs font-medium text-muted peer-checked:text-ink">{{ STYLE_DEFS[th.style].label }}</span>
    </label>
  </div>
</template>
