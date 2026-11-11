# Eval 20261110-210818

Seat model `openrouter/anthropic/claude-haiku-5.5`, researcher `openrouter/anthropic/claude-sonnet-5.5:online`, chair `openrouter/anthropic/claude-sonnet-5.5`, web search on. Judge `openrouter/anthropic/claude-sonnet-5.5`.

## Final answers, graded blind

Three answers per scenario, shuffled and unlabeled, with fact IDs removed: **Baseline** is one plain prompt to the Chairman's model; **Baseline + research** is the same prompt given the board's own research; **Board** is the Chairman's verdict. Per planted risk: 2 = the recommendation is gated on it or changed by it, 1 = mentioned only, 0 = absent. Actionable is 1–5. Errors counts claims the judge is confident are wrong.

**Risk points:** Baseline 29/30 (97%) · Baseline + research 30/30 (100%) · Board 30/30 (100%)

| Scenario | Risks: Baseline | + research | Board | Actionable B / B+R / Board | Errors B / B+R / Board | Decision | Notes |
|---|---|---|---|---|---|---|---|
| bakery-price-increase | 2/2 | 2/2 | 2/2 | 4 / 4 / 4 | 0 / 0 / 0 | defer | invented blocker: none |
| cleaning-chatbot-binding-quotes | 2/2 | 2/2 | 2/2 | 4 / 4 / 4 | 1 / 0 / 0 | pilot |  |
| coffee-tip-pool-managers | 2/2 | 2/2 | 2/2 | 4 / 5 / 4 | 1 / 1 / 1 | defer |  |
| dental-ai-receptionist | 3/4 | 4/4 | 4/4 | 4 / 4 / 5 | 1 / 0 / 0 | pilot |  |
| food-truck-merchant-cash-advance | 4/4 | 4/4 | 4/4 | 4 / 5 / 5 | 0 / 1 / 1 | reject |  |
| hvac-ai-promo-texts | 4/4 | 4/4 | 4/4 | 4 / 5 / 5 | 0 / 1 / 0 | pilot |  |
| landscaping-1099-crew | 2/2 | 2/2 | 2/2 | 4 / 4 / 5 | 1 / 1 / 0 | reject |  |
| restaurant-ai-video-interviews | 4/4 | 4/4 | 4/4 | 4 / 4 / 5 | 1 / 0 / 0 | reject |  |
| retail-ai-face-cameras | 4/4 | 4/4 | 4/4 | 4 / 4 / 5 | 0 / 0 / 0 | defer |  |
| salon-client-data-free-ai | 2/2 | 2/2 | 2/2 | 5 / 5 / 4 | 0 / 1 / 0 | pilot |  |

## Keyword check (secondary)

Regex hits for each planted risk anywhere in the text. A hit can be a passing mention and a miss can be a synonym, so read the judged table first.

| Scenario | Baseline | + research | Board (evidence + debate) | Verdict | Realist blocks (R2) | Seconds | Cost: board · all |
|---|---|---|---|---|---|---|---|
| bakery-price-increase | 1/1 | 1/1 | 1/1 | 1/1 | 0 | 103 | — |
| cleaning-chatbot-binding-quotes | 1/1 | 1/1 | 1/1 | 1/1 | 0 | 72 | — |
| coffee-tip-pool-managers | 1/1 | 1/1 | 1/1 | 1/1 | 1 | 89 | — |
| dental-ai-receptionist | 2/2 | 2/2 | 2/2 | 2/2 | 2 | 80 | — |
| food-truck-merchant-cash-advance | 2/2 | 2/2 | 2/2 | 2/2 | 1 | 97 | — |
| hvac-ai-promo-texts | 2/2 | 2/2 | 2/2 | 2/2 | 2 | 109 | — |
| landscaping-1099-crew | 1/1 | 1/1 | 1/1 | 1/1 | 2 | 113 | — |
| restaurant-ai-video-interviews | 2/2 | 2/2 | 2/2 | 1/2 | 1 | 96 | — |
| retail-ai-face-cameras | 2/2 | 2/2 | 2/2 | 2/2 | 0 | 73 | — |
| salon-client-data-free-ai | 1/1 | 1/1 | 1/1 | 1/1 | 0 | 75 | — |

Seconds is the board alone, in-process. Cost is what OpenRouter charged per call: the board's 12 calls, then everything in the scenario (both baselines and the judge too).
