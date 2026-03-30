(function () {
  const tableBody = document.querySelector("#cheat-table tbody");
  const summaryEl = document.getElementById("catalog-summary");
  const searchEl = document.getElementById("cheat-search");
  const csvBtn = document.getElementById("download-csv-btn");

  if (!tableBody || !summaryEl || !searchEl) return;
  if (!Array.isArray(CHEATS)) return;

  function toConditionSummary(cheat) {
    const parts = [];

    const unlockAt = Number(cheat.unlockAt || 0);
    if (unlockAt > 0) {
      parts.push(`Meta progression >= ${unlockAt}`);
    } else {
      parts.push("Available from run start");
    }

    if (!cheat.included) {
      parts.push("Excluded from random pool");
    }

    if (cheat.poolExcludedIfPowerOwned) {
      parts.push(`Excluded when power '${cheat.poolExcludedIfPowerOwned}' is active`);
    }

    const desc = String(CHEAT_DESCRIPTIONS?.[cheat.name] || "");
    const restrictionMatch = desc.match(/Can only[^.]*\./i);
    if (restrictionMatch) {
      parts.push(restrictionMatch[0].trim());
    }

    return parts.join(" | ");
  }

  function rarityCell(rarity) {
    const value = String(rarity || "unknown");
    return `<span class="rarity-chip rarity-${value}">${value}</span>`;
  }

  function rowMarkup(cheat) {
    const unlockText = Number(cheat.unlockAt || 0) > 0 ? `Meta ${cheat.unlockAt}` : "Start";
    const desc = CHEAT_DESCRIPTIONS?.[cheat.name] || "";
    return `
      <tr>
        <td class="mono">${cheat.id || ""}</td>
        <td>${cheat.name || ""}</td>
        <td>${rarityCell(cheat.rarity)}</td>
        <td>${unlockText}</td>
        <td>${cheat.included ? "Yes" : "No"}</td>
        <td>${cheat.stacking || "unique"}</td>
        <td>${Number.isFinite(cheat.weight) ? cheat.weight : 1}</td>
        <td>${toConditionSummary(cheat)}</td>
        <td>${desc}</td>
      </tr>
    `;
  }

  function toCsvRow(values) {
    return values
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(",");
  }

  function downloadCsv() {
    const header = toCsvRow([
      "id",
      "name",
      "rarity",
      "unlockAt",
      "included",
      "stacking",
      "weight",
      "poolExcludedIfPowerOwned",
      "conditions",
      "description",
    ]);

    const lines = CHEATS.map((cheat) =>
      toCsvRow([
        cheat.id,
        cheat.name,
        cheat.rarity,
        cheat.unlockAt ?? 0,
        !!cheat.included,
        cheat.stacking || "unique",
        Number.isFinite(cheat.weight) ? cheat.weight : 1,
        cheat.poolExcludedIfPowerOwned || "",
        toConditionSummary(cheat),
        CHEAT_DESCRIPTIONS?.[cheat.name] || "",
      ])
    );

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cheat-catalog.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function updateSummary(visibleCheats) {
    const byRarity = visibleCheats.reduce((acc, cheat) => {
      const key = cheat.rarity || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const rarityText = Object.entries(byRarity)
      .map(([rarity, count]) => `${rarity}: ${count}`)
      .join(" | ");

    summaryEl.innerText = `Showing ${visibleCheats.length} / ${CHEATS.length} cheats${rarityText ? ` (${rarityText})` : ""}.`;
  }

  function render(filterText) {
    const filter = String(filterText || "").trim().toLowerCase();
    const visibleCheats = CHEATS.filter((cheat) => {
      if (!filter) return true;
      const haystack = [
        cheat.id,
        cheat.name,
        cheat.rarity,
        cheat.stacking,
        CHEAT_DESCRIPTIONS?.[cheat.name],
        toConditionSummary(cheat),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(filter);
    });

    tableBody.innerHTML = visibleCheats.map(rowMarkup).join("");
    updateSummary(visibleCheats);
  }

  searchEl.addEventListener("input", () => {
    render(searchEl.value);
  });

  if (csvBtn) {
    csvBtn.addEventListener("click", downloadCsv);
  }

  render("");
})();
