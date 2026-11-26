/**
 * Contrôles du modèle, du lien et de la mise en page, sans navigateur :
 *
 *   node scripts/check.ts
 *
 * Sort en erreur au premier contrôle qui rate.
 */
import assert from 'node:assert/strict'
import { layout, SLIDE_WIDTH } from '../app/utils/layout.ts'
import { decodeTimeline, encodeTimeline, HASH_PREFIX } from '../app/utils/share.ts'
import { contrast } from '../app/utils/styles.ts'
import { sameRef } from '../app/utils/svg.ts'
import { EXEMPLE, EXEMPLES } from '../app/utils/exemples.ts'
import { bounds, fromDay, normalizeTimeline, STYLES, type Timeline, TimelineError, toDay } from '../app/utils/timeline.ts'

const clone = <T>(v: T): T => structuredClone(v)
const TODAY = '2026-11-25'
// Toutes les options à la fois : fond sombre, titre dans l'image, dates masquées, repère du jour.
const complet: Timeline = { ...clone(EXEMPLE), sousTitre: 'Comité du 25/11', fond: '#1f2d5c', affichage: { aujourdhui: true, titre: true, dates: false, weekends: false }, libelles: { gouvernance: 'COPIL', sprint_review: 'Sprint review' }, marques: { atelier: { forme: 'triangle' }, gouvernance: { couleur: 'bleu', forme: 'etoile' }, livraison: { forme: 'carre' }, retour: { couleur: 'violet' } } }
const rejects = (raw: unknown, expected: string) =>
  assert.throws(() => normalizeTimeline(raw), (e: unknown) => e instanceof TimelineError && e.message === expected, expected)

// Le modèle : les exemples passent tels quels, une erreur nomme le champ fautif.
for (const e of EXEMPLES) assert.deepEqual(normalizeTimeline(clone(e.timeline)), e.timeline, e.slug)
{
  const t = clone(EXEMPLE) as any
  t.projets[2].jalons[1].date = '2026-02-30'
  rejects(t, 'projets[2] (Migration des données) > jalons[1] > date : date invalide (AAAA-MM-JJ)')
  t.projets[2].jalons[1].date = '2027-12-01'
  rejects(t, 'projets[2] (Migration des données) : le 01/12/2027 sort de la période, à élargir')
  t.projets[2].jalons[1] = { date: '2026-12-07', titel: 'faute' }
  rejects(t, 'projets[2] (Migration des données) > jalons[1] > titel : champ inconnu (attendus : date, type, titre, detail)')
  rejects({ projets: [{ nom: 'A', phases: [{ nom: 'X', debut: '2026-01-01', couleur: 'rouge' }] }] },
    'projets[0] (A) > phases[0] > couleur : valeur inconnue (attendues : bleu, orange, vert, violet, gris, vert_clair)')
}
assert.deepEqual(normalizeTimeline(clone(complet)), complet)
rejects({ fond: 'bleu', projets: [] }, 'fond : couleur attendue (#rrggbb)')
rejects({ affichage: { legend: false }, projets: [] }, 'affichage > legend : champ inconnu (attendus : aujourdhui, legende, titre, dates, weekends)')
rejects({ affichage: { dates: 'non' }, projets: [] }, 'affichage > dates : vrai ou faux attendu')
assert.equal(normalizeTimeline({ affichage: {}, projets: [] }).affichage, undefined)
rejects({ libelles: { jalon: 'X' }, projets: [] }, 'libelles > jalon : champ inconnu (attendus : atelier, sprint_review, livraison, gouvernance, retour)')
assert.equal(normalizeTimeline({ libelles: { atelier: ' ' }, projets: [] }).libelles, undefined)
rejects({ marques: { gouvernance: { forme: 'drapeau' } }, projets: [] }, 'marques > gouvernance > forme : valeur inconnue (attendues : losange, rond, carre, triangle, etoile)')
rejects({ marques: { gouvernance: { teinte: 'bleu' } }, projets: [] }, 'marques > gouvernance > teinte : champ inconnu (attendus : couleur, forme)')
assert.equal(normalizeTimeline({ marques: { atelier: {} }, projets: [] }).marques, undefined)
// Un type renommé l'est dans la légende ; deux types au même jalon partagent une entrée.
{
  const legende = (t: Timeline) => layout(t, { measure: (s: string) => s.length * 7 }).scene.flatMap(p => (p.t === 'text' && !p.ref && !p.halo ? p.lines.map(l => l.text) : []))
  assert.ok(legende(EXEMPLE).includes('Rendez-vous ou atelier, démo'))
  const renomme = legende({ ...EXEMPLE, libelles: { gouvernance: 'COPIL', sprint_review: 'Sprint review' } })
  assert.ok(renomme.includes('COPIL') && renomme.includes('Rendez-vous ou atelier, Sprint review'), renomme.join(' | '))
  // Une forme propre à un type le sépare dans la légende, et change son dessin partout.
  const etoile: Timeline = { ...EXEMPLE, marques: { sprint_review: { forme: 'etoile', couleur: 'orange' } } }
  assert.ok(legende(etoile).includes('Rendez-vous ou atelier') && legende(etoile).includes('Démo'), legende(etoile).join(' | '))
  const branches = (t: Timeline) => layout(t, { measure: (s: string) => s.length * 7 }).scene.filter(p => p.t === 'poly' && p.points.length === 10).length
  const demos = EXEMPLE.projets.flatMap(p => p.jalons).filter(j => j.type === 'sprint_review').length
  assert.equal(branches(EXEMPLE), 0)
  assert.equal(branches(etoile), demos + 1)
}
// Valeurs par défaut et champs vides retirés.
assert.deepEqual(
  normalizeTimeline({ projets: [{ nom: ' A ', jalons: [{ date: '2026-01-05', titre: '' }] }] }),
  { titre: 'Sans titre', projets: [{ nom: 'A', phases: [], jalons: [{ date: '2026-01-05', type: 'atelier' }] }] },
)

