# Project Overview (Concise)

## What It Is
- `52!` is a browser-based higher/lower card game with progression, powers, cheats, and shared Daily mode.
- Mobile-first UI; desktop is supported but not primary.
- HTML is now served as revalidating content via `.htaccess`; versioned JS/CSS assets are expected to be cache-busted when changed.

## Core Surfaces
- `index.html`: entry hub
- `game.html`: run gameplay
- `daily.html`: daily challenge + leaderboard
- `heroes.html`: clear board
- `profile.html`: local player stats/crowns
- `settings.html`: config/reset tools
- Daily sharing exists in UI but is currently disabled by a code flag in `js/daily-page.js` until we turn it back on.

## Gameplay Layout Surface
- `game.html` now defines the gameplay screen as a deliberate vertical layout skeleton with spacer/gap rows around the card pair, message bar, cheat panel, controls, and memory grid.
- `styles.css` contains the late-file "Structured vertical layout system" that turns `#game` and `#main-layout` into fixed-height CSS grids. Key row variables are `--header-height`, `--info-height`, `--cheats-height`, `--buttons-height`, `--section-gap`, `--card-pair-gap`, and `--card-row-max-height`.
- Cards are sized through container queries on `.card-slot`, then `#current-card`, `#face-down-deck`, and `#reveal-overlay` fill the slot. This keeps the card pair stable while the available viewport height changes.
- `js/fullscreen.js` is part of layout ownership because it writes `--app-height` from `visualViewport.height`.
- Choice modals use body classes from `js/render.js`: `choice-modal-open`, `cheat-choice-open`, and `power-choice-open`.

## Current Visual Treatment
- `body[data-visuals="new"]` switches card faces to white playing-card markup with corner ranks and image-backed suit symbols. `js/render.js::renderCardFaceMarkup` emits this markup; `styles.css` maps the suit assets.
- The cheat bar and cheat-choice cards are circular rarity coins with count badges and small layout animations.
- Power choice cards and the header power chip are shield-shaped via `.power-shield-svg` / `.power-shield-fill`.

## Deck/Progression Model
- Start: Blue Level 1 unlocked.
- Daily unlocks after first run started.
- Green L1 unlocks after Blue L1 clear.
- Red L1 unlocks after Blue L2 clear.
- Yellow L1 unlocks after Blue L3 clear.
- Higher levels unlock by clearing previous level in same deck.
- Level cap currently 4 on Blue/Green/Red/Yellow.
- Settings include an Unlock Decks toggle (`hl_prototype_unlock_decks`) for testing Level 1 of every deck without changing recorded wins. A separate `hl_prototype_unlock_all` helper still exists for full level bypasses.
- Settings also include `hl_prototype_guess_button_order`, which swaps the visual order of the existing Higher/Lower buttons without changing their styling.

## Gameplay Notes
- Aces are low.
- Equal-value comparisons continue the run.
- Cards-cleared model is now "start at 1" (starting face-up card counts).
- Nudges use separate + / - charge pools.
- Yellow runs insert level-gated Joker hazard cards after the first four deck positions, so they can only appear after three correct guesses. A Joker consumes the next-card reveal without caring whether the player guessed Higher or Lower, applies its negative effect, resets streak, and leaves the current normal card in play.
- Yellow Joker levels: L1 Tearless repairs one persistent torn corner from a remaining card if total torn cards are above four; L2 adds Nudgeless to clear banked Nudges; L3 adds Cheatless to clear held Cheat cards; L4 adds Powerless to clear persistent power effects.
- Daily/Heroes support Supabase + local fallback behavior.

## Main Code Ownership
- `js/logic.js`: game rules and state transitions
- `js/render.js`: DOM rendering, visual-theme markup, choice modal body classes, and animation hooks
- `js/input.js`: controls/input gating + tutorial flow
- `js/storage.js`: persistence/migrations
- `js/daily.js` + `js/daily-page.js`: Daily data flow/UI
- `js/leaderboard.js` + `js/heroes.js`: Heroes/crowns rendering
- `js/profile-page.js`: profile stats/crowns
- `js/fullscreen.js`: viewport-height handling, including Android standalone/home-screen mode
- `styles.css`: gameplay vertical layout grid, responsive card sizing, NEW visual theme, cheat coin styling, and power shield styling

## Current Critical Risk
- Reveal animation on some Android browsers still fails to show face mid-flip.

## Current Sensitive Area
- Tutorial / choice-modal behavior on mobile was recently adjusted:
  - target-element highlighting replaces floating highlight positioning
  - render-owned current-card and face-down-card elements preserve tutorial focus after redraws
  - focused tutorial targets use a cyan throbbing ring in `styles.css`
  - gameplay guess buttons should hide while power / cheat choice modals are open
