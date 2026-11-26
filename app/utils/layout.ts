/**
 * La mise en page d'une timeline, en fonction pure : elle renvoie une scène de
 * primitives que lisent le SVG de l'éditeur, l'export PNG et l'export PPTX.
 *
 * Échelle par mois ou par jour, flèches de phase, jalons, libellés placés en
 * couloirs de part et d'autre de la bande sans se chevaucher.
 */
import { contrast, markStyle, onBackground, type Palette, STYLE_DEFS } from './styles.ts'
import { AFFICHAGE, bounds, type Couleur, ddmm, endOfMonth, type Forme, fromDay, type Jalon, type Periode, type Projet, type Style, type Timeline, toDay, type TypeJalon, typeLabel, TYPES } from './timeline.ts'

export type Measure = (text: string, weight: number, size: number, family: string) => number

/** Ce qu'une primitive représente, pour la sélection et le glisser. */
export interface ItemRef { projet: number, kind: 'projet' | 'phase' | 'jalon', index: number }
export interface TextLine { y: number, text: string, weight: number, size: number, color: string }
export type Prim =
  | { t: 'poly', points: [number, number][], fill: string, stroke?: string, strokeWidth?: number, ref?: ItemRef }
  | { t: 'line', x1: number, y1: number, x2: number, y2: number, stroke: string, width: number, dash?: string }
  | { t: 'rect', x: number, y: number, w: number, h: number, rx?: number, fill: string, stroke?: string, strokeWidth?: number, ref?: ItemRef }
  | { t: 'circle', cx: number, cy: number, r: number, fill: string, stroke?: string, strokeWidth?: number, ref?: ItemRef }
  | { t: 'text', x: number, anchor: 'start' | 'middle' | 'end', family: string, lines: TextLine[], halo?: boolean, tip?: string, ref?: ItemRef }

export interface Row { top: number, bottom: number, bandTop: number, bandBottom: number }

export interface Layout {
  width: number
  height: number
  /** Taille des libellés en px, pour juger la lisibilité sur une slide. */
  font: number
  scene: Prim[]
  rows: Row[]
  warnings: string[]
  x0: number
  x1: number
  /** Hauteur du titre dessiné en haut de l'image (0 sans titre) : tout le reste est décalé d'autant. */
  y0: number
  background: string
  /** La palette du style, adaptée au fond. */
  palette: Palette
  /** Abscisse d'une date ; f = 0 début du jour, 0,5 son milieu (jalons), 1 sa fin (fins de phase). */
  x: (date: string, f?: number) => number
  /** Date du jour sous une abscisse, bornée à la période. */
  dateAt: (px: number) => string
}

// Géométrie en px d'une image de 1 600 px de large : une slide 16:9 fait 960 pt,
// donc 1 px vaut 0,6 pt en pleine largeur.
export const SLIDE_WIDTH = 1600
/** Jusqu'à cette durée en jours, l'axe montre chaque jour ; au-delà, chaque mois. */
export const DAY_SCALE_MAX = 62
export const dayScale = (p: Periode) => toDay(p.fin) - toDay(p.debut) + 1 <= DAY_SCALE_MAX
const LEFT = 200
const FONT = 15, META = 13, LINE = 16, BAND_H = 26, HALF = 12, GAP = 7, PAD = 6, LANE_GAP = 6
const TITLE_MAX = 150, MERGE_DAYS = 3, DAY_MS = 864e5
const MONTH_NAMES = ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE']
type Side = 'below' | 'above'
type Anchor = 'middle' | 'start' | 'end'
const LANES: [Side, number][] = [['below', 0], ['above', 0], ['below', 1], ['above', 1], ['below', 2], ['above', 2]]

interface Box { left: number, right: number, anchor: Anchor }
interface Spot extends Box { side: Side, lane: number, fallback?: boolean }
interface Group { jalons: (Jalon & { index: number })[], lx: number, lines: { t: string, w: number, s: number }[], tip: string }

const pad = (n: number) => String(n).padStart(2, '0')
const time = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))

