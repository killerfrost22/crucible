# Crucible — team TODO

**Submitted Sun Nov 8** (video and prototype link on the designated Google Drive). **Next:** finalists are notified Mon Nov 16, and the in-person finals are Tue Nov 17, 5–8 pm. The Fri/Sat/Sun items below that are still open carry over to the finals.

| Live | URL | Checked Nov 10 |
|---|---|---|
| Frontend | https://smith26-crucible.vercel.app | auto-deploys from `main`; the live bundle already has the `4335f71` changes (not-found page, practice-signature wording) |
| Backend | https://hacks2026-corkboard-api.vercel.app | the frontend's `VITE_API_BASE`. `/list-apps` → `["crucible"]`, `/docs` → 404 `CRUCIBLE_NOT_FOUND` (the guard is live), and CORS allows the frontend origin. `smith26-crucible-api.vercel.app` answers `DEPLOYMENT_NOT_FOUND`, so don't hand that one out. |

| Who | Role |
|---|---|
| Yizhan | Developer |
| Ruijie | Tester |
| Tiffany | Video producer |

## ✅ Quota blocker resolved: OpenRouter ($25 prepaid)
- [x] The board now runs through OpenRouter: Claude Haiku 5.5 for the five seats, and Claude Sonnet 5.5 with web search for the Researcher and Chairman. Measured runs cost $0.06–0.12 and took 50–85 s. Since the Nov 10 link check and longer tool and verdict fields, four runs took 75–102 s; their cost wasn't measured. $25 covers roughly 200–400 runs. The credit is a hard cap, so a public demo link can't overspend.
- [x] Web search works, and since Nov 10 `check_sources` also opens every source link and dates it. In the current dental recording, 9 of 12 facts have a source link that opened. The board and the verdict both name Maryland's all-party recording consent and the HIPAA BAA, and the verdict requires both before any live pilot call. Leaked prompt tags (Claude Haiku once wrote `</reasoning_effort>` into an answer) are now stripped from every model answer before anyone sees it.
- [ ] Watch the balance at https://openrouter.ai/settings/credits before filming and judging. When the credit is gone the board shows "out of AI credit". Four paid runs were used on Nov 10: three re-recordings and one live test.

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
- [x] Optional: reloading the page loses the board, and the owner's ratification is saved but never shown again. Fixed Nov 10 by decision history (see the website backlog): reloading reopens the decision, and **Your decisions** lists it.
**Sat**
- [x] Deploy the backend. It went to Vercel instead of Cloud Run: https://hacks2026-corkboard-api.vercel.app.
- [x] Deploy the frontend to Vercel: https://smith26-crucible.vercel.app, with `VITE_API_BASE` pointing at the backend above.
- [ ] Prompt fixes from Ruijie's eval report. One is already known: the five seats open with the same plan (see "the five seats agree from the start" in the website backlog).
- [x] Re-record the HVAC replay with the final models. Done Nov 10: bakery, dental and HVAC were all re-recorded on the current Claude setup with web search and the link check, and `src/content.ts` (`FEATURED`) and `src/underthehood/recorded.ts` were updated to match. When you re-record again: `python eval/record_replay.py hvac-ai-promo-texts`, then update the same two files. The home page quotes are shortened, not reworded.
**Sun**
- [ ] Feature freeze at noon; final `AGENTS.md` review pass at 375/768/1440/1920.
- [x] Put the public prototype link in the submission.

