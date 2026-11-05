# Mise à jour

Voir [ADMIN-CORRECTIONS.md](ADMIN-CORRECTIONS.md) pour les rubriques actuelles, les corrections de médias et les limites de vérification. Le graphique utilise désormais un SVG sans Recharts et aucun polling du dashboard n’est actif. Les anciennes descriptions ci-dessous constituent l’historique.

# SLKM Dashboard V2 — implementation and deployment

This update modifies the existing Next.js 16.2 App Router application. Existing content tables, storage bucket, authorization by Auth UUID, login transport and public navigation remain in use. No existing data is removed by the new migration.

## Delivered

- Scoped light dashboard palette, blue/lime accents, grouped icon navigation, collapsible sidebar, mobile drawer, sticky toolbar, current date and account shortcuts.
- Ten database-backed statistics, traffic chart with 7/30/90-day and 12-month views, content shortcuts, recent complaints and automatic activity logs. Dashboard refreshes while visible every minute.
- Dedicated `/admin/accueil`, `/admin/notre-histoire`, `/admin/parametres` routes; legacy query-based management links remain valid.
- Existing editorial CRUD, numeric ordering, publication controls and bilingual content retained. FR/AR form tabs, RTL Arabic, inline image imports and compact live content previews added. Hero fields include both CTA buttons. History includes values and timeline fields.
- Settings grouped into identity, contact, social links and appearance. SEO, metadata title/description, sharing image and account password change are available on the settings page. Password change requires the current password.
- Uploaded logo/favicon use existing immutable Supabase image storage and existing Next.js metadata integration. Clearing an image URL removes its use, while retaining stored files to protect existing references.
- Server-validated first-party tracking; optional anonymous UUIDs, no stored IP/email/user agent, Do Not Track support, 30-day visitor ID rotation, per-tab session IDs, same-origin checks and database-enforced rate limits. Hashed rate-limit keys expire; tracking failures do not affect navigation.
- Lazy-loaded Recharts; existing tagged public-content cache and save/delete invalidation preserved. New custom page sections render using existing public styles; Maps links use stored settings.

## SQL execution order

On an existing installation with migrations `202611030001` through `202611030005` already applied, run only:

1. `supabase/migrations/202611040001_admin_dashboard_v2.sql`

Paste that entire file into Supabase SQL Editor once. It is transactional and creates analytics, rate-limit, audit tables, RPC functions, RLS policies, indexes and audit triggers. It has not been executed remotely. Do not rerun the original initial migration against an existing database. On a fresh installation, apply the five existing migrations in filename order before this new migration and follow the existing seed/admin setup documentation.

No duplicate homepage, history or settings tables were created: `hero_slides`, `page_sections`, `site_settings`, `seo_settings`, `services` and `media_assets` already provide these capabilities. Admin management is deliberately omitted: the existing model permits users to read only their own membership and cannot safely list or provision administrators.

## Environment and startup

No new variable names. See `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or existing legacy anon key alternative)
- `SUPABASE_SERVICE_ROLE_KEY` — server only, needed for complaint submission and analytics ingestion; admin sign-in does not require it.
- `RATE_LIMIT_SECRET` — at least 32 random characters.
- `NEXT_PUBLIC_SITE_URL` — canonical origin, matching the deployed site.
- `SLKM_PREVIEW=false` for real public content and tracking; `true` enables the existing explicit local preview.

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:3000/admin/login`. Production: `npm.cmd run build`, then `npm.cmd start`.

## File inventory

Created:

- `components/admin-shell.tsx`
- `components/admin-dashboard.tsx`
- `components/traffic-chart.tsx`
- `components/traffic-plot.tsx`
- `components/account-settings.tsx`
- `components/visit-tracker.tsx`
- `app/admin/accueil/page.tsx`
- `app/admin/notre-histoire/page.tsx`
- `app/admin/parametres/page.tsx`
- `app/admin/loading.tsx`
- `app/api/visits/route.ts`
- `supabase/migrations/202611040001_admin_dashboard_v2.sql`
- `tests/public-preview.mjs`
- `docs/ADMIN-V2.md`

Modified:

- `app/admin/page.tsx`
- `app/admin/actions.ts`
- `components/admin-editor.tsx`
- `app/globals.css`
- `app/[locale]/page.tsx`
- `app/layout.tsx`
- `app/icon.svg` moved intact to `public/icon.svg` so file-based metadata cannot override the configured favicon
- `.env.example`
- `package.json`, `package-lock.json` (Recharts)
- `tests/database.mjs`
- `tests/auth-browser.mjs`
- `tests/browser.mjs`

