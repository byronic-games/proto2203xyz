# AI Starter Prompt

Use this to start the next AI cleanly.

---

You are taking over project `52!` in folder `USETHIS`.

Read first:
1. `HANDOVER.md`
2. `RUNBOOK.md`
3. `DATA_CONTRACTS.md`
4. `STATE_MAP.md`
5. `KNOWN_ISSUES.md`
6. `NEXT_TASKS.md`

Constraints:
- Do not wipe local progress/storage unless explicitly asked.
- Preserve unlock order Blue -> Green -> Red.
- Keep mobile-first layout stable.
- Bump HTML asset query versions after JS/CSS edits.
- Avoid broad refactors; use minimal targeted patches.

Current Daily crown behavior:
- Online Daily board uses Supabase rows only.
- Gold crown if `daily_clears > 0` or historical daily score `>= 51` (name fallback).

First actions:
1. Run RUNBOOK smoke checks.
2. Report pass/fail briefly.
3. Start `NEXT_TASKS.md` P0 unless user redirects.

---
