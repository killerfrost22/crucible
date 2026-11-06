# Crucible — team TODO

**Video + prototype link due Sun Nov 8, 11:59 pm** (designated Google Drive). Finalists notified Mon Nov 16; in-person finals Tue Nov 17, 5–8 pm.

| Who | Role |
|---|---|
| Yizhan | Developer |
| Ruijie | Tester |
| Tiffany | Video producer |

## 🚧 Blocker — do first (Yizhan)
- [ ] **Enable billing on the Google AI Studio project behind `GEMINI_API_KEY`** and set a budget alert. The free tier allows ~20 requests/day/model (one board run = 12) and has **zero** quota for `gemini-4-argon` and for Google Search grounding. Until this is done, testing and judging will run out of quota within a run or two.
- [ ] After billing: set `CRUCIBLE_CHAIR_MODEL=gemini-4-argon` and `CRUCIBLE_WEB_SEARCH=true`, run one board, and confirm the Researcher returns `verified: true` facts with URLs. (This web-search code path has **not** been exercised yet because the free tier blocks it.)

## ✅ Done (Fri)
- [x] Backend: ADK 2.13 graph workflow — Researcher → 5 seats (Round 1) → 5 rebuttals (Round 2) → Chairman, all with structured output; FastAPI app with CORS; owner ratification stored via session PATCH. Full run verified end to end (~20–65 s on flash-lite models).
- [x] Eval harness `backend/eval/run_eval.py` + 10 trap scenarios (`backend/eval/scenarios.json`), board vs. single-prompt baseline. Smoke-run on one scenario.
- [x] Replay recorder `backend/eval/record_replay.py`; real runs in `frontend/public/replays/`: dental receptionist, HVAC promo texts, plus a real quota-failure run for testing the error screen.
- [x] Cloud Run `Dockerfile` (not built yet — no Docker locally).
- [x] Frontend (`frontend/`): Crucible front page in the prototype's style. On first visit it builds itself with six named advisor cursors, then shows a real recorded HVAC session, the seats, the rounds, a verdict, and the intake form. The meeting page is a cork board with pinned seat cards, rebuttal notes, red string, the Chairman's stamp, and fact cross-highlighting. Replay and live modes both work, plus accept/override, quota and network error screens, phone-to-1920 layouts, and reduced motion. Checked in a browser with replays and a live run (form → session → `/run_sse` → verdict → PATCH ratify → back to the form).
- [x] Renamed Corkboard → Crucible across the backend (`agents/crucible`, `CRUCIBLE_*` env vars, `/apps/crucible/...`), frontend, and docs. The repo folder is still `hacks2026-Corkboard`.

## Yizhan — developer
**Fri**
- [ ] Billing blocker above.
- [ ] Optional: reloading the page loses the board, and the owner's ratification is saved but never shown again. A "My decisions" list (`GET /apps/crucible/users/{user}/sessions`) would fix both.
**Sat**
- [ ] Deploy backend to Cloud Run: `gcloud run deploy crucible-api --source backend --region us-east1 --min-instances 1 --max-instances 1 --set-env-vars ...` (one instance keeps sessions consistent; see README).
- [ ] Deploy frontend to Vercel with `VITE_API_BASE=<Cloud Run URL>`; add the Vercel origin to `CRUCIBLE_ALLOW_ORIGINS`.
- [ ] Prompt fixes from Ruijie's eval report. Known gap: Maryland's all-party call-recording consent (dental scenario) is caught inconsistently. On `gemini-3.1-flash-lite` after the Researcher was told to check state rules separately, it was caught in 1 of 2 runs (the single-prompt baseline: 0 of 1). The current dental replay misses it. Re-test on the billed models with web search before re-recording.
- [ ] Re-record the demo replays with the final models: `python eval/record_replay.py <scenario-id>`.
**Sun**
- [ ] Feature freeze at noon; final `AGENTS.md` review pass at 375/768/1440/1920.
- [ ] Put the public prototype link in the submission.

## Ruijie — tester
- [ ] Once billing is on: `python eval/run_eval.py` on all 10 scenarios; commit `eval/results/<timestamp>/report.md` (Tiffany needs this table for the video).
- [ ] Read every transcript (`eval/results/<timestamp>/<scenario>.json`) and log problems for Yizhan with scenario id + quote:
  - invented laws or wrong legal claims; legal claims without a fact ID that are not marked "(unverified)"
  - fact IDs (F1…) that don't match the claim
  - seats out of role (e.g., Devil's Advocate agreeing in both rounds)
  - groupthink: everyone flipping in Round 2 without a concrete `changed_because`
  - `bakery-price-increase` is the control: the Realist should not block, and the Chairman should not reject on legal grounds
- [ ] Time 3 live runs end to end (target < 60 s).
- [ ] UI test matrix: 375 / 768 / 1440 / 1920 px; keyboard only; screen-reader phase announcements; reduced motion; both replays; one live run; override requires a note; quota-error message keeps partial results.
- [ ] Poke single runs in ADK's dev UI: `cd backend && .venv/Scripts/adk web agents` → http://127.0.0.1:8000 (stop the API first, or add `--port 8001`).

## Tiffany — video producer (10 minutes)
The challenge requires: MVP proof of concept · how we built it · how we'd use 16 weeks · evidence it's technically possible and valuable · visible contribution from each member.
- [ ] Interview 3–5 small-business owners (Fri/Sat). Ask: the last hard decision they made, who they asked, whether they'd trust an AI board, what would make them act on its advice. Get permission to quote them.
- [ ] Script, suggested timing:
  - 0:00–0:45 Problem, opened with an owner quote
  - 0:45–1:30 The board: 5 seats + Chairman; the owner makes the call
  - 1:30–5:00 Demo: dental replay (Realist block, Devil's Advocate, rebuttal strings, verdict, ratify) + one live run
  - 5:00–6:30 How we built it (Yizhan): architecture diagram from README
  - 6:30–7:45 Evidence (Ruijie): eval table, board vs. single prompt
  - 7:45–9:15 16-week plan: outcome tracking, real business data (QuickBooks/Square), live Maryland SBDC hand-off, verified AI-tool catalog, multilingual intake
  - 9:15–10:00 Team and close
- [ ] Screen-record the replay mode (identical every take) plus one live run as proof.
- [ ] Open on the front page building itself (the six advisor cursors). Use the "Replay effect" button (bottom right) for retakes. It only plays when the OS "reduce motion" setting is off.
- [ ] Credits slide: acknowledge any coaching (rules require it) and the AI tools used to build Crucible.
- [ ] Export and upload to the designated Google Drive before Sun 11:59 pm.