console.log('modèle : ok')

// La mise en page, avec une mesure de texte approchée (pas de canvas dans Node).
const measure = (text: string, weight: number, size: number) => text.length * size * (weight >= 600 ? 0.56 : 0.5)
// Les congés sur fond sombre : les numéros des jours aussi doivent se lire.
const congesSombre: Timeline = { ...EXEMPLES.find(e => e.slug === 'conges-equipe')!.timeline, fond: '#1f2d5c' }
const cas: [string, Timeline][] = [...EXEMPLES.map((e): [string, Timeline] => [e.slug, e.timeline]), ['complet', complet], ['conges-sombre', congesSombre]]
for (const [name, t] of cas) for (const style of STYLES) {
  for (const width of [SLIDE_WIDTH, SLIDE_WIDTH * 2]) {
    const l = layout(t, { measure, style, width, today: TODAY })
    const where = `${name} ${style} ${width}`
    assert.deepEqual(l.warnings, [], `${where} : avertissements`)
    // Tout texte se lit à 3:1 au moins, contre la forme qu'il recouvre ou contre le fond.
    for (const p of l.scene) {
      if (p.t !== 'text') continue
      const under = !p.halo && p.ref && (p.ref.kind === 'phase' || p.anchor === 'middle')
        ? l.scene.find(q => (q.t === 'poly' || q.t === 'rect') && sameRef(q.ref, p.ref))
        : undefined
      const ground = under && 'fill' in under ? under.fill : l.background
      for (const line of p.lines) assert.ok(contrast(line.color, ground) >= 3, `${where} : « ${line.text} » à ${contrast(line.color, ground).toFixed(2)}:1`)
    }
    // Une boîte par libellé de jalon, dans l'ordre de leurs traits.
    const labels = l.scene.flatMap((p) => {
      if (p.t !== 'text' || !p.tip) return []
      const w = Math.max(...p.lines.map(line => measure(line.text, line.weight, line.size)))
      const left = p.anchor === 'middle' ? p.x - w / 2 : p.anchor === 'start' ? p.x : p.x - w
      return [{ left, right: left + w, top: p.lines[0]!.y - 12.5, bottom: p.lines.at(-1)!.y + 3.5 }]
    })
    const stems = l.scene.filter(p => p.t === 'line' && p.width === 1.3) as { x1: number, y1: number, y2: number }[]
    assert.equal(labels.length, stems.length, `${where} : un trait par libellé`)
    labels.forEach((a, i) => labels.slice(i + 1).forEach((b) => {
      assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, `${where} : libellés qui se chevauchent`)
    }))
    stems.forEach((s, i) => labels.forEach((b, j) => {
      if (i === j) return
      const [y1, y2] = [Math.min(s.y1, s.y2), Math.max(s.y1, s.y2)]
      assert.ok(s.x1 < b.left || s.x1 > b.right || y2 <= b.top || y1 >= b.bottom, `${where} : un trait traverse un libellé`)
    }))
    // L'échelle croît avec les jours, et une abscisse redonne sa date.
    const { debut, fin } = bounds(t)
    let prev = -Infinity
    for (let d = toDay(debut); d <= toDay(fin); d++) {
      const s = fromDay(d)
      // Un week-end masqué n'a pas de largeur : le bloc « échelle au jour » le vérifie à part.
      if (l.x(s, 1) === l.x(s, 0)) continue
      assert.ok(l.x(s) > prev, `x() croissante au ${s}`)
      assert.equal(l.dateAt(l.x(s)), s)
      prev = l.x(s)
    }
  }
}
// Le titre dans l'image descend les lignes sans toucher à l'échelle du temps.
{
  const sans = layout(EXEMPLE, { measure })
  const avec = layout({ ...EXEMPLE, affichage: { titre: true } }, { measure })
  assert.ok(avec.y0 > 0 && avec.rows[0]!.top === sans.rows[0]!.top + avec.y0)
  assert.equal(avec.x(TODAY), sans.x(TODAY))
}
// Le repère du jour : un trait en tirets dans la période, rien hors de la période.
{
  const t = { ...EXEMPLE, affichage: { aujourdhui: true, legende: false } }
  const repere = (today: string) => layout(t, { measure, today }).scene.filter(p => p.t === 'line' && p.dash === '6 4').length
  assert.equal(repere(TODAY), 1)
  assert.equal(repere('2030-01-01'), 0)
}
// L'échelle au jour : jusqu'à deux mois, les mois au-dessus et un numéro par jour ; au-delà, les mois seuls.
{
  const entete = (t: Timeline) => layout(t, { measure }).scene.flatMap(p => (p.t === 'text' && !p.ref && !p.halo ? p.lines.map(l => l.text) : []))
  const courte = normalizeTimeline({ periode: { debut: '2026-12-21', fin: '2027-01-06' }, projets: [{ nom: 'A', phases: [{ nom: 'Congés', debut: '2026-12-23', fin: '2026-12-31' }] }] })
  const jours = entete(courte)
  for (const s of ['DÉCEMBRE 2026', 'JANVIER 2027', '21', '26', '31', '1', '6']) assert.ok(jours.includes(s), `échelle au jour : « ${s} » absent de ${jours.join(' | ')}`)
  const l = layout(courte, { measure })
  assert.equal(l.x('2026-12-21', 0), l.x0)
  assert.ok(Math.abs(l.x('2027-01-06', 1) - l.x1) < 1e-6)
  assert.ok(!entete(EXEMPLE).includes('15'), 'projet client : échelle au mois')
  // Week-ends masqués : plus de colonne, une fin de dimanche tombe sur le début du lundi.
  const ouvres = { ...courte, affichage: { weekends: false } }
  assert.ok(!entete(ouvres).includes('26') && !entete(ouvres).includes('27') && entete(ouvres).includes('28'))
  const o = layout(ouvres, { measure })
  assert.equal(o.x('2026-12-27', 1), o.x('2026-12-28', 0))
  assert.ok(o.x('2026-12-28', 1) > o.x('2026-12-28', 0))
  assert.equal(o.dateAt(o.x('2026-12-26', 0)), '2026-12-28')
  assert.equal(o.dateAt(o.x1 + 50), '2027-01-06')
  // Une période faite d'un seul week-end garde ses deux colonnes.
  const samedi = layout({ ...ouvres, periode: { debut: '2026-12-26', fin: '2026-12-27' }, projets: [] }, { measure })
  assert.ok(samedi.x('2026-12-26', 1) > samedi.x('2026-12-26', 0))
}
// Dates masquées : un jalon sans titre n'a plus de libellé, donc plus de trait.
{
  const t = clone(EXEMPLE)
  delete t.projets[0]!.jalons[0]!.titre
  const traits = (dates: boolean) => layout({ ...t, affichage: { dates } }, { measure }).scene.filter(p => p.t === 'line' && p.width === 1.3).length
  assert.equal(traits(true) - traits(false), 1)
}
console.log('mise en page : ok')

