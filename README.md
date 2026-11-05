# SLKM — Transport et Logistique

Connexion administrateur : créez l’utilisateur dans Supabase Auth, ajoutez son UUID dans `admin_users` (voir plus bas), puis connectez-vous à `/admin/login`. Le compte Auth et son UUID sont distincts de l’email de contact. Aucun mot de passe par défaut. Les vérifications d’authentification se lancent avec `npm run test:auth` (API locale simulée, aucun compte réel) et `npm run auth:diagnostics` (lecture distante uniquement, sans clés dans les logs).

Identité d’interface actuelle : bleu `#08648B`, bleu de marque `#0865B8`, bleu nuit `#101C33`, orange `#C46200` (survol `#A95000`), fond `#F6F8FA`, cartes `#FFFFFF`, bordures `#E3E8EF`, texte `#111827`, secondaire `#6B7789`. Logos et photos ne sont pas recolorés. Le thème porte `theme_version=2` : un ancien thème sauvegardé ne peut plus réintroduire ses couleurs. Pour une base installée jusqu’à 004, appliquer uniquement `202611030005_blue_orange_theme.sql`. Elle remplace les champs de palette et retire l’ancien accent jaune ; les contacts, textes, médias et autres paramètres sont conservés. Après cette mise à niveau, les couleurs personnalisées sauvegardées dans le dashboard prennent la priorité et sont conservées lors d’une nouvelle exécution de la migration.

Application Next.js App Router, TypeScript strict, Tailwind, Supabase Auth/Postgres/Storage, Zod et next-intl. Livraison locale : aucune base distante ni publication n’a été effectuée automatiquement.

## Installation et lancement

Node.js 22.13+ (24 recommandé).

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Ouvrir http://127.0.0.1:3000/fr ou /ar. `/` redirige vers le français. `SLKM_PREVIEW=true` utilise explicitement les données de `lib/seed.ts`. Une bannière identifie ce mode, le formulaire ne simule aucun envoi et le dashboard exige une véritable session. Une panne Supabase en mode connecté provoque une erreur, jamais un retour silencieux aux seeds.

## Variables

- `NEXT_PUBLIC_SUPABASE_URL` : URL HTTPS du projet identifié.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : clé publique du même projet.
- `SUPABASE_SERVICE_ROLE_KEY` : secret serveur, uniquement pour le formulaire et l’import. Jamais préfixé NEXT_PUBLIC.
- `RATE_LIMIT_SECRET` : secret aléatoire d’au moins 32 caractères pour hacher les IP.
- `NEXT_PUBLIC_SITE_URL` : véritable origine publique HTTPS sans slash final. Conditionne canonical, hreflang et sitemap. Ne pas inventer de domaine.
- `SLKM_PREVIEW` : true pour la prévisualisation locale ; false pour la production connectée.

Ne jamais versionner `.env.local`. Les modules privilégiés sont marqués `server-only`.

## Configuration Supabase

1. Créer ou sélectionner **le projet cible**, sauvegarder une base existante et examiner les objets avant application. Le dossier de travail initial était vide ; le SQL ne remplace aucune ancienne migration.
2. Dans le SQL Editor du projet identifié, exécuter tous les fichiers de `supabase/migrations/` dans l’ordre de leur nom, puis `supabase/seed.sql`. Avec Supabase CLI, utiliser le flux habituel de migrations après liaison explicite au bon projet. Aucun `db reset` requis.
3. Dans Authentication, désactiver les inscriptions publiques et configurer l’URL du site. Le site n’expose aucune inscription.
4. Créer manuellement le premier utilisateur dans Authentication (adresse réelle, mot de passe fort choisi par vous), récupérer son UUID, puis exécuter avec un compte de confiance :

```sql
insert into public.admin_users(user_id) values ('UUID_AUTH_REEL') on conflict do nothing;
```

Personne ne peut s’ajouter via les politiques publiques. `is_admin()` utilise une fonction security definer avec search_path vide. Chaque Server Action exige une session validée par `getUser()` et l’appartenance à `admin_users`; les politiques RLS répètent ce contrôle. Le middleware/proxy renouvelle les cookies, il n’est pas l’unique protection.

5. Renseigner les variables serveur, mettre `SLKM_PREVIEW=false`, relancer. Se connecter à `/admin/login`.

## Médias réels

Le dossier initial ne contenait **aucune image**, aucun logo ni fichier Noda. `media-manifest.json` décrit chaque source attendue, son rôle et les textes alternatifs. Aucun véhicule ni logo photographique n’est généré. Le mot-symbole temporaire doit être remplacé par le logo réel. Les brochures SATRF ne doivent pas être importées comme contenu SLKM.

Créer `media-source/` et y placer les originaux selon le manifeste (adapter les noms dans celui-ci si nécessaire), puis :

```powershell
npm run media:import
```

