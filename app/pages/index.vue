<script setup lang="ts">
import { EXEMPLES } from '~/utils/exemples'
import { track } from '~/utils/track'

useSeoMeta({
  title: 'Timeline : le planning du projet, sur une slide',
  description: 'Des projets en lignes, des phases en flèches, des jalons datés. Modifiez sur le dessin, exportez en PowerPoint, Google Slides ou PNG. Sans compte.',
})

const tl = useTimeline()
const roadmap = EXEMPLES.find(e => e.slug === 'roadmap-produit')!
const draft = ref<string | null>(null)
onMounted(() => { draft.value = tl.draftTitle() })

function create() {
  tl.createNew()
  navigateTo('/editeur')
}

const GESTES = [
  { geste: 'Double-cliquez sur la ligne d\'un projet', effet: 'Un jalon apparaît à cette date. Donnez-lui un titre, un type, un détail.' },
  { geste: 'Glissez sur une ligne vide', effet: 'Vous dessinez une phase. Tirez ses bords pour changer ses dates.' },
  { geste: 'Exportez', effet: 'PowerPoint aux formes modifiables, Google Slides par import, ou image PNG. Les libellés se placent d\'eux-mêmes, sans se chevaucher.' },
]
</script>

<template>
  <div class="min-h-dvh bg-ground font-sans text-ink antialiased">
    <SiteHeader />

    <main>
      <!-- Première vue : ce que fait l'outil, et un vrai rendu. -->
      <section class="mx-auto max-w-6xl px-5 pt-10 pb-16 sm:px-8 sm:pt-16">
        <h1 class="max-w-3xl font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-bold tracking-[-0.02em] text-balance">
          Le planning du projet, sur une slide.
        </h1>
        <p class="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
          Des projets en lignes, des phases en flèches, des jalons datés. Vous modifiez directement sur le dessin, puis vous exportez en PowerPoint, Google Slides ou image.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-3">
          <button class="btn btn-primary h-11 px-5 text-[15px]" type="button" @click="create">Créer une timeline</button>
          <NuxtLink v-if="draft" to="/editeur" class="btn h-11 max-w-full px-5 text-[15px]" @click="track('brouillon_repris')">
            <span class="truncate">Reprendre « {{ draft }} »</span>
          </NuxtLink>
        </div>
        <p class="mt-4 text-sm text-muted">Sans compte ni installation. La timeline reste dans votre navigateur.</p>

        <TimelineView class="mt-12" :timeline="roadmap.timeline" reveal />
      </section>

      <!-- Comment on s'en sert : trois gestes, en colonnes séparées par un filet. -->
      <section class="border-y border-line bg-paper">
        <div class="mx-auto max-w-6xl px-5 py-14 sm:px-8">
          <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">Trois gestes suffisent</h2>
          <ol class="mt-8 grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
            <li v-for="g in GESTES" :key="g.geste" class="md:px-8 md:first:pl-0 md:last:pr-0">
              <p class="font-semibold">{{ g.geste }}</p>
              <p class="mt-2 leading-relaxed text-muted">{{ g.effet }}</p>
            </li>
          </ol>
        </div>
      </section>

      <!-- Les exemples : un par public, chacun sur sa page. -->
      <section id="exemples" class="mx-auto max-w-6xl scroll-mt-6 px-5 py-16 sm:px-8">
        <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">Un exemple pour chaque usage</h2>
        <div class="mt-8 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          <ExempleCard v-for="e in EXEMPLES" :key="e.slug" :exemple="e" />
        </div>
      </section>

      <!-- Confidentialité, en clair. -->
      <section class="border-t border-line bg-paper">
        <div class="mx-auto grid max-w-6xl gap-6 px-5 py-14 sm:px-8 md:grid-cols-[1fr_2fr]">
          <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">Rien ne passe par un serveur</h2>
          <div class="flex max-w-2xl flex-col gap-3 leading-relaxed text-muted">
            <p>L'outil fonctionne entièrement dans votre navigateur. Votre travail en cours y reste enregistré d'une visite à l'autre.</p>
            <p>Pour garder une timeline, enregistrez-la en fichier JSON. Pour la transmettre, copiez son lien : il contient toute la timeline, compressée dans la partie de l'adresse que le navigateur n'envoie jamais au serveur. Toute personne qui reçoit le lien peut donc la lire.</p>
          </div>
        </div>
      </section>
    </main>

    <footer class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm text-muted sm:px-8">
      <span class="flex items-center gap-2"><BrandMark class="size-5" /> Timeline</span>
      <span>Exports PNG, PowerPoint et Google Slides. Aucun compte.</span>
      <a href="https://github.com/csanchez-jetdev/timeline" target="_blank" rel="noopener" class="ml-auto underline-offset-4 hover:text-ink hover:underline">Code source sur GitHub</a>
      <NuxtLink to="/editeur" class="underline-offset-4 hover:text-ink hover:underline">Ouvrir l'éditeur</NuxtLink>
    </footer>
  </div>
</template>
