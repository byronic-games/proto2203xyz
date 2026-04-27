# State Map (Storage Keys)

## High-Impact `localStorage`
- `hl_prototype_best_scores_by_mode`
- `hl_prototype_selected_deck`
- `hl_prototype_selected_level`
- `hl_prototype_deck_wins`
- `hl_prototype_deck_level_clears`
- `hl_prototype_profile_stats`
- `hl_prototype_daily_player_id`
- `hl_prototype_daily_attempts_local`
- `hl_prototype_hero_name`
- `hl_prototype_heroes_local`

## Supporting `localStorage`
- `hl_prototype_card_stats`
- `hl_prototype_card_back_status`
- `hl_prototype_cheat_unlocks`
- `hl_prototype_run_debug_log`
- `hl_prototype_last_seed`
- `hl_prototype_meta_progression`
- tutorial flags/state

## `sessionStorage`
- `hl_prototype_game_state_snapshot`
- `hl_prototype_settings_return_url`
- `hl_prototype_red_deck_debug_unlock`

## Guardrails
- Never bulk-clear storage during normal bug fixes.
- Keep key names stable.
- Use `js/storage.js` helpers for migration-safe updates.
