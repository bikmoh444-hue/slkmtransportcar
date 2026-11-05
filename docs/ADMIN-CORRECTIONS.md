# Administration et médias — vérification du 4 novembre 2026

Mise à jour : le site public utilise désormais la même image et le même point focal sur ordinateur et téléphone. Les anciennes variantes mobiles restent stockées mais ne remplacent plus la photo principale ; les champs mobiles distincts sont retirés du formulaire. Après sauvegarde, un événement de stockage notifie les autres onglets du même site ; le retour sur un onglet déclenche également un rafraîchissement, sans polling. Le cache public conserve l'invalidation à la sauvegarde et expire après 30 secondes pour limiter les données anciennes entre instances ; les lectures Supabase internes ne créent pas de second cache de requêtes. Les enregistrements masqués affichent un message explicite de sauvegarde en brouillon. La mise en page publique est légèrement plus compacte, sans changer la taille du dashboard ni réduire les zones tactiles.

Autre défaut confirmé dans le code : les formulaires proposaient un second paragraphe et une image de présentation pour Services, Réseau, Messagerie, Location et Contact, mais leurs rendus publics les ignoraient. Ces valeurs sont maintenant affichées lorsqu'elles sont renseignées, sans bloc vide autrement. La description des cartes réseau et les textes alternatifs de flotte sont également affichés/utilisés.

Compatibilité Chrome : les suites navigateur utilisent désormais Google Chrome par défaut (`BROWSER_CHANNEL` permet de choisir un autre canal). Les posters réseau occupent toute la largeur de leur cadre, avec hauteur naturelle et agrandissement conservant la carte entière. Les liens admin ne préchargent plus les autres rubriques. Le proxy ne rafraîchit plus une ancienne session sur la page ou le POST de connexion : cette étape ne peut donc pas écraser les cookies du nouveau login. La protection des pages et mutations reste active. Le test Chrome couvre notamment une nouvelle connexion avec des cookies expirés ; le compte Supabase réel reste à vérifier avec son utilisateur.

Dans Lignes et réseau, « Carte du réseau voyageurs — image » est maintenant ouverte directement. Si la ligne `network_maps.voyageurs` manque, le formulaire propose sa création avec la clé existante attendue par le site, sans requête d'écriture avant Enregistrer et sans migration SQL. Le même mécanisme répare le cas d'une carte messagerie absente. La fiche du service « Transport de voyageurs » est également gérée dans Lignes et réseau plutôt que dans Accueil.

Les huit rubriques utilisent les tables et la protection Supabase Auth existantes. Les anciennes URL avec `?section=` restent compatibles. Les agences et lignes conservent leurs relations avec `cities` dans les colonnes existantes ; les agences associées à une ligne sont sélectionnées dans `data.agency_ids`, sans nouvelle table. Les sections éditoriales sont paginées par 20 éléments. Les textes des services messagerie et location sont accessibles dans leurs rubriques respectives.

Paramètres conserve les logos, favicon, image de partage, nom de la société FR/AR, présentation du footer, réseaux sociaux, couleurs, typographie, navigation, SEO et sécurité du compte. Les coordonnées et horaires sont dans Contact. Le footer utilise maintenant les numéros enregistrés pour ses liens téléphoniques, et le nom de société enregistré pour son copyright. Les horaires enregistrés sont affichés sur le site.

## Diagnostic des images

- Le code utilise réellement Supabase Auth : `auth.getUser()` puis contrôle de l'UUID dans `admin_users`. Le client SSR transmet le jeton de cette session au Storage. Aucun contournement par une clé privilégiée n'a été ajouté.
- `.env.local` contient une URL et une clé publique, sans clé service_role. Cette dernière n'est pas nécessaire aux uploads administrateur. Sa présence reste nécessaire aux messages publics et au suivi des visites.
- `SLKM_PREVIEW=true` est activé localement : le site public lit alors `lib/seed.ts`, et non les modifications enregistrées dans Supabase. C'est une cause confirmée de non-affichage des changements publics, sans preuve d'un échec de téléversement. Une indication explicite apparaît désormais dans l'administration.
- Les tentatives de lecture distante Auth, PostgREST et Storage ont toutes échoué avec `EACCES` dans cet environnement. L'existence effective du bucket, les policies déployées et les droits du compte réel ne peuvent donc pas être certifiés ici. Aucun upload ni changement de base distant n'a été effectué.
- Un défaut de compatibilité locale a été corrigé : le client Auth acceptait Supabase HTTP sur loopback, tandis que la validation des références et les images Next.js ne le permettaient pas. HTTP reste interdit pour les médias distants ; les URL locales doivent désigner le bucket public existant. Les images Next.js sont limitées à l'origine Storage configurée et à ce bucket.