// Le lien : l'aller-retour rend exactement la timeline, un lien abîmé est refusé proprement.
{
  const grand = normalizeTimeline({ titre: 'Grand', projets: Array.from({ length: 6 }, () => clone(EXEMPLE.projets)).flat() })
  const vide = normalizeTimeline({ projets: [] })
  for (const t of [EXEMPLE, complet, grand, vide]) assert.deepEqual(await decodeTimeline(await encodeTimeline(t)), t)
  // Un lien d'avant les options (deux premiers projets de l'exemple) s'ouvre toujours à l'identique.
  const ancien = 'fZLNbhshFIVfBd31RBpm_MsuSruoFDdW3F3lBYFrlxYDASaKFfmB_Bx-sQoG2-Oo6g7pfNyfc88HeGDQ1M3krp7f1RQqiMDgGTfWRCSyI876yJUmQis0ESoIwGgFDlhDaQUa2M8P-AMMlumzSY_PPzaZSdIDl55vESqQwCYVILB2VoEARg9Vj3w5Hd9QW-dwhyaGHh3RzNJxneH6DD-jwBhLPTpuszo-rCv4nXtKYNMK9sDafq9HbkSuC6mCBNbeyA9Py2-PRCIRZc5CjeeZooWyxuC7soZ0Rm3U6Zj6v98IjnuStic7vlWvHRKMZLV6ImiiR-dVuJSeTYelvwbHBRJpRddvXyhaz4bYqlNvikgMROKOG4lXsJ1kcHS-Y7SdJ11UWgUesfOhzNorgZyOwqsY8qW5QU2c0jZexsue7oE1fb2FCkjQEF98P1Pz8b8o563sRFTWwGGd0ByTpsTk3jmtBE8y2dkXpfEmKgv-2qUeJQHtKCdg2p-4_W9appOSkmEOUnT2wOp-xPuIWqFPhxLJh_Mm02ZI_cAQs827yzCXg9DhQb7bqDZlmSszaofMwkokv6wPRKutuXo3u_Fu2b1cXAnR-tRyfVgf_gI'
  assert.deepEqual(await decodeTimeline(ancien), { ...clone(EXEMPLE), projets: EXEMPLE.projets.slice(0, 2) })
  const payload = await encodeTimeline(EXEMPLE)
  for (const bad of [payload.slice(0, -20), 'abc$', '']) {
    await assert.rejects(decodeTimeline(bad), TimelineError)
  }
  console.log(`lien : ok (exemple ${HASH_PREFIX.length + payload.length} caractères, ${grand.projets.length} projets ${(await encodeTimeline(grand)).length})`)
}
