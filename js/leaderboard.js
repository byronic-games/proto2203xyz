const LEADERBOARD_LOCAL_KEY = "hl_prototype_heroes_local";
const HERO_NAME_KEY = "hl_prototype_hero_name";

const LEADERBOARD_CONFIG = {
  supabaseUrl: "https://auryndtrodikjfxuqzyv.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1cnluZHRyb2Rpa2pmeHVxenl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTM5MjMsImV4cCI6MjA5MDQ2OTkyM30.Sj7HEKLcwwEeoEmfArjVwpiCHrbDwmu7rWkN3RpO7_Y",
  table: "heroes_52",
};

const CROWN_BLUE = "🔵👑";
const CROWN_GREEN = "🟢👑";
const CROWN_RED = "🔴👑";
const CROWN_DAILY = "🟡👑";

function leaderboardRemoteEnabled() {
  return !!LEADERBOARD_CONFIG.supabaseUrl && !!LEADERBOARD_CONFIG.supabaseAnonKey;
}

function sanitizeHeroName(name) {
  const normalized = String(name || "").trim().replace(/\s+/g, " ");
  return normalized.slice(0, 24);
}

function getLocalHeroes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LEADERBOARD_LOCAL_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalHeroes(entries) {
  localStorage.setItem(LEADERBOARD_LOCAL_KEY, JSON.stringify(entries));
}

function addLocalHero(entry) {
  const heroes = getLocalHeroes();
  if (heroes.some((h) => getHeroEntryKey(h) === getHeroEntryKey(entry))) {
    return { saved: false, reason: "duplicate" };
  }
  heroes.push(entry);
  heroes.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  saveLocalHeroes(heroes);
  return { saved: true };
}

function loadPreferredHeroName() {
  return sanitizeHeroName(localStorage.getItem(HERO_NAME_KEY) || "");
}

function savePreferredHeroName(name) {
  localStorage.setItem(HERO_NAME_KEY, sanitizeHeroName(name));
}

function normalizeHeroDeck(deck) {
  const normalized = String(deck || "").trim();
  if (!normalized) return "-";
  if (normalized.toLowerCase() === "pink") return "Red";
  return normalized;
}

function normalizeHeroPower(startingPower) {
  const normalized = String(startingPower || "").trim();
  return normalized || "-";
}

function normalizeHeroLevel(level = DEFAULT_LEVEL_NUMBER) {
  const value = Number(level);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : DEFAULT_LEVEL_NUMBER;
}

function normalizeCrownBoolean(value) {
  if (value === true || value === false) return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "t" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "f" || normalized === "0" || normalized === "no") return false;
  }
  return false;
}

function buildCrownSummary(snapshot = {}) {
  const parts = [];
  if (snapshot.blueCleared) parts.push(CROWN_BLUE);
  if (snapshot.greenCleared) parts.push(CROWN_GREEN);
  if (snapshot.redCleared) parts.push(CROWN_RED);
  if (snapshot.dailyCleared) parts.push(CROWN_DAILY);
  return parts.join(" ");
}

function getLocalCrownSnapshot() {
  let deckWins = {};
  let profileStats = {};

  try {
    deckWins = typeof loadDeckWins === "function"
      ? loadDeckWins()
      : (JSON.parse(localStorage.getItem(typeof DECK_WINS_KEY === "string" ? DECK_WINS_KEY : "hl_prototype_deck_wins") || "{}") || {});
  } catch {
    deckWins = {};
  }

  try {
    profileStats = typeof loadProfileStats === "function"
      ? loadProfileStats()
      : (JSON.parse(localStorage.getItem(typeof PROFILE_STATS_KEY === "string" ? PROFILE_STATS_KEY : "hl_prototype_profile_stats") || "{}") || {});
  } catch {
    profileStats = {};
  }

  const snapshot = {
    blueCleared: normalizeCrownBoolean(deckWins.blue),
    greenCleared: normalizeCrownBoolean(deckWins.green),
    redCleared: normalizeCrownBoolean(deckWins.red),
    dailyCleared: Number(profileStats.dailyClears || 0) > 0,
  };

  return {
    ...snapshot,
    dailyClears: Math.max(0, Number(profileStats.dailyClears || 0)),
    summary: buildCrownSummary(snapshot),
  };
}

function getEntryCrownSnapshot(entry = {}) {
  const blueCleared = normalizeCrownBoolean(entry.blueCleared ?? entry.blue_cleared);
  const greenCleared = normalizeCrownBoolean(entry.greenCleared ?? entry.green_cleared);
  const redCleared = normalizeCrownBoolean(entry.redCleared ?? entry.red_cleared);
  const dailyClearedFromBool = normalizeCrownBoolean(entry.dailyCleared ?? entry.daily_cleared);
  const dailyClears = Math.max(0, Number(entry.dailyClears ?? entry.daily_clears ?? 0));
  const dailyCleared = dailyClearedFromBool || dailyClears > 0;
  const summary = String(entry.crownSummary ?? entry.crown_summary ?? "").trim();
  const computedSummary = buildCrownSummary({ blueCleared, greenCleared, redCleared, dailyCleared });

  return {
    blueCleared,
    greenCleared,
    redCleared,
    dailyCleared,
    dailyClears,
    summary: summary || computedSummary,
  };
}

