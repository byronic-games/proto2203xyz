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

function buildDailyLeaderboardResult(entries, remoteAvailable, status) {
  const list = Array.isArray(entries) ? entries : [];
  // Keep backward compatibility with older daily-page.js that expects an Array.
  list._remoteAvailable = !!remoteAvailable;
  list._status = String(status || (remoteAvailable ? "online" : "offline_network"));
  return list;
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
  const crownSnapshot = typeof getEntryCrownSnapshot === "function"
    ? getEntryCrownSnapshot(entry || {})
    : {
      blueCleared: false,
      greenCleared: false,
      redCleared: false,
      dailyCleared: false,
      dailyClears: 0,
      summary: "",
    };

  return {
    dateKey: String(entry?.dateKey || ""),
    seed: String(entry?.seed || ""),
    playerName: String(entry?.playerName || "Unknown"),
    playerId: String(entry?.playerId || ""),
    score: Math.max(0, Number(entry?.score || 0)),
    completed: entry?.completed !== false,
    createdAt: String(entry?.createdAt || new Date().toISOString()),
    source: String(entry?.source || "local"),
    blueCleared: crownSnapshot.blueCleared,
    greenCleared: crownSnapshot.greenCleared,
    redCleared: crownSnapshot.redCleared,
    dailyCleared: crownSnapshot.dailyCleared,
    dailyClears: crownSnapshot.dailyClears,
    crownSummary: crownSnapshot.summary,
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

function normalizeDailyNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

async function fetchDailyClearedNameSet(config, limit = 5000) {
  const clearedNames = new Set();
  const safeLimit = Math.max(1, Number(limit) || 5000);
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
  };

  const collectNames = (rows) => {
    if (!Array.isArray(rows)) return;
    rows.forEach((row) => {
      const key = normalizeDailyNameKey(row?.player_name);
      if (key) {
        clearedNames.add(key);
      }
    });
  };

  try {
    const byDailyClearsQuery =
      `select=player_name` +
      `&daily_clears=gt.0` +
      `&limit=${safeLimit}`;
    const byDailyClearsUrl = `${config.supabaseUrl}/rest/v1/${config.table}?${byDailyClearsQuery}`;
    let response = await fetchWithTimeout(byDailyClearsUrl, { headers });

    if (response.ok) {
      collectNames(await response.json());
    } else {
      response = null;
    }

    const byScoreQuery =
      `select=player_name` +
      `&score=gte.52` +
      `&limit=${safeLimit}`;
    const byScoreUrl = `${config.supabaseUrl}/rest/v1/${config.table}?${byScoreQuery}`;
    const scoreResponse = await fetchWithTimeout(byScoreUrl, { headers });
    if (scoreResponse.ok) {
      collectNames(await scoreResponse.json());
    } else if (!response) {
      return clearedNames;
    }
  } catch {
    return clearedNames;
  }

  return clearedNames;
}

function hasPlayedDaily(dateKey) {
  const attempt = getLocalDailyAttempt(dateKey);
  return !!attempt && attempt.completed === true;
}

function buildDailyEntry({
  dateKey,
  seed,
  playerName,
  playerId,
  score,
  completed = true,
  createdAt,
  source = "local",
  blueCleared,
  greenCleared,
  redCleared,
  dailyCleared,
  dailyClears,
  crownSummary,
}) {
  const normalizedSource = String(source || "local").toLowerCase();
  const shouldUseLocalCrowns =
    normalizedSource !== "remote" &&
    blueCleared === undefined &&
    greenCleared === undefined &&
    redCleared === undefined &&
    dailyCleared === undefined &&
    dailyClears === undefined &&
    crownSummary === undefined;

  const localCrowns = shouldUseLocalCrowns && typeof getLocalCrownSnapshot === "function"
    ? getLocalCrownSnapshot()
    : {
      blueCleared: false,
      greenCleared: false,
      redCleared: false,
      dailyCleared: false,
      dailyClears: 0,
      summary: "",
    };

  return normalizeDailyEntry({
    dateKey,
    seed,
    playerName,
    playerId,
    score,
    completed,
    createdAt: createdAt || new Date().toISOString(),
    source: normalizedSource,
    blueCleared: blueCleared ?? localCrowns.blueCleared,
    greenCleared: greenCleared ?? localCrowns.greenCleared,
    redCleared: redCleared ?? localCrowns.redCleared,
    dailyClears: dailyClears ?? localCrowns.dailyClears,
    dailyCleared: dailyCleared ?? localCrowns.dailyCleared,
    crownSummary: crownSummary ?? localCrowns.summary,
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
    let response = await fetchWithTimeout(`${config.supabaseUrl}/rest/v1/${config.table}`, {
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
        blue_cleared: normalized.blueCleared,
        green_cleared: normalized.greenCleared,
        red_cleared: normalized.redCleared,
        daily_clears: normalized.dailyClears,
        crown_summary: normalized.crownSummary,
      }),
    });

    if (!response.ok && response.status !== 409) {
      response = await fetchWithTimeout(`${config.supabaseUrl}/rest/v1/${config.table}`, {
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
    }

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
    return buildDailyLeaderboardResult(localAttempt?.completed ? [localAttempt] : [], false, "offline_config");
  }

  const config = getDailyLeaderboardConfig();

  try {
    const queryPrimary =
      `select=date_key,seed,player_name,player_id,score,blue_cleared,green_cleared,red_cleared,daily_clears,crown_summary,created_at` +
      `&date_key=eq.${encodeURIComponent(dateKey)}` +
      `&order=score.desc,created_at.asc&limit=${Math.max(1, limit)}`;
    const primaryUrl = `${config.supabaseUrl}/rest/v1/${config.table}?${queryPrimary}`;
    let response = await fetchWithTimeout(primaryUrl, {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      const queryFallback =
        `select=date_key,seed,player_name,player_id,score,created_at` +
        `&date_key=eq.${encodeURIComponent(dateKey)}` +
        `&order=score.desc,created_at.asc&limit=${Math.max(1, limit)}`;
      const fallbackUrl = `${config.supabaseUrl}/rest/v1/${config.table}?${queryFallback}`;
      response = await fetchWithTimeout(fallbackUrl, {
        headers: {
          apikey: config.supabaseAnonKey,
          Authorization: `Bearer ${config.supabaseAnonKey}`,
        },
      });
    }

    if (!response.ok) {
      return buildDailyLeaderboardResult(localAttempt?.completed ? [localAttempt] : [], false, "offline_http");
    }

    const rows = await response.json();
    if (!Array.isArray(rows)) {
      return buildDailyLeaderboardResult(localAttempt?.completed ? [localAttempt] : [], false, "offline_payload");
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
        blueCleared: row.blue_cleared,
        greenCleared: row.green_cleared,
        redCleared: row.red_cleared,
        dailyClears: row.daily_clears,
        crownSummary: row.crown_summary,
      })
    );

    const clearedNameSet = await fetchDailyClearedNameSet(config);
    if (clearedNameSet.size) {
      mapped.forEach((entry) => {
        const nameKey = normalizeDailyNameKey(entry.playerName);
        if (!nameKey || !clearedNameSet.has(nameKey)) return;
        entry.dailyCleared = true;
        entry.dailyClears = Math.max(1, Number(entry.dailyClears || 0));
        if (typeof buildCrownSummary === "function") {
          entry.crownSummary = buildCrownSummary({
            blueCleared: !!entry.blueCleared,
            greenCleared: !!entry.greenCleared,
            redCleared: !!entry.redCleared,
            dailyCleared: true,
          });
        }
      });
    }

    mapped.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.createdAt).localeCompare(String(b.createdAt));
    });

    return buildDailyLeaderboardResult(mapped.slice(0, limit), true, "online");
  } catch {
    return buildDailyLeaderboardResult(localAttempt?.completed ? [localAttempt] : [], false, "offline_network");
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
  const requested = String(params.get("date") || "").trim();
  return requested || getCurrentDailyDateKey();
}
