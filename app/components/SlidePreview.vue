<script setup lang="ts">
import { SLIDE_IN, SLIDE_SUBTITLE, SLIDE_TITLE, slideFrame } from '~/utils/export'
import { layout, slideReadability } from '~/utils/layout'
import { svgInner } from '~/utils/svg'

/*
 * La slide telle que l'export PowerPoint la pose : même mise en page à 1 600 px,
 * même zone sous le titre, mêmes tailles. Les positions sont en pourcentage de la
 * slide et les polices en cqw (largeur du conteneur) : tout suit sa taille.
 */
const tl = useTimeline()
const { doc } = tl
const l = computed(() => {
  void tl.fontsTick.value
  return layout({ ...doc.value, affichage: { ...doc.value.affichage, titre: false } }, { measure: tl.measure, today: tl.today })
})
const frame = computed(() => slideFrame(l.value))
const readability = computed(() => slideReadability(l.value))
const pct = (v: number, of: number) => `${(v / of) * 100}%`
// Une taille en points vers des cqw : 72 pt par pouce, la slide fait SLIDE_IN[0] pouces de large.
const cqw = (pt: number) => `${(pt / 72 / SLIDE_IN[0]) * 100}cqw`
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-4 overflow-auto p-6">
    <div
      class="relative aspect-video w-[min(100%,calc((100dvh-56px-120px)*16/9))] shrink-0 overflow-hidden rounded-md shadow-(--shadow-pop) [container-type:inline-size]"
      :style="{ background: l.background }"
      role="img"
      :aria-label="`Aperçu de la slide ${doc.titre}`"
    >
      <p
        class="absolute m-0 font-bold leading-tight"
        :style="{ left: pct(SLIDE_TITLE.x, SLIDE_IN[0]), top: pct(SLIDE_TITLE.y, SLIDE_IN[1]), width: pct(SLIDE_TITLE.w, SLIDE_IN[0]), fontFamily: 'Montserrat, Arial, sans-serif', fontSize: cqw(SLIDE_TITLE.size), color: l.palette.teal }"
      >
        {{ doc.titre }}
      </p>
      <p
        v-if="doc.sousTitre"
        class="absolute m-0 leading-tight"
        :style="{ left: pct(SLIDE_SUBTITLE.x, SLIDE_IN[0]), top: pct(SLIDE_SUBTITLE.y, SLIDE_IN[1]), width: pct(SLIDE_SUBTITLE.w, SLIDE_IN[0]), fontFamily: 'Carlito, Calibri, Arial, sans-serif', fontSize: cqw(SLIDE_SUBTITLE.size), color: l.palette.muted }"
      >
        {{ doc.sousTitre }}
      </p>
      <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
      <svg
        class="absolute"
        :style="{ left: pct(frame.x, SLIDE_IN[0]), top: pct(frame.y, SLIDE_IN[1]), width: pct(frame.w, SLIDE_IN[0]) }"
        :viewBox="`0 0 ${l.width} ${l.height}`"
        aria-hidden="true"
        v-html="svgInner(l)"
      />
    </div>
    <p class="text-center text-sm text-muted">
      La slide PowerPoint et Google Slides, libellés à {{ readability.pt.toFixed(1).replace('.', ',') }} pt.
      <span v-if="readability.warning" class="text-alert">Sous 7,5 pt, ils deviennent difficiles à lire.</span>
      L'image PNG reprend la timeline seule.
    </p>
  </div>
</template>
