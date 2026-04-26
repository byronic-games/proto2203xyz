# Data Contracts Checklist

## Supabase Tables

## `public.daily_52`
Used by:
- `js/daily.js`
- `js/daily-page.js`

Expected columns used:
- `date_key`, `seed`, `player_name`, `player_id`, `score`, `game_version`
- `blue_cleared`, `green_cleared`, `red_cleared`
- `daily_clears`, `crown_summary`
- `created_at`

Required behavior:
- anon `SELECT` works
- anon `INSERT` works

## `public.heroes_52`
Used by:
- `js/leaderboard.js`
- `js/heroes.js`

Expected columns used:
- `player_name`, `seed`, `game_version`, `deck`
- `deck_level` (or legacy `level`)
- `starting_power`
- `blue_cleared`, `green_cleared`, `red_cleared`
- `daily_clears`, `crown_summary`
- `created_at`

Required behavior:
- anon `SELECT` works

## Crown Logic
- Blue/Green/Red crowns from row boolean fields.
- Daily gold crown from:
  - `daily_clears > 0`, or
  - Daily history score `>= 51` (name-based enrichment fallback).

## Identity Caveat
- Daily has `player_id`.
- Heroes currently not linked with same ID.
- Cross-table backfills are mostly name-based.

## Legacy Data/Backfill Rule
- For old rows, deck clear can be derived from `heroes_52.deck`.
- Daily clear can be bulk-inferred from historical Daily `score >= 51`.
