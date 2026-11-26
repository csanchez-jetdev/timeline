/**
 * La scène en SVG, sous forme de texte : le même balisage sert l'éditeur
 * (v-html, avec les attributs d'interaction), l'aperçu d'export et le PNG.
 */
import type { Layout, Prim, ItemRef } from './layout.ts'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const n = (v: number) => Math.round(v * 100) / 100
export const sameRef = (a?: ItemRef | null, b?: ItemRef | null) => !!a && !!b && a.kind === b.kind && a.projet === b.projet && a.index === b.index

interface Options {
  /** Ajoute les attributs data-* que lit l'éditeur, et marque la sélection. */
  interactive?: boolean
  selected?: ItemRef | null
}

/** Une primitive en SVG ; sert aussi aux pictogrammes de jalon du panneau. */
export function prim(p: Prim, o: Options = {}, background = ''): string {
  let attrs = ''
  if (o.interactive && 'ref' in p && p.ref) {
    attrs = ` data-kind="${p.ref.kind}" data-projet="${p.ref.projet}" data-index="${p.ref.index}"`
    if (sameRef(p.ref, o.selected) || (o.selected?.kind === 'projet' && p.ref.kind === 'projet' && p.ref.projet === o.selected.projet)) attrs += ' class="sel"'
  }
  switch (p.t) {
    case 'poly':
      return `<polygon points="${p.points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="${p.fill}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.strokeWidth}" stroke-linejoin="miter"` : ''}${attrs}/>`
    case 'line':
      return `<line x1="${n(p.x1)}" y1="${n(p.y1)}" x2="${n(p.x2)}" y2="${n(p.y2)}" stroke="${p.stroke}" stroke-width="${p.width}"${p.dash ? ` stroke-dasharray="${p.dash}"` : ''}/>`
    case 'circle':
      return `<circle cx="${n(p.cx)}" cy="${n(p.cy)}" r="${n(p.r)}" fill="${p.fill}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.strokeWidth}"` : ''}${attrs}/>`
    case 'rect':
      return `<rect x="${n(p.x)}" y="${n(p.y)}" width="${n(p.w)}" height="${n(p.h)}"${p.rx ? ` rx="${p.rx}"` : ''} fill="${p.fill}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.strokeWidth}"` : ''}${attrs}/>`
    case 'text': {
      // Le halo prend la couleur du fond : il efface ce qui passe derrière le texte sans le cerner.
      const halo = p.halo ? ` stroke="${background}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"` : ''
      const tip = p.tip ? `<title>${esc(p.tip)}</title>` : ''
      const lines = p.lines.map(l => `<tspan x="${n(p.x)}" y="${n(l.y)}" font-weight="${l.weight}" font-size="${l.size}" fill="${l.color}">${esc(l.text)}</tspan>`).join('')
      return `<text x="${n(p.x)}" text-anchor="${p.anchor}" font-family="${esc(p.family)}"${halo}${attrs}>${tip}${lines}</text>`
    }
  }
}

/** Les poignées d'une phase sélectionnée : elles montrent où tirer pour changer ses dates. */
function handles(l: Layout, sel: ItemRef): string {
  const shape = l.scene.find(p => (p.t === 'poly' || p.t === 'rect') && sameRef(p.ref, sel))
  if (!shape) return ''
  const [x0, x1, y0, y1] = shape.t === 'rect'
    ? [shape.x, shape.x + shape.w, shape.y, shape.y + shape.h]
    : [Math.min(...shape.points.map(q => q[0])), Math.max(...shape.points.map(q => q[0])), Math.min(...shape.points.map(q => q[1])), Math.max(...shape.points.map(q => q[1]))]
  const cy = (y0 + y1) / 2
  const attrs = ` data-kind="phase" data-projet="${sel.projet}" data-index="${sel.index}"`
  const grip = (x: number) => `<rect x="${n(x - 4)}" y="${n(cy - 10)}" width="8" height="20" rx="3" fill="#ffffff" stroke="#cf4329" stroke-width="2"${attrs}/>`
  // Une phase qui va jusqu'au bout de la période n'a pas de fin à tirer.
  return grip(x0) + (x1 < l.x1 - 0.5 ? grip(x1) : '')
}

/** Le contenu du SVG (sans la balise <svg>), fond compris. */
export function svgInner(l: Layout, o: Options = {}): string {
  const row = o.selected?.kind === 'projet' ? l.rows[o.selected.projet] : undefined
  const wash = row ? `<rect x="0" y="${n(row.top)}" width="${l.width}" height="${n(row.bottom - row.top)}" fill="#cf4329" fill-opacity="0.07"/>` : ''
  const grips = o.interactive && o.selected?.kind === 'phase' ? handles(l, o.selected) : ''
  return `<rect width="${l.width}" height="${n(l.height)}" fill="${l.background}"/>${wash}${l.scene.map(p => prim(p, o, l.background)).join('')}${grips}`
}

/** Un document SVG autonome ; `head` accueille par exemple les polices intégrées. */
export function toSvg(l: Layout, head = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${l.width} ${n(l.height)}" width="${l.width}" height="${n(l.height)}">${head}${svgInner(l)}</svg>`
}
