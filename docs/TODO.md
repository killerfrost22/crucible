# Crucible — team TODO

**Video + prototype link due Sun Nov 8, 11:59 pm** (designated Google Drive). Finalists notified Mon Nov 16; in-person finals Tue Nov 17, 5–8 pm.

| Who | Role |
|---|---|
| Yizhan | Developer |
| Ruijie | Tester |
| Tiffany | Video producer |

## ✅ Quota blocker resolved: OpenRouter ($25 prepaid)
- [x] The board now runs through OpenRouter: Claude Haiku 5.5 for the five seats, and Claude Sonnet 5.5 with web search for the Researcher and Chairman. Measured runs cost $0.06–0.12 and take 50–85 s, so $25 covers roughly 200–400 runs. The credit is a hard cap, so a public demo link can't overspend.
- [x] Web search works: Researcher facts come back marked `verified` with source links. Current dental recording: 9 of 13 facts verified; the board and the verdict both name Maryland's all-party recording consent and the HIPAA BAA, and the verdict requires a signed BAA and counsel-approved recording notice before the first live call. Leaked prompt tags (Claude Haiku once wrote `</reasoning_effort>` into an answer) are now stripped from every model answer before anyone sees it.
- [ ] Watch the balance at https://openrouter.ai/settings/credits before filming and judging. When the credit is gone the board shows "out of AI credit".

