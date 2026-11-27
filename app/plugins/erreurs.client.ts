import { trackError } from '~/utils/track'

// Vue intercepte les erreurs des composants (rendu, clics, watchers) et ne fait que
// les écrire en console : la capture automatique de Rybbit (window.onerror) ne les voit pas.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', err => trackError(err))
})
