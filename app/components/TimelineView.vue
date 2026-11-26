<script setup lang="ts">
import { layout } from '~/utils/layout'
import { svgInner } from '~/utils/svg'
import type { Timeline } from '~/utils/timeline'

/*
 * Une timeline en lecture seule, rendue par le même moteur que l'éditeur. La mesure
 * du texte passe par un canvas : le rendu se fait dans le navigateur, et le serveur
 * réserve la place avec une mesure approchée pour que la page ne saute pas.
 */
const props = defineProps<{ timeline: Timeline, reveal?: boolean }>()
const tl = useTimeline()
onMounted(() => tl.loadFonts())
const approx = layout(props.timeline, { measure: (s, w, size) => s.length * size * (w >= 600 ? 0.56 : 0.5) })
const l = computed(() => {
  void tl.fontsTick.value
  return layout(props.timeline, { measure: tl.measure, today: tl.today })
})
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-line shadow-(--shadow-float) max-sm:[mask-image:linear-gradient(to_right,#000_82%,transparent)]" :style="{ background: timeline.fond ?? '#ffffff' }">
    <ClientOnly>
      <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
      <svg
        class="block w-full min-w-[760px]"
        :class="{ reveal }"
        :viewBox="`0 0 ${l.width} ${l.height}`"
        role="img"
        :aria-label="`Timeline ${timeline.titre}`"
        v-html="svgInner(l)"
      />
      <template #fallback>
        <div class="w-full min-w-[760px]" :style="{ aspectRatio: `${approx.width} / ${approx.height}` }" />
      </template>
    </ClientOnly>
  </div>
</template>

<style>
/* Le seul mouvement des pages publiques : la timeline se déroule de gauche à droite, comme le temps. */
@media (prefers-reduced-motion: no-preference) {
  .reveal { animation: reveal 1.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
}
@keyframes reveal {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}
</style>
