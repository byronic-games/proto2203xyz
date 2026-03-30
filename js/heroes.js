async function renderHeroesBoard() {
  const bodyEl = document.getElementById("heroes-table-body");
  const noteEl = document.getElementById("heroes-note");
  if (!bodyEl || !noteEl) return;

  const heroes = await fetchHeroes(300);
  bodyEl.innerHTML = "";

  if (!heroes.length) {
    bodyEl.innerHTML = "<tr><td colspan='3'>No 52-card clears yet. Be the first hero.</td></tr>";
    noteEl.innerText = leaderboardRemoteEnabled()
      ? "Connected to online leaderboard."
      : "Showing local leaderboard only. Configure Supabase in js/leaderboard.js for global tracking.";
    return;
  }

  heroes.forEach((hero) => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.innerText = hero.playerName || "Unknown";

    const seedTd = document.createElement("td");
    seedTd.innerText = hero.seed || "-";

    const dateTd = document.createElement("td");
    dateTd.innerText = formatHeroDate(hero.createdAt);

    tr.appendChild(nameTd);
    tr.appendChild(seedTd);
    tr.appendChild(dateTd);
    bodyEl.appendChild(tr);
  });

  noteEl.innerText = leaderboardRemoteEnabled()
    ? "Connected to online leaderboard."
    : "Showing local leaderboard only. Configure Supabase in js/leaderboard.js for global tracking.";
}

renderHeroesBoard();
