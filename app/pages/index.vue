<script setup lang="ts">
import { ArrowRight, Check, ChevronRight, CircleHelp, Download, ExternalLink, Eye, FolderOpen, Link2, Pause, PenLine, Play, Redo2, SlidersHorizontal, Undo2 } from '@lucide/vue'
import { EXEMPLES } from '~/utils/exemples'
import { exportPptx, fileName } from '~/utils/export'
import { layout } from '~/utils/layout'
import { encodeTimeline, HASH_PREFIX } from '~/utils/share'
import type { Entry } from '~/utils/store'
import { STYLE_DEFS, THUMB_FRAME } from '~/utils/styles'
import { bounds, type Style, STYLES } from '~/utils/timeline'
import { track, trackError } from '~/utils/track'

useSeoMeta({
  title: 'Timeline : le planning du projet, sur une slide',
  description: 'Des projets en lignes, des phases en flèches, des jalons datés. Modifiez sur le dessin, exportez en PowerPoint, Google Slides ou PNG, partagez par un lien. Sans compte.',
})

const tl = useTimeline()
const { rybbitSiteId } = useRuntimeConfig().public
const reduced = ref(false)
onMounted(() => { reduced.value = matchMedia('(prefers-reduced-motion: reduce)').matches })

/*
 * Un changement d'usage ou de style passe par une transition de vue : la timeline
 * glisse vers sa nouvelle forme au lieu de se redessiner d'un coup. Sans l'API, ou
 * si le système demande moins de mouvement, le changement est immédiat.
 */
function smoothly(change: () => void) {
  if (reduced.value || !document.startViewTransition) return change()
  document.startViewTransition(async () => { change(); await nextTick() })
}

// L'usage choisi pilote le cadre du haut, les six styles, la slide et le lien.
const slug = ref(EXEMPLES[0]!.slug)
const current = computed(() => EXEMPLES.find(e => e.slug === slug.value)!)
function choose(s: string) {
  smoothly(() => { slug.value = s })
  track('usage_choisi', { exemple: s })
}

// Les timelines de ce navigateur ne se lisent qu'après le rendu : la page est prérendue.
const recent = ref<Entry[]>([])
onMounted(() => { recent.value = tl.recent().slice(0, 3) })

const creator = ref<{ open: () => void }>()

function open() {
  tl.openExample(current.value.timeline)
  track('exemple_ouvert', { exemple: slug.value, depuis: 'accueil' })
  navigateTo('/editeur')
}

// Le panneau du cadre d'éditeur : quelques réglages de l'exemple, en lecture seule.
const dmy = (d: string) => d.split('-').reverse().join('/')
const periode = computed(() => current.value.timeline.periode ?? bounds(current.value.timeline))
const thumb = computed(() => tl.thumb(current.value.timeline))

/*
 * Les trois gestes, filmés dans l'éditeur. La vidéo joue quand elle est visible et
 * passe au geste suivant à la fin. Avec moins de mouvement demandé : l'image fixe,
 * et les commandes de lecture pour qui veut la lancer.
 */
const GESTES = [
  { geste: 'Double-cliquez sur la ligne d\'un projet', effet: 'Un jalon apparaît à cette date. Donnez-lui un titre, un type, un détail.', video: '/accueil/geste-jalon.mp4', poster: '/accueil/geste-jalon.webp', alt: 'Un double-clic sur la ligne Accompagnement pose un jalon le 22 octobre, puis son titre « Réunion des relais » s\'écrit.' },
  { geste: 'Glissez sur une ligne vide', effet: 'Vous dessinez une phase. Tirez ses bords pour changer ses dates.', video: '/accueil/geste-phase.mp4', poster: '/accueil/geste-phase.webp', alt: 'Un glisser sur la ligne Accompagnement dessine une phase de novembre à décembre, puis son bord droit est tiré d\'une semaine.' },
  { geste: 'Exportez', effet: 'PowerPoint aux formes modifiables, Google Slides par import, ou image PNG. Les libellés se placent d\'eux-mêmes, sans se chevaucher.', video: '/accueil/geste-export.mp4', poster: '/accueil/geste-export.webp', alt: 'Le menu Exporter, puis la fenêtre d\'export : PowerPoint, le style Chevrons, et le téléchargement.' },
]
const geste = ref(0)
const video = ref<HTMLVideoElement>()
const progress = ref(0)
const paused = ref(false)
let visible = false
function play() {
  const v = video.value
  if (v && visible && !paused.value && !reduced.value) v.play().catch(() => {})
}
function pick(i: number) {
  geste.value = i
  progress.value = 0
  paused.value = false
  nextTick(play)
}
function toggle() {
  paused.value = !paused.value
  if (paused.value) video.value?.pause()
  else play()
}
onMounted(() => {
  if (!video.value) return
  new IntersectionObserver(([e]) => {
    visible = e!.isIntersecting
    if (visible) play()
    else video.value?.pause()
  }, { threshold: 0.5 }).observe(video.value)
})

