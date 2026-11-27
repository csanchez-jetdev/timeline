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
  pop.style.visibility = 'hidden'
  // Mesure après affichage : le popover n'a pas encore de taille avant le premier rendu.
  requestAnimationFrame(() => {
    const p = pop.getBoundingClientRect()
    const gap = 8
    let left = side === 'right' ? a.right + gap : side === 'left' ? a.left - p.width - gap : a.right - p.width
    let top = side === 'right' || side === 'left' ? a.top : side === 'below-end' ? a.bottom + gap : a.top - p.height - gap
    left = Math.max(gap, Math.min(left, innerWidth - p.width - gap))
    top = Math.max(gap, Math.min(top, innerHeight - p.height - gap))
    pop.style.left = `${left}px`
    pop.style.top = `${top}px`
    pop.style.visibility = ''
    // Un menu s'ouvre le focus sur sa première entrée ; Échap le ferme et rend le focus au bouton.
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
