const POWERS = [
  {
    id: "balanced_nudges",
    name: "Balanced Nudges",
    description: "Start each run with 4 Nudge +1 charges and 4 Nudge -1 charges.",
    rarity: "common",
    unlockAt: 0,
    weight: 1,
    included: true,
  },
  {
    id: "updraft",
    name: "Updraft",
    description: "Start each run with 8 Nudge +1 charges.",
    rarity: "common",
    unlockAt: 0,
    weight: 1,
    included: true,
  },
  {
    id: "downforce",
    name: "Downforce",
    description: "Start each run with 8 Nudge -1 charges.",
    rarity: "common",
    unlockAt: 0,
    weight: 1,
    included: true,
  },
  {
    id: "quick_fingers",
    name: "Quick Fingers",
    description: "Choose a new Cheat every 2 successful guesses instead of every 3.",
    rarity: "common",
    unlockAt: 0,
    weight: 1,
    included: true,
  },
  {
    id: "swap_stack",
    name: "Swap Stack",
    description: "Start each run with four Swap Cheats in hand.",
    rarity: "common",
    unlockAt: 0,
    weight: 1,
    included: true,
  },
  {
    id: "aces_wild",
    name: "Aces Wild",
    description: "Aces count as both high and low, and can be nudged down to King while Kings can be nudged up to Ace.",
    rarity: "common",
    unlockAt: 0,
    weight: 1,
    included: true,
  },
  {
    id: "lucky_opening",
    name: "Lucky Opening",
    description: "Start each run with two Lucky 7 Cheats in hand.",
    rarity: "common",
    unlockAt: 0,
    weight: 1,
    included: true,
  },
];

const START_POWER_SEED_RULESET = "start-power-v1";

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


function getDeckName(deckKey = state?.currentDeckKey || state?.selectedDeckKey || "blue") {
  return normalizeDeckKey(deckKey) === "red" ? "Red" : "Blue";
}

function getPowerRarityLabel(power) {
  return (power?.rarity || "common").replace(/^\w/, (c) => c.toUpperCase());
}

function getPowerIcon(powerId) {
  switch (powerId) {
    case "balanced_nudges":
      return "↕️";
    case "updraft":
      return "⬆️";
    case "downforce":
      return "⬇️";
    case "quick_fingers":
      return "⚡";
    case "swap_stack":
      return "🃏";
    case "aces_wild":
      return "A";
    case "lucky_opening":
      return "7️⃣";
    default:
      return "✨";
  }
}

function getUnlockedPowerPool(includeAll = false) {
  return POWERS.filter((power) => {
    if (!power.included) return false;
    if (includeAll) return true;
    return (state.metaProgression ?? 0) >= (power.unlockAt ?? 0);
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function getStartPowerOfferSeed(seedString) {
  const normalizedSeed = normalizeSeed(seedString) || "NO-SEED";
  return `${GAME_VERSION}|${START_POWER_SEED_RULESET}|${normalizedSeed}`;
}

function getRandomPowerOptions(count = 2, seedString = "", includeAll = false) {
  const pool = [...getUnlockedPowerPool(includeAll)];
  const options = [];
  const seeded = !!normalizeSeed(seedString);
  const rng = seeded
    ? mulberry32(stringToSeedNumber(getStartPowerOfferSeed(seedString)))
    : null;

  while (options.length < count && pool.length > 0) {
    const idx = seeded
      ? Math.floor(rng() * pool.length)
      : Math.floor(Math.random() * pool.length);
    options.push(pool.splice(idx, 1)[0]);
  }

  return options;
}

function getCheatRewardThreshold() {
  return runHasPower("quick_fingers") ? 2 : 3;
}

function awardOnCorrectGuessPowers(guessType) {
  const awardedNames = [];

  if (normalizeDeckKey(state.currentDeckKey) === "red") {
    return awardedNames;
  }

  if (runHasPower("nudge_engine")) {
    if (guessType === "higher") {
      state.nudgeUpCharges = (state.nudgeUpCharges || 0) + 1;
      awardedNames.push("Nudge +1");
    }

    if (guessType === "lower") {
      state.nudgeDownCharges = (state.nudgeDownCharges || 0) + 1;
      awardedNames.push("Nudge -1");
    }
  }

  return awardedNames;
}
