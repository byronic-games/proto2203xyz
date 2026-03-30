const SUITS = ["♠", "♥", "♦", "♣"];
    const SUIT_NAMES = {
      "♠": "spades",
      "♥": "hearts",
      "♦": "diamonds",
      "♣": "clubs",
    };

    const RANKS = [
      { r: "A", v: 1 },
      { r: "2", v: 2 },
      { r: "3", v: 3 },
      { r: "4", v: 4 },
      { r: "5", v: 5 },
      { r: "6", v: 6 },
      { r: "7", v: 7 },
      { r: "8", v: 8 },
      { r: "9", v: 9 },
      { r: "10", v: 10 },
      { r: "J", v: 11 },
      { r: "Q", v: 12 },
      { r: "K", v: 13 },
    ];

    const BEST_SCORE_KEY = "hl_prototype_best_score";
    const CARD_STATS_KEY = "hl_prototype_card_stats";
    const CARD_BACK_STATUS_KEY = "hl_prototype_card_back_status";
    const RUN_SEED_KEY = "hl_prototype_last_seed";
    const META_PROGRESSION_KEY = "hl_prototype_meta_progression";
    const GAME_VERSION = "v0.1";

    const CHEAT_RARITY = {
      common: 60,
      uncommon: 25,
      rare: 10,
      legendary: 5,
    };

const CHEAT_UNLOCKS_KEY = "hl_prototype_cheat_unlocks";;

function mulberry32(a) {
      return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

function stringToSeedNumber(str) {
      let h = 1779033703 ^ str.length;
      for (let i = 0; i < str.length; i += 1) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
      }
      return h >>> 0;
    }

function randomSeedString(length = 6) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let out = "";
      for (let i = 0; i < length; i += 1) {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
      return out;
    }

function normalizeSeed(seed) {
      return String(seed || "").trim().toUpperCase();
    }

function seededShuffle(array, seedString) {
      const rng = mulberry32(stringToSeedNumber(seedString));
      for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

function getCardId(suit, rank) {
      return `${SUIT_NAMES[suit]}_${rank}`;
    }
