window.CHEAT_BALANCE_OVERRIDES = {
    "five_alive":  {
                       "stacking":  "unique",
                       "description":  "Can only be used on a 5. If your next guess is wrong, the run still continues.",
                       "weight":  1,
                       "unlockAt":  0,
                       "name":  "Five Alive",
                       "included":  true,
                       "rarity":  "rare"
                   },
    "nudge_up_2":  {
                       "stacking":  "stackable",
                       "description":  "Increases the value of the current face card by two, stopping at King.",
                       "weight":  1,
                       "unlockAt":  30,
                       "name":  "Nudge +2",
                       "included":  true,
                       "rarity":  "uncommon",
                       "poolExcludedIfPowerOwned":  "nudge_engine"
                   },
    "lower_of_next_two":  {
                              "stacking":  "unique",
                              "description":  "Reveals the lowest value of the next two face down cards.",
                              "weight":  1,
                              "unlockAt":  30,
                              "name":  "Lower of Next Two",
                              "included":  true,
                              "rarity":  "uncommon"
                          },
    "is_it_an_ace":  {
                         "stacking":  "unique",
                         "description":  "Reveals whether at least one Ace appears in the next three face down cards.",
                         "weight":  1,
                         "unlockAt":  0,
                         "name":  "Is it an Ace?",
                         "included":  true,
                         "rarity":  "common"
                     },
    "nudge_down":  {
                       "stacking":  "stackable",
                       "description":  "Decreases the value of the current face card by one for the next guess.",
                       "weight":  1,
                       "unlockAt":  0,
                       "name":  "Nudge -1",
                       "included":  true,
                       "rarity":  "common",
                       "poolExcludedIfPowerOwned":  "nudge_engine"
                   },
    "above_9":  {
                    "stacking":  "unique",
                    "description":  "Is the next face down card above 9?",
                    "weight":  1,
                    "unlockAt":  0,
                    "name":  "Above 9?",
                    "included":  true,
                    "rarity":  "common"
                },
    "chance_higher":  {
                          "stacking":  "unique",
                          "description":  "Calculates the probability that one of the remaining cards is higher than the current card.",
                          "weight":  1,
                          "unlockAt":  50,
                          "name":  "Chance Higher",
                          "included":  true,
                          "rarity":  "rare"
                      },
    "number_remaining":  {
                             "stacking":  "unique",
                             "description":  "Reveals how many copies of the next face down card\u0027s rank are still left in the deck, including that next card.",
                             "weight":  1,
                             "unlockAt":  40,
                             "name":  "Number Remaining?",
                             "included":  true,
                             "rarity":  "rare"
                         },
    "next_two_total":  {
                           "stacking":  "unique",
                           "description":  "Reveals the total of the next two face down cards.",
                           "weight":  1,
                           "unlockAt":  0,
                           "name":  "Total of Next Two",
                           "included":  true,
                           "rarity":  "uncommon"
                       },
    "below_5":  {
                    "stacking":  "unique",
                    "description":  "Is the next face down card below 5?",
                    "weight":  1,
                    "unlockAt":  0,
                    "name":  "Below 5?",
                    "included":  true,
                    "rarity":  "common"
                },
    "swap":  {
                 "stacking":  "repeatable",
                 "description":  "Replace the current face card with the card at the bottom of the deck.",
                 "weight":  1,
                 "unlockAt":  0,
                 "name":  "Swap",
                 "included":  true,
                 "rarity":  "uncommon"
             },
    "next_card_parity":  {
                             "stacking":  "unique",
                             "description":  "Reveals if the next card is odd, even or a picture card.",
                             "weight":  1,
                             "unlockAt":  0,
                             "name":  "Next Card Parity",
                             "included":  true,
                             "rarity":  "common"
                         },
    "double_trouble":  {
                           "stacking":  "unique",
                           "description":  "Treat the current card as double its value for the next guess, up to King.",
                           "weight":  1,
                           "unlockAt":  45,
                           "name":  "Double Trouble",
                           "included":  true,
                           "rarity":  "rare"
                       },
    "lucky_7":  {
                    "stacking":  "unique",
                    "description":  "Can only be used on a 7. Your next wrong guess still counts as correct.",
                    "weight":  1,
                    "unlockAt":  0,
                    "name":  "Lucky 7",
                    "included":  true,
                    "rarity":  "rare"
                },
    "six_seven":  {
                      "stacking":  "unique",
                      "description":  "Use only on an un-nudged 6 or 7, and it must be the first and only cheat played on that card. Nudges then lock. Guess correctly to pick 3 cheats in a row. Guess wrong and you lose.",
                      "weight":  1,
                      "unlockAt":  20,
                      "name":  "6/7",
                      "included":  true,
                      "rarity":  "rare"
                  },
    "twin_peek":  {
                      "stacking":  "unique",
                      "description":  "Checks the next five cards and reveals whether any of them match the face-up card\u0027s current value.",
                      "weight":  1,
                      "unlockAt":  15,
                      "name":  "Twin Peek",
                      "included":  true,
                      "rarity":  "uncommon"
                  },
    "run_stopper":  {
                        "stacking":  "unique",
                        "description":  "Checks the next five cards and reveals whether at least one Ace or King appears.",
                        "weight":  1,
                        "unlockAt":  10,
                        "name":  "Run Stopper",
                        "included":  true,
                        "rarity":  "uncommon"
                    },
    "bang_average":  {
                         "stacking":  "unique",
                         "description":  "Reveals the exact average value of the next three face down cards.",
                         "weight":  1,
                         "unlockAt":  20,
                         "name":  "Bang Average",
                         "included":  false,
                         "rarity":  "uncommon"
                     },
    "god_save_the_king":  {
                              "stacking":  "unique",
                              "description":  "Play on any face card. If the next card is a King, the run survives even if your guess is wrong.",
                              "weight":  1,
                              "unlockAt":  20,
                              "name":  "God Save The King",
                              "included":  true,
                              "rarity":  "rare"
                          },
    "next_card_nudge_up":  {
                               "stacking":  "unique",
                               "description":  "Temporarily nudges the next face-down card up by 3 for the next guess, stopping at King.",
                               "weight":  1,
                               "unlockAt":  10,
                               "name":  "Next Card Nudge Up",
                               "included":  true,
                               "rarity":  "uncommon"
                           },
    "next_card_nudge_down":  {
                                 "stacking":  "unique",
                                 "description":  "Temporarily nudges the next face-down card down by 3 for the next guess, stopping at Ace.",
                                 "weight":  1,
                                 "unlockAt":  15,
                                 "name":  "Next Card Nudge Down",
                                 "included":  true,
                                 "rarity":  "uncommon"
                             },
    "face_card_ahead":  {
                            "stacking":  "unique",
                            "description":  "Reveals whether at least one face card (J, Q, or K) appears in the next three face down cards.",
                            "weight":  1,
                            "unlockAt":  10,
                            "name":  "Face Card Ahead?",
                            "included":  true,
                            "rarity":  "uncommon"
                        },
    "nudge_up":  {
                     "stacking":  "stackable",
                     "description":  "Increases the value of the current face card by one for the next guess.",
                     "weight":  1,
                     "unlockAt":  0,
                     "name":  "Nudge +1",
                     "included":  true,
                     "rarity":  "common",
                     "poolExcludedIfPowerOwned":  "nudge_engine"
                 },
    "top_half_bottom_half":  {
                                 "stacking":  "unique",
                                 "description":  "Is the next card below 7 or is it 7 and above?",
                                 "weight":  1,
                                 "unlockAt":  0,
                                 "name":  "Top Half / Bottom Half",
                                 "included":  true,
                                 "rarity":  "common"
                             },
    "odd_one_out":  {
                        "stacking":  "unique",
                        "description":  "For the next card only: if it is odd, you lose. Aces count as odd even under Aces Wild. Otherwise you survive.",
                        "weight":  1,
                        "unlockAt":  35,
                        "name":  "Odd One Out",
                        "included":  true,
                        "rarity":  "rare"
                    },
    "halve_it":  {
                     "stacking":  "unique",
                     "description":  "Can only be used on an even card. Treat the current card as half its value for the next guess.",
                     "weight":  1,
                     "unlockAt":  45,
                     "name":  "Halve It",
                     "included":  true,
                     "rarity":  "uncommon"
                 },
    "tear_corner":  {
                        "stacking":  "unique",
                        "description":  "Tear off the top left corner of the current face card so it can be recognised in future runs.",
                        "weight":  1,
                        "unlockAt":  40,
                        "name":  "Tear Corner",
                        "included":  true,
                        "rarity":  "common"
                    },
    "higher_of_next_two":  {
                               "stacking":  "unique",
                               "description":  "Reveals the highest value of the next two face down cards.",
                               "weight":  1,
                               "unlockAt":  25,
                               "name":  "Higher of Next Two",
                               "included":  true,
                               "rarity":  "uncommon"
                           },
    "one_of_next_two_higher":  {
                                   "stacking":  "unique",
                                   "description":  "Reveals if at least one of the next two cards is higher than the current card.",
                                   "weight":  1,
                                   "unlockAt":  5,
                                   "name":  "One of Next 2 Higher?",
                                   "included":  true,
                                   "rarity":  "common"
                               },
    "mid_range":  {
                      "stacking":  "unique",
                      "description":  "Is the value of the next face down card a 5, 6, 7, 8 or 9?",
                      "weight":  1,
                      "unlockAt":  0,
                      "name":  "Between 5 and 9?",
                      "included":  true,
                      "rarity":  "common"
                  },
    "ace_ahead":  {
                      "stacking":  "unique",
                      "description":  "Reveals whether at least one Ace appears in the next three face down cards.",
                      "weight":  1,
                      "unlockAt":  25,
                      "name":  "Ace ahead?",
                      "included":  true,
                      "rarity":  "uncommon"
                  },
    "nudge_down_2":  {
                         "stacking":  "stackable",
                         "description":  "Decreases the value of the current face card by two, stopping at Ace.",
                         "weight":  1,
                         "unlockAt":  30,
                         "name":  "Nudge -2",
                         "included":  true,
                         "rarity":  "uncommon",
                         "poolExcludedIfPowerOwned":  "nudge_engine"
                     },
    "one_of_next_two_lower":  {
                                  "stacking":  "unique",
                                  "description":  "Reveals if at least one of the next two cards is lower than the current card.",
                                  "weight":  1,
                                  "unlockAt":  5,
                                  "name":  "One of Next 2 Lower?",
                                  "included":  true,
                                  "rarity":  "common"
                              },
    "king_ahead":  {
                       "stacking":  "unique",
                       "description":  "Reveals whether at least one King appears in the next three face down cards.",
                       "weight":  1,
                       "unlockAt":  25,
                       "name":  "King ahead?",
                       "included":  true,
                       "rarity":  "uncommon"
                   },
    "chance_lower":  {
                         "stacking":  "unique",
                         "description":  "Calculates the probability that one of the remaining cards is lower than the current card.",
                         "weight":  1,
                         "unlockAt":  50,
                         "name":  "Chance Lower",
                         "included":  true,
                         "rarity":  "rare"
                     },
    "is_it_a_king":  {
                         "stacking":  "unique",
                         "description":  "Reveals whether the next face down card is a King.",
                         "weight":  1,
                         "unlockAt":  0,
                         "name":  "Is it a King?",
                         "included":  true,
                         "rarity":  "common"
                     },
    "next_three_total":  {
                             "stacking":  "unique",
                             "description":  "Reveals the total of the next three face down cards.",
                             "weight":  1,
                             "unlockAt":  20,
                             "name":  "Total of Next Three",
                             "included":  true,
                             "rarity":  "rare"
                         },
    "total_above_12":  {
                           "stacking":  "unique",
                           "description":  "Reveals whether the next two face down cards total more than 12.",
                           "weight":  1,
                           "unlockAt":  0,
                           "name":  "Total Above 12?",
                           "included":  true,
                           "rarity":  "common"
                       },
    "total_above_20":  {
                           "stacking":  "unique",
                           "description":  "Reveals whether the next two face down cards total more than 20.",
                           "weight":  1,
                           "unlockAt":  15,
                           "name":  "Total Above 20?",
                           "included":  true,
                           "rarity":  "uncommon"
                       },
    "total_under_10":  {
                           "stacking":  "unique",
                           "description":  "Reveals whether the next two face down cards total less than 10.",
                           "weight":  1,
                           "unlockAt":  0,
                           "name":  "Total Under 10?",
                           "included":  true,
                           "rarity":  "common"
                       },
    "total_under_15":  {
                           "stacking":  "unique",
                           "description":  "Reveals whether the next two face down cards total less than 15.",
                           "weight":  1,
                           "unlockAt":  5,
                           "name":  "Total Under 15?",
                           "included":  true,
                           "rarity":  "common"
                       },
    "prime_ahead":  {
                        "stacking":  "unique",
                        "description":  "Reveals whether the next face down card is prime-valued: 2, 3, 5, 7, J = 11, or K = 13.",
                        "weight":  1,
                        "unlockAt":  15,
                        "name":  "Prime Ahead?",
                        "included":  false,
                        "rarity":  "uncommon"
                    },
    "product_of_next_two":  {
                                "stacking":  "unique",
                                "description":  "Reveals the product of the next two face down cards.",
                                "weight":  1,
                                "unlockAt":  35,
                                "name":  "Product of Next Two",
                                "included":  true,
                                "rarity":  "rare"
                            }
};
