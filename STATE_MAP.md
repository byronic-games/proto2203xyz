# State Map (Storage Keys)

## High-Impact `localStorage`
- `hl_prototype_best_scores_by_mode`
- `hl_prototype_selected_deck`
- `hl_prototype_selected_level`
- `hl_prototype_deck_wins`
- `hl_prototype_deck_level_clears`
- `hl_prototype_profile_stats`
- `hl_prototype_unlock_decks`
- `hl_prototype_unlock_all`
- `hl_prototype_guess_button_order`
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

## Deck Progression Shape
- Deck stats normalize `blue`, `green`, `red`, and `yellow`.
- Yellow unlocks after a verified Blue Level 3 clear unless `hl_prototype_unlock_decks` or `hl_prototype_unlock_all` is enabled.
- `hl_prototype_unlock_decks` unlocks Level 1 of every deck only; higher levels still require same-deck clears unless `hl_prototype_unlock_all` is enabled.
- Yellow Joker effects can mutate persistent card-back status, specifically Tearless removing a torn corner from a remaining card when the total torn-card count is above four.

## `sessionStorage`
- `hl_prototype_game_state_snapshot`
- `hl_prototype_settings_return_url`
- `hl_prototype_red_deck_debug_unlock`

## Guardrails
- Never bulk-clear storage during normal bug fixes.
- Keep key names stable.
- Use `js/storage.js` helpers for migration-safe updates.