## Ruijie — tester
- [ ] `python eval/run_eval.py` on all 10 scenarios (about $1–1.50); commit `eval/results/<timestamp>/report.md`. Not run yet as of Nov 10: there is no `backend/eval/results/`, and `/under-the-hood` says "Not run yet" until there is. The verdict check matches exact wording ("all-party"), so a verdict that says "attorney-approved recording notice" scores as a miss; read the transcripts before quoting numbers.
- [ ] Read every transcript (`eval/results/<timestamp>/<scenario>.json`) and log problems for Yizhan with scenario id + quote:
  - invented laws or wrong legal claims; legal claims without a fact ID that are not marked "(unverified)"
  - fact IDs (F1…) that don't match the claim
  - seats out of role (e.g., Devil's Advocate agreeing in both rounds)
  - groupthink: everyone flipping in Round 2 without a concrete `changed_because`, or (seen in all three Nov 10 recordings) all five opening with the same plan
  - `bakery-price-increase` is the control: the Realist should not block, and the Chairman should not reject on legal grounds
- [ ] Time 3 live runs end to end (target < 60 s). On Nov 10, four runs took 75–102 s, mostly the Researcher and the Chairman. Getting under 60 s needs a faster Researcher or Chairman model, or a shorter verdict.
- [ ] UI test matrix: 375 / 768 / 1440 / 1920 px; keyboard only; screen-reader phase announcements; reduced motion; all three replays; one live run; override requires a note; quota-error message keeps partial results. New since Nov 10:
  - a live meeting's URL turns into `/?decision=…`, and reloading it reopens the decision without a new run
  - the signed call survives a reload
  - **Your decisions** on the home page
  - "Decision not found" in another browser
  - Show/Hide on research and debate
  - "Open source" in the F-number preview
  - keyboard path to Accept/Override in the brief
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
- [ ] **For the finals cut:** the app footage predates Nov 10. It doesn't show the decision card at the top, a reopened decision, **Your decisions**, "Link checked" sources or the side-by-side tools, and all three recordings have since been re-recorded (the dental verdict now reads "Don't replace the front desk yet; pilot after-hours and overflow calls once gates clear."). Re-shoot the demo scenes from the new recordings.
- [ ] Team credits are a separate video, `videos/crucible-credits.mp4` (16.8 s, also appended to the end of the main cut): team cards, then music, voice and tech credits. Yizhan's card is the photo `videos/Retakes/Yizhan.HEIC`; Tiffany and Ruijie show letter tiles until we have their photos or a short clip of each. Still to add: any coaching acknowledgement (rules require it) and the AI tools used to build Crucible. On Nov 10, neither `crucible-credits.mp4` nor `videos/Retakes/` was in the `videos/` folder of the copy that was checked; find them before re-cutting for the finals.
- [x] Export and upload to the designated Google Drive before Sun 11:59 pm.

## After submission: website backlog (review of Mon Nov 9)
Browser review of local `main` (`42c49c4`) at 320, 375, 768, 1440 and 1920 px, both themes. Numbers (G1, #5…) point to [`WEBSITE_REVIEW.md`](WEBSITE_REVIEW.md), which has the reasoning and full acceptance criteria; **New** items aren't in it.
- On Nov 9 these were still broken in the browser: G1, #1, #2, #4, #12, #16, #18. These were still broken in the source: G2, G3, G4, #3 wording, #10. All but #12 and G4 were fixed on Nov 10 (see below).
- Fixed since the review: the Postgres driver (#3 storage note). `backend/requirements.txt` has `asyncpg` and `sqlalchemy[asyncio]`, and the README documents `postgresql+asyncpg://`.
- Good baseline to keep: axe-core 4.10 finds 0 WCAG 2.2 A/AA violations on `/`, `/under-the-hood` and a finished dental replay, in both themes. No page scrolls sideways at any width.
- **Nov 10:** the "Before finals" list below is done in code, except what still has to be checked on the live deploy or an older iPhone. It was committed as `4335f71`, pushed, and Vercel deployed both projects (see the Live table at the top). Each item says where it was checked (Chromium, both themes). axe-core is still at 0 violations, now also on the not-found page and the "can't reach the server" screen. No credit was spent: the meetings were replays, and the one live run was refused by the guard before any model call.
- **Nov 10, later:** #3 + #19, #5, #7, #8 and #9 from "Next" are done locally, with a backend link check and three re-recordings. One paid live meeting ran end to end. axe-core is at 0 violations on the finished replay, the saved decision, the home page with **Your decisions** and "Decision not found", in both themes. None of this is committed yet.

### Before finals (Tue Nov 17): anything a judge can click
- [x] **G1: advisor links no longer restart the meeting.** `App.tsx` now compares path and query only, so a `#fragment` never remounts the board. Checked on a finished dental replay: the standings links, the skip link and Back ×2 keep the verdict and a practice signature, and the recording isn't fetched again.
- [x] **New: walkthrough evidence fits on phones.** `.hm-facts li` is `2.4rem minmax(0, 1fr)`, and the source tag ("Link checked host" since the later Nov 10 batch) wraps as a unit (`home.css`). Checked: no text overflows `.hm-win__main` on any of the six steps of either recording at 320, 360, 375, 390 or 414 px.
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
  - **Routes:** only `GET /list-apps`, session create, ratification PATCH, `/run_sse`, and (since Nov 10) `GET` one session and `GET …/decisions` are open. Everything else returns 404 `CRUCIBLE_NOT_FOUND`.
  - **Input checks:** a body cap (413) and strict intake and ratification checks (422). The server sets the ratification time.
  - **Limits:** per IP, 10 runs and 30 sessions an hour; 100 runs a day in total; at most 3 runs at once. All are set in `.env` (see the README table).
  - **Frontend:** it shows the server's sentence, e.g. "That's a lot of meetings from one network." The form's `maxLength` values match the caps.
  - [ ] **Now, the guard is live on Vercel:** in the API project, set `CRUCIBLE_CLIENT_IP_HEADER=x-vercel-forwarded-for` and redeploy. Without it the limits key on the socket peer, which on Vercel is probably the platform's proxy rather than the visitor. If so, the 10-runs-an-hour limit is shared by everyone. Then check that two networks get separate limits. Also remember that Vercel counts limits per function instance.
  - [ ] **Before finals:** decide whether 10 runs an hour per IP is enough for a room of judges behind one venue IP.
  - [ ] **Still open from G3:** server-issued ownership of sessions. Since Nov 10 a decision link carries only the session id, and reading or changing a decision needs the owner id from the browser that made it. The owner id is still client-chosen, though, so anyone who learns both IDs can read or PATCH that session.
- [ ] **New: one hosting story, written down.** Done: hosting is Vercel for both projects, the README diagram shows OpenRouter → Claude, and `npm run build` fails without `VITE_API_BASE` (`vite.config.ts`).
  - [ ] Commit and push the later Nov 10 batch, then check it on https://smith26-crucible.vercel.app: the decision card, a reload of `/?decision=…`, **Your decisions**, and "Link checked" labels on a replay.
  - [ ] Confirm `CRUCIBLE_SESSION_DB` (Neon, `postgresql+asyncpg://…`) is set on the API project. Without it, a session created on one function instance may be missing on the one that runs the meeting.
  - [ ] Run one paid live meeting on https://smith26-crucible.vercel.app before the finals. No live meeting has been run through the deployed guard yet.
  - [x] Write the live URLs (Live table above) in the README.
  - [ ] Make the Deploy section of `/under-the-hood` match Vercel (it still says Cloud Run + Secret Manager), and list Cloud Run in the README as the alternative.

### Next: a decision worth coming back to
- [x] **#3 + #19: decision history** (Nov 10).
  - **The link:** once a live meeting's session exists, the URL becomes `/?decision=<id>`.
  - **Reopening:** a reload or the link rebuilds the board from the saved state (`GET` session), shows the signed call again, and starts no new run.
  - **Your decisions:** the home page lists this browser's decisions under **Your decisions**, from the new `GET …/decisions` route in the guard.
  - **Elsewhere:** another browser, or another owner id, gets "Decision not found".
  - **Checked:** one live meeting (tip pool → Defer), then reload → "Saved" badge and only `GET` requests, Accept → reload still signed, the home list, and the stranger case.
  - [ ] On the Vercel deploy, this needs `CRUCIBLE_SESSION_DB` (Neon), or a reload can land on an instance without the session.
  - [ ] A meeting that stopped early reopens as stopped, with "Convene a new meeting on this question". Nothing resumes a run that was cut off.
- [x] **#5: the brief first** (Nov 10).
  - **The card:** under the question, a card shows the decision, up to three reasons, the strongest objection, open gates (including a Realist block), the first next step and **Your call**. From tablet width, your call sits beside the reasons.
  - **Where Your call lands (finished replay):** about 900 px down at 1440 (the verdict used to start about 7,150 px down), about 1,250 px at 768, and about 2,500 px on a phone (it used to be past 17,000).
  - **Folding:** research and debate have Show/Hide, open by default.
- [x] **#9: source labels** (Nov 10).
  - **Link check:** a new backend node, `check_sources`, opens every source link (SSRF-safe, 8 s cap) and stamps it `ok`/`broken`/`unreachable` with the date.
  - **Labels:** facts read "Link checked Nov 10", "Couldn't open link", "Link broken", "Source found" (older recordings) or "No source". The F-number preview has **Open source**.
  - **What it proves:** "link checked" means the page loaded, not that it backs the claim. The page says so.
- [x] **#8: confidence** (Nov 10). It is shown as "Chairman's own estimate: 72%", with "That's the AI's estimate, not a measured probability" in the brief, plus a new **What would change this** list (1–3 findings).
- [x] **#7: AI tools side by side** (Nov 10).
  - **Each tool shows:** the official link, its cost and where the price came from (a cited fact with its link check, or "AI estimate, not from a source"), works-with, a caveat and a **pilot test** (keep-or-stop rule with a date).
  - **Also on the card:** the **No new tool** option, using the tools the owner already has.
  - **Example:** in the bakery recording, DoorDash's price cites F9, the DoorDash pricing page, with the link checked.
  - [ ] Dental's RingCentral and HVAC's Housecall Pro have no price fact yet: the Researcher found no vendor pricing page. The catalog in `todo/03-barriers.md` §4 is what would fill that gap.
- [ ] **New: the five seats agree from the start.** In all three Nov 10 recordings the five Round 1 headlines are nearly the same plan.
  - **Bakery:** three seats wrote "Don't sign the Route 1 lease yet; test delivery and a manager first." word for word.
  - **HVAC:** all five open with "Don't blast the whole list; …".
  - **Dental:** even the Devil's Advocate opens with "Don't sign up this month; run a limited pilot first."
  - **Why it matters:** the debate only starts in Round 2, which weakens "argued from five sides". The fix is in each seat's charge in `backend/agents/crucible/seats.py`. Ideas:
    - give each seat a question only it answers;
    - make the Devil's Advocate argue against whatever plan the others are likely to reach, not only against the owner's leaning.
  - **Check:** re-record and compare the Round 1 headlines.
- [ ] **#11: a data notice next to Convene.** What goes to OpenRouter and web search, what is stored, and how to delete it. Warn against entering patient, customer or payment data. Since Nov 10, also say that decisions are saved, and can be reopened only from this browser (its owner id is in local storage). Clearing site data loses access to them, but the decisions themselves stay on the server.
- [ ] **#10: Maryland scope.** The SBDC referral is hard-coded for every location (`Verdict.tsx:19, 179–182`). Call it a Maryland pilot, or route referrals by state.
- [ ] **#12: sessions grid.** The fourth card leaves two-thirds of a row empty at 1440 and 1920 px.
- [ ] **#6: hero copy.** Say who it's for (small-business owners) and what they leave with, not only how it works.
- [ ] **G4: error boundary and event checks.** There is no error boundary anywhere in `src/`, so one malformed event blanks the page.
- [ ] **#15: a "Skip effect" control** for the cursor build effect on `/under-the-hood`. While the effect runs, axe also flags the advisor-name labels on the cursors for contrast (1.1–1.3:1).
- [ ] **#17: code-split.** The production build is one 540 KB JS chunk (168 KB gzipped) plus 134 KB of CSS (26 KB gzipped), measured Nov 10. Vite warns about the size. On Nov 9, with a local preview, fast 3G and 4× CPU throttling, LCP was 1.2 s and CLS 0. That's fine today, so lazy-load `/under-the-hood` and the meeting room before adding more effects.
- [ ] **#20 + #21: replay labels and quotes.** All three recordings are now from Nov 10 on the current setup with web search. Still to do: label each replay with its date and models, and build the home and explainer quotes (`src/content.ts` `FEATURED`, `underthehood/recorded.ts`) from the replay files instead of copying them by hand.

### Keep improving: make every change checkable
- [ ] **New: CI.** There is no `.github/`, no test and no lint script. Add a GitHub Action that runs `npm ci && npm run build` in `frontend/` and builds the backend app with `python -c "import main"` in `backend/` (this passes locally today) on every push and PR. Turn on Vercel preview deploys for PRs.
- [ ] **New: browser smoke tests (Playwright).** Cover `/`, `/under-the-hood`, and each replay skipped to the verdict, at 375/768/1440/1920 px in both themes.
  - **Assert:**
    - no clipped text in the header, walkthrough, decision card or tool cards;
    - the standings links keep the verdict (G1);
    - an unknown replay shows "not found";
    - `/?decision=<unknown>` shows "Decision not found";
    - a saved decision (seeded with `CRUCIBLE_SESSION_DB=memory://`) reopens with its signed call and starts no `/run_sse`;
    - axe stays at 0 violations.
  - **Why:** this automates the render step of the `AGENTS.md` review loop and most of Ruijie's UI matrix; the critique step stays human.
- [ ] **New: learn from real visitors.** There are no analytics, no feedback and no error reports today. Add cookieless page analytics (e.g., Vercel Web Analytics) and the funnel hero → form → convene → verdict → signed; a one-tap "Was this useful?" with an optional note, saved on the decision; and frontend error reporting. List all of it in the data notice (#11).
