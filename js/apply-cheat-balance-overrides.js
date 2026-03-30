(function () {
  if (typeof CHEATS === "undefined" || !Array.isArray(CHEATS)) return;
  if (typeof CHEAT_BALANCE_OVERRIDES === "undefined" || !CHEAT_BALANCE_OVERRIDES) return;

  const editableKeys = [
    "name",
    "rarity",
    "unlockAt",
    "included",
    "stacking",
    "weight",
    "poolExcludedIfPowerOwned",
  ];

  CHEATS.forEach((cheat) => {
    if (!cheat || !cheat.id) return;
    const override = CHEAT_BALANCE_OVERRIDES[cheat.id];
    if (!override) return;

    const previousName = cheat.name;

    editableKeys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(override, key)) return;
      cheat[key] = override[key];
    });

    if (typeof CHEAT_DESCRIPTIONS !== "undefined" && CHEAT_DESCRIPTIONS) {
      if (
        cheat.name !== previousName &&
        CHEAT_DESCRIPTIONS[previousName] &&
        !CHEAT_DESCRIPTIONS[cheat.name]
      ) {
        CHEAT_DESCRIPTIONS[cheat.name] = CHEAT_DESCRIPTIONS[previousName];
      }

      if (Object.prototype.hasOwnProperty.call(override, "description")) {
        CHEAT_DESCRIPTIONS[cheat.name] = override.description;
      }
    }
  });
})();
