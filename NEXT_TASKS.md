# Next Tasks Checklist

## P0 - Shared Player Identity
- Add stable cross-table player ID for Heroes + Daily.
- Use ID-first crown enrichment; name fallback only.
- Acceptance: rename/name-collision no longer breaks crowns.

## P0 - Explicit Daily Clear Data
- Ensure daily clear writes durable `daily_clears` signal for new rows.
- Keep score-threshold fallback only for legacy rows.
- Acceptance: new rows show gold without inference.

## P1 - SQL Backfill Scripts In Repo
- Add `tools/sql/` scripts for preview/apply backfills.
- Include rollback notes.
- Acceptance: backfills are repeatable and auditable.

## P1 - Diagnostics
- Add optional debug summary for Daily load path:
  - source online/offline
  - row count
  - crowns enriched count
- Acceptance: mismatch reports diagnosable from one screenshot/log.

## P2 - Daily Table Polish
- Validate smallest phone heights.
- Tune row/crown spacing.
- Acceptance: no clipping, ties still correct.
