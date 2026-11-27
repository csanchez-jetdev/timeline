import { bounds, type Timeline, TimelineError, toDay } from './timeline.ts'

/*
 * Événements Rybbit. Ils ne portent jamais le contenu d'une timeline : ni texte
 * saisi, ni date, ni nom de fichier, ni message d'erreur de validation (il cite le
 * champ fautif, donc parfois un nom de projet). Seulement l'action, des valeurs du
 * schéma fermé et des comptes.
 */
type Props = Record<string, string | number>
interface Rybbit { event: (name: string, props?: Props) => void, error: (err: Error, props?: Props) => void }
declare global { interface Window { rybbit?: Rybbit } }

// L'éditeur, rendu dans le navigateur, agit parfois avant que le script soit chargé :
// on garde les appels 10 s, puis on les jette (mesure désactivée ou bloquée).
const queue: ((r: Rybbit) => void)[] = []
function flush(tries: number) {
  const r = window.rybbit
  if (r) for (const call of queue.splice(0)) call(r)
  else if (tries) setTimeout(flush, 250, tries - 1)
  else queue.length = 0
}
function send(call: (r: Rybbit) => void) {
  if (typeof window === 'undefined') return
  queue.push(call)
  if (queue.length === 1) flush(40)
}

export const track = (name: string, props?: Props) => send(r => r.event(name, props))

/**
 * Une erreur imprévue, message et pile compris. Les erreurs de validation (fichier,
 * lien, JSON) n'en sont pas : leur message cite le contenu, elles ne remontent jamais.
 */
export function trackError(err: unknown, props?: Props) {
  if (err instanceof TimelineError || err instanceof SyntaxError) return
  send(r => r.error(err instanceof Error ? err : new Error(String(err)), props))
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
