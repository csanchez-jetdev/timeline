<script setup lang="ts">
import { CircleAlert, Copy, Download, Info, Trash2, X } from '@lucide/vue'
import { downloadJson } from '~/utils/export'
import { create, type Entry, load, put, remove } from '~/utils/store'
import { normalizeTimeline, type Timeline } from '~/utils/timeline'
import { shape, track } from '~/utils/track'

/* Les timelines de ce navigateur, de la plus récente à la plus ancienne. Rendue dans le navigateur seulement. */
useSeoMeta({ title: 'Mes timelines | Timeline', description: 'Les timelines enregistrées dans ce navigateur.' })

const tl = useTimeline()
interface Item extends Entry { raw: string, t: Timeline | null }
const items = ref<Item[] | null>(null)
function refresh() {
  items.value = tl.recent().map((e) => {
    const raw = load(localStorage, e.id) ?? ''
    let t: Timeline | null = null
    try { t = normalizeTimeline(JSON.parse(raw)) }
    catch { /* illisible : elle s'ouvre quand même, son texte va au panneau JSON */ }
    return { ...e, raw, t }
  })
}
onMounted(() => {
  tl.loadFonts()
  refresh()
  track('timelines_vues', { timelines: items.value!.length })
})

const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
// Le haut à gauche de la timeline, au cadrage des aperçus d'exemple.
const FRAME = [768, 320] as const

function createTimeline() {
  tl.createNew()
  navigateTo('/editeur')
}

// Avis de la page : une suppression s'y annule ; une erreur reste jusqu'à ce qu'on la ferme.
const notice = ref<{ text: string, tone: 'info' | 'error', undo?: Item } | null>(null)
const undoButton = ref<HTMLButtonElement>()
let timer: ReturnType<typeof setTimeout> | undefined
watch(notice, (n) => {
  clearTimeout(timer)
  if (n?.tone === 'info') timer = setTimeout(() => { notice.value = null }, 8000)
})
const refused = () => { notice.value = { tone: 'error', text: 'Le navigateur refuse d\'enregistrer (stockage plein ou bloqué).' } }

function duplicate(it: Item) {
  try {
    create(localStorage, { ...it.t!, titre: `${it.t!.titre} (copie)` })
    track('timeline_dupliquee', shape(it.t!))
    refresh()
  }
  catch { refused() }
}
async function del(it: Item) {
  remove(localStorage, it.id)
  // Elle reste en mémoire si l'éditeur l'avait ouverte : il ne doit pas la réécrire.
  if (tl.current.value === it.id) tl.current.value = null
  track('timeline_supprimee')
  refresh()
  notice.value = { tone: 'info', text: `« ${it.titre} » est supprimée.`, undo: it }
  // Le bouton pressé a disparu : le focus va au bouton qui annule.
  await nextTick()
  undoButton.value?.focus()
}
function undo() {
  const it = notice.value?.undo
  if (!it) return
  try {
    put(localStorage, { id: it.id, titre: it.titre, modifie: it.modifie }, it.raw)
    notice.value = null
    refresh()
  }
  catch { refused() }
}
</script>

<template>
  <div class="min-h-dvh bg-ground font-sans text-ink antialiased">
    <SiteHeader />

    <main class="mx-auto max-w-6xl px-5 pt-6 pb-16 sm:px-8">
      <div class="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div class="max-w-2xl">
          <h1 class="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.08] font-bold tracking-[-0.02em]">Mes timelines</h1>
          <p class="mt-4 leading-relaxed text-muted">
            Elles restent dans ce navigateur, sur cet appareil. Effacer les données du site les efface aussi&nbsp;: pour garder une timeline ailleurs, téléchargez son fichier JSON.
          </p>
        </div>
        <button class="btn btn-primary h-11 px-5 text-[15px]" type="button" @click="createTimeline">Créer une timeline</button>
      </div>

      <p v-if="items && !items.length" class="mt-12 leading-relaxed text-muted">
        Aucune timeline dans ce navigateur pour l'instant. Créez-en une, ou partez d'un
        <NuxtLink to="/#exemples" class="text-ink underline underline-offset-4 hover:text-accent">exemple</NuxtLink>.
      </p>

      <ul v-else-if="items" class="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="it in items" :key="it.id" class="group relative">
          <div class="overflow-hidden rounded-xl border border-line shadow-(--shadow-float) transition-colors group-hover:border-line-strong" :style="{ background: it.t?.fond ?? '#ffffff', aspectRatio: `${FRAME[0]} / ${FRAME[1]}` }">
            <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
            <svg v-if="it.t" class="block size-full" :viewBox="`0 0 ${FRAME[0]} ${FRAME[1]}`" preserveAspectRatio="xMinYMin slice" aria-hidden="true" v-html="tl.thumb(it.t)" />
            <p v-else class="flex size-full items-center justify-center p-6 text-center text-sm text-muted">Illisible : son texte s'ouvre dans le panneau JSON de l'éditeur.</p>
          </div>
          <h2 class="mt-4 text-lg leading-snug font-semibold text-balance">
            <NuxtLink :to="`/editeur?id=${it.id}`" class="after:absolute after:-inset-2 after:rounded-2xl group-hover:text-accent focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent" @click="track('timeline_reprise')">
              {{ it.titre }}
            </NuxtLink>
          </h2>
          <p v-if="it.modifie" class="mt-1 text-sm text-muted">Modifiée le {{ date.format(it.modifie) }}</p>
          <div class="relative z-10 mt-2 -ml-2 flex flex-wrap gap-0.5">
            <button v-if="it.t" class="btn btn-quiet px-2 text-muted hover:text-ink" type="button" :aria-label="`Dupliquer « ${it.titre} »`" @click="duplicate(it)"><Copy :size="15" /> Dupliquer</button>
            <button v-if="it.t" class="btn btn-quiet px-2 text-muted hover:text-ink" type="button" :aria-label="`Télécharger le fichier JSON de « ${it.titre} »`" title="Télécharger le fichier JSON" @click="downloadJson(it.t); track('fichier_enregistre', shape(it.t))"><Download :size="15" /> Télécharger</button>
            <button class="btn btn-quiet px-2 text-muted hover:text-alert" type="button" :aria-label="`Supprimer « ${it.titre} »`" @click="del(it)"><Trash2 :size="15" /> Supprimer</button>
          </div>
        </li>
      </ul>
    </main>

    <Transition enter-from-class="translate-y-2 opacity-0" leave-to-class="translate-y-2 opacity-0" enter-active-class="transition duration-200 ease-out" leave-active-class="transition duration-150 ease-in">
      <p
        v-if="notice"
        :role="notice.tone === 'error' ? 'alert' : 'status'"
        class="float fixed bottom-6 left-1/2 z-20 flex w-max max-w-[min(560px,calc(100%-24px))] -translate-x-1/2 items-center gap-2.5 py-2 pr-2 pl-3 text-sm"
      >
        <CircleAlert v-if="notice.tone === 'error'" :size="18" class="shrink-0 text-alert" />
        <Info v-else :size="18" class="shrink-0 text-muted" />
        <span class="flex-1">{{ notice.text }}</span>
        <button v-if="notice.undo" ref="undoButton" class="btn" type="button" @click="undo">Annuler</button>
        <button class="btn btn-icon size-7" type="button" aria-label="Fermer" @click="notice = null"><X :size="15" /></button>
      </p>
    </Transition>
  </div>
</template>
