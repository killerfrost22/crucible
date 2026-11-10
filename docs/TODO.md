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

## After submission: website backlog (review of Mon Nov 9)
Browser review of local `main` (`42c49c4`) at 320, 375, 768, 1440 and 1920 px, both themes. Numbers (G1, #5…) point to [`WEBSITE_REVIEW.md`](WEBSITE_REVIEW.md), which has the reasoning and full acceptance criteria; **New** items aren't in it.
- Re-checked in the browser and still broken: G1, #1, #2, #4, #12, #16, #18. Still in the source: G2, G3, G4, #3 wording, #10.
- Fixed since the review: the Postgres driver (#3 storage note). `backend/requirements.txt` has `asyncpg` and `sqlalchemy[asyncio]`, and the README documents `postgresql+asyncpg://`.
- Good baseline to keep: axe-core 4.10 finds 0 WCAG 2.2 A/AA violations on `/`, `/under-the-hood` and a finished dental replay, in both themes. No page scrolls sideways at any width.
- **Nov 10:** the "Before finals" list below is done in code, except the live URLs and what still has to be checked on a real deploy or an older iPhone. Each item says where it was checked (Chromium, both themes). axe-core is still at 0 violations, now also on the not-found page and the "can't reach the server" screen. No credit was spent: the meetings were replays, and the one live run was refused by the guard before any model call.

### Before finals (Tue Nov 17): anything a judge can click
- [x] **G1: advisor links no longer restart the meeting.** `App.tsx` now compares path and query only, so a `#fragment` never remounts the board. Checked on a finished dental replay: the standings links, the skip link and Back ×2 keep the verdict and a practice signature, and the recording isn't fetched again.
- [x] **New: walkthrough evidence fits on phones.** `.hm-facts li` is `2.4rem minmax(0, 1fr)`, and the "Verified host" tag wraps as a unit (`home.css`). Checked: no text overflows `.hm-win__main` on any of the six steps of either recording at 320, 360, 375, 390 or 414 px.
- [x] **#1: the hero CTA lands on the question.** `goToForm` (`Home.tsx`) scrolls to the section where it fits, otherwise to the question field. Checked: the label and box are visible below the header and the text is kept, at 375, 390, 768, 1440 and 1920 px.
- [x] **#2: the replay header fits at every width.** It also overflowed at 420–799 and 1400–1479 px. Below 800 px the labels shorten and one `2×` button steps through the speeds; the wordmark hides below 600 px and the "Recorded" badge below 560 px; the one-row header starts at 1480 px (`board.css`). Checked: no control past the header's padding, 320–2560 px.
- [x] **#4: a mistyped `/?replay=` shows "Recording not found".** `loadReplay` rejects HTML and empty bodies, and the Board shows the new `NotFound` view with links to all three recordings.
- [x] **#18: tab titles and unknown routes.** A finished meeting's tab reads "Pilot: Should we replace our front-desk phone line… — Crucible"; stopped meetings say "Meeting stopped". Unknown paths get a 404 view ("Nothing was cast here.", `components/NotFound.tsx`).
- [x] **#16: eval copy.** `/under-the-hood` now says the full eval "hasn't been run yet", with a static "Not run yet" pill. Re-quote once Ruijie commits `report.md`.
- [x] **#3 wording.** A replay signature now says "practice signature on a recording, not saved".
- [x] **#10: Industry Expert copy.** It now reads "Judges it the way a seasoned operator in your trade would." (`seats.ts`). The seat prompt in `backend/agents/crucible/seats.py` is unchanged.
- [x] **New: no more fake buttons.** The walkthrough's "Convene the board" is now a real button that steps the tour to Research. Accept/Override on the example verdict and the walkthrough's "Your call" step are now a plain caption: "Accept it, or override it with a note."
- [x] **New: the "can't reach the server" screen.** When nothing came back, only the question and one notice show ("Meeting didn't start"), with Try again / Watch a recorded session / Edit my question. The screen reader announces "The meeting stopped." "Everything the board finished is still on this page" appears only when something did finish.
- [x] **G2: no blank page without newer APIs.** `fonts.ts` uses `new Promise`, and `Brief.tsx` parses source URLs in a `try`. Checked in Chromium with both APIs deleted: home and the sourced dental replay render, with 9 source links.
  - [ ] Still check on a real older iPhone (iOS 16) or BrowserStack.
- [x] **G3: the API has a front door** (`backend/guard.py`, wired inside ADK's CORS middleware in `main.py`).
  - **Routes:** only `GET /list-apps`, session create, ratification PATCH and `/run_sse` are open. Everything else returns 404 `CRUCIBLE_NOT_FOUND`.
  - **Input checks:** a body cap (413) and strict intake and ratification checks (422). The server sets the ratification time.
  - **Limits:** per IP, 10 runs and 30 sessions an hour; 100 runs a day in total; at most 3 runs at once. All are set in `.env` (see the README table).
  - **Frontend:** it shows the server's sentence, e.g. "That's a lot of meetings from one network." The form's `maxLength` values match the caps.
  - [ ] **On deploy:** set `CRUCIBLE_CLIENT_IP_HEADER` (README, "Limits and client IPs"), then check that two networks get separate limits. The Cloud Run header choice is inferred from docs, not observed.
  - [ ] **Before finals:** decide whether 10 runs an hour per IP is enough for a room of judges behind one venue IP.
  - [ ] **Still open from G3:** server-issued ownership of sessions. Today, anyone holding both IDs can PATCH a session. This belongs with decision history below.
- [ ] **New: one hosting story, written down.** Done: the README diagram now shows OpenRouter → Claude, and `npm run build` fails without `VITE_API_BASE` (`vite.config.ts`).
  - [ ] Write the live frontend and backend URLs in the README.
  - [ ] Pick Vercel + Neon or Cloud Run, and make the Deploy section of `/under-the-hood` (it says Cloud Run + Secret Manager) and the Sat items above match.

### Next: a decision worth coming back to
- [ ] **#3 + #19: decision history.** A stable URL per decision that reopens it read-only, with no new paid run; the signed ratification shown again; a "My decisions" list (the optional Fri item above). The Postgres driver is already installed.
- [ ] **#5: the brief first, the transcript second.** In a finished dental meeting, the verdict starts about 7,150 px down at 1440 px, and past 17,000 px on a phone. Open with a summary card (decision, three reasons, strongest objection, open gates, next step, Accept/Override) and make the rounds collapsible.
- [ ] **#9: "Open source" inside the F-number preview,** plus separate labels for "source found" and "source checked".
- [ ] **#8: confidence percentages.** Label "72% confident" as the model's own estimate, or replace it with the open assumptions.
- [ ] **#7: AI tools as a comparison.** Official links, where each price came from and when, the no-new-tool option, and a pilot exit criterion. This feeds the catalog in `todo/03-barriers.md` §4.
- [ ] **#11: a data notice next to Convene.** What goes to OpenRouter and web search, what is stored, and how to delete it. Warn against entering patient, customer or payment data.
- [ ] **#10: Maryland scope.** The SBDC referral is hard-coded for every location (`Verdict.tsx:19, 179–182`). Call it a Maryland pilot, or route referrals by state.
- [ ] **#12: sessions grid.** The fourth card leaves two-thirds of a row empty at 1440 and 1920 px.
- [ ] **#6: hero copy.** Say who it's for (small-business owners) and what they leave with, not only how it works.
- [ ] **G4: error boundary and event checks.** There is no error boundary anywhere in `src/`, so one malformed event blanks the page.
- [ ] **#15: a "Skip effect" control** for the cursor build effect on `/under-the-hood`.
- [ ] **#17: code-split.** The production build is one 523 KB JS chunk (163 KB gzipped) plus 125 KB of CSS, and Vite warns about the size. Measured on a local preview with fast 3G and 4× CPU throttling: LCP 1.2 s, CLS 0. That's fine today, so lazy-load `/under-the-hood` and the meeting room before adding more effects.
- [ ] **#20 + #21: replay labels and quotes.** Label each replay with its date, models and whether web search was on (HVAC is still the old Gemini run). Build the home and explainer quotes (`src/content.ts` `FEATURED`, `underthehood/recorded.ts`) from the replay files instead of copying them by hand, so re-recording can't leave stale quotes behind.

### Keep improving: make every change checkable
- [ ] **New: CI.** There is no `.github/`, no test and no lint script. Add a GitHub Action that runs `npm ci && npm run build` in `frontend/` and builds the backend app with `python -c "import main"` in `backend/` (this passes locally today) on every push and PR. Turn on Vercel preview deploys for PRs.
- [ ] **New: browser smoke tests (Playwright).** Cover `/`, `/under-the-hood`, and each replay skipped to the verdict, at 375/768/1440/1920 px in both themes. Assert: no clipped text in the header or walkthrough, the standings links keep the verdict (G1), an unknown replay shows "not found", and axe stays at 0 violations. This automates the render step of the `AGENTS.md` review loop and most of Ruijie's UI matrix; the critique step stays human.
- [ ] **New: learn from real visitors.** There are no analytics, no feedback and no error reports today. Add cookieless page analytics (e.g., Vercel Web Analytics) and the funnel hero → form → convene → verdict → signed; a one-tap "Was this useful?" with an optional note, saved on the decision; and frontend error reporting. List all of it in the data notice (#11).
