/**
 * Le schéma fermé d'une timeline.
 *
 * FIGÉ sous le préfixe de lien `t1` : le lien porte l'indice de chaque valeur
 * dans ces listes. Une valeur nouvelle s'ajoute à la fin, aucune ne se
 * renomme ni ne se déplace.
 */
export const TYPES = ['atelier', 'sprint_review', 'livraison', 'gouvernance', 'retour'] as const
export const COULEURS = ['bleu', 'orange', 'vert', 'violet', 'gris', 'vert_clair'] as const
export const STYLES = ['tableau', 'frise', 'epure', 'chevrons', 'cahier', 'contraste'] as const
export const FORMES = ['losange', 'rond', 'carre', 'triangle', 'etoile'] as const

export type TypeJalon = (typeof TYPES)[number]
export type Couleur = (typeof COULEURS)[number]
export type Style = (typeof STYLES)[number]
export type Forme = (typeof FORMES)[number]

export interface Jalon { date: string, type: TypeJalon, titre?: string, detail?: string }
export interface Phase { nom: string, debut: string, fin?: string, couleur: Couleur }
export interface Projet { code?: string, nom: string, phases: Phase[], jalons: Jalon[] }
export interface Periode { debut: string, fin: string }
/** Le dessin d'un type de jalon ; une clé absente garde celui du style. */
export interface Marque { couleur?: Couleur, forme?: Forme }
/** Ce que l'image montre en plus ou en moins ; une clé absente prend sa valeur dans AFFICHAGE. */
export interface Affichage { aujourdhui?: boolean, legende?: boolean, titre?: boolean, dates?: boolean, weekends?: boolean }
export interface Timeline {
  titre: string
  sousTitre?: string
  style?: Style
  /** Couleur de fond de l'image, `#rrggbb` ; blanc par défaut. */
  fond?: string
  affichage?: Affichage
  /** Libellés propres à cette timeline pour les types de jalon (légende, liste des types). */
  libelles?: Partial<Record<TypeJalon, string>>
  /** Couleur et forme propres à cette timeline pour les types de jalon. */
  marques?: Partial<Record<TypeJalon, Marque>>
  periode?: Periode
  projets: Projet[]
}

/** `weekends` : sur l'échelle au jour, les samedis et dimanches gardent leur colonne. */
export const AFFICHAGE: Required<Affichage> = { aujourdhui: false, legende: true, titre: false, dates: true, weekends: true }

// Les clés ne changent jamais (fichiers et liens existants) ; seuls les libellés changent.
export const TYPE_LABELS: Record<TypeJalon, string> = {
  atelier: 'Rendez-vous ou atelier',
  sprint_review: 'Démo',
  livraison: 'Livraison ou rendu',
  gouvernance: 'Décision',
  retour: 'Retour',
}

export const COULEUR_LABELS: Record<Couleur, string> = {
  bleu: 'Bleu',
  orange: 'Orange',
  vert: 'Vert',
  violet: 'Violet',
  gris: 'Gris',
  vert_clair: 'Vert clair',
}

export const FORME_LABELS: Record<Forme, string> = {
  losange: 'Losange',
  rond: 'Rond',
  carre: 'Carré',
  triangle: 'Triangle',
  etoile: 'Étoile',
}

/** Le libellé d'un type dans cette timeline : le sien s'il l'a renommé, sinon le libellé commun. */
export const typeLabel = (t: Pick<Timeline, 'libelles'>, k: TypeJalon) => t.libelles?.[k] ?? TYPE_LABELS[k]

export class TimelineError extends Error {}

