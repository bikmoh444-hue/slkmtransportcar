# Durcissement de sécurité — phase 1

Cette phase ne modifie ni l’interface, ni les contenus existants, ni les comptes. Aucun SQL n’est exécuté sur Supabase Cloud. Les essais utilisent des données fictives en mémoire et des services sur loopback.

## Corps des requêtes

`lib/security/body.ts` compte les octets lus, indépendamment de Content-Length, interrompt la lecture au dépassement et décode strictement UTF-8. Les limites existantes restent 16 000 octets pour les réclamations, 1 500 pour les visites et 16 384 pour la connexion. Les API publiques renvoient 413 au dépassement, 400 pour JSON/UTF-8 invalide. Les contrôles de schéma et quotas SQL existants sont conservés.

## Frontière proxy à configurer avant déploiement

L’application ne peut pas prouver qu’un en-tête a été réécrit par un proxy. L’opérateur doit vérifier le chemin réseau réel :

| Configuration | Identité admise | Prérequis |
|---|---|---|
| Vercel (`VERCEL=1`, détection automatique ou `SLKM_TRUSTED_PROXY=vercel`) | `x-vercel-forwarded-for`, une seule IP | Requêtes passant effectivement par l’infrastructure Vercel qui réécrit cet en-tête ; pas de serveur directement accessible imitant cet environnement. |
| `SLKM_TRUSTED_PROXY=cloudflare` | `cf-connecting-ip`, une seule IP | Bloquer l’accès direct à l’origine au pare-feu ; vérifier les éventuels Workers/sous-requêtes et leur traitement des en-têtes. |
| `SLKM_TRUSTED_PROXY=local` | Identité loopback fixe | Développement uniquement, serveur lié à 127.0.0.1/::1, aucune exposition publique. Refus en production. |
| Toute autre configuration, IP absente ou invalide | Aucune | Les API publiques répondent 503 sans écrire en base. Aucun repli sur x-forwarded-for, UUID visiteur ou quota « unknown ». |

La politique 503 concerne les réclamations et le suivi des visites tant que la frontière réseau n’est pas vérifiée : il faut configurer le proxy pour conserver leur disponibilité en production. Elle évite de transformer un en-tête falsifiable en autorisation et de partager une même pénalité entre tous les visiteurs. Les empreintes HMAC ont des domaines distincts par usage. Aucune IP complète n’est journalisée par ces protections. La rotation du secret réinitialise de fait les identités de quota : prévoir cette opération, ne pas la faire à chaque déploiement.

