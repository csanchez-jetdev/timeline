<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, PanelRightClose, Plus, Trash2, X } from '@lucide/vue'
import { place } from '~/utils/popover'
import { dayScale, markPrim } from '~/utils/layout'
import { markStyle, STYLE_DEFS, THUMB_FRAME } from '~/utils/styles'
import { prim } from '~/utils/svg'
import { track } from '~/utils/track'
import { AFFICHAGE, type Affichage, bounds, COULEUR_LABELS, COULEURS, ddmmyyyy, type Forme, FORME_LABELS, FORMES, fromDay, isDate, type Jalon, type Marque, type Phase, type Projet, type Style, toDay, TYPE_LABELS, type TypeJalon, typeLabel, TYPES } from '~/utils/timeline'

/* Les champs de l'élément sélectionné, ou de la timeline quand rien ne l'est. */
const emit = defineEmits<{ close: [] }>()
const tl = useTimeline()
const { doc, selection } = tl
const style = computed(() => doc.value.style ?? 'tableau')
const palette = computed(() => STYLE_DEFS[style.value].palette)

const kind = computed(() => (tl.selectedItem() ? selection.value!.kind : null))
const projet = computed(() => (kind.value === 'projet' ? (tl.selectedItem() as Projet) : null))
const phase = computed(() => (kind.value === 'phase' ? (tl.selectedItem() as Phase) : null))
const jalon = computed(() => (kind.value === 'jalon' ? (tl.selectedItem() as Jalon) : null))
const parent = computed(() => (selection.value ? doc.value.projets[selection.value.projet] : undefined))
const select = (projet: number) => { selection.value = { kind: 'projet', projet, index: projet } }

const panel = ref<HTMLElement>()
watch(tl.created, async () => {
  await nextTick()
  panel.value?.querySelector<HTMLElement>('[data-first]')?.focus()
})
const closeButton = ref<HTMLButtonElement>()
defineExpose({ focusClose: () => closeButton.value?.focus() })

// Toutes les dates de la timeline : la période doit les contenir.
const range = computed(() => {
  const ds = doc.value.projets.flatMap(p => [...p.jalons.map(j => j.date), ...p.phases.flatMap(f => (f.fin ? [f.debut, f.fin] : [f.debut]))]).sort()
  return ds.length ? { min: ds[0]!, max: ds.at(-1)! } : null
})
const shownPeriod = computed(() => bounds(doc.value))
function setAuto(auto: boolean) {
  tl.change((t) => {
    if (auto) delete t.periode
    else t.periode = { ...bounds(t) }
  })
}
function setPeriod(edge: 'debut' | 'fin', date: string) {
  if (!isDate(date) || !doc.value.periode) return
  const debut = edge === 'debut' ? date : doc.value.periode.debut
  const fin = edge === 'fin' ? date : doc.value.periode.fin
  if (debut >= fin || (range.value && (debut > range.value.min || fin < range.value.max))) return
  tl.change((t) => { t.periode = { debut, fin } })
}

// Une option égale à sa valeur par défaut sort du fichier : le JSON reste court.
const show = computed(() => ({ ...AFFICHAGE, ...doc.value.affichage }))
function setShow(key: keyof Affichage, value: boolean) {
  tl.change((t) => {
    const next = { ...t.affichage, [key]: value }
    if (value === AFFICHAGE[key]) delete next[key]
    t.affichage = Object.keys(next).length ? next : undefined
  })
}

// Fonds testés d'abord ; une couleur libre peut avaler une couleur de phase.
const FONDS = [
  { value: '#ffffff', label: 'Blanc' },
  { value: '#faf6f0', label: 'Papier' },
  { value: '#eef1f4', label: 'Gris clair' },
  { value: '#1f2d5c', label: 'Bleu nuit' },
  { value: '#24272b', label: 'Ardoise' },
]
const fond = computed(() => doc.value.fond ?? '#ffffff')
const customFond = computed(() => !FONDS.some(f => f.value === fond.value))
function setFond(value: string) {
  tl.change((t) => { t.fond = value.toLowerCase() === '#ffffff' ? undefined : value.toLowerCase() })
}

const styleOpen = ref(false)
const setStyle = (s: Style) => tl.change((t) => { t.style = s })

