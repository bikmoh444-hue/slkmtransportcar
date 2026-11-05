# Correction « An unexpected response was received from the server »

Cette exception est générée par le client Next.js lorsque la soumission d’une Server Action ne reçoit pas la réponse RSC attendue. La ligne `<LoginForm>` dans la page indique le point de montage du composant client. Elle ne prouve pas un refus Supabase.

La connexion utilise maintenant un formulaire HTML classique, `POST /admin/login/submit`, avec redirection HTTP 303. `useActionState` et la référence de Server Action ont été retirés du formulaire. Cette soumission ne dépend plus des identifiants d’actions générés par le bundler ou d’une réponse Flight/RSC.

Le service serveur partagé `lib/auth/login.ts` conserve la validation, `signInWithPassword`, `getUser`, le contrôle du rôle par UUID et les cookies SSR. Le Route Handler vérifie l’origine du POST, borne le corps à 16 Kio, refuse les demandes d’une autre origine et conserve les réponses privées sans cache. Aucun rôle n’a été accordé et aucune RLS n’a été modifiée.

Le POST à vide observé pendant le diagnostic sur le serveur de développement ne reproduisait pas l’exception RSC initiale. Après correction, la même vérification sur `http://localhost:3000` constate le formulaire natif et une réponse 303 vers le message de validation, avec `Cache-Control: private, no-store`. Aucun identifiant réel n’est utilisé pour ce contrôle.

Vérifications : TypeScript, lint, tests unitaires et SQL ; build explicite `npm run build -- --webpack`. Le test `npm run test:auth` vérifie la connexion sur ce build avec une API Auth isolée et simulée, et contrôle que chaque soumission de connexion est un POST natif sans en-tête `Next-Action`. Le test conserve les contrôles de cookies, rôle, rafraîchissement, déconnexion et perte de session. Les identifiants simulés sont générés, y compris espaces et signe `+`, pour vérifier leur préservation par l’encodage du formulaire.

Les captures ou essais de connexion à un compte Supabase réel ne sont pas annoncés : aucun compte de test réel autorisé n’est disponible. Le statut du compte SLKM reste une vérification propriétaire distincte du transport HTTP corrigé.

Après mise à jour, recharger complètement `/admin/login` pour abandonner un éventuel ancien formulaire gardé en mémoire par le navigateur.
