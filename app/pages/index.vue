<script setup lang="ts">
import { ArrowRight, Check, Download, ExternalLink, Link2 } from '@lucide/vue'
import { EXEMPLES } from '~/utils/exemples'
import { exportPptx, fileName } from '~/utils/export'
import { layout } from '~/utils/layout'
import { encodeTimeline, HASH_PREFIX } from '~/utils/share'
import type { Entry } from '~/utils/store'
import { STYLE_DEFS } from '~/utils/styles'
import { type Style, STYLES } from '~/utils/timeline'
import { track, trackError } from '~/utils/track'

useSeoMeta({
  title: 'Timeline : le planning du projet, sur une slide',
  description: 'Des projets en lignes, des phases en flèches, des jalons datés. Modifiez sur le dessin, exportez en PowerPoint, Google Slides ou PNG, partagez par un lien. Sans compte.',
})

const tl = useTimeline()
const { rybbitSiteId } = useRuntimeConfig().public
// L'usage choisi pilote la timeline du haut, les six styles et la slide.
const slug = ref(EXEMPLES[0]!.slug)
const current = computed(() => EXEMPLES.find(e => e.slug === slug.value)!)
watch(slug, s => track('usage_choisi', { exemple: s }))

// Les timelines de ce navigateur ne se lisent qu'après le rendu : la page est prérendue.
const recent = ref<Entry[]>([])
onMounted(() => { recent.value = tl.recent().slice(0, 3) })

const creator = ref<{ open: () => void }>()

// Le vrai lien de partage de l'exemple choisi : calculé dans le navigateur, comme dans l'éditeur.
const link = ref('')
async function makeLink() {
  const s = slug.value
  const url = `${location.origin}/editeur${HASH_PREFIX}${await encodeTimeline(current.value.timeline)}`
  if (s === slug.value) link.value = url
}
onMounted(makeLink)
watch(slug, makeLink)
const copied = ref(false)
async function copyLink() {
  const props = { depuis: 'accueil', exemple: slug.value, caracteres: link.value.length }
  try {
    await navigator.clipboard.writeText(link.value)
    track('lien_copie', { resultat: 'presse_papiers', ...props })
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  }
  catch {
    track('lien_copie', { resultat: 'invite', ...props })
    window.prompt('Copiez le lien de la timeline', link.value)
  }
}

function open() {
  tl.openExample(current.value.timeline)
  track('exemple_ouvert', { exemple: slug.value, depuis: 'accueil' })
  navigateTo('/editeur')
}

const GESTES = [
  { geste: 'Double-cliquez sur la ligne d\'un projet', effet: 'Un jalon apparaît à cette date. Donnez-lui un titre, un type, un détail.', image: '/accueil/geste-jalon.webp', alt: 'Un jalon « Réunion des relais » posé le 22 octobre sur la ligne Accompagnement, sélectionné.' },
  { geste: 'Glissez sur une ligne vide', effet: 'Vous dessinez une phase. Tirez ses bords pour changer ses dates.', image: '/accueil/geste-phase.webp', alt: 'Une phase tirée à la souris du 7 novembre au 9 décembre, ses dates affichées pendant le geste.' },
  { geste: 'Exportez', effet: 'PowerPoint aux formes modifiables, Google Slides par import, ou image PNG. Les libellés se placent d\'eux-mêmes, sans se chevaucher.', image: '/accueil/geste-export.webp', alt: 'La fenêtre d\'export, PowerPoint choisi : une slide aux formes modifiables.' },
]

// L'exemple choisi, redessiné dans le style choisi. Contraste d'abord : le plus éloigné des exemples en couleurs.
const style = ref<Style>('contraste')
const styled = computed(() => ({ ...current.value.timeline, style: style.value }))
watch(style, s => track('style_essaye', { style: s }))

