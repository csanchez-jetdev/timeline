/**
 * Les timelines gardées dans ce navigateur : un document par timeline
 * (`timeline:doc:<id>`) et un index (`timeline:index`) qui les liste sans tout relire.
 * Le stockage est passé en paramètre : `scripts/check.ts` le remplace par une Map.
 * Une écriture refusée (stockage plein ou bloqué) lève l'erreur du navigateur.
 */
import type { Timeline } from './timeline.ts'

export interface Entry { id: string, titre: string, modifie: number }
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

const INDEX = 'timeline:index'
const DOC = 'timeline:doc:'
/** La clé de l'unique brouillon d'avant, repris par `migrate`. */
export const DRAFT_KEY = 'timeline:brouillon'
export const docKey = (id: string) => DOC + id
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const isEntry = (e: any): e is Entry => typeof e?.id === 'string' && typeof e.titre === 'string' && typeof e.modifie === 'number'
const titleOf = (raw: string) => {
  try { return String(JSON.parse(raw).titre ?? 'Sans titre') }
  catch { return 'Sans titre' }
}

/** Les timelines, de la plus récente à la plus ancienne. Un index illisible se reconstruit à partir des documents. */
export function list(s: Store): Entry[] {
  let entries: Entry[] | null = null
  try {
    const raw = JSON.parse(s.getItem(INDEX) ?? 'null')
    if (Array.isArray(raw) && raw.every(isEntry)) entries = raw
  }
  catch { /* index illisible : reconstruit ci-dessous */ }
  if (!entries) {
    entries = []
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i)
      if (k?.startsWith(DOC)) entries.push({ id: k.slice(DOC.length), titre: titleOf(s.getItem(k)!), modifie: 0 })
    }
  }
  return entries.filter(e => s.getItem(docKey(e.id)) !== null).sort((a, b) => b.modifie - a.modifie)
}

export const load = (s: Store, id: string) => s.getItem(docKey(id))

/** Écrit un document tel quel et sa ligne d'index. Sert aussi à remettre une timeline supprimée. */
export function put(s: Store, e: Entry, raw: string) {
  s.setItem(docKey(e.id), raw)
  s.setItem(INDEX, JSON.stringify([e, ...list(s).filter(x => x.id !== e.id)].sort((a, b) => b.modifie - a.modifie)))
}

export const save = (s: Store, id: string, t: Timeline, now = Date.now()) => put(s, { id, titre: t.titre, modifie: now }, JSON.stringify(t))

export function create(s: Store, t: Timeline, now = Date.now()) {
  const id = newId()
  save(s, id, t, now)
  return id
}

export function remove(s: Store, id: string) {
  s.removeItem(docKey(id))
  s.setItem(INDEX, JSON.stringify(list(s)))
}

/** L'ancien brouillon unique devient une timeline de la liste, texte gardé tel quel, même illisible. */
export function migrate(s: Store, now = Date.now()) {
  const raw = s.getItem(DRAFT_KEY)
  if (raw === null) return null
  const id = newId()
  put(s, { id, titre: titleOf(raw), modifie: now }, raw)
  s.removeItem(DRAFT_KEY)
  return id
}
