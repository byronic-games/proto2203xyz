const CHEATS = [
      {
        id: "within_range",
        name: "Within ±2?",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next || !state.current) return "No next card.";
          const currentVal = getCurrentEffectiveValue();
          const diff = Math.abs(next.value - currentVal);
          return diff <= 2 ? "Next card is within ±2 of current value." : "Next card is NOT within ±2.";
        },
      },
      {
        id: "avg_outcome",
        name: "Average Outcome",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const entry = state.cardStats[next.id];
          if (!entry || entry.attempts === 0) return "No data yet.";
          const ratio = entry.correct / entry.attempts;
          if (ratio > 0.6) return "Historically favourable.";
          if (ratio < 0.4) return "Historically unfavourable.";
          return "Historically neutral.";
        },
      },
      {
        id: "danger_indicator",
        name: "Is This Dangerous?",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const entry = state.cardStats[next.id];
          if (!entry || entry.attempts < 5) return "Not enough data.";
          const ratio = entry.correct / entry.attempts;
          return ratio < 0.45 ? "⚠️ This card is dangerous." : "This card seems safe.";
        },
      },
      {
        id: "not_suit",
        name: "Not This Suit",
        rarity: "common",
        stacking: "repeatable",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const suits = ["♠", "♥", "♦", "♣"];
          const notSuit = suits.filter((s) => s !== next.suit);
          const random = notSuit[Math.floor(Math.random() * notSuit.length)];
          return `Next card is NOT ${random}.`;
        },
      },
      {
        id: "red_black",
        name: "Reveal Red / Black",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          return isRed(next) ? "Next card is Red." : "Next card is Black.";
        },
      },
      {
        id: "odd_even_neither",
        name: "Odd / Even / Neither",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          if (isPictureCard(next)) return "Next card is Neither.";
          if (next.value % 2 === 0) return "Next card is Even.";
          return "Next card is Odd.";
        },
      },
      {
        id: "higher_than_6",
        name: "Higher than 6?",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          return next.value > 6 ? "Yes — it is higher than 6." : "No — it is 6 or lower.";
        },
      },
      {
        id: "picture_card",
        name: "Picture Card?",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          return isPictureCard(next) ? "Yes — it is a picture card." : "No — not a picture card.";
        },
      },
      {
        id: "chance_higher",
        name: "Chance Next Card Is Higher",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          if (!state.current) return "No current card.";
          const currentComparisonValue = getCurrentEffectiveValue();
          const remainingCards = state.deck.slice(state.index + 1);
          if (remainingCards.length === 0) return "No next card.";
          const higherCount = remainingCards.filter((card) => card.value > currentComparisonValue).length;
          const percentage = Math.round((higherCount / remainingCards.length) * 100);
          return `${percentage}% chance the next card is higher.`;
        },
      },
      {
        id: "chance_lower",
        name: "Chance Next Card Is Lower",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          if (!state.current) return "No current card.";
          const currentComparisonValue = getCurrentEffectiveValue();
          const remainingCards = state.deck.slice(state.index + 1);
          if (remainingCards.length === 0) return "No next card.";
          const lowerCount = remainingCards.filter((card) => card.value < currentComparisonValue).length;
          const percentage = Math.round((lowerCount / remainingCards.length) * 100);
          return `${percentage}% chance the next card is lower.`;
        },
      },
      {
        id: "correct_percent",
        name: "% Guessed Correctly",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const percentage = getCardCorrectPercentage(next);
          if (percentage === null) return "No tracked history yet for this card.";
          return `${percentage}% of previous Higher/Lower guesses were correct when this card was the face-up card.`;
        },
      },
      {
        id: "tear_corner",
        name: "Tear Corner",
        rarity: "common",
        stacking: "unique",
        consumeOnUse: true,
        use: () => {
          if (!state.current) return "No current card.";
          setCardBackStatus(state.current.id, { tornCorner: true });
          return `${describeCard(state.current)} now has a torn corner on its back.`;
        },
      },
      {
        id: "same_value_remaining",
        name: "Same Number Remaining",
        rarity: "common",
        stacking: "repeatable",
        consumeOnUse: true,
        use: () => {
          const next = peekNext();
          if (!next) return "No next card.";
          const remaining = countUnseenCardsOfRank(next.rank);
          return `${remaining} card(s) of this value remain in the face-down deck.`;
        },
      },
      {
        id: "nudge_up",
        name: "Nudge +1",
        rarity: "common",
        stacking: "stackable",
        consumeOnUse: true,
        use: () => {
          state.currentValueModifier += 1;
          const effective = getCurrentEffectiveValue();
          return `Current card is now treated as ${valueToRank(effective)} for the next guess.`;
        },
      },
      {
        id: "nudge_down",
        name: "Nudge -1",
        rarity: "common",
        stacking: "stackable",
        consumeOnUse: true,
        use: () => {
          state.currentValueModifier -= 1;
          const effective = getCurrentEffectiveValue();
          return `Current card is now treated as ${valueToRank(effective)} for the next guess.`;
        },
      },
      {
        id: "swap",
        name: "Swap",
        rarity: "common",
        stacking: "repeatable",
        consumeOnUse: true,
        use: () => {
          const nextIndex = state.index + 1;
          const topDeckCard = state.deck[nextIndex];
          if (!topDeckCard) return "No next card.";

          if (!state.handCard) {
            const takenCard = state.deck.splice(nextIndex, 1)[0];
            state.handCard = { ...takenCard };
            recordFaceDownCardSeen(peekNext());
            return `Took ${describeCard(takenCard)} into your hand. It is no longer on top of the deck.`;
          }

          const takenCard = { ...topDeckCard };
          const heldCard = { ...state.handCard };
          state.deck[nextIndex] = heldCard;
          state.handCard = takenCard;
          recordFaceDownCardSeen(peekNext());
          return `Took ${describeCard(takenCard)} into your hand and placed ${describeCard(heldCard)} on top of the deck.`;
        },
      },
    ];

function canAddCheatToHand(cheatDef) {
      if (cheatDef.stacking === "stackable" || cheatDef.stacking === "repeatable") return true;
      return !state.cheats.some((c) => c.id === cheatDef.id);
    }

function getRandomCheatOptions(count = 3) {
      const pool = [...CHEATS];
      const options = [];
      while (options.length < count && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        options.push(pool.splice(idx, 1)[0]);
      }
      return options;
    }

function offerCheatChoice() {
      state.pendingCheatOptions = getRandomCheatOptions(3);
      state.message = "Choose 1 cheat:";
      render();
    }

function pickCheatFromChoice(index) {
      const cheat = state.pendingCheatOptions[index];
      if (!cheat) return;
      if (canAddCheatToHand(cheat)) {
        state.cheats.push({ ...cheat });
        state.message = `Picked: ${cheat.name}`;
      } else {
        state.message = `${cheat.name} was already in hand.`;
      }
      state.pendingCheatOptions = [];
      render();
    }
