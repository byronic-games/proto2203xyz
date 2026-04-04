const PROFILE_NAME_KEY = "hl_prototype_hero_name";
const DAILY_LOCAL_ATTEMPTS_KEY = "hl_prototype_daily_attempts_local";

function getCompletedDailyRunCount() {
  try {
    const attempts = JSON.parse(localStorage.getItem(DAILY_LOCAL_ATTEMPTS_KEY) || "{}");
    if (!attempts || typeof attempts !== "object") return 0;

    return Object.values(attempts).filter((entry) => entry?.completed === true).length;
  } catch {
    return 0;
  }
}

function getProfileAchievements(stats, deckWins) {
  const completedDailyRuns = getCompletedDailyRunCount();
  return [
    {
      label: "First Deck Cleared",
      unlocked: (stats.totalDecksCleared || 0) >= 1,
    },
    {
      label: "Blue Deck Cleared",
      unlocked: (deckWins.blue || 0) >= 1,
    },
    {
      label: "Red Deck Cleared",
      unlocked: (deckWins.red || 0) >= 1,
    },
    {
      label: "100 Correct Guesses",
      unlocked: (stats.totalCorrectGuesses || 0) >= 100,
    },
    {
      label: "10 Decks Beaten",
      unlocked: (stats.totalDecksCleared || 0) >= 10,
    },
    {
      label: "Daily Starter",
      unlocked: (stats.dailyAttempts || 0) >= 1,
    },
    {
      label: "Daily Completed",
      unlocked: completedDailyRuns >= 1,
    },
  ];
}

function getProfileStampLabel(achievements) {
  const unlockedCount = achievements.filter((entry) => entry.unlocked).length;
  if (unlockedCount >= 4) return "Deck Veteran";
  if (unlockedCount >= 2) return "Run Survivor";
  if (unlockedCount >= 1) return "First Stamp";
  return "New Challenger";
}

function renderProfilePage() {
  const nameInput = document.getElementById("profile-name-input");
  const bestRunEl = document.getElementById("profile-best-run");
  const totalCorrectEl = document.getElementById("profile-total-correct");
  const decksBeatenEl = document.getElementById("profile-decks-beaten");
  const runsStartedEl = document.getElementById("profile-runs-started");
  const blueClearsEl = document.getElementById("profile-blue-clears");
  const redClearsEl = document.getElementById("profile-red-clears");
  const blueRunsEl = document.getElementById("profile-blue-runs");
  const redRunsEl = document.getElementById("profile-red-runs");
  const dailyAttemptsEl = document.getElementById("profile-daily-attempts");
  const stampEl = document.getElementById("profile-stamp");
  const achievementListEl = document.getElementById("profile-achievement-list");
  const backBtn = document.getElementById("profile-back-btn");

  if (!nameInput || !bestRunEl || !totalCorrectEl || !decksBeatenEl || !runsStartedEl || !blueClearsEl || !redClearsEl || !blueRunsEl || !redRunsEl || !dailyAttemptsEl || !stampEl || !achievementListEl || !backBtn) {
    return;
  }

  const render = () => {
    const deckWins = loadDeckWins();
    const stats = loadProfileStats();
    const bestRun = loadBestScore();
    const achievements = getProfileAchievements(stats, deckWins);

    nameInput.value = loadPreferredHeroName();
    bestRunEl.textContent = String(bestRun || 0);
    totalCorrectEl.textContent = String(stats.totalCorrectGuesses || 0);
    decksBeatenEl.textContent = String(stats.totalDecksCleared || 0);
    runsStartedEl.textContent = String(stats.runsStarted || 0);
    blueClearsEl.textContent = String(deckWins.blue || 0);
    redClearsEl.textContent = String(deckWins.red || 0);
    blueRunsEl.textContent = String(stats.blueRunsStarted || 0);
    redRunsEl.textContent = String(stats.redRunsStarted || 0);
    dailyAttemptsEl.textContent = String(stats.dailyAttempts || 0);
    stampEl.textContent = getProfileStampLabel(achievements);

    achievementListEl.innerHTML = "";
    achievements.forEach((achievement) => {
      const item = document.createElement("div");
      item.className = `achievement-item ${achievement.unlocked ? "unlocked" : "locked"}`;
      item.textContent = achievement.unlocked ? `Stamped: ${achievement.label}` : "Locked achievement";
      achievementListEl.appendChild(item);
    });
  };

  nameInput.addEventListener("input", () => {
    savePreferredHeroName(nameInput.value);
  });

  backBtn.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "index.html";
  });

  render();
}

renderProfilePage();
