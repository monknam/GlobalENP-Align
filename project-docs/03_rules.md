# Rules

## Architecture Rules

- Treat Express session auth as legacy
- Treat Supabase Auth as the target auth system
- Do not add new features on top of the old login model
- Do not mix migration with unrelated UI expansion unless required
- Treat the product as an integrated system with modular functional areas
- Do not frame survey as the whole product in naming, navigation, or IA
- Keep modules logically separated even when they share layout, auth, or data foundations

## Editing Rules

- Preserve user changes already present in the worktree
- Do not revert unrelated modified files
- Prefer additive migration steps over risky big-bang rewrites
- Keep exports stable where possible to reduce churn

## Documentation Rules

- Every meaningful work cycle must end with a `project-docs/02_work_log.md` update
- Every coding agent should start from `AGENTS.md` and the required read order defined there
- Update `project-docs/02_work_log.md` after meaningful migration work
- Update `project-docs/01_current_goal.md` if the active milestone changes
- Use `project-docs/agent_handoff_template.md` when handing work to another agent or session

## Execution Rules

- Prioritize auth and schema direction before deployment polish
- Prefer documenting assumptions explicitly rather than leaving them implicit
- If code cannot be verified locally, record that limitation in the work log
- Before finishing, record changed files, remaining issues, and the recommended next task
- When making UI or navigation decisions, check them against `project-docs/04_product_vision.md`
