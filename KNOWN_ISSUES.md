# Known Issues Checklist

## P0
- Name-based identity matching can mis-map crowns when names collide or change.
- Daily determinism can shift if power/cheat pools are edited during active day.

## P1
- Mobile cache can serve stale JS/CSS unless query versions are bumped.
- Supabase policy/API drift can cause Daily/Heroes load failures.

## P2
- Mixed legacy schema (`deck_level` vs `level`) can create merge/display edge cases.
- Mobile density tweaks can regress readability quickly in overlays/tables.

## Convention To Keep In Sync
- Daily clear fallback currently uses score `>= 51`.
- If this threshold changes, update:
  - code enrichment logic
  - SQL backfills
  - docs