Le script vérifie les fichiers, décode et convertit les raster en WebP, calcule des noms avec empreinte, téléverse réellement les binaires et renseigne les références. Il ne fabrique pas d’URL pour un fichier absent. Les seeds utilisent `on conflict do nothing`; l’import ne remplace pas les champs image déjà personnalisés. Les sources absentes sont signalées avec un code de sortie 2. Relancer le serveur/attendre la revalidation après un import en CLI. Pour changer un média existant, passer par le dashboard : l’import conserve les premières références.

La médiathèque réserve les uploads aux administrateurs, limite à 8 Mo, vérifie le contenu via Sharp, retire les métadonnées par réencodage et génère les noms. SVG utilisateur refusé. Le bucket public ne doit contenir que des médias publics. Les fichiers sont immuables et conservés : pas de suppression physique tant qu’ils peuvent être référencés. Les cartes sont affichées en contain et agrandies via une modale native accessible.

## Dashboard et modèle éditorial

Rubriques : vue d’ensemble, identité/coordonnées, navigation, hero, sections, services, cartes, villes, lignes, agences, flotte, réclamations, médiathèque et SEO. Tous les champs existants du seed sont éditables avec titres FR/AR séparés, ordre, publication, prévisualisation, sauvegarde réelle et confirmation de suppression. Des champs image et CTA sont proposés pour les nouveaux éléments. Le cache public est invalidé après sauvegarde.

Le schéma utilise une enveloppe éditoriale commune typée (`key`, titres FR/AR, ordre, publication, média FK, dates), et `data` pour les blocs de présentation variables. Les réclamations, administrateurs, limites anti-spam et fichiers ont des colonnes dédiées. Les JSON sont bornés en base et validés côté serveur ; aucune injection de HTML/CSS/JS n’est rendue. Les champs de capacité et type de véhicule sont également exposés en colonnes typées générées ; les véhicules, agences et lignes disposent de clés étrangères vers leurs services ou villes. Les options éditoriales variables restent en JSONB.

Les villes/lignes/agences sont préparées en base mais vides : aucun réseau direct ou contact d’agence n’est déduit des cartes manquantes. Les fiches réseau doivent porter `verified=true` et être publiées pour apparaître. Les jalons réels sont saisis ligne par ligne dans les champs de présentation ; la chronologie vide reste masquée. Aucun jalon chronologique fictif. Les réclamations disposent d’une recherche par nom, filtre, pagination, détail, notes privées, statuts et lien mailto ; aucun email n’est envoyé automatiquement.

## Formulaire et déploiement

Les données sont validées côté navigateur et serveur, avec honeypot, origine contrôlée, limites de longueur, et compteur **persistant atomique Postgres** (5 tentatives/heure par empreinte IP). Aucune politique d’insertion anonyme sur complaints : seule la route serveur contrôlée peut enregistrer une nouvelle demande. Ni lecture publique ni journalisation des messages.

Déployer derrière un proxy de confiance Vercel ou Cloudflare qui remplace respectivement `x-vercel-forwarded-for` ou `cf-connecting-ip`. Sur un autre hébergeur, adapter la source IP dans `app/api/complaints/route.ts` à un en-tête garanti par cet hébergeur. Sans cet en-tête, la clé `unknown` partage un quota conservateur global. Ne jamais faire confiance à un en-tête IP librement fourni par le visiteur. Une protection CAPTCHA peut être ajoutée si le trafic l’exige.

```powershell
npm run lint
npm run typecheck
npm test
npm run test:sql
npm run build
npm start
```

Hébergement Next.js Node compatible (Vercel ou équivalent), variables de production définies séparément, HTTPS. Pas d’export statique : Auth et formulaire nécessitent le serveur. Les pages admin et leurs données restent dynamiques et hors indexation.

## Avant publication

Ajouter les photos/logos réels, confirmer le domaine, compléter l’identité légale et la politique de confidentialité (pages explicitement marquées à compléter), vérifier les deux langues et tester les droits avec Supabase. Instagram, adresse, lien HM Studio, historique et lignes restent absents tant qu’ils ne sont pas fournis. Le fichier Noda n’étant pas disponible, ne pas prétendre l’utiliser.

## Vérification navigateur

Après lancement du serveur, `npm run test:ui` teste Microsoft Edge installé localement. Par défaut le test utilise http://127.0.0.1:3030 ; définir `TEST_URL` pour une autre origine. Exemple : `$env:TEST_URL="http://127.0.0.1:3000"`. Les captures sont enregistrées dans `artifacts/`. `test:sql` utilise Postgres embarqué PGlite avec un schéma Auth/Storage de test : ce contrôle ne configure ni ne teste un projet Supabase distant.

Typographie embarquée : Plus Jakarta Sans (FR) et Cairo (AR), via next/font/local, avec notices de licence dans app/fonts. Aucun fichier Noda n’était disponible.

`npm run test:interactions` vérifie également le défilement automatique réel, la pause/reprise, le menu au clavier et le bouton WhatsApp près du formulaire (même variable TEST_URL).
#   s l k m t r a n s p o r t c a r  
 