const downloading = ref(false)
async function download() {
  const t = current.value.timeline
  downloading.value = true
  try {
    await tl.loadFonts()
    // Le PowerPoint porte le titre sur sa slide : pas de titre dans l'image.
    const l = layout({ ...t, affichage: { ...t.affichage, titre: false } }, { measure: tl.measure, today: tl.today })
    await exportPptx(l, t, fileName(t.titre))
    track('export_telecharge', { format: 'pptx', depuis: 'accueil', exemple: slug.value })
  }
  catch (err) {
    trackError(err, { format: 'pptx', depuis: 'accueil' })
  }
  finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-ground font-sans text-ink antialiased">
    <SiteHeader />

    <main>
      <!-- Première vue : ce que fait l'outil, puis le vrai rendu de l'usage choisi. -->
      <section class="mx-auto max-w-6xl px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
        <div class="grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
          <h1 class="font-display text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-bold tracking-[-0.02em] text-balance">
            Le planning du projet, sur une slide.
          </h1>
          <div>
            <p class="text-lg leading-relaxed text-muted">
              Des projets en lignes, des phases en flèches, des jalons datés. Vous modifiez directement sur le dessin, puis vous exportez en PowerPoint, Google Slides ou image, ou vous envoyez un lien.
            </p>
            <p class="mt-3 text-sm text-muted">Sans compte ni installation. Vos timelines restent dans votre navigateur.</p>
          </div>
        </div>

        <div v-if="recent.length" class="mt-6 flex flex-wrap items-center gap-2" role="group" aria-labelledby="reprendre">
          <span id="reprendre" class="mr-1 text-sm text-muted">Reprendre</span>
          <NuxtLink v-for="e in recent" :key="e.id" :to="`/editeur?id=${e.id}`" class="btn max-w-64" @click="track('timeline_reprise')">
            <span class="truncate">{{ e.titre }}</span>
          </NuxtLink>
          <NuxtLink to="/timelines" class="btn btn-quiet text-muted hover:text-ink">
            Toutes vos timelines <ArrowRight :size="15" aria-hidden="true" />
          </NuxtLink>
        </div>

        <!-- Sur mobile, la timeline suit les pastilles pour rester dans la première vue ; en bureau, la ligne d'action passe avant elle. -->
        <div class="flex flex-col">
          <div id="exemples" class="mt-10 flex scroll-mt-6 items-center gap-3 max-sm:flex-col max-sm:items-start">
            <span id="usage" class="shrink-0 text-sm text-muted">Un exemple pour</span>
            <div class="flex flex-wrap gap-0.5 rounded-xl bg-line/80 p-1" role="radiogroup" aria-labelledby="usage">
              <label
                v-for="e in EXEMPLES"
                :key="e.slug"
                class="relative flex h-9 shrink-0 cursor-pointer items-center rounded-lg px-3.5 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-ink has-checked:bg-paper has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent"
              >
                <input v-model="slug" type="radio" name="usage" :value="e.slug" class="sr-only">
                {{ e.usage }}
              </label>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-5 order-2 sm:order-1">
            <div class="max-w-2xl">
              <p class="leading-relaxed sm:min-h-[3.25rem]"><span class="font-semibold">{{ current.public }}.</span> {{ current.accroche }}</p>
              <NuxtLink :to="`/exemples/${current.slug}`" class="mt-1 inline-flex items-center gap-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
                Voir l'exemple et ses conseils <ArrowRight :size="14" aria-hidden="true" />
              </NuxtLink>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-primary h-11 px-5 text-[15px]" type="button" @click="open">Partir de cet exemple</button>
              <button class="btn h-11 px-5 text-[15px]" type="button" @click="creator!.open()">Créer une timeline</button>
            </div>
          </div>

          <TimelineView :key="current.slug" class="order-1 mt-5 sm:order-2 sm:mt-8" :timeline="current.timeline" reveal />
        </div>
      </section>

      <!-- Comment on s'en sert : trois gestes, chacun montré dans l'éditeur. -->
      <section class="border-y border-line bg-paper">
        <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">Trois gestes suffisent</h2>
          <ol class="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
            <li v-for="g in GESTES" :key="g.geste">
              <img :src="g.image" :alt="g.alt" width="720" height="540" loading="lazy" decoding="async" class="block w-full rounded-lg border border-line">
              <p class="mt-5 font-semibold">{{ g.geste }}</p>
              <p class="mt-2 leading-relaxed text-muted">{{ g.effet }}</p>
            </li>
          </ol>
        </div>
      </section>

      <!-- Le même planning dans les six styles : un clic, et le moteur le redessine. -->
      <section class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">Six styles pour le même planning</h2>
        <p class="mt-3 max-w-2xl leading-relaxed text-muted">
          Choisissez un style : « {{ current.timeline.titre }} » est redessiné, avec les mêmes dates et les mêmes noms. Dans l'éditeur, le changement se fait aussi en un clic.
        </p>
        <div class="mt-8 flex w-fit max-w-full flex-wrap gap-0.5 rounded-xl bg-line/80 p-1" role="radiogroup" aria-label="Style">
          <label
            v-for="s in STYLES"
            :key="s"
            class="relative flex h-9 shrink-0 cursor-pointer items-center rounded-lg px-3.5 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-ink has-checked:bg-paper has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent"
          >
            <input v-model="style" type="radio" name="style" :value="s" class="sr-only">
            {{ STYLE_DEFS[s].label }}
          </label>
        </div>
        <TimelineView :key="`${current.slug}-${style}`" class="mt-6" :timeline="styled" reveal />
      </section>

      <!-- La slide exacte, en grand, et le vrai fichier à télécharger. -->
      <section class="border-y border-line bg-paper">
        <div class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div class="grid gap-x-12 gap-y-6 lg:grid-cols-2">
            <div>
              <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">La slide, telle qu'elle sera projetée</h2>
              <p class="mt-3 leading-relaxed text-muted">L'éditeur et l'export calculent la même mise en page : ce que vous voyez à l'écran arrive tel quel dans votre présentation.</p>
            </div>
            <div>
              <ul class="flex flex-col gap-2 leading-relaxed">
                <li><span class="font-semibold">PowerPoint :</span> <span class="text-muted">des formes et des textes que vous corrigez dans la slide.</span></li>
                <li><span class="font-semibold">Google Slides :</span> <span class="text-muted">le même fichier, à importer.</span></li>
                <li><span class="font-semibold">Image PNG :</span> <span class="text-muted">pour un document ou un message.</span></li>
              </ul>
              <button class="btn mt-5 h-11 px-5 text-[15px]" type="button" :disabled="downloading" @click="download">
                <Download :size="16" aria-hidden="true" />
                Télécharger cette slide en PowerPoint
              </button>
            </div>
          </div>
          <!-- Comme le mode Aperçu de l'éditeur : la slide sur le fond tiède. -->
          <ClientOnly>
            <SlidePreview :timeline="current.timeline" class="mx-auto mt-10 rounded-xl bg-ground sm:p-10 lg:max-w-4xl" />
            <template #fallback>
              <div class="mx-auto mt-10 aspect-video rounded-xl bg-ground lg:max-w-4xl" />
            </template>
          </ClientOnly>
        </div>
      </section>

      <!-- Le partage par lien, démontré sur l'exemple choisi, et ce qui reste dans le navigateur. -->
      <section class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <h2 class="font-display text-2xl font-bold tracking-[-0.01em]">Partagez par un lien, sans compte ni serveur</h2>
        <div class="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <p class="max-w-2xl leading-relaxed text-muted">Le lien contient toute la timeline, compressée dans la partie de l'adresse que le navigateur n'envoie jamais au serveur. La personne qui l'ouvre reçoit sa propre copie dans l'éditeur, sans créer de compte.</p>
            <div class="mt-6 rounded-xl border border-line bg-paper p-5">
              <label for="lien" class="text-sm font-medium text-muted">Le lien de « {{ current.timeline.titre }} »</label>
              <input id="lien" :value="link" readonly class="mt-2 w-full truncate rounded-lg border border-line bg-wash px-3 py-2 font-mono text-[13px] text-ink focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent/25" @focus="($event.target as HTMLInputElement).select()">
              <p class="mt-2 text-sm text-muted" aria-live="polite">
                <template v-if="copied">Lien copié. Collez-le dans un message ou un document.</template>
                <template v-else-if="link">Ce lien de {{ link.length }} caractères contient toute la timeline.</template>
              </p>
              <div class="mt-4 flex flex-wrap gap-2">
                <button class="btn h-10 px-4 text-sm" type="button" :disabled="!link" @click="copyLink">
                  <component :is="copied ? Check : Link2" :size="16" aria-hidden="true" />
                  {{ copied ? 'Lien copié' : 'Copier le lien' }}
                </button>
                <a :href="link || undefined" target="_blank" rel="noopener" class="btn btn-quiet h-10 px-4 text-sm" @click="track('lien_essaye', { exemple: slug })">
                  Ouvrir comme le destinataire <ExternalLink :size="15" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-3 leading-relaxed text-muted">
            <h3 class="font-semibold text-ink">Vos timelines ne passent par aucun serveur</h3>
            <p>L'outil fonctionne entièrement dans votre navigateur. Vos timelines y restent enregistrées d'une visite à l'autre, sur cet appareil. Pour en garder une copie ailleurs, téléchargez son fichier JSON.</p>
            <p>Toute personne qui reçoit un lien peut lire la timeline : ne l'envoyez qu'aux personnes concernées.</p>
            <p v-if="rybbitSiteId">Une mesure d'audience compte les visites et quelques actions (exemple choisi, style essayé, export, lien copié), jamais le contenu d'une timeline.</p>
          </div>
        </div>
      </section>

      <!-- La fin : une action, et les six exemples en liens. -->
      <section class="border-t border-line bg-paper">
        <div class="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div class="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div class="max-w-2xl">
              <h2 class="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.1] font-bold tracking-[-0.02em] text-balance">Partez d'une page vide ou d'un exemple</h2>
              <p class="mt-4 text-lg leading-relaxed text-muted">La timeline s'ouvre dans l'éditeur, sans compte. Vous l'exportez quand elle est prête.</p>
            </div>
            <button class="btn btn-primary h-11 px-5 text-[15px]" type="button" @click="creator!.open()">Créer une timeline</button>
          </div>
          <nav class="mt-12 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-t border-line pt-6 text-sm" aria-labelledby="exemples-liens">
            <span id="exemples-liens" class="text-muted">Les exemples en détail :</span>
            <NuxtLink v-for="e in EXEMPLES" :key="e.slug" :to="`/exemples/${e.slug}`" class="underline-offset-4 hover:text-accent hover:underline">{{ e.usage }}</NuxtLink>
          </nav>
        </div>
      </section>
    </main>

    <footer class="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-8 text-sm text-muted sm:px-8">
      <span class="flex items-center gap-2"><BrandMark class="size-5" /> Timeline</span>
      <span>Exports PNG, PowerPoint et Google Slides, partage par lien. Aucun compte.</span>
      <a href="https://github.com/csanchez-jetdev/timeline" target="_blank" rel="noopener" class="ml-auto underline-offset-4 hover:text-ink hover:underline">Code source sur GitHub</a>
      <NuxtLink to="/nouveautes" class="underline-offset-4 hover:text-ink hover:underline">Nouveautés</NuxtLink>
      <NuxtLink to="/editeur" class="underline-offset-4 hover:text-ink hover:underline">Ouvrir l'éditeur</NuxtLink>
    </footer>
    <CreateDialog ref="creator" />
  </div>
</template>
