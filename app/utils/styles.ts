import type { Couleur, Forme, Marque, Style, TypeJalon } from './timeline.ts'

/** Les couleurs d'un style, pensées pour un fond clair ; onBackground les adapte à un fond sombre. */
export interface Palette {
  ink: string
  teal: string
  muted: string
  stem: string
  grid: string
  rule: string
  /** Texte posé sur une couleur de phase ou une pastille (pas le fond de l'image). */
  paper: string
  phases: Record<Couleur, string>
  /** Phases trop claires pour du texte blanc : leur texte prend l'encre. */
  darkText: Couleur[]
  marks: Record<TypeJalon, { fill: string, stroke: string }>
}

export interface StyleDef {
  label: string
  /** Cases par mois, pointillés entre les mois, rien, un cahier (traits par semaine), ou des lignes de projet zébrées. */
  grid: 'cases' | 'pointilles' | 'aucune' | 'cahier' | 'zebre'
  /** Flèche, chevron, barre arrondie, ou bloc à angles droits. */
  phase: 'fleche' | 'chevron' | 'barre' | 'bloc'
  mark: Forme
  /** Nom du projet dans une colonne, ou pastille de code au-dessus du nom. */
  projet: 'colonne' | 'pastille'
  palette: Palette
  fonts: { text: string, display: string }
}

// Tableau, Frise et Chevrons ; gris et orange retouchés pour que le texte posé dessus
// atteigne 3:1.
const CLASSIQUE: Palette = {
  ink: '#1f2d5c',
  teal: '#1a6487',
  muted: '#5b6478',
  stem: '#9aa8b8',
  grid: '#d3d7dd',
  rule: '#e8ebef',
  paper: '#ffffff',
  phases: { bleu: '#17607f', orange: '#e97333', vert: '#1e7b34', violet: '#9c2f8e', gris: '#a6a6a6', vert_clair: '#92d36e' },
  darkText: ['vert_clair', 'gris'],
  marks: {
    atelier: { fill: '#4ea72e', stroke: '#bde4f4' },
    sprint_review: { fill: '#4ea72e', stroke: '#bde4f4' },
    livraison: { fill: '#ffffff', stroke: '#bde4f4' },
    gouvernance: { fill: '#f15a22', stroke: '#ffc000' },
    retour: { fill: '#ffc000', stroke: '#fde9a8' },
  },
}

// Teintes désaturées, ronds cerclés de blanc.
const SOBRE: Palette = {
  ink: '#1f2933',
  teal: '#2f5d73',
  muted: '#5f6b76',
  stem: '#b5bec7',
  grid: '#dde2e6',
  rule: '#eceff2',
  paper: '#ffffff',
  phases: { bleu: '#3d6e8c', orange: '#b5653a', vert: '#3f7a52', violet: '#76578a', gris: '#a3abb3', vert_clair: '#abd19a' },
  darkText: ['gris', 'vert_clair'],
  marks: {
    atelier: { fill: '#3f7a52', stroke: '#ffffff' },
    sprint_review: { fill: '#3f7a52', stroke: '#ffffff' },
    livraison: { fill: '#ffffff', stroke: '#1f2933' },
    gouvernance: { fill: '#b5653a', stroke: '#ffffff' },
    retour: { fill: '#e0b341', stroke: '#ffffff' },
  },
}

// Pastels de cahier, encre bleue de stylo, texte foncé dans toutes les barres.
const DOUCE: Palette = {
  ink: '#2b2d42',
  teal: '#3a5a98',
  muted: '#62667a',
  stem: '#a9b0c2',
  grid: '#c9d3ee',
  rule: '#e4e9f6',
  paper: '#ffffff',
  phases: { bleu: '#a8cbe8', orange: '#f6c29a', vert: '#b5dcb0', violet: '#d3bde6', gris: '#d5d5d5', vert_clair: '#d9edc0' },
  darkText: ['bleu', 'orange', 'vert', 'violet', 'gris', 'vert_clair'],
  marks: {
    atelier: { fill: '#4f9d69', stroke: '#ffffff' },
    sprint_review: { fill: '#4f9d69', stroke: '#ffffff' },
    livraison: { fill: '#ffffff', stroke: '#3a5a98' },
    gouvernance: { fill: '#e76f51', stroke: '#ffffff' },
    retour: { fill: '#f4b942', stroke: '#ffffff' },
  },
}

// Noir et gris pour une impression sans couleur : les jalons se distinguent par leur valeur.
const NB: Palette = {
  ink: '#000000',
  teal: '#000000',
  muted: '#4d4d4d',
  stem: '#8c8c8c',
  grid: '#bfbfbf',
  rule: '#e0e0e0',
  paper: '#ffffff',
  phases: { bleu: '#2b2b2b', orange: '#5c5c5c', vert: '#404040', violet: '#6e6e6e', gris: '#a3a3a3', vert_clair: '#cfcfcf' },
  darkText: ['gris', 'vert_clair'],
  marks: {
    atelier: { fill: '#1a1a1a', stroke: '#ffffff' },
    sprint_review: { fill: '#1a1a1a', stroke: '#ffffff' },
    livraison: { fill: '#ffffff', stroke: '#000000' },
    gouvernance: { fill: '#7a7a7a', stroke: '#000000' },
    retour: { fill: '#c8c8c8', stroke: '#000000' },
  },
}

