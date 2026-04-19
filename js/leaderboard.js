const LEADERBOARD_LOCAL_KEY = "hl_prototype_heroes_local";
const HERO_NAME_KEY = "hl_prototype_hero_name";

const LEADERBOARD_CONFIG = {
  supabaseUrl: "https://auryndtrodikjfxuqzyv.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1cnluZHRyb2Rpa2pmeHVxenl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTM5MjMsImV4cCI6MjA5MDQ2OTkyM30.Sj7HEKLcwwEeoEmfArjVwpiCHrbDwmu7rWkN3RpO7_Y",
  table: "heroes_52",
};

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

  return {
    playerName: sanitizeHeroName(entry.playerName || entry.player_name || "Unknown"),
    seed: String(entry.seed || ""),
    gameVersion: String(entry.gameVersion || entry.game_version || ""),
    deck: normalizeHeroDeck(entry.deck || ""),
    deckLevel: normalizeHeroLevel(rawDeckLevel),
    hasExplicitDeckLevel,
    startingPower: normalizeHeroPower(entry.startingPower || entry.starting_power || ""),
    createdAt: String(entry.createdAt || entry.created_at || ""),
  };
}

function buildHeroEntry(name, seed, deck = "-", startingPower = "-", deckLevel = DEFAULT_LEVEL_NUMBER) {
  return {
    playerName: sanitizeHeroName(name),
    seed: String(seed || "").trim(),
    gameVersion: GAME_VERSION,
    deck: normalizeHeroDeck(deck),
    deckLevel: normalizeHeroLevel(deckLevel),
    hasExplicitDeckLevel: true,
    startingPower: normalizeHeroPower(startingPower),
    createdAt: new Date().toISOString(),
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
    };
    const payloadWithLegacyLevel = {
      player_name: entry.playerName,
      seed: entry.seed,
      game_version: entry.gameVersion,
      deck: entry.deck,
      level: entry.deckLevel,
      starting_power: entry.startingPower,
    };
    const payloadWithoutLevel = {
      player_name: entry.playerName,
      seed: entry.seed,
      game_version: entry.gameVersion,
      deck: entry.deck,
      starting_power: entry.startingPower,
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
      "select=player_name,seed,game_version,deck,deck_level,level,starting_power,created_at"
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
