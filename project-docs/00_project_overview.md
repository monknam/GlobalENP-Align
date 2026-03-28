# Project Overview

## Project

Thingspire Flow is a modular HR and organizational operations system.

At the current implementation stage, the survey module is the most developed part, but survey is only one functional area inside the larger product.

## Current Direction

The project initially used Express, session auth, and local PostgreSQL.

The active migration target is:

- GitHub as the source repository
- Vercel for deployment
- Supabase Auth for authentication
- Supabase Postgres for database hosting

## Current Codebase Shape

- Frontend: `artifacts/thingspire-flow`
- Legacy API server: `artifacts/api-server`
- Shared DB schema: `lib/db`
- Generated API clients/spec: `lib/api-client-react`, `lib/api-spec`, `lib/api-zod`

## Important Strategy

- Keep the current React + Vite app for the first migration pass
- Do not keep Express session auth
- Introduce Supabase Auth and a `profiles`-style app user model
- Keep product structure modular so future HR modules remain separable
- Keep product structure modular so future HR modules remain separable
- Avoid naming or information architecture that frames the whole system as survey-only

## Core Reference Docs

- `MIGRATION_PLAN.md`
- `SUPABASE_AUTH_MIGRATION.md`
- `project-docs/04_product_vision.md`

## Working Assumption

Do not combine architecture migration and unrelated feature expansion in the same pass.
