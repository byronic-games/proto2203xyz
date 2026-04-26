# State Map Checklist

## localStorage (high-impact)
- `hl_prototype_best_scores_by_mode`: best run by `deck|level`
- `hl_prototype_selected_deck`, `hl_prototype_selected_level`
- `hl_prototype_deck_wins`, `hl_prototype_deck_level_clears`
- `hl_prototype_profile_stats`
- `hl_prototype_daily_player_id`
- `hl_prototype_daily_attempts_local`
- `hl_prototype_hero_name`
- `hl_prototype_heroes_local`

## localStorage (supporting)
- `hl_prototype_card_stats`
- `hl_prototype_card_back_status`
- `hl_prototype_cheat_unlocks`
- `hl_prototype_run_debug_log`
- `hl_prototype_last_seed`
- `hl_prototype_meta_progression`
- tutorial flags

## sessionStorage
- `hl_prototype_game_state_snapshot`: resume state on refresh
- `hl_prototype_settings_return_url`
- `hl_prototype_red_deck_debug_unlock`

## Safety Notes
- Never clear all storage in routine bug fixes.
- Keep key names stable.
- Prefer `js/storage.js` helpers for read/write/migration.
