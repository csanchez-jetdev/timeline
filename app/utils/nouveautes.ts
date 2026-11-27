/**
 * Le journal des nouveautés, de la version la plus récente à la plus ancienne, affiché par
 * la page /nouveautes. Une entrée se lit sans connaître le code : elle dit ce qui change
 * pour la personne qui utilise l'outil. Publier une version : voir le README.
 */
export interface Version {
  version: string
  /** Date de publication, AAAA-MM-JJ. */
  date: string
  nouveau?: string[]
  ameliore?: string[]
  corrige?: string[]
}

export const NOUVEAUTES: Version[] = [
  {
    version: '0.1.0',
    date: '2026-11-26',
    nouveau: [
      'Un éditeur de timelines de projet : des projets en lignes, des phases en flèches, des jalons datés, modifiés directement sur le dessin.',
      'Trois exports : une image PNG, un PowerPoint aux formes modifiables, et le même fichier à importer dans Google Slides.',
      'Six styles, choisis sur des aperçus de votre propre timeline. Le fond est libre, et les types de jalon se renomment.',
      'Une échelle au mois, ou au jour quand la période dure deux mois au plus, avec les week-ends masquables.',
      'Une alerte quand un libellé deviendrait trop petit pour être lu sur la slide.',
      'Un lien de partage qui contient toute la timeline, et un fichier JSON pour la garder.',
      'Cinq exemples à ouvrir dans l\'éditeur : projet client, projet étudiant, roadmap produit, déménagement, congés d\'équipe.',
    ],
  },
]