function getCrownSummaryForEntry(entry = {}) {
  const snapshot = getEntryCrownSnapshot(entry);
  return String(snapshot.summary || "").trim();
}

function formatNameWithCrowns(name, entry = {}) {
  const displayName = sanitizeHeroName(name) || "Unknown";
  const crowns = getCrownSummaryForEntry(entry);
  return crowns ? `${displayName} ${crowns}` : displayName;
}

function getHeroEntryKey(entry = {}) {
  const seed = String(entry.seed || "").trim();
  const deck = normalizeHeroDeck(entry.deck || "");
  const deckLevel = normalizeHeroLevel(entry.deckLevel ?? entry.deck_level);
  return `${seed}::${deck}::${deckLevel}`;
}

function normalizeHeroEntry(entry = {}) {
  const rawDeckLevel = entry.deckLevel ?? entry.deck_level ?? entry.level;
  const hasExplicitDeckLevel =
    rawDeckLevel !== undefined && rawDeckLevel !== null && rawDeckLevel !== "";
  const crownSnapshot = getEntryCrownSnapshot(entry);

  return {
    playerName: sanitizeHeroName(entry.playerName || entry.player_name || "Unknown"),
    seed: String(entry.seed || ""),
    gameVersion: String(entry.gameVersion || entry.game_version || ""),
    deck: normalizeHeroDeck(entry.deck || ""),
    deckLevel: normalizeHeroLevel(rawDeckLevel),
    hasExplicitDeckLevel,
    startingPower: normalizeHeroPower(entry.startingPower || entry.starting_power || ""),
    createdAt: String(entry.createdAt || entry.created_at || ""),
    ...crownSnapshot,
    crownSummary: crownSnapshot.summary,
  };
}

function buildHeroEntry(name, seed, deck = "-", startingPower = "-", deckLevel = DEFAULT_LEVEL_NUMBER) {
  const crownSnapshot = getLocalCrownSnapshot();
  return {
    playerName: sanitizeHeroName(name),
    seed: String(seed || "").trim(),
    gameVersion: GAME_VERSION,
    deck: normalizeHeroDeck(deck),
    deckLevel: normalizeHeroLevel(deckLevel),
    hasExplicitDeckLevel: true,
    startingPower: normalizeHeroPower(startingPower),
    createdAt: new Date().toISOString(),
    blueCleared: crownSnapshot.blueCleared,
    greenCleared: crownSnapshot.greenCleared,
    redCleared: crownSnapshot.redCleared,
    dailyCleared: crownSnapshot.dailyCleared,
    dailyClears: crownSnapshot.dailyClears,
    crownSummary: crownSnapshot.summary,
  };
}

