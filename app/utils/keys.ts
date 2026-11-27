/**
 * Les raccourcis de l'éditeur, tels qu'on les affiche : symboles sous macOS (⌘ ⌥ ⇧ ⌫),
 * noms ailleurs (Ctrl, Alt, Maj, Suppr). `aria` suit la syntaxe de `aria-keyshortcuts`.
 * Le gestionnaire qui les applique est `keys()`, dans `pages/editeur.vue`.
 */
const mac = import.meta.client && /Mac|iPhone|iPad/.test(navigator.platform)

export const MOD = mac ? '⌘' : 'Ctrl'

export const SHORTCUTS = {
  annuler: { label: mac ? '⌘Z' : 'Ctrl+Z', aria: mac ? 'Meta+Z' : 'Control+Z' },
  retablir: { label: mac ? '⇧⌘Z' : 'Ctrl+Y', aria: mac ? 'Shift+Meta+Z' : 'Control+Y' },
  supprimer: { label: mac ? '⌫' : 'Suppr', aria: mac ? 'Backspace' : 'Delete' },
  renommer: { label: mac ? '↩' : 'Entrée', aria: 'Enter F2' },
  monter: { label: mac ? '⌥↑' : 'Alt+↑', aria: 'Alt+ArrowUp' },
  descendre: { label: mac ? '⌥↓' : 'Alt+↓', aria: 'Alt+ArrowDown' },
}
