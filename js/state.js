function createDeck(seedString) {
      const deck = [];
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          deck.push({
            id: getCardId(suit, rank.r),
            suit,
            rank: rank.r,
            value: rank.v,
          });
        }
      }
      seededShuffle(deck, seedString);
      return deck;
    }

function createEmptyState() {
      return {
        deck: [],
        index: 0,
        current: null,
        cheats: [],
        pendingCheatOptions: [],
        message: "Press Start Run.",
        gameOver: true,
        handCard: null,
        currentValueModifier: 0,
        correctAnswers: 0,
        streak: 0,
        bestScore: loadBestScore(),
        seenCardIds: new Set(),
        powers: [],
        selectedStartPowerId: "none",
        cardStats: loadCardStats(),
        cardBackStatuses: loadCardBackStatuses(),
        runSeed: loadLastRunSeed() || randomSeedString(),
      };
    }

let state = createEmptyState();
