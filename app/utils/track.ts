import { bounds, type Timeline, toDay } from './timeline.ts'

/*
 * Événements Rybbit. Ils ne portent jamais le contenu d'une timeline : ni texte
 * saisi, ni date, ni nom de fichier, ni message d'erreur (il cite le champ fautif,
 * donc parfois un nom de projet). Seulement l'action, des valeurs du schéma fermé
 * et des comptes.
 */
type Props = Record<string, string | number>
declare global { interface Window { rybbit?: { event: (name: string, props?: Props) => void } } }

// L'éditeur, rendu dans le navigateur, agit parfois avant que le script soit chargé :
// on garde les événements 10 s, puis on les jette (mesure désactivée ou bloquée).
const queue: [string, Props?][] = []
function flush(tries: number) {
  if (window.rybbit) for (const [name, props] of queue.splice(0)) window.rybbit.event(name, props)
  else if (tries) setTimeout(flush, 250, tries - 1)
  else queue.length = 0
}

export function track(name: string, props?: Props) {
  if (typeof window === 'undefined') return
  queue.push([name, props])
  if (queue.length === 1) flush(40)
}

/** La forme d'une timeline, sans son contenu. */
export function shape(t: Timeline): Props {
  const b = bounds(t)
  return {
    projets: t.projets.length,
    phases: t.projets.reduce((n, p) => n + p.phases.length, 0),
    jalons: t.projets.reduce((n, p) => n + p.jalons.length, 0),
    jours: toDay(b.fin) - toDay(b.debut) + 1,
    style: t.style ?? 'tableau',
  }
}