## Verification and operational limits

The workspace has no `.git` repository, so a Git diff cannot be generated. Existing changed files were reviewed directly. The implementation was continued in place. Favicon imports produce a 128px PNG; the original fallback SVG remains available at `/icon.svg`, and configured metadata can override it.

Run `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run test:sql`, `npm.cmd run build`, `npm.cmd run test:auth`, and `node tests/public-preview.mjs`.

SQL tests exercise existing migrations and preservation plus new analytics ingestion, rate limits, audit triggers, unauthorized access and role policies in local PostgreSQL/PGlite. Auth/browser tests use an isolated local Auth/PostgREST fixture with real Next.js/SSR transport; they do not prove connectivity to the deployed Supabase project. They cover ten cards, 390/768/1440px layouts, dedicated routes, saves, session refresh, denied mutations and logout. Public tests cover French/Arabic across six widths and existing interactions. Screenshots and result JSON are in `artifacts/`.

Analytics starts at deployment; no historical traffic is invented. Cards measure page views, not unique people. The chart also aggregates page views; distinct anonymous daily visitor counts are available from the read RPC. Period boundaries use UTC and displayed administration timestamps use Africa/Casablanca. Percentage comparison currently covers yesterday/today when a nonzero prior period exists. Fleet records describe registered vehicle types/capacities, not an independently verified physical vehicle inventory. Complaints have no subject/reference columns: the dashboard uses a message excerpt and the first eight UUID characters, preserving the complete record.

Fonts remain self-hosted Plus Jakarta Sans/Cairo: fetching Inter was blocked by the environment's network restrictions. Full remote upload, metadata propagation and real account changes require deployment credentials and the new migration. Stored media stays immutable; replacement/removal changes references rather than deleting shared storage objects. Activity logs begin after migration and intentionally exclude complaint contents and passwords. Rate-limit IP headers assume a trusted deployment proxy (Vercel/Cloudflare); environments without one share the fallback rate-limit key.


## Final verification ? 2026-11-04

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: PASS.
- `npm.cmd run build`: PASS, including the explicit dynamic configuration and private metadata of the three dedicated admin routes.
- `npm.cmd test`: PASS, 9 tests.
- `npm.cmd run test:sql`: PASS using an isolated in-memory PGlite database; existing persistence, RLS, new analytics rate limiting and audit triggers verified.
- `npm.cmd run test:auth`: PASS with the isolated Auth/SSR fixture, including session refresh, denied writes, logout, ten dashboard cards and responsive/dedicated routes. The fixture now preserves valid access tokens and models the brief refresh-token reuse interval for concurrent SSR requests.
- `node tests/public-preview.mjs`: PASS, including French/Arabic public navigation and interactions across six viewport widths.

No remote SQL migration or production content mutation was performed. Apply the single new migration manually before enabling real analytics. Runtime remote uploads and actual account password changes remain to be checked against the deployed Supabase project.

## Hydration, language switch and brand settings update

- Editorial panels now use React-controlled buttons and `hidden` forms instead of native `<details open>` attributes. Navigation groups use the same controlled pattern. No hydration warning is suppressed.
- Administration language is selected from the topbar (Français / العربية), stored in an `/admin`-scoped cookie and read on the server for the first render. Arabic uses RTL, localized navigation, dashboard labels, forms and dates. The language switch reloads the current page; unsaved forms warn before leaving.
- Topbar date and traffic-chart date boundaries now come from the same server snapshot rather than independently reading the clock during hydration.
- `/admin/parametres` starts with an expanded **Logo et icône du site** panel: principal logo, footer logo, favicon and social sharing image. Upload/replace/preview/remove and a dedicated save button use the existing Supabase integrations.
- Asset saves preserve the other identity settings; saving the general settings form preserves the current logo/icon references. Favicon uploads remain PNG, and existing metadata/cache invalidation remains in use.
- Browser regression coverage includes FR/AR persistence, RTL at 390/1440px, editorial expansion, visible brand settings, saving/reloading asset references, preserving those references during general saves, and rejecting hydration errors. The regression uses local Auth/PostgREST fixtures, not real account credentials or production writes.
- Added `lib/admin-i18n.ts`, `components/admin-language.tsx`, `components/admin-brand-settings.tsx`. Also updated the existing admin shell, editors, dashboard, chart, account forms, admin route, actions, proxy and styles.

No additional SQL migration or environment variable is required for this update.
