# Agent Instructions

## Purpose

This repository uses a documentation-first handoff workflow so different coding agents can continue work from the same local files without losing context.

## Mandatory Read Order

Before making any code or documentation changes, read these files in order:

1. `project-docs/00_project_overview.md`
2. `project-docs/01_current_goal.md`
3. `project-docs/02_work_log.md`
4. `project-docs/03_rules.md`
5. `project-docs/04_product_vision.md`

If the task is part of the migration, also read:

- `MIGRATION_PLAN.md`
- `SUPABASE_AUTH_MIGRATION.md`

## Mandatory Workflow

Every work cycle must follow this sequence:

1. Read the required docs
2. Infer current state from code and docs together
3. Make the smallest coherent set of changes needed
4. Update documentation before finishing
5. Append the work history to `project-docs/02_work_log.md`

## Required Documentation Updates

After meaningful work, update all applicable files:

- `project-docs/02_work_log.md`
  - what changed
  - why it changed
  - remaining issues
  - recommended next task
- `project-docs/01_current_goal.md`
  - only if the active milestone or scope changed
- `project-docs/03_rules.md`
  - only if a new standing workflow rule was introduced

## Non-Negotiable Rules

- Do not skip `project-docs/02_work_log.md` after meaningful work
- Do not overwrite unrelated user changes
- Do not treat legacy Express session auth as the long-term target architecture
- Do not add new feature work on top of the old auth model unless absolutely required
- Prefer additive transitional changes over risky big-bang rewrites

## Handoff Rule

If work is being handed to another agent or resumed in a later session:

- use `project-docs/agent_handoff_template.md`
- make sure `project-docs/02_work_log.md` reflects the latest state first

## Current Architecture Direction

The current intended direction is:

- GitHub-managed repository
- Vercel deployment
- Supabase Auth
- Supabase Postgres
- Modular structure; keep each HR module separable
- Modular integrated-system product structure where survey is only one module
