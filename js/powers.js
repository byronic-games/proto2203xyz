const POWERS = [
      {
        id: "nudge_engine",
        name: "Nudge",
        description: "Every correct Higher/Lower guess adds a directional Nudge cheat to your hand while active.",
        startsActive: true,
        canToggleDuringRun: true,
      },
      {
        id: "stats_display",
        name: "Stats",
        description: "Shows persistent face-down card stats on the back of the deck while active. Nudge rewards are suppressed while this is on.",
        startsActive: true,
        canToggleDuringRun: true,
      },
    ];

function getPowerName(powerId) {
      const power = POWERS.find((p) => p.id === powerId);
      return power ? power.name : powerId;
    }

function getPowerById(powerId) {
      return POWERS.find((p) => p.id === powerId) || null;
    }

function runHasPower(powerId) {
      return state.powers.includes(powerId);
    }

function getPowerToggleStateForSelection(powerId) {
      if (powerId === "none") return [];
      const power = getPowerById(powerId);
      if (!power) return [];
      return power.startsActive ? [powerId] : [];
    }

function togglePower(powerId) {
      const power = getPowerById(powerId);
      if (!power || !power.canToggleDuringRun || state.gameOver || !state.current) return;
      if (runHasPower(powerId)) {
        state.powers = state.powers.filter((id) => id !== powerId);
        state.message = `${power.name} OFF.`;
      } else {
        state.powers = [...state.powers, powerId];
        state.message = `${power.name} ON.`;
      }
      render();
    }

function awardOnCorrectGuessPowers(guessType) {
      const awardedNames = [];
      if (runHasPower("nudge_engine") && !runHasPower("stats_display")) {
        let nudgeCheat = null;
        if (guessType === "higher") nudgeCheat = CHEATS.find((c) => c.id === "nudge_up");
        if (guessType === "lower") nudgeCheat = CHEATS.find((c) => c.id === "nudge_down");
        if (nudgeCheat) {
          state.cheats.push({ ...nudgeCheat });
          awardedNames.push(nudgeCheat.name);
        }
      }
      return awardedNames;
    }
