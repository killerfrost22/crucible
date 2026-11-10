# What Crucible does differently today

Each item points to where it lives, so it can be shown in the demo or the video. The examples come from the dental recording, `frontend/public/replays/dental-ai-receptionist.sse`, re-recorded Nov 10.

| Differentiator | Where it lives | Example from the dental recording |
|---|---|---|
| Seats split by job, not department | `backend/agents/crucible/seats.py`, `frontend/src/seats.ts` | Industry Expert, AI-Tools Expert, Realist, Strategist, Devil's Advocate |
| Built-in opposition | `_devils_advocate_charge` in `seats.py` | The only seat that opposed the owner's plan in both rounds |
| Shared, labeled evidence | `researcher_instruction` in `seats.py`, `backend/agents/crucible/sources.py` | 12 facts (F1–F12). 9 have a source link, and all 9 opened when `check_sources` tried them |
| Round 1 written blind; Round 2 rebuttals name who they answer | `backend/agents/crucible/agent.py`, `frontend/src/components/SeatCard.tsx` | Each rebuttal card quotes the claim it answers |
| Realist checks: pass / flag / block | Realist output (`checks`) | 1 block (legal: all-party recording consent and a BAA on the exact plan), 3 flags, 1 pass |
| A full decision record | Chairman output | Decision, the Chairman's own confidence estimate, decisive arguments, dissent, conditions, what would change it, dated next steps, tools with a pilot test, the no-new-tool option, `escalate_to: attorney` |
| The owner decides, and can come back to it | `YourCall` and `DecisionBrief` in `frontend/src/components/Verdict.tsx`; `?decision=` in `App.tsx` | Accept or Override from the card at the top (an override needs a note); the decision reopens from its link, still signed |
| Accuracy is measured | `backend/eval/` | 10 Maryland small-business scenarios with planted risks; the bakery price increase is the control with no legal trap. The full run hasn't been done yet |
| Cheap enough for a small business | `README.md` | $0.06–0.12 (measured before Nov 10) and 75–100 seconds per decision |

## Gaps in the dental recording
These weaken the claims above. Fix them before leaning on those claims. Rechecked against the Nov 10 recording.

- [ ] **The key legal fact cites a vendor blog.** F1 (Maryland all-party recording consent) now has a source link that opened (dentalbase.ai), but it is an AI-receptionist vendor's blog, not the statute or a regulator. The most important fact in the run still rests on secondary sources. Fixed by barrier 2, the rule base.
- [ ] **Tool prices are still unknown.** The Chairman's one tool, RingCentral AI Receptionist, shows `monthly_cost: "unknown; check RingCentral pricing (F11)"`, with no price fact behind it. The AI-Tools Expert's second tool, Weave, is "$0-400/mo estimate (unverified)". The Researcher found no vendor pricing page for either. In the bakery recording, by contrast, DoorDash's price cites the DoorDash pricing page (F9). Fixed by barrier 4, the catalog.
- [x] **The AI-Tools Expert named no tools in Round 1.** Fixed in the Nov 10 recording: it names RingCentral AI Receptionist and Weave in Round 1.
- [ ] **Little disagreement among the advisors, now in every recording.** In dental, four seats open "conditional" with "pilot after-hours and overflow calls first", and even the Devil's Advocate's headline is "Don't sign up this month; run a limited pilot first." In bakery, three seats open with the same sentence word for word, and in HVAC all five open with "Don't blast the whole list; …". The board disagrees with the owner but not much with itself. Tracked in `TODO.md` ("the five seats agree from the start").
- [x] **Leftover link formatting.** None of the three Nov 10 recordings contains a stray `](`.
