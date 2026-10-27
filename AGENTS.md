# AGENTS.md

## Repo shape

- The application lives entirely in `frontend/`; the root has no `package.json`. Run all Node/pnpm commands from `frontend/`.
- `frontend/README.md` is untouched create-next-app boilerplate. Use the root `README.md` instead.
- `database_migrations/` contains Supabase SQL applied manually in order: `schema.sql` → `seed.sql` → `params.sql`. `schema.sql` is the cumulative schema (tables, RLS, triggers, storage), not an incremental migration. Edit it for schema changes and rerun on a clean/dev Supabase instance.
- `Docs/` contains Spanish end-user manuals that describe product behavior.
- Both `package-lock.json` and `pnpm-lock.yaml` are tracked. The docs specify pnpm; use pnpm and avoid regenerating the other lockfile unnecessarily.

## Commands

```bash
cd frontend
pnpm install
pnpm dev
pnpm build
pnpm exec tsc --noEmit    # there is no "typecheck" script
pnpm exec eslint <paths>  # scoped lint
```

- `pnpm lint` currently fails with a large pre-existing backlog (~450 errors). Use scoped ESLint on changed files and distinguish new issues from that baseline.
- There is no automated test suite. `test_distribution.js` and `frontend/scripts/*` are ad-hoc debugging scripts, not a test runner.

## Architecture

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind v4 + shadcn/ui (new-york). `@/*` maps to `frontend/*`.
- Route groups: `app/(auth)`, `app/(pages)/(admin)`, `app/(pages)/owners`, `app/(pages)/(tenants)`. Main destinations are `/dashboard` (admin), `/payment-form` (tenant), and `/owners/dashboard` (owner).
- Most data access is client-side: `hooks/use-*.ts` query `lib/supabase.ts` with the anon key. Follow this hook pattern for new CRUD features. Only privileged operations use server actions in `actions/` or route handlers in `app/api/`.
- `lib/supabase-admin.ts` uses `SUPABASE_SERVICE_ROLE_KEY` and must stay server-only (server actions/API routes). Never import it into a client component or hook.
- Role routing is enforced in client layouts from `session.user.user_metadata.role` (`admin`, `operator`, `tenant`, `owner`, plus a `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` override). `proxy.ts` is intentionally a no-op; do not assume middleware protects routes.
- Email sending uses Resend via `lib/mail.ts`. Bulk sends are sequential with a delay to avoid provider rate limits.

## Environment

- `frontend/.env` is gitignored. Code expects `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_APIKEY`, `FROM_EMAIL`, `FROM_NAME`, and `NEXT_PUBLIC_APP_URL`.
- The root README is stale: it documents `RESEND_API_KEY`, but the code reads `RESEND_APIKEY`. Sending fails at runtime without the latter.
- `NEXT_PUBLIC_DOLAR_API_URL` and `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` are optional env vars used for exchange rates and the super-admin check.
- New remote image hosts must be added to `images.remotePatterns` in `next.config.ts`; image optimization is disabled but the host allowlist still applies.

## Change tracking

- After the user approves a change, append a concise entry to the root `MEMORY.md` with the date, affected files, and what changed. Do not log unapproved or in-progress work.

## Domain conventions

- UI, emails, and documentation are in Spanish. Use es-VE formatting for dates and currency.
- Amounts are dual-currency USD/VES via `currency` and `exchange_rate`. Use helpers in `lib/utils.ts`: `formatCurrency`, `parseLocalDate`, and `formatDateString`.
- Date-only DB fields are `YYYY-MM-DD`. Parse them with `parseLocalDate` rather than `new Date(string)` to avoid timezone shifts.
- Payment registration, approval, receipts, and reporting carry split/grouped payment details through `payments.metadata`; do not assume one payment maps to exactly one billing month.