// Dates : toujours « AAAA-MM-JJ », calculées en jours UTC pour échapper aux fuseaux.
const DAY_MS = 864e5
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isDate(s: unknown): s is string {
  const m = typeof s === 'string' && DATE.exec(s)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!))
  return d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!
}
export const toDay = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY_MS
export const fromDay = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10)
export const ddmm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`
export const ddmmyyyy = (s: string) => `${ddmm(s)}/${s.slice(0, 4)}`
/** Dernier jour du mois de `s`. */
export const endOfMonth = (s: string) => fromDay(Date.UTC(+s.slice(0, 4), +s.slice(5, 7), 0) / DAY_MS)

/** La période affichée : celle du fichier, sinon du premier au dernier mois touché, sinon le mois courant. */
export function bounds(t: Timeline): Periode {
  if (t.periode) return t.periode
  const dates = t.projets.flatMap(p => [...p.jalons.map(j => j.date), ...p.phases.flatMap(ph => ph.fin ? [ph.debut, ph.fin] : [ph.debut])]).sort()
  const first = dates[0] ?? new Date().toISOString().slice(0, 10)
  const last = dates.at(-1) ?? first
  return { debut: `${first.slice(0, 7)}-01`, fin: endOfMonth(last) }
}

/**
 * Valide une timeline venue d'un fichier ou d'un lien et la renvoie propre :
 * clés inconnues refusées (une faute de frappe ne passe pas en silence),
 * champs facultatifs vides retirés. L'erreur nomme le champ fautif.
 */
export function normalizeTimeline(raw: unknown): Timeline {
  const fail = (path: string[], msg: string): never => {
    throw new TimelineError(`${path.join(' > ') || 'timeline'} : ${msg}`)
  }
  const obj = (v: unknown, path: string[], keys: string[]): Record<string, unknown> => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) fail(path, 'objet attendu')
    const o = v as Record<string, unknown>
    for (const k of Object.keys(o)) if (!keys.includes(k)) fail([...path, k], `champ inconnu (attendus : ${keys.join(', ')})`)
    return o
  }
  // Un nom vide prend une valeur par défaut plutôt qu'une erreur : un brouillon
  // enregistré pendant la saisie doit toujours se relire.
  const text = (v: unknown, path: string[]): string | undefined => {
    if (v === undefined || v === null) return undefined
    if (typeof v !== 'string') return fail(path, 'texte attendu')
    return v.trim() || undefined
  }
  const date = (v: unknown, path: string[]): string => (isDate(v) ? v : fail(path, 'date invalide (AAAA-MM-JJ)'))
  const bool = (v: unknown, path: string[]): boolean | undefined => (v === undefined || typeof v === 'boolean' ? v : fail(path, 'vrai ou faux attendu'))
  const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T, path: string[]): T =>
    v === undefined ? fallback : list.includes(v as T) ? (v as T) : fail(path, `valeur inconnue (attendues : ${list.join(', ')})`)
  const list = (v: unknown, path: string[]): unknown[] => (v === undefined ? [] : Array.isArray(v) ? v : fail(path, 'liste attendue'))
  // « projets[2] (Portail client) » : l'indice et le nom, pour retrouver l'élément.
  const item = (name: string, i: number, label?: unknown) => `${name}[${i}]${typeof label === 'string' && label ? ` (${label})` : ''}`
  const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T

  const r = obj(raw, [], ['titre', 'sousTitre', 'style', 'fond', 'affichage', 'libelles', 'marques', 'periode', 'projets'])
  if (r.fond !== undefined && !(typeof r.fond === 'string' && /^#[0-9a-f]{6}$/i.test(r.fond))) fail(['fond'], 'couleur attendue (#rrggbb)')
  let affichage: Affichage | undefined
  if (r.affichage !== undefined) {
    const a = obj(r.affichage, ['affichage'], Object.keys(AFFICHAGE))
    affichage = clean(Object.fromEntries(Object.keys(AFFICHAGE).map(k => [k, bool(a[k], ['affichage', k])])))
    if (!Object.keys(affichage).length) affichage = undefined
  }
  let libelles: Partial<Record<TypeJalon, string>> | undefined
  if (r.libelles !== undefined) {
    const l = obj(r.libelles, ['libelles'], [...TYPES])
    libelles = clean(Object.fromEntries(TYPES.map(k => [k, text(l[k], ['libelles', k])])))
    if (!Object.keys(libelles).length) libelles = undefined
  }
  let marques: Partial<Record<TypeJalon, Marque>> | undefined
  if (r.marques !== undefined) {
    const m = obj(r.marques, ['marques'], [...TYPES])
    marques = clean(Object.fromEntries(TYPES.map((k) => {
      if (m[k] === undefined) return [k, undefined]
      const mp = ['marques', k]
      const v = obj(m[k], mp, ['couleur', 'forme'])
      const marque = clean({
        couleur: v.couleur === undefined ? undefined : oneOf(v.couleur, COULEURS, 'bleu', [...mp, 'couleur']),
        forme: v.forme === undefined ? undefined : oneOf(v.forme, FORMES, 'losange', [...mp, 'forme']),
      })
      return [k, Object.keys(marque).length ? marque : undefined]
    })))
    if (!Object.keys(marques).length) marques = undefined
  }
  let periode: Periode | undefined
  if (r.periode !== undefined) {
    const p = obj(r.periode, ['periode'], ['debut', 'fin'])
    periode = { debut: date(p.debut, ['periode', 'debut']), fin: date(p.fin, ['periode', 'fin']) }
    if (periode.debut >= periode.fin) fail(['periode'], 'debut doit précéder fin')
  }
  const projets = list(r.projets, ['projets']).map((pv, pi): Projet => {
    const raw = pv as Record<string, unknown> | null
    const pp = [item('projets', pi, raw?.code || raw?.nom)]
    const p = obj(pv, pp, ['code', 'nom', 'phases', 'jalons'])
    const phases = list(p.phases, [...pp, 'phases']).map((fv, fi): Phase => {
      const fp = [...pp, item('phases', fi)]
      const f = obj(fv, fp, ['nom', 'debut', 'fin', 'couleur'])
      const phase = clean({
        nom: text(f.nom, [...fp, 'nom']) ?? 'Phase',
        debut: date(f.debut, [...fp, 'debut']),
        fin: f.fin === undefined || f.fin === null ? undefined : date(f.fin, [...fp, 'fin']),
        couleur: oneOf(f.couleur, COULEURS, 'bleu', [...fp, 'couleur']),
      })
      if (phase.fin && phase.debut >= phase.fin) fail(fp, 'debut doit précéder fin')
      return phase
    })
    const jalons = list(p.jalons, [...pp, 'jalons']).map((jv, ji): Jalon => {
      const jp = [...pp, item('jalons', ji)]
      const j = obj(jv, jp, ['date', 'type', 'titre', 'detail'])
      return clean({
        date: date(j.date, [...jp, 'date']),
        type: oneOf(j.type, TYPES, 'atelier', [...jp, 'type']),
        titre: text(j.titre, [...jp, 'titre']),
        detail: text(j.detail, [...jp, 'detail']),
      })
    })
    const projet = clean({ code: text(p.code, [...pp, 'code']), nom: text(p.nom, [...pp, 'nom']) ?? 'Sans nom', phases, jalons })
    if (periode) {
      const dates = [...jalons.map(j => j.date), ...phases.flatMap(f => (f.fin ? [f.debut, f.fin] : [f.debut]))]
      const out = dates.find(d => d < periode!.debut || d > periode!.fin)
      if (out) fail(pp, `le ${ddmmyyyy(out)} sort de la période, à élargir`)
    }
    return projet
  })
  return clean({
    titre: text(r.titre, ['titre']) ?? 'Sans titre',
    sousTitre: text(r.sousTitre, ['sousTitre']),
    style: r.style === undefined ? undefined : oneOf(r.style, STYLES, 'tableau', ['style']),
    fond: (r.fond as string | undefined)?.toLowerCase(),
    affichage,
    libelles,
    marques,
    periode,
    projets,
  })
}
