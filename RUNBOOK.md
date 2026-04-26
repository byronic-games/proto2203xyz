# Runbook Checklist

## Start Locally
- Serve repo root with any static server.
- Open `index.html`.

## Quick Smoke (5 minutes)
1. Start Blue run, make guesses, restart run.
2. Deck picker order is Blue, Green, Red.
3. Locked decks/levels are greyed out.
4. Open `daily.html`, confirm board loads.
5. Daily table shows `Rank | Name (+crowns) | Cards Cleared`.
6. Open `heroes.html` and `profile.html`, confirm data renders.

## Daily Validation
1. Compare same date on two devices.
2. Entry count and ordering must match.
3. Tied scores share rank.
4. Crowns are per-player, not per-viewer.
5. Today scores hidden before local completion, shown after.

## Deploy Hygiene
- After JS/CSS edits, bump query versions in:
  - `index.html`
  - `game.html`
  - `daily.html`
  - `heroes.html`
  - `profile.html`
  - `settings.html`

## Supabase Health Check
- `daily_52` anon `SELECT` and `INSERT` works.
- `heroes_52` anon `SELECT` works.
- If Daily hangs loading:
  1. check network response
  2. check RLS policy
  3. check table API availability

## Useful SQL
```sql
select date_key, player_name, score, blue_cleared, green_cleared, red_cleared, daily_clears, crown_summary, created_at
from public.daily_52
where date_key = '2026-04-25'
order by score desc, created_at asc;
```

```sql
select player_name, deck, deck_level, blue_cleared, green_cleared, red_cleared, created_at
from public.heroes_52
where lower(trim(player_name)) = lower(trim('Byronicman'))
order by created_at desc;
```
