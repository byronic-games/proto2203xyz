# 52! Handover Checklist

## Snapshot
- Branch: `main`
- Baseline commit: `653a8f2`
- App type: static browser app, mobile-first

## Entry Points
- `index.html` main menu
- `game.html` gameplay
- `daily.html` daily hub
- `heroes.html` heroes board
- `profile.html` profile
- `settings.html` settings

## Critical Rules
- Preserve unlock order: Blue -> Green -> Red.
- Do not wipe local storage progress unless asked.
- Keep mobile layout stable first.
- Bump HTML asset query versions after JS/CSS edits.
- Be careful with Daily determinism changes mid-day.

## Daily/Crown Current Behavior
- Online Daily board uses Supabase rows only.
- No local-only row injection when online.
- Crown rendering is per-entry (no device-local leak).
- Gold daily crown shown when:
  - `daily_clears > 0`, or
  - historical daily score `>= 51` (name-based enrichment fallback).

## Read Next
1. `RUNBOOK.md`
2. `DATA_CONTRACTS.md`
3. `STATE_MAP.md`
4. `KNOWN_ISSUES.md`
5. `NEXT_TASKS.md`
6. `AI_STARTER_PROMPT.md`
