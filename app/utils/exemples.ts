/**
 * Les exemples des pages publiques, un par public. Fictifs : aucune date
 * officielle, aucun nom réel. Chacun montre un style différent, sauf les congés
 * qui reprennent Cahier : ses barres et ses pointillés de semaine conviennent à
 * un planning de congés. Les vacances reprennent Frise, ses flèches suivent le voyage.
 */
import type { Timeline } from './timeline.ts'

export interface Exemple {
  slug: string
  /** Pour qui, en quelques mots. */
  public: string
  /** Titre de la page d'exemple. */
  titre: string
  /** Une ou deux phrases sous le titre. */
  accroche: string
  /** Trois conseils pour ce public, qui ne citent que ce que l'outil fait vraiment. */
  conseils: { titre: string, texte: string }[]
  timeline: Timeline
}

/** L'avis à l'ouverture d'un exemple dans l'éditeur. */
export const EXEMPLE_OUVERT = 'Exemple ouvert : cette copie est à vous, modifiez-la librement.'

export const EXEMPLES: Exemple[] = [
  {
    slug: 'projet-client',
    public: 'Chefs de projet et consultants',
    titre: 'Le planning de votre prochain comité de pilotage',
    accroche: 'Phases, démos, mises en production : tout le projet sur une slide, prête à projeter.',
    conseils: [
      { titre: 'Avant le comité', texte: 'Une ligne par chantier, avec un code court (P1, P2) si votre client les numérote. Renommez les types de jalon dans la légende pour reprendre ses mots : « Décision » peut devenir « COPIL ». Si les libellés deviennent trop petits pour la slide, l\'éditeur vous le signale avant l\'export.' },
      { titre: 'Pour la présentation', texte: 'Le mode Aperçu montre la slide telle qu\'elle sortira. Le PowerPoint garde des formes modifiables : un libellé se corrige dans la slide, sans revenir à l\'outil. Le détail de chaque jalon part dans les notes, pour la personne qui présente.' },
      { titre: 'D\'un comité à l\'autre', texte: 'Enregistrez le fichier JSON avec les documents du projet. Au comité suivant, rouvrez-le, tirez les phases qui ont glissé, puis exportez à nouveau. Le lien de partage contient toute la timeline : ne l\'envoyez qu\'aux personnes autorisées à la lire.' },
    ],
    timeline: {
      titre: 'Refonte du portail client',
      style: 'frise',
      periode: { debut: '2026-09-01', fin: '2027-03-31' },
      projets: [
        {
          code: 'P1',
          nom: 'Portail client',
          phases: [
            { nom: 'Cadrage', debut: '2026-09-07', fin: '2026-10-09', couleur: 'orange' },
            { nom: 'Développements', debut: '2026-10-12', fin: '2027-01-29', couleur: 'bleu' },
            { nom: 'Recette', debut: '2027-02-01', couleur: 'vert_clair' },
          ],
          jalons: [
            { date: '2026-09-08', type: 'gouvernance', titre: 'Lancement' },
            { date: '2026-10-08', type: 'gouvernance', titre: 'COPIL de cadrage' },
            { date: '2026-10-30', type: 'sprint_review', titre: 'Connexion unifiée', detail: 'Connexion par lien magique et SSO entreprise' },
            { date: '2026-11-27', type: 'sprint_review', titre: 'Espace documents' },
            { date: '2026-12-18', type: 'sprint_review', titre: 'Suivi des demandes' },
            { date: '2027-01-15', type: 'retour', titre: 'Retour utilisateurs', detail: 'Retours écrits du panel pilote' },
            { date: '2027-02-01', type: 'livraison', titre: 'Mise en recette' },
            { date: '2027-03-15', type: 'livraison', titre: 'Mise en production' },
          ],
        },
        {
          code: 'P2',
          nom: 'Application mobile',
          phases: [
            { nom: 'Maquettes', debut: '2026-10-05', fin: '2026-11-13', couleur: 'violet' },
            { nom: 'Développements', debut: '2026-11-16', couleur: 'bleu' },
          ],
          jalons: [
            { date: '2026-10-21', type: 'atelier', titre: 'Atelier parcours' },
            { date: '2026-11-12', type: 'atelier', titre: 'Test des maquettes' },
            { date: '2026-12-11', type: 'sprint_review', titre: 'Notifications' },
            { date: '2027-01-22', type: 'sprint_review', titre: 'Mode hors ligne' },
            { date: '2027-03-05', type: 'livraison', titre: 'Publication stores' },
          ],
        },
        {
          nom: 'Migration des données',
          phases: [
            { nom: 'Analyse', debut: '2026-09-14', fin: '2026-10-30', couleur: 'bleu' },
            { nom: 'En attente', debut: '2026-11-02', fin: '2026-12-04', couleur: 'gris' },
            { nom: 'Migration', debut: '2026-12-07', fin: '2027-02-26', couleur: 'bleu' },
          ],
          jalons: [
            { date: '2026-10-29', type: 'gouvernance', titre: 'Arbitrage du périmètre' },
            { date: '2026-12-07', type: 'atelier', titre: 'Reprise' },
            { date: '2027-01-29', type: 'livraison', titre: 'Migration à blanc' },
            { date: '2027-02-26', type: 'livraison', titre: 'Bascule' },
          ],
        },
        {
          nom: 'Accompagnement',
          phases: [{ nom: 'Conduite du changement', debut: '2027-01-04', couleur: 'vert' }],
          jalons: [
            { date: '2027-01-12', type: 'atelier', titre: 'Formation des relais' },
            { date: '2027-02-16', type: 'atelier', titre: 'Démo aux équipes' },
            { date: '2027-03-23', type: 'gouvernance', titre: 'Bilan' },
          ],
        },
      ],
    },
  },
  {
    slug: 'projet-etudiant',
    public: 'Élèves, étudiants et enseignants',
    titre: 'Un projet de groupe, du sujet à la soutenance',
    accroche: 'Les rendus, les revues avec le tuteur et la soutenance sur une seule frise, que tout le groupe peut ouvrir.',
    conseils: [
      { titre: 'Au lancement', texte: 'Posez d\'abord les dates imposées : rendus, revues avec le tuteur, soutenance. Chacune devient un jalon. Renommez les types dans la légende : « Livraison ou rendu » en « Rendu », « Démo » en « Revue tuteur ». Les phases se dessinent ensuite entre ces dates.' },
      { titre: 'Pendant le projet', texte: 'Copiez le lien de partage dans la conversation du groupe : il s\'ouvre sans compte et contient toute la frise. Le lien est une copie : quand quelqu\'un modifie la frise, il envoie un nouveau lien. Pour garder une version de référence, enregistrez aussi le fichier JSON.' },
      { titre: 'Pour le rapport et la soutenance', texte: 'L\'image PNG se colle dans le rapport. Le style Contraste, en noir et gris, reste lisible à l\'impression sans couleur. Pour la soutenance, exportez en PowerPoint, ou importez ce même fichier dans Google Slides.' },
    ],
    timeline: {
      titre: 'Projet tutoré : covoiturage du campus',
      sousTitre: 'Licence professionnelle, groupe de quatre',
      style: 'cahier',
      periode: { debut: '2026-10-01', fin: '2027-04-30' },
      projets: [
        {
          nom: 'Conception',
          phases: [
            { nom: 'Besoins', debut: '2026-10-05', fin: '2026-10-30', couleur: 'orange' },
            { nom: 'Maquettes', debut: '2026-11-02', fin: '2026-11-27', couleur: 'violet' },
          ],
          jalons: [
            { date: '2026-10-09', type: 'atelier', titre: 'Entretiens étudiants' },
            { date: '2026-10-30', type: 'gouvernance', titre: 'Sujet validé' },
            { date: '2026-11-26', type: 'sprint_review', titre: 'Revue des maquettes' },
          ],
        },
        {
          nom: 'Développement',
          phases: [
            { nom: 'Sprint 1', debut: '2026-11-30', fin: '2026-12-18', couleur: 'bleu' },
            { nom: 'Pause', debut: '2026-12-21', fin: '2027-01-01', couleur: 'gris' },
            { nom: 'Sprint 2', debut: '2027-01-04', fin: '2027-01-29', couleur: 'bleu' },
            { nom: 'Sprint 3', debut: '2027-02-01', fin: '2027-02-26', couleur: 'bleu' },
          ],
          jalons: [
            { date: '2026-12-18', type: 'sprint_review', titre: 'Démo au tuteur' },
            { date: '2027-01-29', type: 'sprint_review', titre: 'Démo de mi-parcours' },
            { date: '2027-02-26', type: 'livraison', titre: 'Version testable' },
          ],
        },
        {
          nom: 'Rapport',
          phases: [
            { nom: 'Plan', debut: '2027-01-11', fin: '2027-01-22', couleur: 'vert_clair' },
            { nom: 'Rédaction', debut: '2027-02-01', fin: '2027-03-19', couleur: 'vert' },
          ],
          jalons: [
            { date: '2027-01-22', type: 'retour', titre: 'Avis du tuteur sur le plan' },
            { date: '2027-03-19', type: 'livraison', titre: 'Rapport rendu' },
          ],
        },
        {
          nom: 'Soutenance',
          phases: [{ nom: 'Préparation', debut: '2027-03-01', fin: '2027-04-09', couleur: 'orange' }],
          jalons: [
            { date: '2027-04-02', type: 'atelier', titre: 'Oral blanc' },
            { date: '2027-04-12', type: 'gouvernance', titre: 'Soutenance' },
          ],
        },
      ],
    },
  },
  {
    slug: 'roadmap-produit',
    public: 'Équipes produit',
    titre: 'Une roadmap qui tient sur une slide',
    accroche: 'Chaque chantier sur sa ligne, de la recherche à la mise en ligne, pour la revue de trimestre.',
    conseils: [
      { titre: 'Préparer la revue', texte: 'Un chantier par ligne, chacun avec les mêmes étapes : recherche, réalisation, ouverture. Quand la fin d\'un chantier n\'est pas encore fixée, cochez « Jusqu\'au bout de la période » : la phase s\'étend jusqu\'à la fin de la frise.' },
      { titre: 'Le jour de la revue', texte: 'Cochez le repère « aujourd\'hui » dans les réglages de la timeline : un trait marque la date du jour et montre où en est l\'équipe. Le style Épure retire le quadrillage des mois.' },
      { titre: 'D\'un trimestre à l\'autre', texte: 'Rangez le fichier JSON avec la documentation du produit : c\'est du texte, il se versionne et se compare d\'une revue à l\'autre. Pour la revue suivante, rouvrez-le, décalez les phases et exportez.' },
    ],
    timeline: {
      titre: "Roadmap 2027 de l'application",
      style: 'epure',
      periode: { debut: '2027-01-01', fin: '2027-09-30' },
      projets: [
        {
          nom: 'Paiement',
          phases: [
            { nom: 'Recherche', debut: '2027-01-04', fin: '2027-02-12', couleur: 'violet' },
            { nom: 'Réalisation', debut: '2027-02-15', fin: '2027-05-28', couleur: 'bleu' },
            { nom: 'Ouverture', debut: '2027-06-01', fin: '2027-06-30', couleur: 'vert' },
          ],
          jalons: [
            { date: '2027-02-12', type: 'gouvernance', titre: 'Go ou no go' },
            { date: '2027-04-15', type: 'sprint_review', titre: 'Démo interne' },
            { date: '2027-06-01', type: 'livraison', titre: 'Bêta à 10 %' },
            { date: '2027-06-30', type: 'livraison', titre: 'Ouvert à tous' },
          ],
        },
        {
          nom: 'Recherche',
          phases: [
            { nom: 'Exploration', debut: '2027-03-01', fin: '2027-04-09', couleur: 'violet' },
            { nom: 'Réalisation', debut: '2027-04-12', fin: '2027-07-30', couleur: 'bleu' },
          ],
          jalons: [
            { date: '2027-03-25', type: 'atelier', titre: 'Tests utilisateurs' },
            { date: '2027-07-30', type: 'livraison', titre: 'Nouvelle recherche' },
          ],
        },
        {
          nom: 'Hors ligne',
          phases: [{ nom: 'Réalisation', debut: '2027-05-03', fin: '2027-09-24', couleur: 'bleu' }],
          jalons: [
            { date: '2027-07-08', type: 'sprint_review', titre: 'Testeurs internes' },
            { date: '2027-09-24', type: 'livraison', titre: 'Mode hors ligne' },
          ],
        },
        {
          nom: 'Plateforme',
          phases: [
            { nom: 'API v2', debut: '2027-01-04', fin: '2027-03-26', couleur: 'gris' },
            { nom: 'Supervision', debut: '2027-04-05', fin: '2027-06-25', couleur: 'vert_clair' },
          ],
          jalons: [
            { date: '2027-03-26', type: 'livraison', titre: 'API v2 en ligne' },
            { date: '2027-06-25', type: 'retour', titre: 'Bilan des incidents' },
          ],
        },
      ],
    },
  },
  {
    slug: 'demenagement',
    public: 'Tout le monde',
    titre: 'Un déménagement sans rien oublier',
    accroche: 'Le bail, le préavis, les cartons et les travaux, chacun sur sa ligne, avec les dates qui comptent.',
    conseils: [
      { titre: 'Les dates qui ne bougent pas', texte: 'Commencez par les dates fixées par d\'autres : fin du préavis, remise des clés, jour J. Chacune devient un jalon. Son détail peut garder l\'heure du rendez-vous ou le numéro à appeler.' },
      { titre: 'Puis le reste', texte: 'Dessinez ensuite les phases entre ces dates : recherche, cartons, travaux. Quand un rendez-vous change, faites glisser son jalon à la nouvelle date.' },
      { titre: 'Garder le fil', texte: 'La timeline reste dans ce navigateur, sur cet appareil : vous la retrouvez dans Mes timelines. Pour la transmettre aux personnes qui déménagent avec vous, envoyez le lien. Pour l\'avoir sous les yeux, exportez une image.' },
    ],
    timeline: {
      titre: 'Déménagement à Lyon',
      style: 'chevrons',
      periode: { debut: '2027-03-01', fin: '2027-07-31' },
      projets: [
        {
          nom: 'Logement',
          phases: [
            { nom: 'Recherche', debut: '2027-03-01', fin: '2027-04-16', couleur: 'bleu' },
            { nom: 'Dossier et bail', debut: '2027-04-19', fin: '2027-05-14', couleur: 'orange' },
          ],
          jalons: [
            { date: '2027-03-20', type: 'atelier', titre: 'Visites' },
            { date: '2027-04-23', type: 'gouvernance', titre: 'Dossier accepté' },
            { date: '2027-05-14', type: 'livraison', titre: 'Bail signé' },
          ],
        },
        {
          nom: 'Administratif',
          phases: [
            { nom: 'Préavis', debut: '2027-04-26', fin: '2027-05-26', couleur: 'gris' },
            { nom: "Changements d'adresse", debut: '2027-06-01', fin: '2027-06-30', couleur: 'violet' },
          ],
          jalons: [
            { date: '2027-04-26', type: 'livraison', titre: 'Préavis envoyé' },
            { date: '2027-06-04', type: 'atelier', titre: 'Rendez-vous banque' },
          ],
        },
        {
          nom: 'Cartons',
          phases: [
            { nom: 'Tri et dons', debut: '2027-05-03', fin: '2027-05-28', couleur: 'vert_clair' },
            { nom: 'Cartons', debut: '2027-05-31', fin: '2027-06-18', couleur: 'orange' },
          ],
          jalons: [
            { date: '2027-05-15', type: 'atelier', titre: 'Vide-grenier' },
            { date: '2027-06-19', type: 'gouvernance', titre: 'Jour J' },
          ],
        },
        {
          nom: 'Nouvel appartement',
          phases: [
            { nom: 'Peinture', debut: '2027-05-17', fin: '2027-06-11', couleur: 'vert' },
            { nom: 'Installation', debut: '2027-06-21', fin: '2027-07-16', couleur: 'bleu' },
          ],
          jalons: [
            { date: '2027-05-15', type: 'livraison', titre: 'Remise des clés' },
            { date: '2027-07-03', type: 'atelier', titre: 'Crémaillère' },
          ],
        },
      ],
    },
  },
  {
    slug: 'conges-equipe',
    public: 'Managers et équipes',
    titre: 'Les congés de l\'équipe pendant les fêtes',
    accroche: 'Qui part quand, jour par jour : les journées où l\'équipe est réduite se voient d\'un coup d\'œil.',
    conseils: [
      { titre: 'Une ligne par personne', texte: 'Ajoutez une ligne par personne, puis une phase par période d\'absence : une personne peut en avoir plusieurs. Écrivez les dates dans le nom de la phase, « 21 au 27/12 » : elles se lisent dans la barre. Une personne qui reste garde sa ligne vide.' },
      { titre: 'Un jour par colonne', texte: 'Sur une période de deux mois ou moins, l\'axe montre chaque jour. Choisissez la période au jour près dans le panneau de la timeline, puis décochez « Week-ends » : il ne reste que les jours travaillés, séparés par semaine.' },
      { titre: 'Pour l\'envoyer', texte: 'Exportez une image PNG à coller dans un mail, ou le PowerPoint pour le point d\'équipe. Le lien de partage contient tous les noms et toutes les dates : ne l\'envoyez qu\'aux personnes concernées.' },
    ],
    timeline: {
      titre: 'Congés de fin d\'année',
      style: 'cahier',
      affichage: { weekends: false },
      periode: { debut: '2026-12-21', fin: '2027-01-06' },
      projets: [
        { nom: 'Hélène', phases: [{ nom: '23 au 31/12', debut: '2026-12-23', fin: '2026-12-31', couleur: 'bleu' }], jalons: [] },
        { nom: 'Mathis', phases: [], jalons: [] },
        { nom: 'Inès', phases: [{ nom: '21/12 au 03/01', debut: '2026-12-21', fin: '2027-01-03', couleur: 'violet' }], jalons: [] },
        {
          nom: 'Julien',
          phases: [
            { nom: '21 au 27/12', debut: '2026-12-21', fin: '2026-12-27', couleur: 'orange' },
            { nom: '30/12 au 06/01', debut: '2026-12-30', fin: '2027-01-06', couleur: 'orange' },
          ],
          jalons: [],
        },
      ],
    },
  },
  {
    slug: 'vacances',
    public: 'Familles',
    titre: 'L\'été de toute la famille, jour par jour',
    accroche: 'Les stages des enfants, le voyage et les dates limites des réservations sur une seule frise : vous voyez qui est où, et ce qu\'il reste à régler.',
    conseils: [
      { titre: 'Une ligne par personne', texte: 'Une phase par séjour, une couleur par lieu : stage, centre de loisirs, grands-parents. Les jours sans phase sont ceux qui restent à organiser. Le voyage a sa propre ligne, avec les hébergements en phases et les trajets en jalons ; les sorties ont la leur.' },
      { titre: 'Les dates qui engagent', texte: 'Solde à verser, fin de l\'annulation gratuite : chaque date limite devient un jalon. Son détail garde l\'heure du train ou le numéro de réservation. Les types de jalon se renomment dans la légende, ici Sortie, Trajet et Date limite. Le repère « aujourd\'hui » montre ce qui vient ensuite.' },
      { titre: 'Pendant les vacances', texte: 'Exportez une image PNG : elle reste lisible sur le téléphone, même sans réseau. Le lien s\'ouvre sans compte, mais c\'est une copie, et toute personne qui le reçoit voit tous les noms et toutes les dates.' },
    ],
    timeline: {
      titre: 'Été 2027 en famille',
      style: 'frise',
      libelles: { atelier: 'Sortie', livraison: 'Trajet', gouvernance: 'Date limite' },
      periode: { debut: '2027-07-03', fin: '2027-08-31' },
      projets: [
        {
          nom: 'Léa',
          phases: [
            { nom: 'Stage de voile', debut: '2027-07-05', fin: '2027-07-16', couleur: 'violet' },
            { nom: 'Grands-parents', debut: '2027-07-19', fin: '2027-07-30', couleur: 'vert_clair' },
          ],
          jalons: [],
        },
        {
          nom: 'Tom',
          phases: [
            { nom: 'Centre de loisirs', debut: '2027-07-05', fin: '2027-07-16', couleur: 'vert' },
            { nom: 'Grands-parents', debut: '2027-07-19', fin: '2027-07-30', couleur: 'vert_clair' },
            { nom: 'Centre de loisirs', debut: '2027-08-23', fin: '2027-08-31', couleur: 'vert' },
          ],
          jalons: [],
        },
        {
          nom: 'Voyage',
          phases: [
            { nom: 'Gîte à Quiberon', debut: '2027-07-31', fin: '2027-08-13', couleur: 'bleu' },
            { nom: 'Camping à Crozon', debut: '2027-08-14', fin: '2027-08-20', couleur: 'orange' },
          ],
          jalons: [
            { date: '2027-07-31', type: 'livraison', titre: 'Train pour Vannes', detail: 'Départ à 8 h 12, voiture 14' },
            { date: '2027-08-21', type: 'livraison', titre: 'Train du retour' },
          ],
        },
        {
          nom: 'Sorties',
          phases: [],
          jalons: [
            { date: '2027-08-04', type: 'atelier', titre: 'Belle-Île en bateau' },
            { date: '2027-08-08', type: 'atelier', titre: 'Cours de surf' },
            { date: '2027-08-17', type: 'atelier', titre: 'Pointe de Pen-Hir' },
          ],
        },
        {
          nom: 'Préparatifs',
          phases: [{ nom: 'Valises', debut: '2027-07-27', fin: '2027-07-30', couleur: 'gris' }],
          jalons: [
            { date: '2027-07-09', type: 'gouvernance', titre: 'Solde du gîte' },
            { date: '2027-07-16', type: 'gouvernance', titre: 'Fin de l\'annulation gratuite du camping' },
          ],
        },
      ],
    },
  },
]

/** Le projet client : document par défaut de l'éditeur, et base des contrôles. */
export const EXEMPLE = EXEMPLES[0]!.timeline
