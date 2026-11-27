<script setup lang="ts">
import { NOUVEAUTES } from '~/utils/nouveautes'

useSeoMeta({
  title: 'Nouveautés | Timeline',
  description: 'Ce qui change dans Timeline, d\'une version à l\'autre.',
})

// Prérendue : la date s'écrit au build, en UTC pour ne pas glisser d'un jour selon le fuseau.
const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'UTC' })
const RUBRIQUES = [
  { key: 'nouveau', titre: 'Nouveau' },
  { key: 'ameliore', titre: 'Amélioré' },
  { key: 'corrige', titre: 'Corrigé' },
] as const
const REPO = 'https://github.com/csanchez-jetdev/timeline'
// Espace insécable devant « : ; ! ? » : la ponctuation ne passe pas seule à la ligne.
const insecable = (s: string) => s.replace(/ (?=[:;!?»])|(?<=«) /g, ' ')
</script>

<template>
  <div class="min-h-dvh bg-ground font-sans text-ink antialiased">
    <SiteHeader />

    <main class="mx-auto max-w-6xl px-5 pt-6 pb-16 sm:px-8">
      <h1 class="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.08] font-bold tracking-[-0.02em]">Nouveautés</h1>
      <p class="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
        Ce qui change d'une version à l'autre. Chaque version est aussi publiée sur
        <a :href="`${REPO}/releases`" class="text-ink underline underline-offset-4 hover:text-accent">GitHub</a>,
        avec un <a :href="`${REPO}/releases.atom`" class="text-ink underline underline-offset-4 hover:text-accent">flux Atom</a>
        pour la suivre.
      </p>

      <article v-for="v in NOUVEAUTES" :key="v.version" class="mt-12 grid gap-x-10 gap-y-4 border-t border-line pt-8 md:grid-cols-[14rem_1fr]">
        <header>
          <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">Version {{ v.version }}</h2>
          <p class="mt-1 text-sm text-muted"><time :datetime="v.date">{{ date.format(new Date(`${v.date}T00:00:00Z`)) }}</time></p>
        </header>
        <div class="flex max-w-2xl flex-col gap-6">
          <section v-for="r in RUBRIQUES.filter(r => v[r.key]?.length)" :key="r.key">
            <h3 class="font-semibold">{{ r.titre }}</h3>
            <ul class="mt-2 flex list-disc flex-col gap-2 pl-5 leading-relaxed text-muted marker:text-line-strong">
              <li v-for="item in v[r.key]" :key="item">{{ insecable(item) }}</li>
            </ul>
          </section>
        </div>
      </article>
    </main>
  </div>
</template>
