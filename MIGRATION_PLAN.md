# Thingspire Flow Migration Plan

## Goal

Move the project from a Replit-oriented monorepo to a GitHub-managed codebase deployed on Vercel, with Supabase handling authentication and PostgreSQL.

Operational working docs live under:

- `project-docs/00_project_overview.md`
- `project-docs/01_current_goal.md`
- `project-docs/02_work_log.md`
- `project-docs/03_rules.md`
- `project-docs/agent_handoff_template.md`

Target direction:

- Frontend deploys on Vercel
- Authentication moves to Supabase Auth
- Database moves to Supabase Postgres
- Replit-specific runtime assumptions are removed
- Session-based Express auth is retired

## Recommended Architecture

Use this as the default migration target unless a different constraint appears:

- Keep the current React frontend first
- Remove Express session auth
- Replace auth flows with Supabase Auth
- Keep PostgreSQL schema ownership in the app repo
- Use Supabase for DB + auth, and only keep server-side endpoints where the frontend should not query directly

This avoids doing two migrations at once. Replacing Vite with Next.js right now would multiply moving parts. First stabilize deployment and auth, then decide whether a framework migration is worth it.

## Current-State Audit

### Replit-dependent areas

- `.replit`
- `replit.md`
- `artifacts/thingspire-flow/vite.config.ts`
- `artifacts/api-server/src/index.ts`

Current risks:

- `PORT` and `BASE_PATH` are required at boot in ways tied to Replit workflows
- Replit-only Vite plugins are enabled
- Dev/prod assumptions are centered around Replit artifacts rather than GitHub/Vercel

### Express/session-dependent areas

- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/lib/session.ts`
- Any route using `getCurrentUser()`
- Frontend auth hook: `artifacts/thingspire-flow/src/hooks/use-auth.ts`

Current risks:

- Session cookie auth is not the target model
- `connect-pg-simple` session storage becomes unnecessary
- Password hashing and login flow must be replaced, not patched

### DB-coupled areas

- `lib/db/src/index.ts`
- `lib/db/src/schema/*.ts`
- All API routes under `artifacts/api-server/src/routes`

Current risks:

- Current `users` table is acting as both identity source and app profile
- Supabase splits those concerns between `auth.users` and app tables
- Authorization will need RLS and app-level role rules

### Mixed data-access areas on the frontend

- Generated API hooks from `@workspace/api-client-react`
- Manual fetch hooks in `artifacts/thingspire-flow/src/hooks/use-dashboard.ts`

Current risks:

- Two fetch strategies are already mixed
- Session cookie assumptions exist in manual fetch
- Migration work will get duplicated if the data layer is not unified

## Decision Log

These decisions should be treated as working assumptions for implementation.

1. Do not keep Express session auth.
2. Do not port the current login system as-is.
3. Do not migrate to Next.js in the first pass unless Vercel deployment forces it.
4. Keep the existing domain model for surveys, departments, responses, and action items.
5. Split identity from profile data when moving to Supabase.

## Work Breakdown

### Phase 1. Freeze target architecture

Objective:

- Confirm the first deployable architecture so implementation does not drift

Tasks:

- Keep frontend in `artifacts/thingspire-flow`
- Treat `artifacts/api-server` as legacy unless a route must survive server-side
- Define whether analytics endpoints remain server-only or become DB views/RPCs
- Decide where role information lives:
  - Recommended: `profiles` table with `role`, `department_id`, `employment_status`, `employee_group`

Definition of done:

- One-page architecture choice documented
- No unresolved question about session auth surviving

### Phase 2. Replace authentication

Objective:

- Move user identity and session handling to Supabase Auth

Tasks:

- Create a Supabase client layer for browser auth
- Replace `useAuth()` and `useProtectedRoute()` with Supabase-based session state
- Replace `/auth/login`, `/auth/logout`, `/auth/me` dependency on Express
- Remove password hashing and server-side local session persistence
- Map app roles on top of authenticated users

Primary files affected:

- `artifacts/thingspire-flow/src/hooks/use-auth.ts`
- `artifacts/thingspire-flow/src/pages/login.tsx`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/lib/session.ts`
- `artifacts/api-server/src/app.ts`

Definition of done:

- Login/logout/current-user work through Supabase
- Protected routes use Supabase session state
- No app flow requires `express-session`

### Phase 3. Redesign user/profile schema

Objective:

- Separate authentication identity from app-specific user metadata

Tasks:

- Replace direct reliance on current `users` table for login identity
- Introduce an app profile table keyed by Supabase user ID
- Decide whether the existing `users` table is:
  - migrated into `profiles`, or
  - retained but repurposed
- Update references from API and dashboard logic

Recommended profile fields:

- `id` linked to `auth.users.id`
- `full_name`
- `role`
- `department_id`
- `employment_status`
- `employee_group`
- `job_title`
- `joined_on`
- `is_system_admin` only if still truly needed

Primary files affected:

- `lib/db/src/schema/users.ts`
- `lib/db/src/schema/profiles.ts`
- `artifacts/api-server/src/routes/users.ts`
- `artifacts/api-server/src/lib/session.ts`
- `artifacts/api-server/src/routes/dashboard.ts`

Definition of done:

- App authorization reads from profile data, not legacy local-login assumptions

### Phase 4. Decide server-side API surface

Objective:

- Reduce or reshape the current Express API to fit Vercel + Supabase

Options:

- Option A: Keep a thin server layer only for privileged operations and analytics aggregation
- Option B: Move most CRUD to Supabase directly and keep only secure server-side computations

Recommended:

- Keep a thin server layer for:
  - dashboard aggregation
  - admin-only mutations that should not run from public client code
  - any future AI/report generation

Tasks:

- Review every route in `artifacts/api-server/src/routes`
- Mark each route as `direct-db`, `server-only`, or `delete`
- Stop treating current Express app as mandatory runtime infrastructure

Route triage starting point:

- `auth`: replace
- `departments`: likely keep as admin-managed API or move to controlled client access
- `users`: likely keep as admin-managed API
- `surveys`: mixed, likely keep admin mutations server-side
- `responses`: can be client-driven if RLS is safe, otherwise keep server-side
- `dashboard`: likely keep server-side

Definition of done:

- Every route has a migration destination and owner

### Phase 5. Unify frontend data access

Objective:

- Stop mixing incompatible fetch patterns during the migration

Tasks:

- Choose one primary frontend data-access style:
  - generated API hooks for server endpoints
  - Supabase client queries for direct DB access
- Remove session-cookie assumptions from manual fetch code
- Separate `server endpoint queries` from `Supabase client queries`

Primary files affected:

- `artifacts/thingspire-flow/src/hooks/use-dashboard.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/*`

Definition of done:

- Frontend data layer is coherent enough that new features do not need both systems

### Phase 6. Remove Replit runtime assumptions

Objective:

- Make local dev and Vercel deployment independent of Replit

Tasks:

- Replace Replit-only Vite plugins
- Relax or redesign `PORT` and `BASE_PATH` boot requirements
- Remove Replit deployment notes from active workflow docs
- Add Vercel-compatible environment variable documentation

Primary files affected:

- `artifacts/thingspire-flow/vite.config.ts`
- `artifacts/api-server/src/index.ts`
- `.replit`
- `replit.md`

Definition of done:

- Local boot does not depend on Replit
- Vercel build expectations are explicit

### Phase 7. Deployment preparation

Objective:

- Make the repository deployable from GitHub with predictable env configuration

Tasks:

- Create `.env.example`
- Define required Vercel env vars
- Define required Supabase env vars
- Decide preview/staging/production strategy
- Verify frontend base path assumptions are correct for Vercel

Expected env groups:

- Supabase URL
- Supabase anon key
- Supabase service role key if server routes remain
- Database connection string
- Optional app URL/base URL

Definition of done:

- Another machine can clone the repo and understand what secrets/config are needed

## File-by-File Action List

### Keep with modification

- `artifacts/thingspire-flow/src/pages/*`
- `artifacts/thingspire-flow/src/components/*`
- `artifacts/thingspire-flow/src/hooks/use-dashboard.ts`
- `lib/db/src/schema/surveys.ts`
- `lib/db/src/schema/departments.ts`
- `lib/db/src/schema/action_items.ts`
- `lib/db/src/schema/surveys.ts`

### Rebuild or heavily refactor

- `artifacts/thingspire-flow/src/hooks/use-auth.ts`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/lib/session.ts`
- `lib/db/src/schema/users.ts`
- `artifacts/thingspire-flow/vite.config.ts`

### Possibly remove

- `connect-pg-simple` usage
- `express-session` usage
- Replit Vite plugins
- `.replit` once no longer needed

## Immediate Execution Order

This is the order to actually implement in the repo.

1. Create a Supabase migration checklist and profile schema proposal
2. Replace frontend auth hook with a Supabase-oriented abstraction
3. Refactor login page to use Supabase Auth
4. Redesign user/profile schema and permissions mapping
5. Decide which API routes survive as server routes
6. Refactor dashboard and admin data fetches accordingly
7. Remove Replit runtime dependencies
8. Add GitHub/Vercel/Supabase environment docs

## Immediate Next Task

Start with auth and user modeling, not deployment config.

Reason:

- Auth touches route protection, admin screens, and every API permission check
- If auth remains undecided, any work on API or DB shape will be partially wrong

Concrete next deliverable:

- A `SUPABASE_AUTH_MIGRATION.md` document that maps:
  - old auth flow
  - new auth flow
  - profile schema
  - role enforcement rules
  - frontend hooks to replace
