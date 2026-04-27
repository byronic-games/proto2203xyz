# AI Starter Prompt

You are taking over project `52!` in folder `USETHIS`.

## Read First
1. `HANDOVER.md`
2. `RUNBOOK.md`
3. `KNOWN_ISSUES.md`
4. `NEXT_TASKS.md`
5. `DATA_CONTRACTS.md`
6. `STATE_MAP.md`

## Hard Constraints
- Do not clear/reset storage unless explicitly requested.
- Preserve deck unlock order: Blue -> Green -> Red.
- Keep mobile layout stable.
- Use minimal targeted patches (avoid broad refactors).
- Bump HTML query versions after JS/CSS edits.

## Current Priority
- Fix Android reveal animation where card rotates but face does not appear.

## First Actions
1. Run smoke checks from `RUNBOOK.md`.
2. Reproduce reveal issue on Android profile.
3. Patch and re-test Daily/Heroes/Profile regressions.