// Les formes de jalon sur un carré de demi-côté 1, d'aire voisine de celle du losange,
// centrées à l'œil (le triangle et l'étoile descendent un peu).
const STAR = Array.from({ length: 10 }, (_, i): [number, number] => {
  const r = i % 2 ? 0.5 : 1.12, a = -Math.PI / 2 + (i * Math.PI) / 5
  return [r * Math.cos(a), r * Math.sin(a) + 0.08]
})
const SHAPES: Record<Exclude<Forme, 'rond'>, [number, number][]> = {
  losange: [[0, -1], [1, 0], [0, 1], [-1, 0]],
  carre: [[-0.72, -0.72], [0.72, -0.72], [0.72, 0.72], [-0.72, 0.72]],
  triangle: [[0, -1.08], [1.06, 0.78], [-1.06, 0.78]],
  etoile: STAR,
}

/** Un jalon centré en (cx, cy) ; `half` est sa demi-largeur, celle des collisions. */
export function markPrim(forme: Forme, cx: number, cy: number, half: number, fill: string, stroke: string, ref?: ItemRef): Prim {
  const big = half > 10
  if (forme === 'rond') return { t: 'circle', cx, cy, r: half * 0.8, fill, stroke, strokeWidth: big ? 3.5 : 2.5, ref }
  // Les pointes aiguës allongent le trait en onglet : trait plus fin pour elles.
  const strokeWidth = forme === 'losange' || forme === 'carre' ? (big ? 4 : 3) : (big ? 2.5 : 2)
  return { t: 'poly', points: SHAPES[forme].map(([x, y]) => [cx + x * half, cy + y * half]), fill, stroke, strokeWidth, ref }
}

/** Une primitive descendue de dy pixels. */
function shift(p: Prim, dy: number): Prim {
  switch (p.t) {
    case 'poly': return { ...p, points: p.points.map(([x, y]): [number, number] => [x, y + dy]) }
    case 'line': return { ...p, y1: p.y1 + dy, y2: p.y2 + dy }
    case 'rect': return { ...p, y: p.y + dy }
    case 'circle': return { ...p, cy: p.cy + dy }
    case 'text': return { ...p, lines: p.lines.map(l => ({ ...l, y: l.y + dy })) }
  }
}