## ✅ Done (Fri)
- [x] Backend: ADK 2.13 graph workflow — Researcher → 5 seats (Round 1) → 5 rebuttals (Round 2) → Chairman, all with structured output; FastAPI app with CORS; owner ratification stored via session PATCH. Full run verified end to end (~20–65 s on flash-lite models).
- [x] Eval harness `backend/eval/run_eval.py` + 10 trap scenarios (`backend/eval/scenarios.json`), board vs. single-prompt baseline. Smoke-run on one scenario.
- [x] Replay recorder `backend/eval/record_replay.py` (scenario ids or demo intake files in `eval/demos/`); real runs in `frontend/public/replays/`: bakery second location (demo-video meeting), dental receptionist, HVAC promo texts, plus a real quota-failure run for testing the error screen. Replays can be paused.
- [x] Cloud Run `Dockerfile` (not built yet — no Docker locally).
- [x] Frontend (`frontend/`), three pages with light and dark modes (toggle in every header; follows the OS setting until you pick):
  - **Home `/`**: GitHub-style layout with the hero question box, a tabbed walkthrough of a real recorded meeting (the demo-video bakery meeting by default; the window's title bar switches to the HVAC meeting, and the hero pill, board cards, example verdict and "Watch a session" follow the choice), the six advisors, an example verdict, recorded sessions, and the full question form.
  - **How it's built `/under-the-hood`**: the "built by many hands" page (six advisor cursors assemble it), now explaining the pipeline, models, structured outputs, streaming, evaluation, frontend, and deploy, using real data from the recordings.
  - **Meeting**: the crucible (melt, refining, pour, cast verdict, the owner's hallmark), now also in a daylight theme.
  - Replay and live modes, accept/override, error screens, phone-to-1920 layouts, and reduced motion all work. Checked in a browser in both themes.
- [x] Renamed Corkboard → Crucible across the backend (`agents/crucible`, `CRUCIBLE_*` env vars, `/apps/crucible/...`), frontend, and docs. The repo folder is still `hacks2026-Corkboard`.

## Yizhan — developer
**Fri**
- [ ] Optional: try a different company per seat for the pitch ("five different AIs argue it out"). It's one `.env` line per seat; see `.env.example`.
- [ ] Optional: reloading the page loses the board, and the owner's ratification is saved but never shown again. A "My decisions" list (`GET /apps/crucible/users/{user}/sessions`) would fix both.
**Sat**
- [ ] Deploy backend to Cloud Run: `gcloud run deploy crucible-api --source backend --region us-east1 --min-instances 1 --max-instances 1 --set-env-vars ...` (one instance keeps sessions consistent; see README).
- [ ] Deploy frontend to Vercel with `VITE_API_BASE=<Cloud Run URL>`; add the Vercel origin to `CRUCIBLE_ALLOW_ORIGINS`.
- [ ] Prompt fixes from Ruijie's eval report.
- [ ] Re-record the HVAC replay with the final models. The home page quotes the HVAC and bakery recordings in `src/content.ts` (`FEATURED`), shortened but not reworded, so update that file whenever you re-record either: `python eval/record_replay.py hvac-ai-promo-texts`. The dental recording is also quoted on `/under-the-hood` (`src/underthehood/recorded.ts`); update that file whenever you re-record dental.
**Sun**
- [ ] Feature freeze at noon; final `AGENTS.md` review pass at 375/768/1440/1920.
- [ ] Put the public prototype link in the submission.

## Ruijie — tester
- [ ] `python eval/run_eval.py` on all 10 scenarios (about $1–1.50); commit `eval/results/<timestamp>/report.md` (Tiffany needs this table for the video). The verdict check matches exact wording ("all-party"), so a verdict that says "attorney-approved recording notice" scores as a miss; read the transcripts before quoting numbers.
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
- [x] 9:08 cut in `videos/`: `crucible-demo.mp4` (burned-in captions), `crucible-demo-no-captions.mp4`, `crucible-demo.srt`, 16 per-scene clips in `videos/segments/` (voice only), `videos/stems/` (voice + music), and the voiceover with a timed edit/voice script in `videos/voiceover/script.md`. Narrator is a bright female ElevenLabs voice (Jessica); other candidates are in `videos/voiceover/narrator-samples/`. App scenes are recorded at 2560×1440 with a larger UI and reframed in post: push-ins on the card, fact or form field being discussed, a visible cursor for clicks and hovers, and each advisor's spoken sentence highlighted on its card in its seat color. Yizhan's on-camera scenes are the Nov 8 retakes in `videos/Retakes/`: scene2 (the problem) with the full-screen comparison/chatbot graphic over the middle, scene3 (meet Crucible, cutting to the crucible melt during the metaphor), Scene4 (meet the board, each advisor's card cut in as he names it, then the advisor materializes as a hologram in one of the empty chairs, tracked to the handheld camera; the narrator then adds the AI-Tools Expert and the Researcher), back-to-maria (Maria at the iPad, opening "Ask the board"), how it works (whiteboard, now including the OpenRouter line) and why it matters and what's next. scene1 (Maria at 2 a.m.) from `Crucible-videos/` stays under the cold open. Crossfades, chapter labels, a "Yizhan Ao" lower third when he introduces himself, and Kevin MacLeod music (CC BY 4.0) ducked about 16 dB under speech; soundtrack at −16 LUFS. Build scripts: `.videobuild/rt/` next to the repo (`holo.py` draws the board holograms).
- [x] The close now says "Built by Yizhan, Tiffany and Ruijie": narrator line re-voiced (Jessica, spelled "Yee-jahn" so it matches his own pronunciation), close card and captions updated. No "Joseph" is left on screen, in the audio or in the captions.
- [ ] Still needed: one live run as proof (the cut only shows a live meeting starting), owner quotes, Tiffany and Ruijie on camera for their parts. `videos/segments/` are clean, so cut new footage in wherever it fits.
- [ ] Team credits are a separate video, `videos/crucible-credits.mp4` (16.8 s, also appended to the end of the main cut): team cards, then music, voice and tech credits. Yizhan's card is the photo `videos/Retakes/Yizhan.HEIC`; Tiffany and Ruijie show letter tiles until we have their photos or a short clip of each. Still to add: any coaching acknowledgement (rules require it) and the AI tools used to build Crucible.
- [ ] Export and upload to the designated Google Drive before Sun 11:59 pm.
