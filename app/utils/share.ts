/**
 * Le lien de partage : `#t1=<payload>`. Forme compacte, puis deflate-raw natif
 * (CompressionStream), puis base64url.
 *
 * FIGÉ sous `t1` : les clés ci-dessous et l'ordre de TYPES, COULEURS, STYLES, FORMES.
 * Changer la forme, c'est ouvrir `t2` et garder ce décodeur.
 *
 *   { r: date de référence, t: titre, u?: sous-titre, s?: style, c?: fond,
 *     a?: { a?: aujourd'hui, l?: légende, t?: titre, d?: dates, w?: week-ends },
 *     n?: { <indice du type>: libellé },
 *     m?: { <indice du type>: { c?: couleur, f?: forme } }, p?: fin de période,
 *     l: [{ k?: code, n: nom,
 *           f?: [{ n: nom, d: début, e?: fin, c: couleur }],
 *           j?: [{ d: date, y: type, t?: titre, x?: détail }] }] }
 *
 * Dates en jours depuis `r` (début de la période), énumérations en indices.
 * `p` présent seulement si la timeline fixe sa période. Une clé facultative
 * s'ajoute sans changer de préfixe : le décodeur ignore son absence.
 */
import { bounds, COULEURS, FORMES, fromDay, normalizeTimeline, STYLES, type Timeline, TimelineError, toDay, type TypeJalon, TYPES } from './timeline.ts'

export const HASH_PREFIX = '#t1='
// Une timeline réelle se déplie en quelques dizaines de Ko : au-delà, c'est une bombe.
const MAX_JSON_BYTES = 1 << 20

const drop = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))) as T

function pack(t: Timeline) {
  const r = bounds(t).debut
  const day = (s: string) => toDay(s) - toDay(r)
  return drop({
    r,
    t: t.titre,
    u: t.sousTitre,
    s: t.style && STYLES.indexOf(t.style),
    c: t.fond,
    a: t.affichage && drop({ a: t.affichage.aujourdhui, l: t.affichage.legende, t: t.affichage.titre, d: t.affichage.dates, w: t.affichage.weekends }),
    n: t.libelles && Object.fromEntries(Object.entries(t.libelles).map(([k, v]) => [TYPES.indexOf(k as TypeJalon), v])),
    m: t.marques && Object.fromEntries(Object.entries(t.marques).map(([k, v]) => [TYPES.indexOf(k as TypeJalon), drop({ c: v.couleur && COULEURS.indexOf(v.couleur), f: v.forme && FORMES.indexOf(v.forme) })])),
    p: t.periode && day(t.periode.fin),
    l: t.projets.map(p => drop({
      k: p.code,
      n: p.nom,
      f: p.phases.map(f => drop({ n: f.nom, d: day(f.debut), e: f.fin && day(f.fin), c: COULEURS.indexOf(f.couleur) })),
      j: p.jalons.map(j => drop({ d: day(j.date), y: TYPES.indexOf(j.type), t: j.titre, x: j.detail })),
    })),
  })
}

// Tout ce qui sort d'ici passe par normalizeTimeline, comme un fichier : un lien est une entrée non fiable.
function unpack(c: any): Timeline {
  const date = (n: unknown) => (Number.isInteger(n) ? fromDay(toDay(c.r) + (n as number)) : n)
  const at = <T>(list: readonly T[], i: unknown) => (i === undefined ? undefined : list[i as number] ?? i)
  return normalizeTimeline({
    titre: c.t,
    sousTitre: c.u,
    style: at(STYLES, c.s),
    fond: c.c,
    affichage: c.a === undefined ? undefined : { aujourdhui: c.a.a, legende: c.a.l, titre: c.a.t, dates: c.a.d, weekends: c.a.w },
    libelles: c.n === undefined ? undefined : Object.fromEntries(Object.entries(c.n).map(([i, v]) => [at(TYPES, Number(i)), v])),
    marques: c.m === undefined ? undefined : Object.fromEntries(Object.entries(c.m).map(([i, v]: [string, any]) => [at(TYPES, Number(i)), { couleur: at(COULEURS, v?.c), forme: at(FORMES, v?.f) }])),
    periode: c.p === undefined ? undefined : { debut: c.r, fin: date(c.p) },
    projets: (c.l ?? []).map((p: any) => ({
      code: p.k,
      nom: p.n,
      phases: (p.f ?? []).map((f: any) => ({ nom: f.n, debut: date(f.d), fin: f.e === undefined ? undefined : date(f.e), couleur: at(COULEURS, f.c) })),
      jalons: (p.j ?? []).map((j: any) => ({ date: date(j.d), type: at(TYPES, j.y), titre: j.t, detail: j.x })),
    })),
  })
}

async function through(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, max = Infinity) {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > max) {
      await reader.cancel()
      throw new TimelineError('lien trop volumineux')
    }
    chunks.push(value)
  }
  return new Uint8Array(await new Blob(chunks as BlobPart[]).arrayBuffer())
}

const toBase64url = (bytes: Uint8Array) => {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromBase64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0))

export async function encodeTimeline(t: Timeline): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(pack(t)))
  return toBase64url(await through(json, new CompressionStream('deflate-raw')))
}

export async function decodeTimeline(payload: string): Promise<Timeline> {
  let compact: unknown
  try {
    if (!/^[\w-]+$/.test(payload)) throw new Error('base64url attendu')
    const json = await through(fromBase64url(payload), new DecompressionStream('deflate-raw'), MAX_JSON_BYTES)
    compact = JSON.parse(new TextDecoder().decode(json))
  }
  catch (err) {
    if (err instanceof TimelineError) throw err
    throw new TimelineError('lien illisible : il a peut-être été coupé en le copiant')
  }
  try {
    return unpack(compact)
  }
  catch (err) {
    if (err instanceof TimelineError) throw new TimelineError(`lien invalide : ${err.message}`)
    throw new TimelineError('lien illisible')
  }
}
