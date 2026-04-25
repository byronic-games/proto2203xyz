const DAILY_PLAYER_ID_KEY = "hl_prototype_daily_player_id";
const DAILY_LOCAL_KEY = "hl_prototype_daily_attempts_local";
const DAILY_NAME_KEY = "hl_prototype_hero_name";
const DAILY_TABLE = "daily_52";
const DAILY_RULESET_VERSION = "daily-v1";
const DAILY_REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url, options = {}, timeoutMs = DAILY_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || DAILY_REQUEST_TIMEOUT_MS));
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getDailyLeaderboardConfig() {
  if (typeof LEADERBOARD_CONFIG !== "undefined") {
    return {
      supabaseUrl: LEADERBOARD_CONFIG.supabaseUrl,
      supabaseAnonKey: LEADERBOARD_CONFIG.supabaseAnonKey,
      table: DAILY_TABLE,
    };
  }

  return {
    supabaseUrl: "",
    supabaseAnonKey: "",
    table: DAILY_TABLE,
  };
}

function dailyRemoteEnabled() {
  const config = getDailyLeaderboardConfig();
  return !!config.supabaseUrl && !!config.supabaseAnonKey;
}

function getCurrentDailyDateKey(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDailySeedForDate(dateKey) {
  return `DAILY|${GAME_VERSION}|${DAILY_RULESET_VERSION}|${String(dateKey || "").trim()}`;
}

function getOrCreateDailyPlayerId() {
  let existing = String(localStorage.getItem(DAILY_PLAYER_ID_KEY) || "").trim();
  if (existing) return existing;

  existing = `${randomSeedString(8)}-${Date.now().toString(36).toUpperCase()}`;
  localStorage.setItem(DAILY_PLAYER_ID_KEY, existing);
  return existing;
}

function loadPreferredPlayerName() {
  return String(localStorage.getItem(DAILY_NAME_KEY) || "").trim().replace(/\s+/g, " ").slice(0, 24);
}

function savePreferredPlayerName(name) {
  const normalized = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
  localStorage.setItem(DAILY_NAME_KEY, normalized);
  return normalized;
}

function getLocalDailyAttempts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DAILY_LOCAL_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalDailyAttempts(attempts) {
  localStorage.setItem(DAILY_LOCAL_KEY, JSON.stringify(attempts));
}

function normalizeDailyEntry(entry) {
  return {
    dateKey: String(entry?.dateKey || ""),
    seed: String(entry?.seed || ""),
    playerName: String(entry?.playerName || "Unknown"),
    playerId: String(entry?.playerId || ""),
    score: Math.max(0, Number(entry?.score || 0)),
    completed: entry?.completed !== false,
    createdAt: String(entry?.createdAt || new Date().toISOString()),
    source: String(entry?.source || "local"),
  };
}

function getLocalDailyAttempt(dateKey) {
  const attempts = getLocalDailyAttempts();
  if (!attempts[dateKey]) return null;
  return normalizeDailyEntry(attempts[dateKey]);
}

function saveLocalDailyAttempt(entry) {
  const attempts = getLocalDailyAttempts();
  attempts[entry.dateKey] = normalizeDailyEntry(entry);
  saveLocalDailyAttempts(attempts);
  return attempts[entry.dateKey];
}

function hasPlayedDaily(dateKey) {
  const attempt = getLocalDailyAttempt(dateKey);
  return !!attempt && attempt.completed === true;
}

function buildDailyEntry({ dateKey, seed, playerName, playerId, score, completed = true, createdAt, source = "local" }) {
  return normalizeDailyEntry({
    dateKey,
    seed,
    playerName,
    playerId,
    score,
    completed,
    createdAt: createdAt || new Date().toISOString(),
    source,
  });
}

function lockDailyAttempt(dateKey, seed, playerName) {
  return saveLocalDailyAttempt(
    buildDailyEntry({
      dateKey,
      seed,
      playerName: playerName || "Unknown",
      playerId: getOrCreateDailyPlayerId(),
      score: 0,
      completed: false,
    })
  );
}

async function submitDailyResult(entry) {
  const normalized = buildDailyEntry(entry);
  saveLocalDailyAttempt({ ...normalized, completed: true });

  if (!dailyRemoteEnabled()) {
    return { ok: true, message: "Daily result saved locally.", entry: { ...normalized, completed: true } };
  }

  const config = getDailyLeaderboardConfig();

  try {
    const response = await fetchWithTimeout(`${config.supabaseUrl}/rest/v1/${config.table}`, {
      method: "POST",
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        date_key: normalized.dateKey,
        seed: normalized.seed,
        player_name: normalized.playerName,
        player_id: normalized.playerId,
        score: normalized.score,
        game_version: GAME_VERSION,
      }),
    });

    if (response.ok) {
      return { ok: true, message: "Daily result saved.", entry: { ...normalized, completed: true } };
    }

    return { ok: true, message: "Daily result saved locally.", entry: { ...normalized, completed: true } };
  } catch {
    return { ok: true, message: "Daily result saved locally.", entry: { ...normalized, completed: true } };
  }
}

