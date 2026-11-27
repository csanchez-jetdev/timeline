/**
 * Place un popover natif (`popover` + `popovertarget`) à côté du bouton qui
 * l'ouvre, au moment où il s'ouvre : `@beforetoggle="place($event, 'right')"`.
 * Le positionnement par ancre CSS n'est pas encore partout ; ceci suffit.
 */
export function place(e: Event, side: 'right' | 'left' | 'below-end' | 'above-end' = 'right') {
  const pop = e.target as HTMLElement
  if ((e as ToggleEvent).newState !== 'open') return
  const anchor = document.querySelector<HTMLElement>(`[popovertarget="${pop.id}"]`)
  if (!anchor) return
  const a = anchor.getBoundingClientRect()
  const gap = 8
  position(pop, p => [
    side === 'right' ? a.right + gap : side === 'left' ? a.left - p.width - gap : a.right - p.width,
    side === 'right' || side === 'left' ? a.top : side === 'below-end' ? a.bottom + gap : a.top - p.height - gap,
  ])
}

/** Ouvre un popover au point (x, y) de la fenêtre, sans qu'il en déborde : un menu contextuel. */
export function placeAt(pop: HTMLElement, x: number, y: number) {
  pop.showPopover()
  position(pop, () => [x, y])
}

// Mesure après affichage : le popover n'a pas encore de taille avant le premier rendu.
function position(pop: HTMLElement, at: (p: DOMRect) => [number, number]) {
  pop.style.visibility = 'hidden'
  requestAnimationFrame(() => {
    const p = pop.getBoundingClientRect()
    const gap = 8
    const [left, top] = at(p)
    pop.style.left = `${Math.max(gap, Math.min(left, innerWidth - p.width - gap))}px`
    pop.style.top = `${Math.max(gap, Math.min(top, innerHeight - p.height - gap))}px`
    pop.style.visibility = ''
    // Un menu s'ouvre le focus sur sa première entrée ; Échap le ferme et rend le focus.
    if (pop.role === 'menu') items(pop)[0]?.focus()
  })
}

const items = (menu: HTMLElement) => [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]:not(:disabled)')]

/** Dans un menu (`@keydown="menuKeys"`) : flèches haut et bas, Début, Fin. */
export function menuKeys(e: KeyboardEvent) {
  const all = items(e.currentTarget as HTMLElement)
  const i = all.indexOf(document.activeElement as HTMLElement)
  const next = ({ ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 } as Record<string, number>)[e.key]
  if (next === undefined) return
  e.preventDefault()
  all[(next + all.length) % all.length]?.focus()
}
