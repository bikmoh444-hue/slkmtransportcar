# Vérification — 3 novembre 2026

Correction du parcours administrateur : voir [le rapport d’authentification](docs/ADMIN-AUTH-VERIFICATION.md) et [la procédure Supabase](docs/ADMIN-AUTH.md). Les tests HTTP isolés passent ; aucune connexion réelle au compte SLKM ni attribution distante n’a été effectuée.

## Direction actuelle : bleu et orange soutenu

Correction appliquée au site, au dashboard et à ses paramètres : navigation blanche compacte, bleu #08648B, bleu nuit #101C33, orange #C46200, survol #A95000, fonds blancs/gris et bordures #E3E8EF. Ombres légères, logos et photos sans recoloration. Aucun élément de réservation ajouté.

Contrôles après correction : lint, TypeScript, build, 4 tests de validation/thème, SQL avec migration 005, navigateur FR/AR aux six largeurs et tests d’interactions réussis. Les styles calculés dans Edge confirment l’orange normal/survol, le bleu de navigation, les bordures et l’absence du jaune citron. Captures dans artifacts actualisées. Les textes des boutons orange utilisent un bleu presque noir pour conserver un contraste lisible ; ils deviennent blancs sur l’orange plus sombre au survol.

La priorité du thème est versionnée. Tests : des données héritées sauvegardées ne rétablissent pas l’ancienne palette ; les contenus personnalisés sont conservés ; les modifications administrateur faites après la mise à niveau restent prioritaires. Le cache public possède une nouvelle clé et les sauvegardes administrateur l’invalident immédiatement.

Lecture Supabase distante tentée en lecture seule, indisponible pour cause de réseau. Aucune migration distante appliquée. Migration 005 prête ; le rendu utilise déjà la nouvelle palette même si les paramètres lus appartiennent encore à l’ancienne version.

La référence image annoncée dans le message n’était pas accessible dans le fil : les valeurs et consignes textuelles ont servi de référence. Les photographies SLKM originales restent absentes du workspace ; aucun véhicule artificiel n’a été ajouté.

## Contrôles exécutés

- Installation des dépendances et validation du lockfile par `npm ci --dry-run --offline --ignore-scripts`.
- `npm run lint` : réussi, sans avertissement.
- `npm run typecheck` : réussi ; TypeScript strict.
- `npm test` : quatre tests réussis (réclamations, liens/édition, seeds bilingues).
- `npm run test:sql` : cinq migrations et seeds exécutés sur Postgres embarqué PGlite. Lecture publiée uniquement, droits anonyme/non-admin/admin, réclamations privées, sauvegarde, publication, quotas persistants, droits Storage et préservation des personnalisations vérifiés. L’attachement des médias est testé de manière atomique et idempotente.
- `npm run build` : build de production Next.js 16.2.10 réussi.
- `npm run test:ui` sur le serveur **de production local** avec Microsoft Edge : FR et AR à 360, 390, 430, 768, 1280 et 1440 px. Aucun débordement horizontal global. Menu mobile, contrôles des carrousels, swipe tactile natif dans les deux sens de lecture, stabilité verticale du hero, liens téléphone/WhatsApp, absence d’Instagram vide, redirection `/ → /fr`, protection `/admin` et réponse 503 honnête du formulaire en prévisualisation vérifiés.
- `npm run test:interactions` : défilement automatique réel, pause/reprise, hauteur stable du hero, menu au clavier et masquage du bouton WhatsApp à proximité du formulaire vérifiés.
- Captures FR/AR à 390 et 1440 px dans `artifacts/`, résultat détaillé dans `artifacts/browser-results.json`.
- Vérification visuelle des captures mobile et desktop. Polices locales Plus Jakarta Sans et Cairo.
- Syntaxe du script d’import vérifiée avec `node --check`.
- Recherche de `SUPABASE_SERVICE_ROLE_KEY` et `RATE_LIMIT_SECRET` dans `.next/static` : aucune occurrence.

Le test SQL remplace uniquement `auth.users`, `auth.uid` et les tables Storage par des équivalents de test pour exécuter les règles Postgres. Il ne prétend pas tester les services hébergés Supabase Auth ou Storage.

## Éléments non vérifiables sans accès ou fichiers

- Aucune migration appliquée à une base Supabase distante, aucun upload distant ni déploiement réalisé.
- Pas de connexion administrateur réelle testée avec Supabase Auth ; aucun compte ou mot de passe par défaut créé.
- Pas d’enregistrement de réclamation réel sur un projet distant. Le formulaire reste explicitement indisponible en prévisualisation ; la validation et la confidentialité ont été contrôlées localement.
- Photos, logos, affiche et carte non fournis dans le workspace : cadrage photographique, lisibilité des villes et modale avec les cartes originales restent à valider après import. Aucun média de remplacement SLKM n’a été fabriqué.
- Aucun score Lighthouse annoncé : mesure non exécutée.
- Domaine réel et contenu juridique à compléter avant publication. Instagram, adresse et lien HM Studio restent vides.

## Environnement

Le dossier initial était vide. Aucun ancien fichier, aucune table distante ni donnée existante n’a été supprimé. Un cache temporaire de dépendances a été créé pour contourner les restrictions réseau/écriture ; sa suppression finale a été refusée automatiquement par la politique de l’environnement. Il reste dans `.npm-cache/`, exclu de Git.