async function fetchDailyLeaderboard(dateKey, limit = 100) {
  const localAttempt = getLocalDailyAttempt(dateKey);

  if (!dailyRemoteEnabled()) {
    return {
      entries: localAttempt?.completed ? [localAttempt] : [],
      remoteAvailable: false,
      status: "offline_config",
    };
  }

  const config = getDailyLeaderboardConfig();

  try {
    const query =
      `select=date_key,seed,player_name,player_id,score,created_at` +
      `&date_key=eq.${encodeURIComponent(dateKey)}` +
      `&order=score.desc,created_at.asc&limit=${Math.max(1, limit)}`;
    const url = `${config.supabaseUrl}/rest/v1/${config.table}?${query}`;
    const response = await fetchWithTimeout(url, {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      return {
        entries: localAttempt?.completed ? [localAttempt] : [],
        remoteAvailable: false,
        status: "offline_http",
      };
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      return {
        entries: localAttempt?.completed ? [localAttempt] : [],
        remoteAvailable: false,
        status: "offline_payload",
      };
    }

    const mapped = rows.map((row) =>
      buildDailyEntry({
        dateKey: row.date_key,
        seed: row.seed,
        playerName: row.player_name,
        playerId: row.player_id,
        score: row.score,
        createdAt: row.created_at,
        source: "remote",
      })
    );

    if (localAttempt?.completed && !mapped.some((entry) => entry.playerId === localAttempt.playerId && entry.dateKey === localAttempt.dateKey)) {
      mapped.push(localAttempt);
    }

    mapped.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.createdAt).localeCompare(String(b.createdAt));
    });

    return {
      entries: mapped.slice(0, limit),
      remoteAvailable: true,
      status: "online",
    };
  } catch {
    return {
      entries: localAttempt?.completed ? [localAttempt] : [],
      remoteAvailable: false,
      status: "offline_network",
    };
  }
}

function addDaysToDateKey(dateKey, daysToAdd) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  return getCurrentDailyDateKey(date);
}

function incrementDateKey(dateKey) {
  return addDaysToDateKey(dateKey, 1);
}

function decrementDateKey(dateKey) {
  return addDaysToDateKey(dateKey, -1);
}

const DAILY_LAUNCH_DATE = "2026-04-03";

function canNavigateToDate(dateKey) {
  const today = getCurrentDailyDateKey();
  // Can't go to future
  if (dateKey > today) return false;
  // Can't go before launch date
  if (dateKey < DAILY_LAUNCH_DATE) return false;
  return true;
}

function canNavigatePrevious(currentDateKey) {
  const prevDate = decrementDateKey(currentDateKey);
  return canNavigateToDate(prevDate);
}

function canNavigateNext(currentDateKey) {
  const nextDate = incrementDateKey(currentDateKey);
  return canNavigateToDate(nextDate);
}

function buildDailyGameUrl(dateKey) {
  const params = new URLSearchParams({
    mode: "daily",
    date: dateKey,
  });
  return `game.html?${params.toString()}`;
}

function getRequestedDailyDateKeyFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mode") !== "daily") return "";
  const requested = String(params.get("date") || "").trim();
  return requested || getCurrentDailyDateKey();
}
