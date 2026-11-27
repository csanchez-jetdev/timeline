<script setup lang="ts">
import { Braces, CircleHelp, FileDown, FilePlus2, FolderOpen, LayoutList, Redo2, SlidersHorizontal, Undo2, Upload } from '@lucide/vue'
import { menuKeys, place } from '~/utils/popover'
import { track } from '~/utils/track'

/* Le rail d'outils : annuler, fichier, réglages, aide. Icônes seules, nommées pour les lecteurs d'écran. */
defineProps<{ horizontal?: boolean }>()
const emit = defineEmits<{ open: [], save: [], json: [], settings: [] }>()
const tl = useTimeline()
const mod = import.meta.client && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'
const close = (id: string) => document.getElementById(id)?.hidePopover()
</script>

<template>
  <nav class="float flex gap-0.5 p-1.5" :class="horizontal ? 'flex-row' : 'flex-col'" aria-label="Outils">
    <button class="btn btn-icon" type="button" :disabled="!tl.canUndo.value" aria-label="Annuler" :title="`Annuler (${mod}+Z)`" @click="tl.undo()">
      <Undo2 :size="18" :stroke-width="1.75" />
    </button>
    <button class="btn btn-icon" type="button" :disabled="!tl.canRedo.value" aria-label="Rétablir" :title="`Rétablir (${mod}+Maj+Z)`" @click="tl.redo()">
      <Redo2 :size="18" :stroke-width="1.75" />
    </button>
    <span class="m-1 bg-line" :class="horizontal ? 'w-px self-stretch' : 'h-px'" aria-hidden="true" />
    <button class="btn btn-icon" type="button" popovertarget="file-menu" aria-label="Fichier" title="Fichier">
      <FolderOpen :size="18" :stroke-width="1.75" />
    </button>
    <button class="btn btn-icon" type="button" aria-label="Réglages de la timeline" title="Réglages de la timeline" @click="emit('settings')">
      <SlidersHorizontal :size="18" :stroke-width="1.75" />
    </button>
    <button class="btn btn-icon" type="button" popovertarget="help" aria-label="Aide" title="Aide">
      <CircleHelp :size="18" :stroke-width="1.75" />
    </button>

    <div id="file-menu" popover class="menu" role="menu" aria-label="Fichier" @beforetoggle="place($event, horizontal ? 'above-end' : 'right')" @keydown="menuKeys">
      <NuxtLink to="/timelines" class="menu-item" role="menuitem"><LayoutList :size="16" /> Mes timelines</NuxtLink>
      <button class="menu-item" type="button" role="menuitem" @click="close('file-menu'); tl.newTimeline()"><FilePlus2 :size="16" /> Nouvelle timeline</button>
      <button class="menu-item" type="button" role="menuitem" @click="close('file-menu'); emit('open')"><Upload :size="16" /> Ouvrir un fichier JSON…</button>
      <button class="menu-item" type="button" role="menuitem" @click="close('file-menu'); emit('save')"><FileDown :size="16" /> Télécharger le fichier JSON</button>
      <button class="menu-item" type="button" role="menuitem" @click="close('file-menu'); emit('json')"><Braces :size="16" /> Modifier le JSON…</button>
    </div>

    <div id="help" popover class="menu w-80 p-4" @beforetoggle="place($event, horizontal ? 'above-end' : 'right')" @toggle="($event as ToggleEvent).newState === 'open' && track('aide_ouverte')">
      <h2 class="mb-2 text-sm font-semibold">Sur la timeline</h2>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
        <dt class="font-medium">Double-clic</dt><dd class="text-muted">sur un élément&nbsp;: le renommer</dd>
        <dt class="font-medium">Double-clic</dt><dd class="text-muted">ailleurs sur une ligne : un jalon à cette date</dd>
        <dt class="font-medium">Glisser</dt><dd class="text-muted">sur une ligne vide : une phase</dd>
        <dt class="font-medium">Glisser</dt><dd class="text-muted">un jalon, une phase ou ses bords : changer les dates</dd>
        <dt class="font-medium">Glisser le fond</dt><dd class="text-muted">ou Espace + glisser : déplacer la vue</dd>
        <dt class="font-medium">Molette</dt><dd class="text-muted">ou deux doigts : faire défiler</dd>
        <dt class="font-medium">{{ mod }} + molette</dt><dd class="text-muted">ou pincer : zoomer</dd>
        <dt class="font-medium">Suppr</dt><dd class="text-muted">supprimer la sélection</dd>
        <dt class="font-medium">Échap</dt><dd class="text-muted">revenir aux réglages de la timeline</dd>
        <dt class="font-medium">{{ mod }} + Z</dt><dd class="text-muted">annuler ; avec Maj, rétablir</dd>
      </dl>
    </div>
  </nav>
</template>
