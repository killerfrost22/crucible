# Eval 20261110-221043

Seat model `openrouter/anthropic/claude-haiku-5.5`, researcher `openrouter/anthropic/claude-sonnet-5.5:online`, chair `openrouter/anthropic/claude-sonnet-5.5`, web search on. Judge `openrouter/anthropic/claude-sonnet-5.5`.

## Final answers, graded blind

Three answers per scenario, shuffled and unlabeled, with fact IDs removed: **Baseline** is one plain prompt to the Chairman's model; **Baseline + research** is the same prompt given the board's own research; **Board** is the Chairman's verdict. Per planted risk: 2 = the recommendation is gated on it or changed by it, 1 = mentioned only, 0 = absent. Actionable is 1–5. Errors counts claims the judge is confident are wrong.

**Risk points:** Baseline 4/4 (100%) · Baseline + research 4/4 (100%) · Board 4/4 (100%)

| Scenario | Risks: Baseline | + research | Board | Actionable B / B+R / Board | Errors B / B+R / Board | Decision | Notes |
|---|---|---|---|---|---|---|---|
| bakery-price-increase | 2/2 | 2/2 | 2/2 | 4 / 4 / 4 | 0 / 0 / 0 | defer | invented blocker: none |
| cleaning-chatbot-binding-quotes | 2/2 | 2/2 | 2/2 | 5 / 4 / 4 | 0 / 0 / 0 | pilot |  |

## Keyword check (secondary)

Regex hits for each planted risk anywhere in the text. A hit can be a passing mention and a miss can be a synonym, so read the judged table first.

| Scenario | Baseline | + research | Board (evidence + debate) | Verdict | Realist blocks (R2) | Seconds | Cost: board · all |
|---|---|---|---|---|---|---|---|
| bakery-price-increase | 1/1 | 1/1 | 1/1 | 1/1 | 0 | 79 | $0.12 · $0.19 |
| cleaning-chatbot-binding-quotes | 1/1 | 1/1 | 1/1 | 1/1 | 0 | 76 | $0.12 · $0.18 |

Seconds is the board alone, in-process. Cost is what OpenRouter charged per call: the board's 12 calls, then everything in the scenario (both baselines and the judge too).
