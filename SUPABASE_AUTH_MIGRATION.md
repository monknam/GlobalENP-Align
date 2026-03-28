# Supabase Auth Migration

## Objective

Replace the current local email/password + Express session model with Supabase Auth, while preserving the application's role-based behavior (`admin`, `leader`, `member`).

Working-state references:

- `project-docs/00_project_overview.md`
- `project-docs/01_current_goal.md`
- `project-docs/02_work_log.md`
- `project-docs/03_rules.md`

## Current Auth Flow

### Backend

- `POST /api/auth/login`
  - verifies email/password against local `users` table
  - hashes password with fixed SHA-256 salt
  - stores `userId` in server session
- `POST /api/auth/logout`
  - destroys server session
- `GET /api/auth/me`
  - resolves the current user from session

Files:

- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/lib/session.ts`
- `artifacts/api-server/src/app.ts`

### Frontend

- `useAuth()` calls generated hooks:
  - `useLogin`
  - `useLogout`
  - `useGetMe`
- `useProtectedRoute()` redirects based on `user.role`
- Login form posts email/password to the local API

Files:

- `artifacts/thingspire-flow/src/hooks/use-auth.ts`
- `artifacts/thingspire-flow/src/pages/login.tsx`

## Problems With Current Model

1. It depends on Express session cookies.
2. It depends on a local password table.
3. It assumes the app server is the source of identity.
4. It is not aligned with Vercel + Supabase deployment.
5. It mixes authentication and profile/authorization concerns in one table.

## Target Auth Flow

### New source of truth

- Identity: Supabase Auth (`auth.users`)
- App profile and authorization: application table linked to auth user ID

Recommended table name:

- `profiles`

Current groundwork file:

- `lib/db/src/schema/profiles.ts`

Recommended key:

- `profiles.id = auth.users.id`

### New login flow

1. User enters email/password in frontend login page
2. Frontend calls `supabase.auth.signInWithPassword`
3. Supabase returns session
4. Frontend loads the app profile for the authenticated user
5. Protected routes authorize using profile role

### New logout flow

1. Frontend calls `supabase.auth.signOut`
2. Local auth state is cleared
3. User is redirected to `/login`

### New current-user flow

1. Frontend reads auth session from Supabase
2. If authenticated, app loads matching `profiles` row
3. UI uses merged auth + profile state

## Proposed Profile Schema

Recommended replacement for the current app-level `users` record:

- `id` uuid primary key, equals `auth.users.id`
- `email` text
- `full_name` text
- `role` enum: `admin | leader | member`
- `department_id` uuid nullable
- `employment_status` enum: `active | inactive | leave`
- `employee_group` enum: `dev | non_dev | management`
- `job_title` text nullable
- `joined_on` date nullable
- `is_system_admin` boolean default false
- `created_at`
- `updated_at`

Notes:

- `email` can be duplicated from `auth.users` for convenience, but auth identity should still come from Supabase
- `role` should be app-managed, not trusted from arbitrary client input

## Authorization Rules

Authorization should move from session lookups to profile-based checks.

### Role rules

- `admin`
  - full survey management
  - user management
  - department management
  - full dashboard and action item permissions
- `leader`
  - dashboard access
  - limited management actions only if explicitly allowed
- `member`
  - survey participation only

### Enforcement layers

- Frontend:
  - route gating
  - UX gating for buttons and screens
- Backend or privileged server routes:
  - final authorization check for admin/leader mutations
- Database:
  - RLS if direct client access is used

## Files To Replace

### Frontend

- Replace:
  - `artifacts/thingspire-flow/src/hooks/use-auth.ts`
- Refactor:
  - `artifacts/thingspire-flow/src/pages/login.tsx`
  - `artifacts/thingspire-flow/src/components/layout/Shell.tsx`
  - any page using `useProtectedRoute()`

### Backend

- Remove or retire:
  - `artifacts/api-server/src/routes/auth.ts`
  - `artifacts/api-server/src/lib/session.ts`
  - `express-session` setup in `artifacts/api-server/src/app.ts`

### Shared/Data model

- Refactor:
  - `lib/db/src/schema/users.ts`

## Files That Currently Depend on Role State

These will need to consume the new profile-based auth state.

- `artifacts/thingspire-flow/src/pages/dashboard.tsx`
- `artifacts/thingspire-flow/src/pages/admin/users.tsx`
- `artifacts/thingspire-flow/src/pages/admin/departments.tsx`
- `artifacts/thingspire-flow/src/pages/admin/surveys/edit.tsx`
- `artifacts/thingspire-flow/src/pages/results/dashboard.tsx`
- `artifacts/thingspire-flow/src/pages/surveys/index.tsx`
- `artifacts/thingspire-flow/src/pages/surveys/intro.tsx`
- `artifacts/thingspire-flow/src/pages/surveys/respond.tsx`

## Suggested New Frontend Auth Layer

Create a small auth module, for example:

- `artifacts/thingspire-flow/src/lib/supabase.ts`
- `artifacts/thingspire-flow/src/hooks/use-auth.ts`

Responsibilities:

- initialize Supabase client
- read session
- sign in
- sign out
- load profile row
- expose `user`, `profile`, `role`, `isAuthenticated`, `isLoading`

Recommended shape:

- `authUser`: raw Supabase auth user
- `profile`: app profile row
- `role`: derived from profile
- `isAuthenticated`: based on session

## Suggested New Server Pattern

If server routes remain:

- trust Supabase JWT/session, not Express session
- resolve the current user by verifying Supabase auth context
- read profile row for authorization

This is the replacement for `getCurrentUser()`.

## Migration Sequence

1. Add Supabase client setup
2. Replace login form integration
3. Replace `useAuth()` implementation
4. Replace `useProtectedRoute()` implementation
5. Introduce `profiles` schema mapping
6. Update role-based UI references
7. Retire local auth endpoints
8. Remove session middleware

## Risks To Watch

1. Role mismatch during transition
2. Existing admin/leader UX exposing actions no longer allowed
3. Profile row missing for a valid auth user
4. Dashboard/admin routes still assuming session-based backend identity
5. Generated OpenAPI auth hooks becoming dead code

## Implementation Notes

During migration, do not try to support both auth systems for long.

Recommended short transition:

- add Supabase auth path
- switch frontend to Supabase
- keep old auth endpoints only temporarily if needed for rollback
- remove old auth path once profile loading is stable

## Next Code Changes

The next implementation task should be:

1. add a Supabase client module
2. rewrite `artifacts/thingspire-flow/src/hooks/use-auth.ts`
3. keep the same exported API shape where possible so page churn stays small