Références opérateur : [Vercel — Request headers](https://vercel.com/docs/headers/request-headers), [Cloudflare — HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/), [Cloudflare — adresse du visiteur](https://developers.cloudflare.com/support/troubleshooting/restoring-visitor-ips/restoring-original-visitor-ips/).

## Protection de connexion partagée : activation progressive

Par défaut, `SLKM_LOGIN_LIMITER=provider` conserve les protections de Supabase Auth et la connexion existante. Ce mode n’offre PAS de limite applicative globale ; un avertissement technique sans identifiant personnel le signale. L’absence de migration ne bloque donc pas les administrateurs existants.

Pour activer le mode durable :

1. Valider la migration et le proxy en staging isolé, avec un compte de test. Vérifier également les limites du fournisseur Auth et les règles réseau/WAF.
2. Faire appliquer, par l’opérateur autorisé, le SQL exact de `supabase/migrations/202611040003_phase1_login_protection.sql`, après les migrations précédentes jusqu’à `202611040002_media_cleanup.sql`. Le fichier constitue le SQL complet à exécuter ; aucune ancienne migration n’est réécrite.
3. Configurer côté serveur `RATE_LIMIT_SECRET` (au moins 32 caractères aléatoires), la clé privilégiée déjà utilisée pour les API publiques et le proxy vérifié. Ne jamais les exposer via NEXT_PUBLIC.
4. Activer `SLKM_LOGIN_LIMITER=supabase`, puis vérifier connexion, refus, récupération et surveillance avant production. Dans ce mode, RPC absente, erreur SQL, secret insuffisant ou IP non fiable entraînent un refus contrôlé ; aucun repli permissif.

La nouvelle table ne contient que des HMAC et compteurs temporaires, aucune adresse email/IP brute. Budget réseau : 30 admissions/requêtes de limitation par 10 minutes ; refroidissement par couple réseau/compte après cinq admissions, 15 secondes puis 30/60/120/240/300 secondes au maximum. Fenêtre du couple : une heure. Les refus ne prolongent pas son refroidissement ; une connexion administrateur réussie efface seulement son compteur de couple. Les compteurs expirés sont nettoyés par petits lots lors des appels. Les quotas peuvent gêner un réseau administratif partagé : tester cette situation et prévoir une procédure opérateur de récupération, sans endpoint public ni verrouillage permanent. Le limiteur ne remplace ni la protection du fournisseur ni une défense réseau contre les attaques distribuées.

Compatibilité/retour arrière : revenir au code/configuration précédente ou au mode provider si nécessaire, en conservant une protection au niveau fournisseur/proxy. La table et les fonctions additives peuvent rester en place. Ne pas supprimer de données métier ni modifier les comptes pour revenir en arrière. Une activation/désactivation doit être une décision opérateur suivie, jamais un mécanisme automatique après erreur.

## Sessions, autorisation et MFA

Les mutations continuent à vérifier côté serveur `getUser()` puis l’appartenance de son UUID à `admin_users`. Aucun rôle client n’est accepté. Les sessions restent gérées par Supabase SSR, avec cookies sécurisés selon HTTPS, HttpOnly, SameSite et propagation des rafraîchissements. La déconnexion reste locale à la session demandée. Les messages publics de refus de compte non confirmé/non administrateur sont désormais identiques à des identifiants incorrects ; les détails techniques restent hors de la réponse.

MFA : **PENDING**. Ne pas forcer aal2 avant inscription et validation d’un moyen de récupération. Plan : vérifier disponibilité TOTP Supabase et procédure de secours, inscrire volontairement un administrateur de test, ajouter ensuite un parcours de défi sans exposer les secrets TOTP, exiger `aal2` après vérification du rôle sur toutes les mutations sensibles (et pas uniquement la page), tester expiration/refresh, perte du second facteur et récupération avec un second administrateur autorisé. L’enrôlement des comptes réels et l’activation obligatoire nécessitent une phase approuvée distincte.

## En-têtes

La CSP est uniquement **Report-Only**. Aucun changement de blocage effectif : les scripts Next/JSON-LD intégrés peuvent générer des signalements, mais restent opérationnels. Les sources Supabase et polices locales sont prises en compte. Aucun collecteur distant de rapports n’est ajouté. Avant enforcement, vérifier les violations sur toutes les routes FR/AR/admin, les images, les vidéos, les actions et l’hydratation ; concevoir une stratégie nonce/hash Next.js pour les scripts intégrés. Ne pas ajouter aveuglément unsafe-inline à script-src pour faire disparaître les alertes.

HSTS reste désactivé. `SLKM_HSTS_ENABLED=true` ne doit être défini qu’après confirmation du domaine de production et de HTTPS sur tous ses chemins. Le code exige production et une URL publique HTTPS et propose seulement `max-age=86400`, sans includeSubDomains ni preload. Vérifier également les en-têtes émis par l’hébergeur/CDN : aucune validation de sa configuration réelle n’a été effectuée ici.

## Médias et paramètres publics

Le bucket public et ses URL sont conservés. Les uploads administratifs vérifiés passent toujours par Sharp ; le format réellement décodé doit maintenant correspondre au MIME JPEG/PNG/WebP/AVIF annoncé. Un SVG déclaré PNG est refusé. La transparence et le traitement spécial favicon sont préservés. Aucun fichier existant n’est déplacé, renommé ou supprimé par cette phase. Le formulaire de réclamation actuel n’intègre pas de pièce jointe ; cela ne prouve pas que des objets déposés hors application ne contiennent aucune donnée privée.

Un média masqué/non publié reste accessible par son URL publique. Pour de futurs documents confidentiels, prévoir un bucket privé séparé, métadonnées privées sous RLS, accès autorisé par utilisateur, URL signées courtes et validation serveur ; aucune migration automatique des images actuelles.

Les paramètres publiés par l’application sont filtrés selon les champs réellement consommés. La sauvegarde valide ces champs, refuse les clés sensibles et l’ajout de champs inconnus ; les champs historiques inconnus inchangés restent stockés. Ne jamais utiliser site_settings pour des secrets, même dans une ligne non publiée. Une valeur secrète arbitraire placée dans un champ texte public ne peut pas toujours être reconnue automatiquement : la validation ne remplace pas cette règle.

**Limite importante S-09** : les policies existantes autorisent encore la lecture REST directe des lignes publiées, y compris leurs JSON historiques. Le filtrage applicatif ne change pas ces permissions et ne supprime aucune donnée. Avant évolution RLS, inventorier les consommateurs, séparer les paramètres privés dans une structure inaccessible au public, publier une projection des champs autorisés et migrer les lecteurs de façon compatible. Préparer ensuite une migration additive revue et testée. Aucun changement de policy déployée n’est fait ici.

L’identité globale ne peut plus être dépubliée ou renommée accidentellement via l’action générique. Si elle manque déjà dans les données publiques, le rendu continue sans inventer de marque et sans republier la ligne ; le JSON-LD d’organisation est omis. Les réglages présents gardent leur rendu habituel.

## Vérification Supabase Cloud — à exécuter séparément par l’opérateur

Les tests SQL locaux ne prouvent pas la configuration déployée. Requêtes d’inspection en lecture seule proposées, sans valeurs de secrets :

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public','storage') order by 1,2,3;

select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','storage') and c.relkind='r';

select grantee, table_schema, table_name, privilege_type
from information_schema.role_table_grants
where grantee in ('anon','authenticated','service_role') and table_schema in ('public','storage');

select n.nspname, p.proname, p.prosecdef, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public';

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id='slkm-media';

select count(*) as admin_count from public.admin_users;
```

Vérifier : absence de droits publics sur les fonctions privilégiées et les compteurs de connexion ; search_path contrôlé des SECURITY DEFINER ; impossibilité pour un utilisateur ordinaire de s’ajouter à admin_users ; isolation des réclamations et statistiques ; écritures Storage réservées aux administrateurs vérifiés ; privilèges effectifs hérités et policies réellement appliquées. Réaliser les essais d’écriture uniquement dans un staging autorisé avec comptes fictifs, jamais avec les identifiants de production de ce poste.

## Vérifications locales et limites

Tests unitaires : `npm test`. Migration isolée : `node tests/security-database.mjs`. Schéma existant isolé : `npm run test:sql`. Typage/lint : `npm run typecheck`, `npm run lint`. Le navigateur `npm run test:auth` utilise un GoTrue/PostgREST/Storage simulé sur loopback, avec de fausses clés et données ; il ne valide pas le fournisseur réel. Le préchargement `tests/loopback-only.cjs` bloque les fetch distants du serveur de test.

Le build de vérification doit surcharger les variables Supabase/site avec des valeurs fictives locales, SLKM_PREVIEW=true et les clés privilégiées vides ; ne pas lancer un scénario qui utilise les identifiants réels de .env.local. Aucun test de charge, aucune optimisation de phase 2, aucune modification de production dans cette phase. Les courses de sauvegardes concurrentes et la transaction complète Storage/PostgreSQL restent des sujets distincts de fiabilité à traiter ensuite.

### Résultats exécutés le 4 novembre 2026

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` | PASS — 16 tests |
| `node tests/security-database.mjs` | PASS — migration sur PostgreSQL éphémère PGlite |
| `npm run test:sql` | PASS — anciennes migrations/RLS sur PGlite |
| Build Next.js avec variables factices et `--require ./tests/loopback-only.cjs` | PASS |
| `npm run test:auth` après le build final | PASS — Chrome, fournisseur Auth/PostgREST/Storage simulé localement |
| Connexion au vrai fournisseur, permissions Cloud, HTTPS/proxy réels, MFA | NOT TESTED |

Le scénario Chrome couvre notamment refus d’admission avant appel Auth, origine, cookies découpés et refresh, déconnexion, refus des mutations invité/non-admin, huit rubriques, FR/AR/RTL, uploads PNG/logo/favicon avec transparence, annulation, erreur Storage, erreur de sauvegarde et nettoyage, persistance après rechargement, invalidation du contenu public, API valides/413/JSON invalide/IP absente/quota, flux HTTP chunked sans Content-Length et identité absente sur FR/AR. Les images du navigateur sont simulées pour isoler le réseau : leur distribution par le vrai CDN n’est pas validée.

Comparaison avec la copie initiale des sources : aucune modification CSS, de composant visuel du dashboard, d’ancienne migration ou des manifestes de dépendances. Le dépôt ne contient pas de répertoire Git exploitable ; le contrôle a donc été effectué par comparaison de fichiers avec cette copie, sans restauration de travail préexistant. Les artefacts de build et captures des tests sont générés localement.
