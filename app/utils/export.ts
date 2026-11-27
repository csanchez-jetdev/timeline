/**
 * Exports : PNG (le SVG de la scène sur un canvas) et PPTX (chaque primitive
 * devient une forme modifiable). Google Slides importe le PPTX.
 */
import { type Layout, SLIDE_AREA_PT } from './layout.ts'
import { toSvg } from './svg.ts'
import type { Timeline } from './timeline.ts'

export function download(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export const fileName = (titre: string) =>
  titre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'timeline'

/** Le fichier JSON d'une timeline, à rouvrir ou à garder ailleurs. */
export const downloadJson = (t: Timeline) =>
  download(new Blob([`${JSON.stringify(t, null, 2)}\n`], { type: 'application/json' }), `${fileName(t.titre)}.json`)

const toDataUrl = async (url: string) => {
  const blob = await (await fetch(url)).blob()
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/**
 * Les @font-face de la page pour Carlito et Montserrat, fichiers intégrés en
 * data: : un SVG chargé comme image ne lit ni les polices de la page ni une URL.
 */
async function embeddedFonts() {
  const rules = [...document.styleSheets]
    .flatMap((sheet) => {
      try { return [...sheet.cssRules] }
      catch { return [] } // feuille d'une autre origine : illisible, et sans nos polices
    })
    .filter((r): r is CSSFontFaceRule => r instanceof CSSFontFaceRule && /Carlito|Montserrat/.test(r.style.getPropertyValue('font-family')))
  const faces = await Promise.all(rules.map(async (rule) => {
    let css = rule.cssText
    for (const [, url] of css.matchAll(/url\("?([^")]+)"?\)/g)) {
      css = css.replace(url!, await toDataUrl(new URL(url!, rule.parentStyleSheet?.href ?? location.href).href))
    }
    return css
  }))
  return faces.join('\n')
}

export async function exportPng(l: Layout, name: string, scale = 2) {
  const svg = toSvg(l, `<style>${await embeddedFonts()}</style>`)
  const img = new Image()
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(l.width * scale)
    canvas.height = Math.round(l.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('image trop grande pour le navigateur')
    download(blob, `${name}.png`)
  }
  finally {
    URL.revokeObjectURL(img.src)
  }
}

// Slide 16:9 de PowerPoint : 13,333 x 7,5 pouces (960 x 540 pt).
export const SLIDE_IN = [13.333, 7.5] as const

/**
 * Où la timeline se pose sur la slide, en pouces : dans la zone utile sous le
 * titre, centrée en largeur. Partagé par l'export PPTX et l'aperçu de l'éditeur.
 */
export function slideFrame(l: Pick<Layout, 'width' | 'height'>) {
  const pt = Math.min(SLIDE_AREA_PT[0] / l.width, SLIDE_AREA_PT[1] / l.height) // points par px
  const k = pt / 72 // pouces par px
  return { pt, k, x: (SLIDE_IN[0] - l.width * k) / 2, y: 1.1, w: l.width * k, h: l.height * k }
}
/** Titre et sous-titre de la slide, en pouces et en points. */
export const SLIDE_TITLE = { x: 0.28, y: 0.22, w: 12.77, h: 0.6, size: 24 } as const
export const SLIDE_SUBTITLE = { x: 0.28, y: 0.74, w: 12.77, h: 0.3, size: 14 } as const
const hex = (c: string) => c.replace('#', '').toUpperCase()
// Carlito a les métriques de Calibri, présente partout où l'on ouvre un PPTX.
const face = (family: string) => (/Carlito/.test(family) ? 'Calibri' : family.split(',')[0]!.replace(/"/g, '').trim())

/** `l` doit être calculée sans le titre dans l'image : la slide porte déjà le sien. */
export async function exportPptx(l: Layout, t: Pick<Timeline, 'titre' | 'sousTitre'>, name: string) {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.title = t.titre
  const slide = pptx.addSlide()
  slide.background = { color: hex(l.background) }
  const { x: tx, y: ty, w: tw, h: th, size: ts } = SLIDE_TITLE
  slide.addText(t.titre, { x: tx, y: ty, w: tw, h: th, margin: 0, fontFace: 'Montserrat', fontSize: ts, bold: true, color: hex(l.palette.teal) })
  const sub = SLIDE_SUBTITLE
  if (t.sousTitre) slide.addText(t.sousTitre, { x: sub.x, y: sub.y, w: sub.w, h: sub.h, margin: 0, fontFace: 'Calibri', fontSize: sub.size, color: hex(l.palette.muted) })

  const { pt, k, x: ox, y: oy } = slideFrame(l)
  const X = (px: number) => ox + px * k
  const Y = (px: number) => oy + px * k

  const tips: string[] = []
  for (const p of l.scene) {
    if (p.t === 'poly') {
      const xs = p.points.map(q => q[0]), ys = p.points.map(q => q[1])
      const [x0, y0] = [Math.min(...xs), Math.min(...ys)]
      slide.addShape(pptx.ShapeType.custGeom, {
        x: X(x0), y: Y(y0), w: (Math.max(...xs) - x0) * k, h: (Math.max(...ys) - y0) * k,
        points: [...p.points.map(([x, y]) => ({ x: (x - x0) * k, y: (y - y0) * k })), { close: true as const }],
        fill: { color: hex(p.fill) },
        line: p.stroke ? { color: hex(p.stroke), width: p.strokeWidth! * pt } : { type: 'none' },
      })
    }
    else if (p.t === 'circle') {
      slide.addShape(pptx.ShapeType.ellipse, {
        x: X(p.cx - p.r), y: Y(p.cy - p.r), w: 2 * p.r * k, h: 2 * p.r * k,
        fill: { color: hex(p.fill) },
        line: p.stroke ? { color: hex(p.stroke), width: p.strokeWidth! * pt } : { type: 'none' },
      })
    }
    else if (p.t === 'line') {
      slide.addShape(pptx.ShapeType.line, {
        x: X(Math.min(p.x1, p.x2)), y: Y(Math.min(p.y1, p.y2)), w: Math.abs(p.x2 - p.x1) * k, h: Math.abs(p.y2 - p.y1) * k,
        line: { color: hex(p.stroke), width: p.width * pt, dashType: p.dash ? 'sysDash' : 'solid' },
      })
    }
    else if (p.t === 'rect') {
      slide.addShape(p.rx ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
        x: X(p.x), y: Y(p.y), w: p.w * k, h: p.h * k,
        ...(p.rx ? { rectRadius: p.rx * k } : {}),
        ...(p.fill !== 'none' ? { fill: { color: hex(p.fill) } } : {}),
        line: p.stroke ? { color: hex(p.stroke), width: (p.strokeWidth ?? 1) * pt } : { type: 'none' },
      })
    }
    else {
      if (p.tip) tips.push(p.tip)
      // Une zone par ligne, large et ancrée comme dans le SVG ; le haut de la zone
      // se place à la ligne de base moins la hauteur des capitales de Calibri.
      const BOX = 600
      const left = p.anchor === 'start' ? p.x : p.anchor === 'end' ? p.x - BOX : p.x - BOX / 2
      for (const line of p.lines) {
        slide.addText(line.text, {
          x: X(left), y: Y(line.y - line.size * 0.95), w: BOX * k, h: line.size * 1.25 * k,
          margin: 0, valign: 'top', align: p.anchor === 'start' ? 'left' : p.anchor === 'end' ? 'right' : 'center',
          fontFace: face(p.family), fontSize: Math.round(line.size * pt * 10) / 10, bold: line.weight >= 600, color: hex(line.color),
        })
      }
    }
  }
  if (tips.length) slide.addNotes(tips.join('\n'))
  await pptx.writeFile({ fileName: `${name}.pptx` })
}
