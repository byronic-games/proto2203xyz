# Known Issues

## P0
- Android reveal animation: next card can rotate but still show back instead of face.
  - Repro provided by user with frame screenshots.
  - Affects perceived gameplay quality and trust in reveal flow.

## P1
- Mobile browser caching still depends on version discipline for JS/CSS even though `.htaccess` now forces HTML revalidation.
- Daily/Heroes availability depends on Supabase policy/API state; misconfig can appear as "loading forever".
- Tutorial and choice-modal flow on mobile was recently patched and should be treated as regression-sensitive until re-confirmed on device.

## P2
- Name-based identity fallback for crowns is still imperfect when names collide/rename.
- Small-screen density tweaks can regress quickly in overlays (tutorial, cheat picker, Daily table).

## Rules To Keep Synced When Changed
- Daily clear definition/scoring thresholds.
- Crown enrichment logic and SQL backfill scripts.
- Unlock and level progression rules in both code and docs.