const p = computed(() => doc.value.periode)
function addJalonHere() {
  const b = tl.period()
  tl.addJalon(selection.value!.projet, fromDay(Math.round((toDay(b.debut) + toDay(b.fin)) / 2)))
  track('jalon_ajoute', { depuis: 'panneau' })
}
function addPhaseHere() {
  const projet = selection.value!.projet
  const debut = tl.period().debut
  tl.snapshot()
  tl.pushPhase(projet, debut, tl.clampDate(fromDay(toDay(debut) + 30)))
  tl.created.value++
  track('phase_ajoutee', { depuis: 'panneau' })
}
const value = (e: Event) => (e.target as HTMLInputElement).value

// Un champ modifié (attribut name) : sa valeur ne remonte que si elle vient d'une liste
// fermée ou d'une case, jamais un texte ni une date saisis.
function changed(e: Event) {
  const el = e.target as HTMLInputElement
  if (!el.name) return
  const valeur = el.type === 'checkbox' ? (el.checked ? 'oui' : 'non') : el.type === 'radio' || el.tagName === 'SELECT' ? el.value : ''
  track('champ_modifie', { element: kind.value ?? 'timeline', champ: el.name, ...(valeur && { valeur }) })
}

// Les types de jalon renommés pour cette timeline ; un champ vidé rend le libellé commun.
function setLabel(k: TypeJalon, v: string) {
  tl.typed(() => {
    const next = { ...doc.value.libelles, [k]: v }
    if (!v.trim()) delete next[k]
    doc.value.libelles = Object.keys(next).length ? next : undefined
  })
}

// Forme et couleur d'un type de jalon : un choix reste tel quel si le style change ;
// « Revenir au style » le retire.
const looks = computed(() => Object.fromEntries(TYPES.map(k => [k, markStyle(STYLE_DEFS[style.value], k, doc.value.marques?.[k])])) as Record<TypeJalon, ReturnType<typeof markStyle>>)
function setMarque(k: TypeJalon, patch: Marque | null) {
  tl.change((t) => {
    const next: Marque = { ...t.marques?.[k], ...patch }
    for (const key of ['couleur', 'forme'] as const) if (next[key] === undefined) delete next[key]
    const all = { ...t.marques, [k]: next }
    if (!patch || !Object.keys(next).length) delete all[k]
    t.marques = Object.keys(all).length ? all : undefined
  })
}
// Pictogramme d'un jalon sur le panneau blanc : un contour blanc y prend le filet.
function icon(k: TypeJalon, forme: Forme = looks.value[k].forme) {
  const { fill, stroke } = looks.value[k]
  return prim(markPrim(forme, 0, 0, 8.5, fill, stroke === '#ffffff' ? '#d6cdc2' : stroke))
}
</script>

