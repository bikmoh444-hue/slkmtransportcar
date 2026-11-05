# Connexion administrateur SLKM

## Diagnostic constaté

Le code précédent renvoyait `error=auth` aussi bien pour un échec de `signInWithPassword` que pour une absence d’autorisation ou une erreur de lecture RLS. Le formulaire affichait donc le même message pour des causes différentes. Le gestionnaire de cookies ignorait aussi toute erreur d’écriture. Enfin, le formulaire et le serveur imposaient 8 caractères à la **connexion**, ce qui pouvait refuser un mot de passe existant valide avant même de joindre Supabase.

Ces trois défauts sont corrigés. Aucun changement de CSS, de palette ou de structure visuelle n’est nécessaire.

La configuration locale inspectée contient une URL HTTPS Supabase et une clé publique de rôle `anon` dont la référence de projet correspond à l’URL. Ce contrôle est une vérification de cohérence, pas une validation cryptographique de la clé ni une preuve d’existence du compte. La clé serveur n’est **pas nécessaire pour se connecter**. Le mode de prévisualisation publique ne désactive jamais l’authentification de l’administration.

Les lectures distantes `/auth/v1/settings` et du schéma public ont échoué pour cause de réseau dans l’environnement d’exécution. Aucune tentative avec le mot de passe du propriétaire n’a été faite. L’existence réelle de `slkmtransport@gmail.com`, son état de confirmation et sa ligne de rôle restent donc à vérifier dans le projet Supabase du propriétaire. L’email de contact du seed n’est pas un compte Auth.

## Interpréter les messages

| Code public | Signification | Vérification propriétaire |
|---|---|---|
| `config` | Variables absentes, URL/clé incohérentes, clé privée dans le champ public ou rejet de clé API | URL et clé publique du même projet, redémarrage Next.js |
| `credentials` | Email/mot de passe refusé, compte éventuellement absent | Chercher l’email exact dans Authentication ; réinitialiser un mot de passe inconnu |
| `unconfirmed` | Supabase renvoie `email_not_confirmed` | Confirmer le compte par la procédure légitime du projet |
| `forbidden` | Identité vérifiée mais aucune ligne admin visible pour son UUID | UUID dans `admin_users`, puis politique de lecture de sa propre ligne |
| `role_check` | Requête de rôle impossible | Schéma, grants et RLS ; logs `admin_role` avec code SQL/PostgREST |
| `session_missing` | Visiteur sans session | Connexion requise |
| `session_lost` | Session non retrouvée après connexion, expirée ou invalide | Cookies autorisés, même hostname, Proxy actif |
| `cookie_write` | Écriture des cookies SSR en échec | Server Action/Route Handler disposant de cookies modifiables |
| `service_unavailable` | Réseau ou service Auth indisponible | Connectivité serveur → Supabase, état du projet |
| `rate_limited` | Supabase limite les tentatives | Attendre avant de réessayer |
| `auth_service` | Autre erreur Auth | Code/statut et étape dans les logs serveur |
| `logout_failed` | Déconnexion non terminée | Réessayer ; ne pas annoncer une déconnexion réussie |

Les logs `[slkm-auth]` contiennent seulement l’étape, le code public, un code fournisseur/SQL autorisé, un statut HTTP et éventuellement une raison de configuration. Aucun email, mot de passe, token, clé, objet session ni message brut du fournisseur n’est conservé dans ces logs ou dans les exceptions propagées. Les messages publics sont FR/AR, choisis dans une liste fixe.

`invalid_credentials` ne distingue volontairement pas un compte absent d’un mauvais mot de passe : l’API publique ne permet pas de prouver cette différence. De même, une ligne admin absente et une ligne masquée silencieusement par une politique peuvent toutes deux produire `forbidden` ; l’inspection SQL du propriétaire permet de trancher.

## Structure et RLS

Le schéma versionné du projet utilise `public.admin_users(user_id uuid primary key references auth.users(id), created_at)`. Il ne repose pas sur `profiles`, un email saisi ou une métadonnée utilisateur.

La politique `admin_self_read` permet à un utilisateur authentifié de lire sa propre ligne (`user_id=auth.uid()`). Elle ne s’appelle pas elle-même et ne fait pas appel à `is_admin()`. La fonction `public.is_admin()` est `SECURITY DEFINER` avec `search_path=''` et références qualifiées ; les tests Postgres vérifient ses politiques avec des rôles anonyme, utilisateur et administrateur. Aucune RLS n’a été désactivée, aucun compte connecté n’est promu automatiquement.

Dans le SQL Editor du **même projet** que les variables de l’application, exécuter d’abord le script de lecture seule [inspect-auth.sql](../supabase/admin/inspect-auth.sql). Il montre l’utilisateur exact, les colonnes de rôle, la RLS, les politiques et la définition de `is_admin()`, sans lire de hash de mot de passe ni de token. Si le schéma distant est différent, examiner le résultat avant toute attribution ; ne pas créer une seconde méthode de rôle au hasard.

Codes utiles : `42P01`/`PGRST205` pour une table absente, `42501` pour un accès refusé, `42P17` pour une récursion de politique. Une erreur de requête n’est plus présentée comme un mauvais mot de passe.

## Premier administrateur : opérations manuelles du propriétaire

