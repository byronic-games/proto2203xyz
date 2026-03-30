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
  if (heroes.some((h) => h.seed === entry.seed)) return { saved: false, reason: "duplicate" };
  heroes.push(entry);
  heroes.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  saveLocalHeroes(heroes);
  return { saved: true };
}

function loadPreferredHeroName() {
  return sanitizeHeroName(localStorage.getItem(HERO_NAME_KEY) || "");
}

function savePreferredHeroName(name) {
  localStorage.setItem(HERO_NAME_KEY, sanitizeHeroName(name));
}

function buildHeroEntry(name, seed) {
  return {
    playerName: sanitizeHeroName(name),
    seed: String(seed || "").trim(),
    gameVersion: GAME_VERSION,
    createdAt: new Date().toISOString(),
  };
}

async function submitHeroWin(name, seed) {
  const playerName = sanitizeHeroName(name);
  const normalizedSeed = String(seed || "").trim();

  if (!playerName) return { ok: false, message: "Please enter a name." };
  if (!normalizedSeed) return { ok: false, message: "Missing run seed." };

  savePreferredHeroName(playerName);

  const entry = buildHeroEntry(playerName, normalizedSeed);
  const localResult = addLocalHero(entry);

  if (!leaderboardRemoteEnabled()) {
    if (!localResult.saved) return { ok: true, message: "Seed already listed in heroes." };
    return { ok: true, message: "Hero recorded locally." };
  }

  try {
    const url = `${LEADERBOARD_CONFIG.supabaseUrl}/rest/v1/${LEADERBOARD_CONFIG.table}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: LEADERBOARD_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${LEADERBOARD_CONFIG.supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        player_name: entry.playerName,
        seed: entry.seed,
        game_version: entry.gameVersion,
      }),
    });

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
    const query = `select=player_name,seed,game_version,created_at&order=created_at.asc&limit=${Math.max(1, limit)}`;
    const url = `${LEADERBOARD_CONFIG.supabaseUrl}/rest/v1/${LEADERBOARD_CONFIG.table}?${query}`;
    const response = await fetch(url, {
      headers: {
        apikey: LEADERBOARD_CONFIG.supabaseAnonKey,
        Authorization: `Bearer ${LEADERBOARD_CONFIG.supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      return localHeroes;
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) return localHeroes;

    const mapped = rows.map((row) => ({
      playerName: sanitizeHeroName(row.player_name || "Unknown"),
      seed: String(row.seed || ""),
      gameVersion: String(row.game_version || ""),
      createdAt: String(row.created_at || ""),
    }));

    return mapped;
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
