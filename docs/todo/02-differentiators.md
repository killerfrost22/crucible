# What Crucible does differently today

Each item points to where it lives, so it can be shown in the demo or the video. The examples come from the dental recording, `frontend/public/replays/dental-ai-receptionist.sse`.

| Differentiator | Where it lives | Example from the dental recording |
|---|---|---|
| Seats split by job, not department | `backend/agents/crucible/seats.py`, `frontend/src/seats.ts` | Industry Expert, AI-Tools Expert, Realist, Strategist, Devil's Advocate |
| Built-in opposition | `_devils_advocate_charge` in `seats.py` | The only seat that opposed the owner's plan in both rounds |
| Shared, labeled evidence | `researcher_instruction` in `seats.py` | 13 facts (F1–F13), 9 of them verified with a source link |
| Round 1 written blind; Round 2 rebuttals name who they answer | `backend/agents/crucible/agent.py`, `frontend/src/components/SeatCard.tsx` | Each rebuttal card quotes the claim it answers |
| Realist checks: pass / flag / block | Realist output (`checks`) | 2 blocks (recording consent, BAA), 3 flags, 1 pass |
| A full decision record | Chairman output | Decision, confidence, decisive arguments, dissent, conditions, dated next steps, AI tools, `escalate_to: attorney` |
| The owner decides | `YourCall` in `frontend/src/components/Verdict.tsx` | Accept or Override; an override needs a note |
| Accuracy is measured | `backend/eval/` | 10 Maryland small-business scenarios with planted risks; the bakery price increase is the control with no legal trap |
| Cheap enough for a small business | `README.md` | $0.06–0.12 and 50–85 seconds per decision |

## Gaps in the dental recording
These weaken the claims above. Fix them before leaning on those claims.

- [ ] **The key legal fact has no source.** F1 (Maryland all-party recording consent) is `verified: false` and has no source. The board handles this honestly: it marks the fact unverified and sends the owner to an attorney. But the most important fact in the run rests on the model's memory. Fixed by barrier 2, the rule base.
- [ ] **Tool prices are blank.** Both tools the board names (RingCentral AI Receptionist, Smith.ai) show `monthly_cost: "unknown; quote required"`. Fixed by barrier 4, the catalog.
- [ ] **The AI-Tools Expert named no tools in Round 1** (`tools: []`). It named two only in Round 2.
- [ ] **Little disagreement among the advisors.** All five opened with the same headline: pilot first, don't replace the front desk. The board disagrees with the owner but not much with itself. `TODO.md` already has Ruijie checking for groupthink; this is a concrete case.
- [ ] **Leftover link formatting.** The Devil's Advocate's Round 1 pushback ends `…any AI tool.](Confirm with your accountant…`. If the UI shows the pushback text, the stray `](` appears on screen.