1. Dans Supabase Authentication → Users, chercher exactement `slkmtransport@gmail.com` dans le projet cible.
2. Si absent, créer le compte depuis cette interface avec un mot de passe fort **choisi par le propriétaire**. Vérifier l’état de confirmation de l’email. Ne pas désactiver globalement la confirmation pour résoudre ce cas.
3. Si le compte existe mais que le mot de passe est inconnu, le **réinitialiser**, sans essayer de le récupérer ni de lire son hash. Une option propriétaire ciblée est fournie ci-dessous.
4. Après examen du schéma, exécuter manuellement [grant-first-admin.sql](../supabase/admin/grant-first-admin.sql). Le script recherche l’email exact dans `auth.users`, s’arrête explicitement s’il est absent ou ambigu, puis insère uniquement son UUID dans `admin_users`. Il peut être relancé sans doublon et ne modifie aucun autre utilisateur. Il ne crée pas de compte et ne modifie pas son mot de passe. Ce fichier n’est pas une migration automatique.
5. Utiliser `/admin/login`. Aucune clé `service_role` n’est requise pour ce parcours.

### Réinitialisation facultative depuis le terminal propriétaire

Le propriétaire peut utiliser son outil d’administration Supabase pour réinitialiser le mot de passe. Pour une réinitialisation directe et ciblée via l’API Admin, `scripts/reset-auth-password.mjs` est également fourni. Il doit être exécuté **manuellement**, avec les accès serveur du propriétaire dans `.env.local` ignoré par Git. Il vérifie que l’UUID correspond exactement à l’email cible, demande un nouveau mot de passe deux fois en saisie masquée, puis appelle `auth.admin.updateUserById`. Il ne modifie ni rôle ni autre compte et n’est jamais exécuté par l’application.

```powershell
node --env-file=.env.local --experimental-strip-types scripts/reset-auth-password.mjs UUID_AUTH_EXACT
```

La clé serveur reste privée ; ne jamais la placer dans `NEXT_PUBLIC_*`. Ne jamais transmettre le mot de passe dans le chat, en argument de commande ou dans un fichier de seed. Le script refuse les terminaux sans saisie interactive et les mots de passe de moins de 12 caractères à la réinitialisation. Il a été vérifié syntaxiquement, sans être exécuté sur un compte réel. Il n’ajoute pas une procédure de récupération par email non configurée au site.

## Session et localhost

Le projet conserve `@supabase/ssr` 0.12.7 avec `getAll`/`setAll`. Chaque requête dispose de son client serveur. Le Route Handler de connexion et les Server Actions de déconnexion et mutation écrivent réellement les cookies ; les Server Components sont explicitement en lecture seule. Le Proxy transmet tous les fragments actualisés au serveur **et** au navigateur, ainsi que les en-têtes de non-cache de la bibliothèque. La connexion utilise un formulaire HTML `POST /admin/login/submit`, avec ou sans JavaScript, et une redirection HTTP 303. Elle ne dépend pas du protocole Server Actions/RSC. Le Route Handler contrôle l’origine exacte du POST et limite le corps à 16 Kio avant de vérifier les identifiants.

Les cookies ont `Path=/`, `SameSite=Lax`, `HttpOnly`, sans `Domain` forcé. Sur `http://localhost:3000`, `Secure` est désactivé, y compris pendant un test de production local ; en production HTTPS il est activé. Choisir `http://localhost:3000` et conserver cette adresse pendant tout le parcours : `localhost` et `127.0.0.1` sont deux hôtes différents pour les cookies.

Après `signInWithPassword`, le serveur vérifie `getUser()` et le rôle sur l’UUID, puis relit la session avec un nouveau client depuis les cookies. La première redirection `/admin?login=complete` vérifie leur retour par le navigateur ; elle aboutit ensuite à `/admin` sans paramètre. Si les cookies sont perdus, le message devient `session_lost`. Ce paramètre ne donne aucune autorisation.

Chaque page et chaque mutation privée répètent la vérification côté serveur. Le Proxy sert au rafraîchissement de session, jamais à lui seul à l’autorisation. Toutes les routes `/admin` sont dynamiques et marquées `private, no-store` ; les requêtes authentifiées ne sont pas mises en cache. La déconnexion ferme la session locale et supprime les fragments de cookies.

## Vérifications reproductibles

```powershell
npm run typecheck
npm run lint
npm test
npm run test:sql
npm run build
node --experimental-strip-types tests/auth-browser.mjs
node --env-file=.env.local --experimental-strip-types scripts/auth-diagnostics.mjs
```

`auth-browser.mjs` utilise le vrai serveur Next.js et le vrai SDK SSR face à une API GoTrue/PostgREST **simulée et isolée sur loopback**. Les identifiants sont générés en mémoire ; le sous-processus bloque les requêtes externes. Aucun compte réel n’est utilisé et aucun mode de contournement d’authentification n’est ajouté au code de production. Le test contrôle les erreurs distinctes, cookies fragmentés, redirections, rechargement, rafraîchissement, déconnexion et refus des mutations non-admin. Les tests SQL exécutent les politiques et le script ciblé sur Postgres embarqué PGlite. Ils ne remplacent pas une connexion finale avec un compte Supabase de test autorisé.

Le test terminé a utilisé un port libre de `localhost`, car un serveur Next.js préexistant occupe déjà `localhost:3000` en IPv6. Ce serveur n’a pas été arrêté. Les options de cookies pour `http://localhost:3000` sont couvertes par les tests unitaires ; aucun test de connexion réel n’a été fait sur ce serveur existant. Vérifier que le serveur utilisé pour les essais manuels est lancé depuis le dossier du présent projet.

Références officielles : [clients SSR et Proxy](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [codes d’erreur Auth](https://supabase.com/docs/guides/auth/debugging/error-codes), [réinitialisation Admin d’un utilisateur](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).
