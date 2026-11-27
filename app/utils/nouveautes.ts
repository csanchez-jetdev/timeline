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
    version: '0.2.0',
    date: '2026-11-27',
    nouveau: [
      'Deux styles de plus : Gantt, en blocs sur des lignes zébrées, et Roadmap, aux couleurs vives et aux barres arrondies.',
      'Plusieurs timelines gardées dans ce navigateur, sur la page Mes timelines : les ouvrir, les dupliquer, les supprimer.',
      'Un assistant de création : partir d\'une page vide ou d\'un exemple, puis choisir le titre, la période et le style.',
      'Un menu au clic droit sur la timeline : ajouter un jalon ou un projet, renommer, monter, descendre, supprimer, annuler.',
      'Un projet s\'ajoute depuis la ligne sous la timeline, et un double-clic sur un élément le renomme.',
      'Une visite guidée de l\'éditeur et un menu Aide.',
      'Un sixième exemple, les vacances en famille, avec des types de jalon renommés : Sortie, Trajet, Date limite.',
    ],
    ameliore: [
      'Un seul menu Exporter réunit les exports, le lien de partage et le fichier JSON.',
      'Les menus affichent leurs raccourcis clavier.',
      'Les réglages de la timeline se rangent en deux parties, Paramètres et Apparence, et le panneau Propriétés se masque depuis son en-tête.',
      'Un fil d\'Ariane dans la barre de l\'éditeur ramène à Mes timelines.',
      'L\'accueil part de votre usage : un exemple par besoin, les gestes de l\'éditeur filmés, les styles, la slide à télécharger et le lien de partage.',
    ],
    corrige: [
      'Le menu des styles de l\'éditeur dépassait du bas de l\'écran.',
    ],
  },
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
