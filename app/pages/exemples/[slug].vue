<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { EXEMPLES } from '~/utils/exemples'
import { STYLE_DEFS } from '~/utils/styles'
import { track } from '~/utils/track'

const route = useRoute()
const exemple = EXEMPLES.find(e => e.slug === route.params.slug)
if (!exemple) throw createError({ statusCode: 404, statusMessage: 'Exemple introuvable', fatal: true })
const e = exemple!
const autres = EXEMPLES.filter(x => x.slug !== e.slug)

useSeoMeta({ title: `${e.titre} | Timeline`, description: e.accroche })

// Espace insécable après « et devant : ; ! ? » : la ponctuation ne passe pas seule à la ligne.
const insecable = (s: string) => s.replace(/ (?=[:;!?»])|(?<=«) /g, ' ')

const tl = useTimeline()
const creator = ref<{ open: () => void }>()
function open() {
  tl.openExample(e.timeline)
  track('exemple_ouvert', { exemple: e.slug })
  navigateTo('/editeur')
}
</script>

<template>
  <div class="min-h-dvh bg-ground font-sans text-ink antialiased">
    <SiteHeader />

    <main>
      <div class="mx-auto max-w-6xl px-5 pt-6 sm:px-8">
        <nav aria-label="Fil d'Ariane" class="flex items-center gap-1 text-sm text-muted">
          <NuxtLink to="/#exemples" class="hover:text-ink hover:underline underline-offset-4">Exemples</NuxtLink>
          <ChevronRight :size="14" aria-hidden="true" />
          <span aria-current="page">{{ e.public }}</span>
        </nav>

        <h1 class="mt-6 max-w-3xl font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.08] font-bold tracking-[-0.02em] text-balance">{{ e.titre }}</h1>
        <p class="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{{ e.accroche }}</p>

        <TimelineView class="mt-10" :timeline="e.timeline" reveal />
        <div class="mt-4 flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
          <p class="text-sm text-muted">« {{ e.timeline.titre }} », style {{ STYLE_DEFS[e.timeline.style ?? 'tableau'].label }}. Exemple fictif.</p>
          <div class="flex flex-col items-start gap-2 sm:items-end">
            <button class="btn btn-primary h-11 px-5 text-[15px]" type="button" @click="open">Ouvrir cet exemple dans l'éditeur</button>
            <p class="text-sm text-muted">Il s'ouvre comme une copie : modifiez-le, exportez-le, partagez-le.</p>
          </div>
        </div>
      </div>

      <!-- Trois conseils propres à ce public, en colonnes séparées par un filet. -->
      <section class="mt-14 border-y border-line bg-paper">
        <div class="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">Comment s'en servir</h2>
          <div class="mt-8 grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
            <div v-for="c in e.conseils" :key="c.titre" class="md:px-8 md:first:pl-0 md:last:pr-0">
              <h3 class="font-semibold">{{ c.titre }}</h3>
              <p class="mt-2 leading-relaxed text-muted">{{ insecable(c.texte) }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto max-w-6xl px-5 pt-16 sm:px-8">
        <h2 class="font-display text-xl font-bold">Autres exemples</h2>
        <div class="mt-6 grid gap-x-8 gap-y-10 sm:grid-cols-3">
          <ExempleCard v-for="x in autres" :key="x.slug" :exemple="x" />
        </div>
      </section>

      <!-- La fin : partir de cet exemple, ou d'une timeline vide. -->
      <section class="mt-16 border-t border-line bg-paper">
        <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">Partez de cet exemple ou d'une page vide</h2>
          <div class="mt-6 flex flex-wrap gap-2">
            <button class="btn btn-primary h-11 px-5 text-[15px]" type="button" @click="open">Ouvrir cet exemple dans l'éditeur</button>
            <button class="btn h-11 px-5 text-[15px]" type="button" @click="creator!.open()">Créer une timeline</button>
          </div>
        </div>
      </section>
    </main>
    <CreateDialog ref="creator" />
  </div>
</template>