// Teintes vives de roadmap produit ; l'orange est foncé juste assez pour porter du texte blanc.
const VIVE: Palette = {
  ink: '#172033',
  teal: '#2b3a9e',
  muted: '#5d6577',
  stem: '#b8c0cc',
  grid: '#dfe3e8',
  rule: '#eef1f4',
  paper: '#ffffff',
  phases: { bleu: '#2f5bea', orange: '#d9530b', vert: '#0b8a5f', violet: '#7b3fe4', gris: '#a7b0bd', vert_clair: '#b5e04c' },
  darkText: ['gris', 'vert_clair'],
  marks: {
    atelier: { fill: '#0b8a5f', stroke: '#ffffff' },
    sprint_review: { fill: '#0b8a5f', stroke: '#ffffff' },
    livraison: { fill: '#ffffff', stroke: '#172033' },
    gouvernance: { fill: '#d9530b', stroke: '#ffffff' },
    retour: { fill: '#f2b705', stroke: '#ffffff' },
  },
}

const FONTS = { text: 'Carlito, Calibri, Arial, sans-serif', display: 'Montserrat, "Segoe UI", Arial, sans-serif' }

/** Un style de plus : une entrée ici, et son nom à la fin de STYLES (timeline.ts). */
export const STYLE_DEFS: Record<Style, StyleDef> = {
  tableau: { label: 'Tableau', grid: 'cases', phase: 'fleche', mark: 'losange', projet: 'colonne', palette: CLASSIQUE, fonts: FONTS },
  frise: { label: 'Frise', grid: 'pointilles', phase: 'fleche', mark: 'losange', projet: 'pastille', palette: CLASSIQUE, fonts: FONTS },
  epure: { label: 'Épure', grid: 'aucune', phase: 'barre', mark: 'rond', projet: 'colonne', palette: SOBRE, fonts: FONTS },
  chevrons: { label: 'Chevrons', grid: 'pointilles', phase: 'chevron', mark: 'losange', projet: 'pastille', palette: CLASSIQUE, fonts: FONTS },
  cahier: { label: 'Cahier', grid: 'cahier', phase: 'barre', mark: 'rond', projet: 'pastille', palette: DOUCE, fonts: FONTS },
  contraste: { label: 'Contraste', grid: 'cases', phase: 'fleche', mark: 'losange', projet: 'colonne', palette: NB, fonts: FONTS },
  gantt: { label: 'Gantt', grid: 'zebre', phase: 'bloc', mark: 'carre', projet: 'colonne', palette: CLASSIQUE, fonts: FONTS },
  roadmap: { label: 'Roadmap', grid: 'aucune', phase: 'barre', mark: 'rond', projet: 'pastille', palette: VIVE, fonts: FONTS },
}

/**
 * Le jalon d'un type : la forme et les couleurs du style, sauf choix de la timeline.
 * Une couleur choisie est celle de la phase du même nom dans ce style, cerclée de
 * la couleur du texte posé sur les phases, pour se détacher de la flèche qu'elle couvre.
 */
export function markStyle(def: StyleDef, type: TypeJalon, m?: Marque) {
  const base = def.palette.marks[type]
  return {
    forme: m?.forme ?? def.mark,
    fill: m?.couleur ? def.palette.phases[m.couleur] : base.fill,
    stroke: m?.couleur ? def.palette.paper : base.stroke,
  }
}

/** Cadre des vignettes de style, en haut à gauche : la colonne des projets et les premiers mois, lisibles. */
export const THUMB_FRAME = [960, 400] as const

const rgb = (hex: string) => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16))
const toHex = (c: number[]) => `#${c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`
/** Mélange de deux couleurs, t = 0 donne a, t = 1 donne b. */
export const mix = (a: string, b: string, t: number) => toHex(rgb(a).map((v, i) => v + (rgb(b)[i]! - v) * t))

/** Luminance relative au sens WCAG. */
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

/**
 * La palette posée sur le fond : sur un fond sombre (sous 0,179, là où le blanc
 * contraste mieux que le noir), l'encre, les gris et les traits passent en clair.
 * Les couleurs de phase et de jalon ne changent pas.
 */
export function onBackground(p: Palette, fond = '#ffffff'): Palette {
  if (luminance(fond) >= 0.179) return p
  return {
    ...p,
    ink: '#f5f6f8',
    teal: mix(p.teal, '#ffffff', 0.7),
    muted: mix(fond, '#ffffff', 0.72),
    stem: mix(fond, '#ffffff', 0.45),
    grid: mix(fond, '#ffffff', 0.28),
    rule: mix(fond, '#ffffff', 0.14),
  }
}