// L'exemple choisi, redessiné dans le style choisi. Contraste d'abord : le plus éloigné des exemples en couleurs.
const style = ref<Style>('contraste')
const styled = computed(() => ({ ...current.value.timeline, style: style.value }))
function chooseStyle(s: Style) {
  smoothly(() => { style.value = s })
  track('style_essaye', { style: s })
}

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

const pill = 'relative flex h-9 shrink-0 cursor-pointer items-center rounded-lg px-3.5 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-ink has-checked:bg-paper has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent'
</script>

<template>
  <div class="min-h-dvh bg-ground font-sans text-ink antialiased">
    <SiteHeader />

    <main>
      <!-- Première vue : la promesse en grand, puis l'éditeur lui-même, sur l'usage choisi. -->
      <section class="pb-20">
        <div class="mx-auto max-w-6xl px-5 pt-12 text-center sm:px-8 sm:pt-20">
          <h1 class="hero-in mx-auto max-w-5xl font-display text-[clamp(2.75rem,7.4vw,6rem)] leading-[0.98] font-bold tracking-[-0.035em] text-balance">
            Le planning du projet, sur une slide.
          </h1>
          <p class="hero-in mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted [animation-delay:80ms] sm:text-xl">
            Des projets en lignes, des phases en flèches, des jalons datés. Vous modifiez directement sur le dessin, puis vous exportez en PowerPoint, Google Slides ou image, ou vous envoyez un lien.
          </p>
          <div class="hero-in mt-8 flex flex-col items-center gap-3 [animation-delay:160ms]">
            <button class="btn btn-primary h-12 px-6 text-base" type="button" @click="creator!.open()">Créer une timeline</button>
            <p class="text-sm text-muted">Sans compte ni installation. Vos timelines restent dans votre navigateur.</p>
          </div>
          <div v-if="recent.length" class="mt-5 flex flex-wrap items-center justify-center gap-2" role="group" aria-labelledby="reprendre">
            <span id="reprendre" class="mr-1 text-sm text-muted">Reprendre</span>
            <NuxtLink v-for="e in recent" :key="e.id" :to="`/editeur?id=${e.id}`" class="btn max-w-64" @click="track('timeline_reprise')">
              <span class="truncate">{{ e.titre }}</span>
            </NuxtLink>
            <NuxtLink to="/timelines" class="btn btn-quiet text-muted hover:text-ink">
              Toutes vos timelines <ArrowRight :size="15" aria-hidden="true" />
            </NuxtLink>
          </div>

          <div id="exemples" class="hero-in mt-14 flex scroll-mt-6 flex-col items-center gap-3 [animation-delay:240ms]">
            <span id="usage" class="text-sm text-muted">Un exemple pour</span>
            <div class="flex flex-wrap justify-center gap-0.5 rounded-xl bg-line/80 p-1" role="radiogroup" aria-labelledby="usage">
              <label v-for="e in EXEMPLES" :key="e.slug" :class="pill">
                <input type="radio" name="usage" :value="e.slug" :checked="slug === e.slug" class="sr-only" @change="choose(e.slug)">
                {{ e.usage }}
              </label>
            </div>
          </div>
        </div>

        <!-- L'éditeur en vitrine : barre, rail, panneau, et la vraie timeline de l'usage. Le cadre se redresse au défilement. -->
        <div class="mx-auto mt-8 max-w-[1360px] px-3 [perspective:2200px] sm:px-6">
          <div class="editor-shot group relative overflow-hidden rounded-2xl border border-line-strong/70 bg-ground shadow-[0_2px_4px_rgb(43_38_34/0.06),0_48px_96px_-24px_rgb(43_38_34/0.38)] has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-accent">
            <span class="flex h-11 items-center gap-2.5 border-b border-line bg-paper px-4 text-[13px]" aria-hidden="true">
              <BrandMark class="size-5 shrink-0" />
              <span class="font-semibold">Timeline</span>
              <span class="text-muted max-sm:hidden">Mes timelines</span>
              <ChevronRight :size="14" class="shrink-0 text-line-strong max-sm:hidden" />
              <span class="truncate font-medium">{{ current.timeline.titre }}</span>
              <span class="ml-auto flex shrink-0 items-center gap-2">
                <span class="flex rounded-lg bg-wash p-0.5 max-md:hidden">
                  <span class="flex h-6 items-center gap-1 rounded-md bg-paper px-2 font-medium shadow-sm"><PenLine :size="13" /> Modifier</span>
                  <span class="flex h-6 items-center gap-1 px-2 font-medium text-muted"><Eye :size="13" /> Aperçu</span>
                </span>
                <span class="flex h-7 items-center gap-1.5 rounded-lg bg-accent px-3 font-medium text-white transition-colors group-hover:bg-accent-strong"><Download :size="14" /> Exporter</span>
              </span>
            </span>
            <span class="relative block bg-[radial-gradient(circle,var(--color-line-strong)_1px,transparent_1.5px)] bg-[length:20px_20px] p-3 sm:p-6 lg:flex lg:h-[400px] lg:items-center lg:py-8 lg:pr-[296px] lg:pl-[84px]">
              <span class="float absolute top-3 left-3 flex flex-col gap-0.5 p-1.5 text-ink max-lg:hidden" aria-hidden="true">
                <span class="grid size-9 place-items-center"><Undo2 :size="18" /></span>
                <span class="grid size-9 place-items-center text-line-strong"><Redo2 :size="18" /></span>
                <span class="m-1 h-px bg-line" />
                <span class="grid size-9 place-items-center"><FolderOpen :size="18" /></span>
                <span class="grid size-9 place-items-center"><SlidersHorizontal :size="18" /></span>
                <span class="grid size-9 place-items-center"><CircleHelp :size="18" /></span>
              </span>
              <span class="float absolute top-3 right-3 bottom-3 flex w-[272px] flex-col overflow-hidden text-[13px] max-lg:hidden" aria-hidden="true">
                <span class="border-b border-line px-4 py-3 font-semibold">Timeline</span>
                <span class="flex flex-col gap-1 px-4 pt-4">
                  <span class="text-xs font-medium text-muted">Période</span>
                  <span class="rounded-lg border border-line px-2.5 py-1.5">Du {{ dmy(periode.debut) }} au {{ dmy(periode.fin) }}</span>
                </span>
                <span class="flex flex-col gap-1 px-4 pt-4">
                  <span class="text-xs font-medium text-muted">Style</span>
                  <span class="block rounded-lg border border-line p-1.5">
                    <ClientOnly>
                      <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
                      <svg class="block w-full rounded-md" :style="{ background: current.timeline.fond ?? '#ffffff' }" :viewBox="`0 0 ${THUMB_FRAME[0]} ${THUMB_FRAME[1]}`" preserveAspectRatio="xMinYMin slice" v-html="thumb" />
                    </ClientOnly>
                    <span class="mt-1 block px-1 font-medium">{{ STYLE_DEFS[current.timeline.style ?? 'tableau'].label }}</span>
                  </span>
                </span>
                <span class="flex flex-col gap-2 px-4 pt-4">
                  <span class="text-xs font-medium text-muted">Dans l'image</span>
                  <span class="flex items-center gap-2"><span class="grid size-4 place-items-center rounded bg-accent text-white"><Check :size="12" /></span> Légende</span>
                  <span class="flex items-center gap-2"><span class="grid size-4 place-items-center rounded bg-accent text-white"><Check :size="12" /></span> Dates sous les jalons</span>
                </span>
              </span>
              <TimelineView class="relative w-full [view-transition-name:hero-timeline]" :timeline="current.timeline" reveal />
            </span>
            <!-- Tout le cadre ouvre l'exemple : un bouton posé par-dessus. Sur mobile, il laisserait la timeline sans défilement : le bouton sous le cadre suffit. -->
            <button type="button" class="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none max-sm:hidden" :aria-label="`Ouvrir « ${current.timeline.titre} » dans l'éditeur`" @click="open" />
          </div>
        </div>

        <div class="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-x-10 gap-y-5 px-5 sm:px-8">
          <div class="max-w-2xl">
            <p class="leading-relaxed sm:min-h-[3.25rem]"><span class="font-semibold">{{ current.public }}.</span> {{ current.accroche }}</p>
            <NuxtLink :to="`/exemples/${current.slug}`" class="mt-1 inline-flex items-center gap-1 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              Voir l'exemple et ses conseils <ArrowRight :size="14" aria-hidden="true" />
            </NuxtLink>
          </div>
          <button class="btn h-11 px-5 text-[15px]" type="button" @click="open">Partir de cet exemple <ArrowRight :size="16" aria-hidden="true" /></button>
        </div>
      </section>

      <!-- Les trois gestes, filmés dans l'éditeur : la liste à gauche pilote le lecteur. -->
      <section class="border-y border-line bg-paper">
        <div class="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 class="rise font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em]">Trois gestes suffisent</h2>
          <div class="mt-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.85fr)] lg:gap-12">
            <div class="rise flex flex-col gap-1" role="radiogroup" aria-label="Geste">
              <label
                v-for="(g, i) in GESTES"
                :key="g.video"
                class="relative block cursor-pointer overflow-hidden rounded-xl px-5 py-4 transition-colors hover:bg-wash has-checked:bg-ground has-focus-visible:outline-2 has-focus-visible:outline-accent"
              >
                <input type="radio" name="geste" :checked="geste === i" class="sr-only" @change="pick(i)">
                <span class="block font-semibold">{{ g.geste }}</span>
                <span class="mt-1 block leading-relaxed text-muted">{{ g.effet }}</span>
                <span v-if="geste === i && !reduced" class="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-line" aria-hidden="true">
                  <span class="block h-full origin-left rounded-full bg-accent transition-transform duration-300 ease-linear" :style="{ transform: `scaleX(${progress})` }" />
                </span>
              </label>
            </div>
            <div class="land relative overflow-hidden rounded-xl border border-line bg-ground shadow-(--shadow-float) max-lg:order-first">
              <video
                ref="video"
                :src="GESTES[geste]!.video"
                :poster="GESTES[geste]!.poster"
                :aria-label="GESTES[geste]!.alt"
                :controls="reduced"
                width="1280"
                height="720"
                class="block aspect-video w-full"
                muted
                playsinline
                preload="metadata"
                @loadeddata="play"
                @timeupdate="progress = video!.duration ? video!.currentTime / video!.duration : 0"
                @ended="pick((geste + 1) % GESTES.length)"
              />
              <button
                v-if="!reduced"
                type="button"
                class="btn btn-icon absolute right-3 bottom-3 bg-paper/90 shadow-(--shadow-float) hover:bg-paper"
                :aria-label="paused ? 'Lire la démonstration' : 'Mettre la démonstration en pause'"
                :title="paused ? 'Lire' : 'Pause'"
                @click="toggle"
              >
                <component :is="paused ? Play : Pause" :size="16" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Le même planning dans les six styles : un clic, et la timeline glisse vers le nouveau style. -->
      <section class="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div class="rise">
          <h2 class="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em]">Six styles pour le même planning</h2>
          <p class="mt-4 max-w-2xl leading-relaxed text-muted">
            Choisissez un style : « {{ current.timeline.titre }} » est redessiné, avec les mêmes dates et les mêmes noms. Dans l'éditeur, le changement se fait aussi en un clic.
          </p>
          <div class="mt-8 flex w-fit max-w-full flex-wrap gap-0.5 rounded-xl bg-line/80 p-1" role="radiogroup" aria-label="Style">
            <label v-for="s in STYLES" :key="s" :class="pill">
              <input type="radio" name="style" :value="s" :checked="style === s" class="sr-only" @change="chooseStyle(s)">
              {{ STYLE_DEFS[s].label }}
            </label>
          </div>
        </div>
        <TimelineView class="land mt-6 [view-transition-name:style-timeline]" :timeline="styled" />
      </section>

      <!-- La slide exacte, en grand, et le vrai fichier à télécharger. -->
      <section class="border-y border-line bg-paper">
        <div class="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <div class="rise grid gap-x-12 gap-y-6 lg:grid-cols-2">
            <div>
              <h2 class="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em]">La slide, telle qu'elle sera projetée</h2>
              <p class="mt-4 leading-relaxed text-muted">L'éditeur et l'export calculent la même mise en page : ce que vous voyez à l'écran arrive tel quel dans votre présentation.</p>
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
            <SlidePreview :timeline="current.timeline" class="land mx-auto mt-10 rounded-xl bg-ground sm:p-10 lg:max-w-4xl" />
            <template #fallback>
              <div class="mx-auto mt-10 aspect-video rounded-xl bg-ground lg:max-w-4xl" />
            </template>
          </ClientOnly>
        </div>
      </section>

      <!-- Le partage par lien, démontré sur l'exemple choisi, et ce qui reste dans le navigateur. -->
      <section class="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <h2 class="rise font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.1] font-bold tracking-[-0.02em]">Partagez par un lien, sans compte ni serveur</h2>
        <div class="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div class="rise">
            <p class="max-w-2xl leading-relaxed text-muted">Le lien contient toute la timeline, compressée dans la partie de l'adresse que le navigateur n'envoie jamais au serveur. La personne qui l'ouvre reçoit sa propre copie dans l'éditeur, sans créer de compte.</p>
            <div class="land mt-6 rounded-xl border border-line bg-paper p-5">
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
          <div class="rise flex flex-col gap-3 leading-relaxed text-muted">
            <h3 class="font-semibold text-ink">Vos timelines ne passent par aucun serveur</h3>
            <p>L'outil fonctionne entièrement dans votre navigateur. Vos timelines y restent enregistrées d'une visite à l'autre, sur cet appareil. Pour en garder une copie ailleurs, téléchargez son fichier JSON.</p>
            <p>Toute personne qui reçoit un lien peut lire la timeline : ne l'envoyez qu'aux personnes concernées.</p>
            <p v-if="rybbitSiteId">Une mesure d'audience compte les visites et quelques actions (exemple choisi, style essayé, export, lien copié), jamais le contenu d'une timeline.</p>
          </div>
        </div>
      </section>

      <!-- La fin : une action, et les six exemples en liens. -->
      <section class="border-t border-line bg-paper">
        <div class="rise mx-auto max-w-6xl px-5 py-24 text-center sm:px-8">
          <h2 class="mx-auto max-w-3xl font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] font-bold tracking-[-0.03em] text-balance">Partez d'une page vide ou d'un exemple</h2>
          <p class="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">La timeline s'ouvre dans l'éditeur, sans compte. Vous l'exportez quand elle est prête.</p>
          <button class="btn btn-primary mt-8 h-12 px-6 text-base" type="button" @click="creator!.open()">Créer une timeline</button>
          <nav class="mx-auto mt-14 flex max-w-3xl flex-wrap items-baseline justify-center gap-x-5 gap-y-2 border-t border-line pt-6 text-sm" aria-labelledby="exemples-liens">
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

<style>
/*
 * Le mouvement de l'accueil, un seul vocabulaire : le texte monte, les objets se posent,
 * le cadre de l'éditeur se redresse. Rien ne bouge si le système demande moins de
 * mouvement ; sans animations liées au défilement, tout est simplement visible.
 */
@media (prefers-reduced-motion: no-preference) {
  .hero-in { animation: hero-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; }

  @supports (animation-timeline: view()) {
    .editor-shot { transform-origin: 50% 0; animation: redresse linear both; animation-timeline: view(); animation-range: entry 0% cover 40%; }
    .rise { animation: rise linear both; animation-timeline: view(); animation-range: entry 0% entry 80%; }
    .land { animation: land linear both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
  }

  /* Seules les timelines nommées glissent ; le reste de la page change sans fondu, pour éviter les doubles. */
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
  ::view-transition-group(*) { animation-duration: 0.5s; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
}
@keyframes hero-in { from { opacity: 0; transform: translateY(18px); } }
@keyframes redresse { from { transform: rotateX(20deg) scale(0.93); } }
@keyframes rise { from { opacity: 0; transform: translateY(28px); } }
@keyframes land { from { opacity: 0.2; transform: scale(0.95); } }
</style>
