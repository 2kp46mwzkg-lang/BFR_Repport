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