/** `today` : la date du jour (AAAA-MM-JJ), pour le repère « aujourd'hui » ; passée par l'appelant, la fonction reste pure. */
export function layout(t: Timeline, opts: { measure: Measure, width?: number, style?: Style, period?: Periode, today?: string }): Layout {
  const def = STYLE_DEFS[opts.style ?? t.style ?? 'tableau']
  const { fonts, grid } = def
  const background = t.fond ?? '#ffffff'
  const c = onBackground(def.palette, background)
  const show = { ...AFFICHAGE, ...t.affichage }
  // Le texte posé sur une couleur suit la palette de base : sur fond sombre, c.ink est clair.
  const onColor = (col: Couleur) => (def.palette.darkText.includes(col) ? def.palette.ink : def.palette.paper)
  // Atelier et démo partagent leur jalon dans la palette CLASSIQUE : la date dit lequel.
  const PREFIX: Partial<Record<TypeJalon, string>> = { sprint_review: `${typeLabel(t, 'sprint_review')} ` }
  const W = opts.width ?? SLIDE_WIDTH
  const X0 = LEFT, X1 = W - 2
  const textWidth = (text: string, weight: number, size: number, family = fonts.text) => opts.measure(text, weight, size, family)

  const period = opts.period ?? bounds(t)
  const months: { y: number, m: number }[] = []
  for (let y = +period.debut.slice(0, 4), m = +period.debut.slice(5, 7); `${y}-${pad(m)}` <= period.fin.slice(0, 7); m === 12 ? (y++, m = 1) : m++) {
    months.push({ y, m })
  }

  // L'échelle : au mois, chaque mois a la même largeur et l'axe couvre les mois entiers ; au jour
  // (période courte), chaque jour a la même largeur et l'axe va du premier au dernier jour.
  // Week-ends masqués : un samedi ou un dimanche n'a pas de largeur, une phase qui finit un
  // dimanche s'arrête au vendredi soir, un jalon du week-end tombe sur le séparateur.
  const daily = dayScale(period)
  const first = daily ? toDay(period.debut) : toDay(`${months[0]!.y}-${pad(months[0]!.m)}-01`)
  const days = Array.from({ length: toDay(daily ? period.fin : endOfMonth(period.fin)) - first + 1 }, (_, i) => fromDay(first + i))
  const weekend = (s: string) => [0, 6].includes(new Date(time(s)).getUTCDay())
  const hide = daily && !show.weekends && days.some(s => !weekend(s))
  const visible = hide ? days.filter(s => !weekend(s)).length : days.length
  const widths = days.map(s => (hide && weekend(s) ? 0 : (X1 - X0) / (daily ? visible : months.length * +endOfMonth(s).slice(8))))
  const edges = [X0]
  for (const w of widths) edges.push(edges.at(-1)! + w)
  const HEADER_H = daily ? 58 : 40, MONTH_ROW = 31

  const x = (s: string, f = 0.5) => {
    const i = toDay(s) - first
    if (i < 0) return X0
    if (i >= days.length) return X1
    return edges[i]! + f * widths[i]!
  }
  const dateAt = (px: number) => {
    const p = Math.min(px, edges.at(-1)! - 1e-6)
    let i = 0
    while (i < days.length - 1 && (edges[i + 1]! <= p || !widths[i])) i++
    return days[i]!
  }
  // Les séparateurs : le 1er de chaque mois au mois, chaque lundi au jour.
  const divisions = days
    .filter((s, i) => i > 0 && (daily ? new Date(time(s)).getUTCDay() === 1 : s.endsWith('-01')))
    .map(s => x(s, 0))
    .filter(gx => gx > X0 + 0.5)

  function wrap(text: string, max: number, weight = 700, size = FONT, family = fonts.text) {
    const out: string[] = []
    let line = ''
    for (const word of text.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (line && textWidth(next, weight, size, family) > max) { out.push(line); line = word }
      else line = next
    }
    if (line) out.push(line)
    return out
  }

  // Les jalons à trois jours d'écart ou moins partagent un libellé ; chacun garde son losange.
  function labelGroups(jalons: Jalon[]): Group[] {
    const sorted = jalons.map((j, index) => ({ ...j, index })).sort((a, b) => time(a.date) - time(b.date))
    const groups: { jalons: (Jalon & { index: number })[] }[] = []
    for (const j of sorted) {
      const last = groups.at(-1)
      if (last && time(j.date) - time(last.jalons.at(-1)!.date) <= MERGE_DAYS * DAY_MS) last.jalons.push(j)
      else groups.push({ jalons: [j] })
    }
    return groups.map(g => ({
      jalons: g.jalons,
      lx: g.jalons.reduce((sum, j) => sum + x(j.date), 0) / g.jalons.length,
      lines: g.jalons.flatMap(j => [
        ...(j.titre ? wrap(j.titre, TITLE_MAX).map(t => ({ t, w: 700, s: FONT })) : []),
        ...(show.dates ? [{ t: (PREFIX[j.type] ?? '') + ddmm(j.date), w: 400, s: META }] : []),
      ]),
      tip: g.jalons.map(j => [(PREFIX[j.type] ?? '') + ddmm(j.date), j.titre, j.detail].filter(Boolean).join(' : ')).join('\n'),
    }))
  }

  // Couloirs gloutons de part et d'autre de la bande, le plus proche d'abord ; dans un couloir le
  // libellé se centre sur son jalon, sinon pend à sa droite, sinon à sa gauche. Un trait ne traverse
  // pas un libellé d'un couloir plus proche, un libellé ne couvre pas le trait d'un couloir plus loin.
  function tryPlace(groups: Group[], aboveFirst: (i: number) => boolean, anchors: Anchor[]) {
    const lanes: Record<Side, Box[][]> = { below: [], above: [] }
    const stems: Record<Side, { x: number, lane: number }[]> = { below: [], above: [] }
    const placed: Spot[] = []
    let fallbacks = 0
    groups.forEach((g, i) => {
      const w = Math.max(...g.lines.map(l => textWidth(l.t, l.w, l.s))) + 8
      const fit = (start: number, anchor: Anchor): Box => {
        let left = Math.max(LEFT + 4, start)
        let right = left + w
        if (right > W - 4) { right = W - 4; left = right - w }
        return { left, right, anchor }
      }
      const byAnchor = { middle: fit(g.lx - w / 2, 'middle'), start: fit(g.lx - 4, 'start'), end: fit(g.lx + 4 - w, 'end') }
      const positions = anchors.map(a => byAnchor[a])
      const order = aboveFirst(i) ? LANES.map(([side, k]): [Side, number] => [side === 'above' ? 'below' : 'above', k]) : LANES
      let spot: Spot | null = null
      place: for (const [side, k] of order) {
        const sideLanes = lanes[side]
        for (let j = 0; j <= k; j++) sideLanes[j] ||= []
        if (sideLanes.slice(0, k).some(l => l.some(b => g.lx >= b.left - 4 && g.lx <= b.right + 4))) continue
        for (const pos of positions) {
          if (sideLanes[k]!.some(b => !(pos.right + PAD <= b.left || pos.left >= b.right + PAD))) continue
          if (stems[side].some(s => s.lane > k && s.x >= pos.left - 4 && s.x <= pos.right + 4)) continue
          sideLanes[k]!.push(pos)
          stems[side].push({ x: g.lx, lane: k })
          spot = { ...pos, side, lane: k }
          break place
        }
      }
      if (!spot) {
        fallbacks++
        spot = { ...positions[0]!, side: 'below', lane: lanes.below.length, fallback: true }
        lanes.below.push([positions[0]!])
      }
      placed.push(spot)
    })
    return { placed, fallbacks }
  }

  // Chaque couloir est aussi haut que son plus haut libellé : offset[side][k] est le départ du couloir k.
  function laneLayout(groups: Group[], placed: Spot[]) {
    const offset: Record<Side, number[]> = { below: [0], above: [0] }
    const extent: Record<Side, number> = { below: 0, above: 0 }
    for (const side of ['below', 'above'] as const) {
      const onSide = placed.map((p, i) => ({ p, g: groups[i]! })).filter(({ p }) => p.side === side)
      const count = Math.max(0, ...onSide.map(({ p }) => p.lane + 1))
      for (let k = 0; k < count; k++) {
        const h = Math.max(0, ...onSide.filter(({ p }) => p.lane === k).map(({ g }) => g.lines.length * LINE))
        offset[side][k + 1] = offset[side][k]! + h + LANE_GAP
      }
      extent[side] = count ? GAP + offset[side][count]! - LANE_GAP : 0
    }
    return { offset, extent }
  }

  // Plusieurs préférences de côté et de position ; garde celle sans croisement et la moins haute.
  function placeLabels(groups: Group[], warnings: string[], name: string) {
    const sides = [() => false, () => true, (i: number) => i % 2 === 1, (i: number) => i % 2 === 0]
    const anchorOrders: Anchor[][] = [['middle', 'start', 'end'], ['middle', 'end', 'start'], ['end', 'middle', 'start'], ['start', 'middle', 'end']]
    let best: { placed: Spot[], layout: ReturnType<typeof laneLayout>, score: number } | null = null
    for (const aboveFirst of sides) {
      for (const anchors of anchorOrders) {
        const { placed, fallbacks } = tryPlace(groups, aboveFirst, anchors)
        const lay = laneLayout(groups, placed)
        const score = fallbacks * 1e6 + lay.extent.above + lay.extent.below
        if (!best || score < best.score) best = { placed, layout: lay, score }
      }
    }
    best!.placed.forEach((p, i) => {
      if (p.fallback) warnings.push(`${name} : jalons serrés autour du ${ddmm(groups[i]!.jalons[0]!.date)}, un trait passe derrière un autre libellé`)
    })
    return { spots: best!.placed, ...best!.layout }
  }

  const looks = Object.fromEntries(TYPES.map(k => [k, markStyle(def, k, t.marques?.[k])])) as Record<TypeJalon, ReturnType<typeof markStyle>>
  const mark = (cx: number, cy: number, half: number, type: TypeJalon, ref?: ItemRef) =>
    markPrim(looks[type].forme, cx, cy, half, looks[type].fill, looks[type].stroke, ref)

  // Premier emplacement après le début de la phase où son nom ne croise aucun losange, en 14 px puis
  // 12 px ; sinon juste après la pointe de la flèche, si l'axe y est libre.
  function phaseText(xs: number, xe: number, label: string, diamonds: number[], phaseRanges: [number, number][]) {
    const clear = (a: number, w: number) => !diamonds.some(d => d + HALF + 3 > a && d - HALF - 3 < a + w)
    for (const size of [14, 12]) {
      const w = textWidth(label, 700, size, fonts.display)
      // Après chaque losange qui gêne le premier emplacement, y compris un losange posé juste avant xs.
      const candidates = [xs + 10, ...diamonds.filter(d => d + HALF + 6 > xs + 10).map(d => d + HALF + 6)]
      const at = candidates.find(a => a + w <= xe - 14 && clear(a, w))
      if (at !== undefined) return { at, size, outside: false }
    }
    const size = 13, w = textWidth(label, 700, size, fonts.display), at = xe + 6
    const free = at + w <= X1 && clear(at, w) && !phaseRanges.some(([a, b]) => b > at && a < at + w)
    return free ? { at, size, outside: true } : null
  }

  const bars: Prim[] = [], stemLines: Prim[] = [], marks: Prim[] = [], texts: Prim[] = [], gridLines: Prim[] = []
  const text = (x: number, y: number, s: string, o: { size: number, weight: number, color: string, family?: string, anchor?: Anchor, halo?: boolean, ref?: ItemRef }): Prim =>
    ({ t: 'text', x, anchor: o.anchor ?? 'start', family: o.family ?? fonts.text, halo: o.halo, ref: o.ref, lines: [{ y, text: s, weight: o.weight, size: o.size, color: o.color }] })

  // Colonne de gauche : « P1 - Portail client » en tableau, une pastille de code et le nom en frise.
  function projectLabel(p: Projet, pi: number, top: number) {
    const ref: ItemRef = { projet: pi, kind: 'projet', index: pi }
    if (def.projet === 'colonne') {
      const lines = wrap(p.code ? `${p.code} - ${p.nom}` : p.nom, LEFT - 24, 600, 16, fonts.display)
      texts.push({ t: 'text', x: 12, anchor: 'start', family: fonts.display, ref, lines: lines.map((s, i) => ({ y: top + 24 + i * 20, text: s, weight: 600, size: 16, color: c.teal })) })
      return 24 + lines.length * 20
    }
    let y = top + 10
    if (p.code) {
      const pillW = textWidth(p.code, 700, 13, fonts.display) + 24
      const couleur = p.phases[0]?.couleur ?? 'bleu'
      texts.push({ t: 'rect', x: 12, y, w: pillW, h: 24, rx: 12, fill: c.phases[couleur], ref })
      texts.push(text(12 + pillW / 2, y + 16.5, p.code, { size: 13, weight: 700, color: onColor(couleur), family: fonts.display, anchor: 'middle', ref }))
      y += 28
    }
    const lines = wrap(p.nom, LEFT - 24, 600, 15, fonts.display)
    texts.push({ t: 'text', x: 12, anchor: 'start', family: fonts.display, ref, lines: lines.map((s, i) => ({ y: y + 16 + i * 19, text: s, weight: 600, size: 15, color: c.teal })) })
    return y - top + 16 + lines.length * 19
  }

  const warnings: string[] = []
  const rows: Row[] = []

  // En-tête des mois : nom complet s'il tient, sinon abrégé ; l'année sur le premier mois et sur
  // chaque janvier quand la période change d'année.
  // Au jour, les mois passent au-dessus des numéros des jours.
  if (grid === 'cases') texts.push(text(LEFT / 2, HEADER_H / 2 + 6, 'PROJETS', { size: 15, weight: 700, color: c.teal, family: fonts.display, anchor: 'middle' }))
  const multiYear = months[0]!.y !== months.at(-1)!.y
  months.forEach(({ y, m }, i) => {
    const start = `${y}-${pad(m)}-01`
    const xs = x(start > days[0]! ? start : days[0]!, 0)
    const xe = x(endOfMonth(start) < days.at(-1)! ? endOfMonth(start) : days.at(-1)!, 1)
    const fits = (s: string) => textWidth(s, 700, 14, fonts.display) <= xe - xs - 8
    const name = MONTH_NAMES[m - 1]!
    const short = [name, `${name.slice(0, 3)}.`, name[0]!].find(fits) ?? ''
    const label = multiYear && (i === 0 || m === 1) && fits(`${short} ${y}`) ? `${short} ${y}` : short
    texts.push(text((xs + xe) / 2, daily ? 22 : 26, label, { size: 14, weight: 700, color: c.ink, family: fonts.display, anchor: 'middle' }))
  })
  if (daily) days.forEach((s, i) => { if (widths[i]) texts.push(text(x(s), 46, String(+s.slice(8, 10)), { size: 13, weight: 400, color: c.muted })) })

  let top = HEADER_H
  t.projets.forEach((p, pi) => {
    const name = p.code || p.nom
    // Sans titre ni date, un jalon n'a pas de libellé : son groupe sort du placement (filtré après
    // construction pour garder l'index de chaque jalon).
    const groups = labelGroups(p.jalons).filter(g => g.lines.length)
    const { spots, offset, extent } = placeLabels(groups, warnings, name)
    const labelH = projectLabel(p, pi, top)
    const bandTop = top + 8 + extent.above
    const bandBottom = bandTop + BAND_H, cy = bandTop + BAND_H / 2
    const diamonds = p.jalons.map(j => x(j.date))

    bars.push({ t: 'line', x1: X0, y1: cy, x2: X1, y2: cy, stroke: c.stem, width: 1.5 })
    const phaseRanges = p.phases.map((f): [number, number] => [x(f.debut, 0), f.fin ? x(f.fin, 1) : X1])
    p.phases.forEach((f, fi) => {
      const [xs, xe] = phaseRanges[fi]!
      const color = c.phases[f.couleur]
      const tip = Math.min(14, (xe - xs) / 3)
      const ref: ItemRef = { projet: pi, kind: 'phase', index: fi }
      let start = xs
      if (def.phase === 'barre') {
        bars.push({ t: 'rect', x: xs, y: bandTop, w: xe - xs, h: BAND_H, rx: Math.min(BAND_H / 2, (xe - xs) / 2), fill: color, ref })
        start = xs + 4
      }
      else {
        // Le chevron ajoute une encoche au début : le nom commence après elle.
        const notch: [number, number][] = def.phase === 'chevron' ? [[xs + tip, cy]] : []
        bars.push({ t: 'poly', points: [[xs, bandTop], [xe - tip, bandTop], [xe, cy], [xe - tip, bandBottom], [xs, bandBottom], ...notch], fill: color, ref })
        start = xs + (notch.length ? tip : 0)
      }
      const spot = phaseText(start, xe, f.nom, diamonds, phaseRanges)
      if (!spot) {
        warnings.push(`${name} : pas de place pour le nom de phase « ${f.nom} »`)
        return
      }
      const fill = !spot.outside ? onColor(f.couleur) : contrast(color, background) >= 3 ? color : c.ink
      texts.push(text(spot.at, cy + spot.size * 0.36, f.nom, { size: spot.size, weight: 700, color: fill, family: fonts.display, halo: spot.outside, ref }))
    })

    p.jalons.forEach((j, ji) => marks.push(mark(x(j.date), cy, HALF, j.type, { projet: pi, kind: 'jalon', index: ji })))
    groups.forEach((g, gi) => {
      const s = spots[gi]!
      const h = g.lines.length * LINE
      const lane = offset[s.side][s.lane]!
      const blockTop = s.side === 'below' ? bandBottom + GAP + lane : bandTop - GAP - lane - h
      const y2 = s.side === 'below' ? blockTop - 2 : blockTop + h + 2
      stemLines.push({ t: 'line', x1: g.lx, y1: cy, x2: g.lx, y2, stroke: c.stem, width: 1.3 })
      const tx = { middle: (s.left + s.right) / 2, start: s.left + 4, end: s.right - 4 }[s.anchor]
      texts.push({
        t: 'text',
        x: tx,
        anchor: s.anchor,
        family: fonts.text,
        halo: true,
        tip: g.tip,
        ref: { projet: pi, kind: 'jalon', index: g.jalons[0]!.index },
        lines: g.lines.map((l, i) => ({ y: blockTop + (i + 1) * LINE - 3.5, text: l.t, weight: l.w, size: l.s, color: l.w === 400 ? c.muted : c.ink })),
      })
    })
    const rowTop = top
    top = Math.max(bandBottom + extent.below + 8, top + labelH + 10)
    rows.push({ top: rowTop, bottom: top, bandTop, bandBottom })
  })

  // Au jour, un mois couvre plusieurs semaines : les séparateurs partent sous la ligne des mois.
  const divTop = daily ? MONTH_ROW : 0
  if (grid === 'cases') {
    for (const gx of [X0, X1]) gridLines.push({ t: 'line', x1: gx, y1: 0, x2: gx, y2: top, stroke: c.grid, width: 1.5 })
    for (const gx of divisions) gridLines.push({ t: 'line', x1: gx, y1: divTop, x2: gx, y2: top, stroke: c.grid, width: 1.5 })
    if (daily) gridLines.push({ t: 'line', x1: X0, y1: MONTH_ROW, x2: W, y2: MONTH_ROW, stroke: c.grid, width: 1.5 })
    for (const gy of [HEADER_H, ...rows.map(r => r.bottom)]) gridLines.push({ t: 'line', x1: 0, y1: gy, x2: W, y2: gy, stroke: c.grid, width: 1.5 })
    gridLines.push({ t: 'rect', x: 0.75, y: 0.75, w: W - 1.5, h: top - 1.5, fill: 'none', stroke: c.grid, strokeWidth: 1.5 })
  }
  else if (grid === 'aucune') {
    // Un filet sous l'en-tête et une graduation entre les mois (les semaines au jour), rien d'autre.
    gridLines.push({ t: 'line', x1: 12, y1: HEADER_H, x2: W, y2: HEADER_H, stroke: c.grid, width: 1 })
    for (const gx of divisions) gridLines.push({ t: 'line', x1: gx, y1: HEADER_H - 10, x2: gx, y2: HEADER_H, stroke: c.grid, width: 1 })
  }
  else {
    // Cahier : un trait léger chaque lundi, sous les pointillés des mois ; au jour, les pointillés
    // tombent déjà sur les lundis.
    if (grid === 'cahier' && !daily) {
      for (let d = toDay(period.debut); d <= toDay(period.fin); d++) {
        if (new Date(d * DAY_MS).getUTCDay() !== 1) continue
        const gx = x(fromDay(d), 0)
        gridLines.push({ t: 'line', x1: gx, y1: HEADER_H, x2: gx, y2: top, stroke: c.rule, width: 1 })
      }
    }
    for (const gx of divisions) gridLines.push({ t: 'line', x1: gx, y1: divTop + 8, x2: gx, y2: top, stroke: c.grid, width: 1.2, dash: '3 5' })
    for (const r of rows.slice(0, -1)) gridLines.push({ t: 'line', x1: 12, y1: r.bottom, x2: W, y2: r.bottom, stroke: c.rule, width: 1.2 })
  }

  // Aujourd'hui : seulement dans la période, sinon x() le collerait au bord.
  const today = show.aujourdhui && opts.today && opts.today >= period.debut && opts.today <= period.fin ? opts.today : null
  if (today) bars.push({ t: 'line', x1: x(today), y1: HEADER_H, x2: x(today), y2: top, stroke: c.teal, width: 2, dash: '6 4' })

  // Légende : seulement les jalons présents ; deux types au même jalon partagent une entrée.
  const legend: { type: TypeJalon, label: string }[] = []
  for (const k of TYPES.filter(k => t.projets.some(p => p.jalons.some(j => j.type === k)))) {
    const same = legend.find(e => JSON.stringify(looks[e.type]) === JSON.stringify(looks[k]))
    if (same) same.label += `, ${t.libelles?.[k] ?? typeLabel(t, k).toLowerCase()}`
    else legend.push({ type: k, label: typeLabel(t, k) })
  }
  let height = top + 10
  if (show.legende && (legend.length || today)) {
    let lx = 20
    const ly = top + 26
    for (const { type, label } of legend) {
      marks.push(mark(lx, ly - 5, 9, type))
      texts.push(text(lx + 16, ly, label, { size: FONT, weight: 400, color: c.ink }))
      lx += 16 + textWidth(label, 400, FONT) + 36
    }
    if (today) {
      const label = `Aujourd'hui, ${ddmm(today)}`
      bars.push({ t: 'line', x1: lx, y1: ly - 15, x2: lx, y2: ly + 5, stroke: c.teal, width: 2, dash: '6 4' })
      texts.push(text(lx + 10, ly, label, { size: FONT, weight: 400, color: c.ink }))
    }
    height = ly + 12
  }

  // Titre et sous-titre en haut de l'image : tout le reste descend d'autant, x() ne bouge pas.
  const head: Prim[] = []
  let y0 = 0
  if (show.titre) {
    const lines = wrap(t.titre, W - 24, 700, 24, fonts.display)
    head.push({ t: 'text', x: 12, anchor: 'start', family: fonts.display, lines: lines.map((s, i) => ({ y: 32 + i * 30, text: s, weight: 700, size: 24, color: c.teal })) })
    y0 = 32 + (lines.length - 1) * 30
    if (t.sousTitre) {
      head.push(text(12, y0 + 24, t.sousTitre, { size: FONT, weight: 400, color: c.muted }))
      y0 += 24
    }
    y0 += 18
  }
  const scene = [...gridLines, ...stemLines, ...bars, ...marks, ...texts]

  return {
    width: W,
    height: height + y0,
    font: FONT,
    scene: [...head, ...(y0 ? scene.map(p => shift(p, y0)) : scene)],
    rows: rows.map(r => ({ top: r.top + y0, bottom: r.bottom + y0, bandTop: r.bandTop + y0, bandBottom: r.bandBottom + y0 })),
    warnings,
    x0: X0,
    x1: X1,
    y0,
    background,
    palette: c,
    x,
    dateAt,
  }
}

/** Zone utile d'une slide 16:9 (960 x 540 pt) sous son titre, et taille de libellé encore lisible. */
export const SLIDE_AREA_PT = [920, 440] as const
export const MIN_PT = 7.5

/** Taille des libellés en points une fois l'image posée sur une slide, et l'avertissement éventuel. */
export function slideReadability(l: Pick<Layout, 'width' | 'height' | 'font'>) {
  const scale = Math.min(SLIDE_AREA_PT[0] / l.width, SLIDE_AREA_PT[1] / l.height)
  const pt = l.font * scale
  return { pt, warning: pt < MIN_PT ? `libellés à ${pt.toFixed(1).replace('.', ',')} pt sur une slide, sous ${String(MIN_PT).replace('.', ',')} pt : raccourcir des titres ou retirer des jalons` : null }
}
