# Next Tasks (Priority Order)

## P0 - Fix Reveal Animation On Android
- Make face reliably appear during reveal flip on Android Chrome.
- Keep existing sequence intent:
  - flip reveal
  - short pause
  - promote to current card
  - then correct/incorrect flash
- Re-test with nudged/temporary next-card values.

## P0 - Regression Pass After Animation Fix
- Verify tutorial flow still works.
- Verify game-over and deck-clear flows still animate correctly.
- Verify Cursed Shield overlay badge behavior unaffected.

## P1 - Identity Hardening
- Move crown enrichment to ID-first joins where possible.
- Keep name fallback only for historical rows.

## P1 - SQL Scripts In Repo
- Add repeatable preview/apply scripts for crown/daily backfills in `tools/sql/`.

## P2 - Optional Visual Polish
- Add reveal effect hooks per outcome/card type (already partially scaffolded).
- Tune timings for low-end Android performance.