Le champ image commun conserve la sélection localement jusqu'à Enregistrer. L'aperçu `blob:` est révoqué à l'annulation, au remplacement et au démontage. Un échec conserve le brouillon et l'ancienne référence. Les réussites ne sont annoncées qu'après upload, insertion de `media_assets` et sauvegarde du contenu. Chaque sauvegarde ne vérifie qu'une seule fois l'accès administrateur, puis réutilise ce client vérifié pour les étapes internes.

JPEG, PNG, WebP et AVIF : 8 Mio maximum par fichier, 40 millions de pixels maximum au décodage. Photos converties en WebP jusqu'à 2560 × 2560 ; transparence conservée. Favicon converti en PNG transparent 128 × 128. Les noms d'objets utilisent un UUID. La limite des actions existante est de 36 Mo ; vérifier également la limite de corps de requête du reverse proxy/hébergeur avant déploiement.

En cas d'échec après upload, les nouvelles références sont supprimées puis les objets inutilisés sont nettoyés. Les anciens objets partagés restent protégés par la policy de nettoyage. Les erreurs Storage indiquent désormais le refus d'autorisation ou l'absence/inaccessibilité du bucket ; les journaux serveur n'incluent ni clés ni contenu des fichiers.

## Mise en service Supabase

Aucune nouvelle migration SQL n'est nécessaire pour cette correction. Ne pas réexécuter les anciennes migrations déjà appliquées.

Si elles ne sont pas encore déployées, exécuter dans le SQL Editor, après les cinq migrations `202611030001` à `202611030005` :

1. Le SQL intégral de `supabase/migrations/202611040001_admin_dashboard_v2.sql` pour les statistiques et journaux.
2. Le SQL intégral de `supabase/migrations/202611040002_media_cleanup.sql` pour nettoyer les nouveaux objets inutilisés après un échec. Cette policy refuse la suppression des images encore référencées.

Le bucket attendu est `slkm-media`, public en lecture, limité aux quatre MIME ci-dessus et à 8388608 octets. Sa policy d'insertion doit exiger `authenticated` et `public.is_admin()`. Vérifier l'UUID du compte connecté dans `admin_users` ; ne pas ouvrir les écritures à tous les comptes.

Configurer `SLKM_PREVIEW=false` pour afficher le contenu réel. Conserver les variables publiques du même projet Supabase. Ne jamais placer `SUPABASE_SERVICE_ROLE_KEY` dans une variable `NEXT_PUBLIC_*`. Redémarrer après modification des variables ; reconstruire après changement de l'origine des images.

## Vérifications et limites

Les tests navigateur utilisent une fixture locale Auth/PostgREST/Storage et le vrai serveur Next.js, le transport SSR, les Server Actions et Sharp. Ils couvrent les huit rubriques, le menu mobile, FR/AR et RTL, les accès refusés, la reconnexion, les images locales, l'annulation, le refus Storage, le nettoyage après échec de sauvegarde, la reprise, la persistance, le logo transparent, le favicon et le contenu public après invalidation du cache. Le rendu optimisé des URL simulées est remplacé par une image de test dans le navigateur : cela ne vérifie pas l'optimiseur contre le Storage réel.

Le test SQL exécute également la migration de nettoyage dans PGlite et vérifie la protection des objets partagés. Les tests publics parcourent FR/AR à six largeurs et les interactions existantes. Les captures et rapports sont dans `artifacts/`.

À vérifier sur l'installation réelle : connexion du compte autorisé, bucket/policies effectifs, upload d'une photo puis rechargement, logo/favicon dans le navigateur et affichage public avec prévisualisation désactivée. Vérifier aussi l'acceptation des fichiers de 8 Mio par l'hébergement. Les tests locaux ne certifient pas ces points distants.

Vérifications exécutées : typage, lint, build de production, 10 tests unitaires, SQL/PGlite avec nettoyage Storage, navigateur Auth/SSR/Storage simulé et tests publics FR/AR aux six largeurs. Les parcours navigateur incluent aussi l'enregistrement d'une image depuis Notre histoire, sa présence dans le HTML public après invalidation et sa persistance après rechargement. Le test attend le statut exact « Enregistré », sans le confondre avec l'indication de modifications non enregistrées.