<template>
  <aside id="proprietes" ref="panel" class="float flex flex-col text-sm text-ink" aria-label="Propriétés" @change="changed">
    <header class="flex items-center gap-1 border-b border-line py-2 pr-2 pl-3">
      <nav aria-label="Élément sélectionné" class="flex min-w-0 flex-1 items-center gap-0.5 text-[13px]">
        <button v-if="kind" class="shrink-0 rounded-md px-1.5 py-1 text-muted hover:bg-wash hover:text-ink" type="button" @click="selection = null">Timeline</button>
        <span v-else class="px-1.5 py-1 font-semibold" aria-current="true">Timeline</span>
        <template v-if="kind && kind !== 'projet' && parent">
          <ChevronRight :size="14" class="shrink-0 text-line-strong" aria-hidden="true" />
          <button class="min-w-0 truncate rounded-md px-1.5 py-1 text-muted hover:bg-wash hover:text-ink" type="button" @click="select(selection!.projet)">{{ parent.code || parent.nom }}</button>
        </template>
        <template v-if="kind">
          <ChevronRight :size="14" class="shrink-0 text-line-strong" aria-hidden="true" />
          <span class="truncate px-1.5 py-1 font-semibold" aria-current="true">{{ kind === 'projet' ? 'Projet' : kind === 'phase' ? 'Phase' : 'Jalon' }}</span>
        </template>
      </nav>
      <button ref="closeButton" class="btn btn-icon size-8 shrink-0" type="button" aria-controls="proprietes" aria-expanded="true" aria-label="Masquer les propriétés" title="Masquer les propriétés" @click="emit('close')">
        <PanelRightClose :size="18" :stroke-width="1.75" class="max-md:hidden" />
        <X :size="18" :stroke-width="1.75" class="md:hidden" />
      </button>
    </header>

    <div class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <!-- Jalon -->
      <template v-if="jalon">
        <label class="field">Titre
          <input data-first name="titre" :value="jalon.titre ?? ''" placeholder="Trois ou quatre mots" @focus="tl.beginTyping" @input="tl.typed(() => { jalon!.titre = value($event) || undefined })">
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="field">Date
            <input type="date" name="date" :value="jalon.date" :min="p?.debut" :max="p?.fin" @change="isDate(value($event)) && tl.change(() => { jalon!.date = tl.clampDate(value($event)) })">
          </label>
          <label class="field">Type
            <select name="type" :value="jalon.type" @change="tl.change(() => { jalon!.type = value($event) as Jalon['type'] })">
              <option v-for="t in TYPES" :key="t" :value="t">{{ typeLabel(doc, t) }}</option>
            </select>
          </label>
        </div>
        <label class="field">Détail <span class="hint">Visible au survol et dans les notes du PowerPoint.</span>
          <textarea rows="3" name="detail" :value="jalon.detail ?? ''" @focus="tl.beginTyping" @input="tl.typed(() => { jalon!.detail = value($event) || undefined })" />
        </label>
        <button class="btn btn-danger" type="button" @click="tl.removeSelected()"><Trash2 :size="15" /> Supprimer le jalon</button>
      </template>

      <!-- Phase -->
      <template v-else-if="phase">
        <label class="field">Nom
          <input data-first name="nom" :value="phase.nom" @focus="tl.beginTyping" @input="tl.typed(() => { phase!.nom = value($event) })">
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="field">Début
            <input type="date" name="debut" :value="phase.debut" :min="p?.debut" :max="phase.fin ? fromDay(toDay(phase.fin) - 1) : p?.fin" @change="(e) => { const v = value(e); if (isDate(v) && (!phase!.fin || v < phase!.fin)) tl.change(() => { phase!.debut = tl.clampDate(v) }) }">
          </label>
          <label class="field">Fin
            <input type="date" name="fin" :value="phase.fin ?? ''" :disabled="!phase.fin" :min="tl.dayAfter(phase.debut)" :max="p?.fin" @change="(e) => { const v = value(e); if (isDate(v) && v > phase!.debut) tl.change(() => { phase!.fin = tl.clampDate(v) }) }">
          </label>
        </div>
        <label class="check">
          <input type="checkbox" name="sans_fin" :checked="!phase.fin" @change="tl.change(() => { phase!.fin = phase!.fin ? undefined : tl.clampDate(fromDay(toDay(phase!.debut) + 30)) })">
          Jusqu'au bout de la période
        </label>
        <fieldset class="field">
          <legend class="mb-1.5">Couleur</legend>
          <div class="flex flex-wrap gap-1.5">
            <label v-for="c in COULEURS" :key="c" class="swatch" :title="COULEUR_LABELS[c]">
              <input type="radio" name="couleur" class="sr-only" :value="c" :checked="phase.couleur === c" @change="tl.change(() => { phase!.couleur = c })">
              <span :style="{ background: palette.phases[c] }" />
              <span class="sr-only">{{ COULEUR_LABELS[c] }}</span>
            </label>
          </div>
        </fieldset>
        <button class="btn btn-danger" type="button" @click="tl.removeSelected()"><Trash2 :size="15" /> Supprimer la phase</button>
      </template>

      <!-- Projet -->
      <template v-else-if="projet">
        <label class="field">Nom
          <input data-first name="nom" :value="projet.nom" @focus="tl.beginTyping" @input="tl.typed(() => { projet!.nom = value($event) })">
        </label>
        <label class="field">Code <span class="hint">Facultatif, par exemple P1.</span>
          <input name="code" :value="projet.code ?? ''" @focus="tl.beginTyping" @input="tl.typed(() => { projet!.code = value($event) || undefined })">
        </label>
        <div class="flex flex-wrap gap-2">
          <button class="btn" type="button" @click="addJalonHere"><Plus :size="15" /> Jalon</button>
          <button class="btn" type="button" @click="addPhaseHere"><Plus :size="15" /> Phase</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn" type="button" :disabled="selection!.projet === 0" @click="tl.moveProjet(selection!.projet, -1)"><ArrowUp :size="15" /> Monter</button>
          <button class="btn" type="button" :disabled="selection!.projet === doc.projets.length - 1" @click="tl.moveProjet(selection!.projet, 1)"><ArrowDown :size="15" /> Descendre</button>
        </div>
        <button class="btn btn-danger" type="button" @click="tl.removeSelected()"><Trash2 :size="15" /> Supprimer le projet</button>
      </template>

      <!-- Timeline -->
      <template v-else>
        <label class="field">Sous-titre <span class="hint">Sous le titre de la slide, et dans l'image si le titre y figure.</span>
          <input name="sous_titre" :value="doc.sousTitre ?? ''" placeholder="Comité du 12 mars" @focus="tl.beginTyping" @input="tl.typed(() => { doc.sousTitre = value($event) || undefined })">
        </label>

        <div class="field">
          <span>Style</span>
          <button popovertarget="style-menu" class="group flex flex-col gap-2 rounded-lg border border-line p-1.5 text-left text-sm font-medium text-ink hover:border-line-strong focus-visible:outline-2 focus-visible:outline-accent" type="button" :aria-label="`Style : ${STYLE_DEFS[style].label}, changer`">
            <!-- eslint-disable-next-line vue/no-v-html : balisage produit par svgInner, textes échappés -->
            <svg class="block w-full rounded-md border border-line" :viewBox="`0 0 ${THUMB_FRAME[0]} ${THUMB_FRAME[1]}`" preserveAspectRatio="xMinYMin slice" aria-hidden="true" v-html="tl.styleThumb(style)" />
            <span class="flex items-center px-1 pb-0.5">
              <span class="flex-1">{{ STYLE_DEFS[style].label }}</span>
              <span class="flex items-center gap-1 text-xs text-muted group-hover:text-ink">Changer <ChevronDown :size="14" aria-hidden="true" /></span>
            </span>
          </button>
          <div id="style-menu" popover class="menu w-[440px] p-3" @beforetoggle="place($event, 'left')" @toggle="styleOpen = ($event as ToggleEvent).newState === 'open'">
            <StylePicker v-if="styleOpen" :model-value="style" @update:model-value="setStyle" />
          </div>
        </div>

        <fieldset class="field">
          <legend class="mb-1.5">Fond</legend>
          <div class="flex flex-wrap items-center gap-1.5">
            <label v-for="f in FONDS" :key="f.value" class="swatch" :title="f.label">
              <input type="radio" name="fond" class="sr-only" :value="f.value" :checked="fond === f.value" @change="setFond(f.value)">
              <span :style="{ background: f.value }" />
              <span class="sr-only">{{ f.label }}</span>
            </label>
            <label class="swatch relative" title="Autre couleur" :class="{ 'ring-2': customFond }">
              <input type="color" name="fond_libre" class="absolute inset-0 size-full cursor-pointer opacity-0" :value="fond" aria-label="Autre couleur de fond" @change="setFond(value($event))">
              <span class="grid place-items-center" :style="customFond ? { background: fond } : { background: 'conic-gradient(#cf4329, #e9b949, #3f7a52, #3d6e8c, #76578a, #cf4329)' }" />
            </label>
          </div>
        </fieldset>

        <fieldset class="field gap-2">
          <legend class="mb-1.5">Dans l'image</legend>
          <label class="check"><input type="checkbox" name="affichage.titre" :checked="show.titre" @change="setShow('titre', ($event.target as HTMLInputElement).checked)"> Titre et sous-titre en haut</label>
          <label class="check"><input type="checkbox" name="affichage.legende" :checked="show.legende" @change="setShow('legende', ($event.target as HTMLInputElement).checked)"> Légende</label>
          <label class="check"><input type="checkbox" name="affichage.dates" :checked="show.dates" @change="setShow('dates', ($event.target as HTMLInputElement).checked)"> Dates sous les jalons</label>
          <label class="check"><input type="checkbox" name="affichage.aujourdhui" :checked="show.aujourdhui" @change="setShow('aujourdhui', ($event.target as HTMLInputElement).checked)"> Repère « aujourd'hui »</label>
          <!-- Seulement sur l'échelle au jour : au mois, un week-end n'a pas de colonne. -->
          <label v-if="dayScale(tl.period())" class="check"><input type="checkbox" name="affichage.weekends" :checked="show.weekends" @change="setShow('weekends', ($event.target as HTMLInputElement).checked)"> Week-ends</label>
        </fieldset>

        <fieldset class="field gap-2">
          <legend class="mb-1.5">Légende <span class="hint">Renommez un type ; son symbole règle sa forme et sa couleur.</span></legend>
          <div v-for="k in TYPES" :key="k" class="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1.25fr)] items-center gap-2">
            <button
              type="button"
              class="grid size-7 place-items-center rounded-md hover:bg-wash focus-visible:outline-2 focus-visible:outline-accent"
              :popovertarget="`marque-${k}`"
              :aria-label="`Forme et couleur : ${typeLabel(doc, k)}`"
              :title="`Forme et couleur : ${typeLabel(doc, k)}`"
            >
              <!-- eslint-disable-next-line vue/no-v-html : balisage produit par prim, sans texte -->
              <svg viewBox="-12 -12 24 24" class="size-5" aria-hidden="true" v-html="icon(k)" />
            </button>
            <span class="text-xs leading-tight font-normal text-muted">{{ TYPE_LABELS[k] }}</span>
            <input :name="`libelle.${k}`" :value="doc.libelles?.[k] ?? ''" placeholder="Renommer…" :aria-label="`Libellé pour ${TYPE_LABELS[k]}`" @focus="tl.beginTyping" @input="setLabel(k, value($event))">

            <div :id="`marque-${k}`" popover class="menu w-[272px] p-3" @beforetoggle="place($event, 'left')">
              <p class="text-[13px] font-semibold text-ink">{{ typeLabel(doc, k) }}</p>
              <fieldset class="mt-2.5">
                <legend class="mb-1.5 text-xs font-medium text-muted">Forme</legend>
                <div class="flex gap-1">
                  <label v-for="f in FORMES" :key="f" class="cursor-pointer" :title="FORME_LABELS[f]">
                    <input type="radio" :name="`forme-${k}`" class="peer sr-only" :value="f" :checked="looks[k].forme === f" @change="setMarque(k, { forme: f })">
                    <!-- eslint-disable-next-line vue/no-v-html : balisage produit par prim, sans texte -->
                    <svg viewBox="-12 -12 24 24" class="block size-9 rounded-lg border border-line p-1.5 hover:border-line-strong peer-checked:border-accent peer-checked:ring-2 peer-checked:ring-accent/30 peer-focus-visible:ring-2 peer-focus-visible:ring-accent" aria-hidden="true" v-html="icon(k, f)" />
                    <span class="sr-only">{{ FORME_LABELS[f] }}</span>
                  </label>
                </div>
              </fieldset>
              <fieldset class="mt-3">
                <legend class="mb-1.5 text-xs font-medium text-muted">Couleur</legend>
                <div class="flex flex-wrap gap-1">
                  <label class="swatch" title="Couleur du style">
                    <input type="radio" :name="`couleur-${k}`" class="sr-only" value="style" :checked="!doc.marques?.[k]?.couleur" @change="setMarque(k, { couleur: undefined })">
                    <span :style="{ background: palette.marks[k].fill }" />
                    <span class="sr-only">Couleur du style</span>
                  </label>
                  <span class="mx-0.5 w-px self-stretch bg-line" aria-hidden="true" />
                  <label v-for="c in COULEURS" :key="c" class="swatch" :title="COULEUR_LABELS[c]">
                    <input type="radio" :name="`couleur-${k}`" class="sr-only" :value="c" :checked="doc.marques?.[k]?.couleur === c" @change="setMarque(k, { couleur: c })">
                    <span :style="{ background: palette.phases[c] }" />
                    <span class="sr-only">{{ COULEUR_LABELS[c] }}</span>
                  </label>
                </div>
              </fieldset>
              <!-- Toujours là, pour que le menu ne grandisse pas sous le pointeur au premier choix. -->
              <button class="btn btn-quiet mt-3 -ml-2 h-7 px-2 text-xs" type="button" :disabled="!doc.marques?.[k]" @click="setMarque(k, null)">Revenir au style</button>
            </div>
          </div>
        </fieldset>

        <fieldset class="field">
          <legend class="mb-1.5">Période</legend>
          <label class="check">
            <input type="checkbox" name="periode_auto" :checked="!doc.periode" @change="setAuto(($event.target as HTMLInputElement).checked)">
            Automatique
          </label>
          <div class="mt-2 grid gap-3">
            <label class="field">Du
              <input type="date" name="periode_debut" :value="shownPeriod.debut" :disabled="!doc.periode" :max="range?.min" @change="setPeriod('debut', value($event))">
            </label>
            <label class="field">Au
              <input type="date" name="periode_fin" :value="shownPeriod.fin" :disabled="!doc.periode" :min="range?.max" @change="setPeriod('fin', value($event))">
            </label>
          </div>
          <p v-if="range" class="hint mt-1.5">Elle contient toutes les dates, du {{ ddmmyyyy(range.min) }} au {{ ddmmyyyy(range.max) }}. Jusqu'à deux mois, l'axe montre chaque jour ; au-delà, chaque mois entier.</p>
        </fieldset>
      </template>
    </div>
  </aside>
</template>
