# Correction et nouveautés du 14/10/2026

- **Dossier photos (.zip)** : bouton « Toutes les photos — dossier .zip » sous Soumettre le
  rapport (et dans l'écran d'envoi). Le zip contient `1-Evenements/`, `2-Pieces/`,
  `3-Photos-complementaires/`, des noms de fichiers parlants (n°, catégorie ou dénomination,
  référence) et `Liste-des-photos.csv` (ouvrable dans Excel : heure, domaine, catégorie,
  machine, texte, référence, quantité, légende).
- **Photos des pièces en grand** dans le tableau du PDF (2,5 cm au lieu de 1,3 cm, dénomination
  sur plusieurs lignes) et du Word (2,6 cm).

- PDF : les photos des pièces de rechange n'apparaissaient jamais dans le tableau des
  pièces (la case affichait « — »). Le code lisait un champ d'image inexistant
  (`jp.bytes`) au lieu de convertir l'image obtenue (`jp.dataUrl`). Défaut présent
  depuis la première version ; un test vérifie désormais la photo dans le PDF et le Word.

# Améliorations du 07/10/2026

## Rapport PDF et Word
- Mise en page des évènements selon le nombre de photos : 0 photo = texte seul,
  1 photo = texte à gauche et photo à droite, 2 photos = côte à côte, 3-4 = grille.
  Les évènements se suivent ; un évènement n'est jamais coupé entre deux pages.
  L'ancienne mise en page (une page par évènement) reste au choix dans Réglages.
- Word : les photos placées dans un tableau (pièces, évènements) sont enfin déclarées
  dans le fichier (elles pouvaient apparaître vides) ; légende toujours avec sa photo.

## Numéros de rapport uniques
- Le numéro contient le code du technicien : `RT-261007-01` (initiales par défaut,
  modifiable dans Mes informations). Plus de doublons entre techniciens le même jour.

## Historique
- La liste « Rapports enregistrés » ne charge plus aucune photo (résumés seulement) ;
  les photos sont chargées à la réouverture d'un rapport.
- Les rapports sont enregistrés sans leurs images (rangées à part) : base plus légère.
- Recherche par client, n°, machine ou date.
- Ménage des rapports terminés de plus de 6 mois, uniquement après une sauvegarde
  complète exportée ; les brouillons ne sont jamais supprimés.
- Supprimer un rapport supprime aussi ses photos.

## Réglages et ergonomie
- Plus aucune adresse e-mail dans le code publié ; nouveau fichier « réglages d'équipe »
  (export / import) pour configurer un téléphone neuf.
- Impossible de démarrer une intervention ou de soumettre un rapport sans nom de technicien.
- Les messages s'affichent en haut de l'écran (ils ne cachent plus le champ en cours de saisie).
- Boîtes de dialogue intégrées à l'application (les fenêtres du navigateur sont bloquées
  dans certains cadres, ex. artefact Claude) ; enregistrement des fichiers compatible.

## Tests automatiques
- `tests/test_appli.py` (5 scénarios de terrain dans un vrai navigateur) ; la GitHub Action
  ne publie que si tous les tests passent.

# Fusion avec la version de Bertrand du 06/10/2026

Reprises telles quelles depuis le dépôt de Bertrand (4 envois du 05 et 06/10) :
- **Annuaire clients** (Menu → Annuaire clients, et bouton « Annuaire complet » dans la fiche
  client) : consulter, créer, modifier ou réinitialiser une fiche client hors intervention.
- **SMS d'arrivée sur site** : message pré-rempli (FR/EN/DE/NL) au contact du client, ouvert
  dans l'application SMS du téléphone.
- **Pièces de rechange rattachées à une machine** (N° de série en priorité) : nouvelle colonne
  « Machine (N° série) » dans l'écran, le PDF et le Word.
- Choix d'un client dans la liste : les coordonnées de l'ancien client ne restent plus.
- Aperçu du logo client mis à jour immédiatement.
- Assistant d'évènement : machines affichées avec leur N° de série.

Toutes nos corrections du 05/10 (ci-dessous) sont conservées. Fichiers générés (docs/,
CR-Intervention-SAV.html) reconstruits à partir des sources fusionnées.

# Corrections du 05/10/2026

## Images absentes dans les anciens rapports
- **Cause** : jusqu'à la version précédente (copie `depot-public/`), l'historique des rapports
  était enregistré **sans les photos** (seul le rapport en cours les gardait). Les rapports
  rangés avec cette version n'ont plus leurs images sur le téléphone : elles ne sont
  récupérables que dans les PDF déjà envoyés ou dans une sauvegarde JSON exportée à l'époque.
- **Garde-fou** : un enregistrement ne peut plus remplacer une photo conservée par une version
  vide (copie allégée du stockage, sauvegarde incomplète) : l'image existante est reprise.
- Les photos « complémentaires » étaient enregistrées sous la clé `phl_…` mais relues sous
  `phlib_…` : relecture corrigée (les deux clés sont essayées).
- Les identifiants des photos sont attribués avant la copie enregistrée.
- Historique : un rapport dont des photos sont introuvables l'indique clairement.

## Bugs
- Numérotation du rapport (PDF et Word) recalculée : plus de saut « 2. » → « 10. ».
- Le corps de mail personnalisé n'est plus effacé à chaque ouverture (migration exécutée
  une seule fois).
- L'e-mail du responsable SAV n'est plus imposé : champ vide = pas d'envoi au SAV.
- Assistant d'évènement : le domaine est exigé dès l'étape 1.
- Rapport fantôme vide (numéro en double) créé au premier lancement : supprimé.
- Polices Open Sans / Poppins mises en cache par le service worker (hors connexion).

## Données
- Demande de stockage permanent (`navigator.storage.persist`) : Android ne doit plus effacer
  les rapports quand la mémoire est pleine.
- Rappel de sauvegarde au démarrage et dans le menu si aucune sauvegarde depuis 7 jours.

## Dépôt
- Supprimés : `depot-public/` (ancienne version), copies du site à la racine, icônes
  `icon-192/512` inutilisées, bouton « Ajouter pièce » en double.
- `build.py` fonctionne sans le fichier de liste clients et n'écrit plus que dans `docs/`.
- Publication automatique : `.github/workflows/pages.yml`.