async function submitHeroWin(name, seed, deck, startingPower, deckLevel = DEFAULT_LEVEL_NUMBER) {
  const playerName = sanitizeHeroName(name);
  const normalizedSeed = String(seed || "").trim();

  if (!playerName) return { ok: false, message: "Please enter a name." };
  if (!normalizedSeed) return { ok: false, message: "Missing run seed." };

  savePreferredHeroName(playerName);

  const entry = buildHeroEntry(playerName, normalizedSeed, deck, startingPower, deckLevel);
  const localResult = addLocalHero(entry);

  if (!leaderboardRemoteEnabled()) {
    if (!localResult.saved) return { ok: true, message: "Seed already listed in heroes." };
    return { ok: true, message: "Hero recorded locally." };
  }

  try {
    const url = `${LEADERBOARD_CONFIG.supabaseUrl}/rest/v1/${LEADERBOARD_CONFIG.table}`;
    const headers = {
      apikey: LEADERBOARD_CONFIG.supabaseAnonKey,
      Authorization: `Bearer ${LEADERBOARD_CONFIG.supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };
    const payloadWithLevel = {
      player_name: entry.playerName,
      seed: entry.seed,
      game_version: entry.gameVersion,
      deck: entry.deck,
      deck_level: entry.deckLevel,
      starting_power: entry.startingPower,
      blue_cleared: entry.blueCleared,
      green_cleared: entry.greenCleared,
      red_cleared: entry.redCleared,
      daily_clears: entry.dailyClears,
      crown_summary: entry.crownSummary,
    };
    const payloadWithLegacyLevel = {
      player_name: entry.playerName,
      seed: entry.seed,
      game_version: entry.gameVersion,
      deck: entry.deck,
      level: entry.deckLevel,
      starting_power: entry.startingPower,
      blue_cleared: entry.blueCleared,
      green_cleared: entry.greenCleared,
      red_cleared: entry.redCleared,
      daily_clears: entry.dailyClears,
      crown_summary: entry.crownSummary,
    };
    const payloadWithoutLevel = {
      player_name: entry.playerName,
      seed: entry.seed,
      game_version: entry.gameVersion,
      deck: entry.deck,
      starting_power: entry.startingPower,
      blue_cleared: entry.blueCleared,
      green_cleared: entry.greenCleared,
      red_cleared: entry.redCleared,
      daily_clears: entry.dailyClears,
      crown_summary: entry.crownSummary,
    };

    let response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payloadWithLevel),
    });

    if (!response.ok && response.status !== 409) {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payloadWithLegacyLevel),
      });
    }

    const canFallbackWithoutLevel =
      normalizeHeroLevel(entry.deckLevel) === DEFAULT_LEVEL_NUMBER;

    if (!response.ok && response.status !== 409 && canFallbackWithoutLevel) {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payloadWithoutLevel),
      });
    }

    if (response.ok) return { ok: true, message: "Hero recorded." };
    if (response.status === 409) return { ok: true, message: "Seed already listed in heroes." };

    return { ok: true, message: "Saved locally (remote save failed)." };
  } catch {
    return { ok: true, message: "Saved locally (offline mode)." };
  }
}

async function fetchHeroes(limit = 200) {
  const localHeroes = getLocalHeroes();

  if (!leaderboardRemoteEnabled()) {
    return localHeroes;
  }

  try {
    const fetchRemoteRows = async (selectClause) => {
      const query = `${selectClause}&order=created_at.desc&limit=${Math.max(1, limit)}`;
      const url = `${LEADERBOARD_CONFIG.supabaseUrl}/rest/v1/${LEADERBOARD_CONFIG.table}?${query}`;
      return fetch(url, {
        headers: {
          apikey: LEADERBOARD_CONFIG.supabaseAnonKey,
          Authorization: `Bearer ${LEADERBOARD_CONFIG.supabaseAnonKey}`,
        },
      });
    };

    let response = await fetchRemoteRows(
      "select=player_name,seed,game_version,deck,deck_level,level,starting_power,blue_cleared,green_cleared,red_cleared,daily_clears,crown_summary,created_at"
    );

    if (!response.ok) {
      response = await fetchRemoteRows("select=player_name,seed,game_version,deck,deck_level,starting_power,created_at");
      if (!response.ok) {
        response = await fetchRemoteRows("select=player_name,seed,game_version,deck,level,starting_power,created_at");
      }
      if (!response.ok) {
        response = await fetchRemoteRows("select=player_name,seed,game_version,deck,starting_power,created_at");
      }
      if (!response.ok) {
        response = await fetchRemoteRows("select=player_name,seed,game_version,created_at");
      }
      if (!response.ok) {
        return localHeroes;
      }
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) return localHeroes;

    const mergedByEntryKey = new Map();
    const localHeroesBySeedDeck = new Map();

    localHeroes
      .map((hero) => normalizeHeroEntry(hero))
      .forEach((hero) => {
        const seedDeckKey = `${String(hero.seed || "").trim()}::${normalizeHeroDeck(hero.deck || "")}`;
        if (!localHeroesBySeedDeck.has(seedDeckKey)) {
          localHeroesBySeedDeck.set(seedDeckKey, []);
        }
        localHeroesBySeedDeck.get(seedDeckKey).push(hero);
      });

    rows
      .map((row) => {
        const hero = normalizeHeroEntry(row);
        if (!hero.hasExplicitDeckLevel) {
          const seedDeckKey = `${String(hero.seed || "").trim()}::${normalizeHeroDeck(hero.deck || "")}`;
          const localMatches = localHeroesBySeedDeck.get(seedDeckKey) || [];
          if (localMatches.length === 1) {
            return {
              ...hero,
              deckLevel: localMatches[0].deckLevel,
              hasExplicitDeckLevel: true,
            };
          }
        }
        return hero;
      })
      .forEach((hero) => {
        mergedByEntryKey.set(getHeroEntryKey(hero), hero);
      });

    localHeroes
      .map((hero) => normalizeHeroEntry(hero))
      .forEach((hero) => {
        const heroKey = getHeroEntryKey(hero);
        const existing = mergedByEntryKey.get(heroKey);
        if (!existing) {
          mergedByEntryKey.set(heroKey, hero);
          return;
        }

        mergedByEntryKey.set(heroKey, {
          ...existing,
          deck: hero.deck || existing.deck,
          deckLevel: hero.deckLevel || existing.deckLevel,
          hasExplicitDeckLevel: existing.hasExplicitDeckLevel || hero.hasExplicitDeckLevel,
          startingPower: hero.startingPower || existing.startingPower,
          createdAt: hero.createdAt || existing.createdAt,
          blueCleared: existing.blueCleared || hero.blueCleared,
          greenCleared: existing.greenCleared || hero.greenCleared,
          redCleared: existing.redCleared || hero.redCleared,
          dailyCleared: existing.dailyCleared || hero.dailyCleared,
          dailyClears: Math.max(existing.dailyClears || 0, hero.dailyClears || 0),
          crownSummary: existing.crownSummary || hero.crownSummary || existing.summary || hero.summary || "",
        });
      });

    return Array.from(mergedByEntryKey.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  } catch {
    return localHeroes;
  }
}

function formatHeroDate(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}
