// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'
import { EXEMPLES } from './app/utils/exemples'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // `nuxt generate` sort un site statique. Les pages publiques sont prérendues
  // (texte et aperçus de lien sans JavaScript) ; l'éditeur tourne seulement
  // dans le navigateur : la timeline ne quitte jamais le poste, le lien la
  // porte dans son fragment. La liste des timelines lit le stockage du navigateur.
  routeRules: { '/editeur': { ssr: false }, '/timelines': { ssr: false } },
  nitro: { prerender: { routes: ['/', '/editeur', '/timelines', ...EXEMPLES.map(e => `/exemples/${e.slug}`)] } },
  runtimeConfig: {
    public: {
      rybbitSiteId: '', // NUXT_PUBLIC_RYBBIT_SITE_ID
      rybbitHost: 'https://app.rybbit.io', // NUXT_PUBLIC_RYBBIT_HOST
    },
  },
  modules: ['@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Timeline',
      meta: [{ name: 'description', content: 'Éditeur de timelines de projets : jalons, phases, export PNG et PPTX.' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  // Servies depuis notre domaine, aucune ressource tierce. Carlito a les
  // métriques de Calibri : la mise en page reste la même une fois en PPTX.
  fonts: {
    families: [
      { name: 'Carlito', weights: [400, 700], global: true },
      { name: 'Montserrat', weights: [600, 700], global: true },
    ],
  },
  vite: { plugins: [tailwindcss()] },
})
