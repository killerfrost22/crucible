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
- [x] The board now runs through OpenRouter: Claude Haiku 5.5 for the five seats, and Claude Sonnet 5.5 with web search for the Researcher and Chairman. A meeting costs about $0.12, summed from OpenRouter's per-call charges for two eval meetings on Nov 10. The board alone takes 72–120 s. $25 covers roughly 200 meetings. The credit is a hard cap, so a public demo link can't overspend.
- [x] Web search works, and since Nov 10 `check_sources` also opens every source link and dates it. In the current dental recording, 9 of 12 facts have a source link that opened. The board and the verdict both name Maryland's all-party recording consent and the HIPAA BAA, and the verdict requires both before any live pilot call. Leaked prompt tags (Claude Haiku once wrote `</reasoning_effort>` into an answer) are now stripped from every model answer before anyone sees it.
- [ ] Watch the balance at https://openrouter.ai/settings/credits before judging. When the credit is gone the board shows "out of AI credit". On Nov 12, **$13.03 of the key's $25 cap was left** (about 100 meetings). **The key expires Nov 22**, after the finals; renew it if the site should keep working.

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
- [x] Prompt fixes from Ruijie's eval report (Nov 10): see "Read every transcript" under Ruijie and the eval item under "Keep improving". The changes are in `seats.py` and `schemas.py`.
- [x] Re-record the HVAC replay with the final models. Done Nov 10: bakery, dental and HVAC were all re-recorded on the current Claude setup with web search and the link check. When you re-record again (`python eval/record_replay.py hvac-ai-promo-texts`), the home page quotes, the `/under-the-hood` dental data and the recording labels update from the file on their own (see #20 + #21 below).
**Sun**
- [ ] Feature freeze at noon; final `AGENTS.md` review pass at 375/768/1440/1920.
- [x] Put the public prototype link in the submission.

## Ruijie — tester
- [x] **Run the eval on all 10 scenarios** (Nov 10): [`backend/eval/results/20261110-210818/report.md`](../backend/eval/results/20261110-210818/report.md), with every transcript next to it.
  - **Keyword check:** the plain single prompt scored the same as the board on every planted risk. The only miss was a regex miss: the restaurant verdict says "facial templates", not "facial recognition".
  - **Graded blind:** the harness now also grades the final answers (see "Keep improving" below). Risk points: baseline 29/30, baseline + research 30/30, board 30/30. Actionable (1–5): 4.1 / 4.4 / 4.6. Confident errors: 5 / 5 / 2.
  - **What this means:** with Claude Sonnet 5.5, one prompt catches these traps too. Don't quote "board 2 of 2, one prompt 0 of 2": that was an early test on a lightweight model.
- [x] **Read every transcript and log problems for Yizhan** (Nov 10): [`review.md`](../backend/eval/results/20261110-210818/review.md), 101 entries, each with the field, a verbatim quote (all 114 quotes checked against the transcripts by script) and a fix.
  - **Patterns:**
    - a fact ID cited for a claim the fact doesn't make (30 entries, 9 of 10 scenarios);
    - all five seats opening with the same plan, with the Devil's Advocate repeating the consensus (10 of 10);
    - overstated legal claims, e.g. "may" read as "must", a penalty on another company presented as a duty, or an amended bill presented as law (8 of 10);
    - the Chairman crediting a point to the wrong seat (3);
    - a must-catch risk left in the escalation note instead of the conditions (3);
    - JSON fragments inside Round 1 "Question this" text (17 strings, 9 of 10).
  - **The control** (`bakery-price-increase`) mostly passes: no Realist block, and the verdict is defer, not reject. But it adds an attorney check on a pricing law its own fact says doesn't apply.
  - **Read by hand:** the single prompt was about as good in most scenarios and better in a few. The board was better on local detail and on turning risks into conditions.
  - **Fixes:** all of the patterns above are fixed, in `seats.py` and `schemas.py` (see "Keep improving" below).
- [x] **Time the runs** (Nov 10). The target of under 60 s is not met.
  - **Board alone, in-process:** the 10 eval scenarios took 72–113 s (median 92).
  - **Live meeting:** one through the browser took 103 s end to end.
  - **Why:** the Researcher's web search and the Chairman take most of the time. Getting under 60 s needs a faster Researcher or Chairman model, or a shorter verdict. That's a quality trade, so it's left for Yizhan to decide.
- [x] **UI test matrix** (Nov 10, Chromium; one paid live meeting, about $0.10). Everything passed except three items, which are fixed:
  - **Covered:**
    - all three replays play to the end at 4×, and the screen reader hears each phase, ending with "The Chairman recommends: …";
    - the quota-error recording keeps the research and all five seats, with the notice as `role="alert"`;
    - reduced motion: the walkthrough doesn't auto-advance, nothing waits hidden, `/under-the-hood` starts with the effect off, and the verdict shows at once;
    - keyboard only, from the hero question through the form to **Convene the board**, past the data notice;
    - a live meeting (nail salon, Rockville) took 103 s; its URL became `/?decision=…`, and a reload reopened it with two GETs and no new run;
    - the signed call survives a reload and shows in **Your decisions**; a different browser id gets "Decision not found";
    - Override focuses the note, an empty note is refused with the focus back on it, and Show/Hide on research and debate work by keyboard;
    - no page scrolls sideways at 375, 768, 1440 or 1920 px.
  - **Fixed:**
    - **F-chips too tight:** axe found two F-chips in a Realist note less than 24 px apart (WCAG 2.5.8). Small notes that hold a chip now get a 24 px line pitch (`cards.css`).
    - **Open source unreachable by keyboard:** a pinned F-number preview sits at the end of the page, so Tab couldn't reach its **Open source** link. Pinned with Enter, the preview now takes focus; Tab past either end, Escape or ✕ returns to the chip. A mouse click still leaves focus where it was (`Notices.tsx`, `facts.tsx`).
    - **Too many stops before Accept:** reaching Accept took 15 Tab presses through the brief's F-chips. A second skip link, **Skip to your call**, appears once there's a verdict.
  - **After the fixes:** axe-core reports 0 violations on the live decision and all three replays, at 375 and 1440 px.
- [x] **ADK dev UI** (Nov 10): it starts and lists the `crucible` app on port 8001. In this checkout the `adk.exe` launcher points at the folder the `.venv` was first created in, so the README now gives `.venv/Scripts/python.exe -m google.adk.cli web --port 8001 agents` as the fallback. The eval transcripts show the same events and state, so no paid run was done in the dev UI.

## Tiffany — video producer
**The video is submitted (Nov 8), so there is no more video production.** The unticked video items below are closed as not needed; they stay here only as a record of what the cut contains.
- [ ] Optional, for the finals pitch: interview 3–5 small-business owners. Ask: the last hard decision they made, who they asked, whether they'd trust an AI board, what would make them act on its advice. Get permission to quote them. A real owner quote would open slide 3 of the deck better than the made-up "Maria". This needs people, so nobody on the AI side can do it.
- [x] ~~Script~~: done. The 9:08 cut follows `videos/voiceover/script.md`.
- [x] 9:08 cut in `videos/`: `crucible-demo.mp4` (burned-in captions), `crucible-demo-no-captions.mp4`, `crucible-demo.srt`, 16 per-scene clips in `videos/segments/` (voice only), `videos/stems/` (voice + music), and the voiceover with a timed edit/voice script in `videos/voiceover/script.md`. Narrator is a bright female ElevenLabs voice (Jessica); other candidates are in `videos/voiceover/narrator-samples/`. App scenes are recorded at 2560×1440 with a larger UI and reframed in post: push-ins on the card, fact or form field being discussed, a visible cursor for clicks and hovers, and each advisor's spoken sentence highlighted on its card in its seat color. Yizhan's on-camera scenes are the Nov 8 retakes in `videos/Retakes/`: scene2 (the problem) with the full-screen comparison/chatbot graphic over the middle, scene3 (meet Crucible, cutting to the crucible melt during the metaphor), Scene4 (meet the board, each advisor's card cut in as he names it, then the advisor materializes as a hologram in one of the empty chairs, tracked to the handheld camera; the narrator then adds the AI-Tools Expert and the Researcher), back-to-maria (Maria at the iPad, opening "Ask the board"), how it works (whiteboard, now including the OpenRouter line) and why it matters and what's next. scene1 (Maria at 2 a.m.) from `Crucible-videos/` stays under the cold open. Crossfades, chapter labels, a "Yizhan Ao" lower third when he introduces himself, and Kevin MacLeod music (CC BY 4.0) ducked about 16 dB under speech; soundtrack at −16 LUFS. Build scripts: `.videobuild/rt/` next to the repo (`holo.py` draws the board holograms).
- [x] The close now says "Built by Yizhan, Tiffany and Ruijie": narrator line re-voiced (Jessica, spelled "Yee-jahn" so it matches his own pronunciation), close card and captions updated. No "Joseph" is left on screen, in the audio or in the captions.
- [x] ~~Still needed: a live run as proof, owner quotes, Tiffany and Ruijie on camera~~: not needed, the video is submitted. For the finals, slide 6 of the deck is a live demo instead.
- [x] ~~Re-shoot the demo scenes from the Nov 10 recordings~~: not needed. The live demo at the finals shows the current site.
- [x] ~~Team credits video~~: not needed. The coaching acknowledgement and the AI-tools credit belong on the deck's last slide now (see the Finals presentation section).
- [x] Export and upload to the designated Google Drive before Sun 11:59 pm.

## Finals presentation (Tue Nov 17)
- [x] Deck: `docs/finals/crucible-finals.pptx` (brand fonts embedded) and `crucible-finals.pdf`. 14 slides, about 10 minutes plus a 2–3 minute live demo (slide 6). Each slide's notes have a suggested speaker (Tiffany 1–3 and 12–13, Yizhan 4–6 and 11, Ruijie 7–10) and a script; the last slide's notes list likely judge questions with answers. The deck is generated by `.deckbuild/build_deck.py` (outside the repo, next to it); re-run it and `render.ps1` rather than editing the PPTX by hand, or the next build overwrites the edits.
- [x] **Nov 12 rebuild:**
  - **Slide 10 (Evidence)** now shows the blind-graded full run ([`report.md`](../backend/eval/results/20261110-214837/report.md)): planted risks 28 / 30 / 30 of 30, confident errors 4 / 3 / 0, actionable 4.1 / 4.3 / 4.6, for one prompt, one prompt with the board's research, and the board. It says one prompt catches most traps too, and what reading the transcripts fixed. The early "0 of 2 / 2 of 2" is gone. The build reads the numbers from `report.md` and stops if they change.
  - **Slides 5 and 11:** about 90 s and about $0.12 a meeting (was 50–85 s and $0.06–0.12).
  - **Slide 7** shows the decision brief's "Before you proceed" instead of the Realist card; **slide 6** shows the current home page; the demo notes walk through the decision brief, **Accept the conditional plan** and **Print / Save as PDF**.
  - **Slide 4:** the Devil's Advocate "argues against whatever the board is most likely to agree on", matching the Nov 10 prompt.
  - **Slide 12:** competitor facts re-checked Nov 12. Ask the AI Council is unchanged (Chairman + operations, growth, innovation, finance; free to try, Pro $29.99) but now also says "one chatbot gives you one agreeable answer", so the notes lean on sources and the legal check. Claude for Small Business: "by default" you approve each action; you can also let a workflow run on its own.
  - The hand edits made to slides 10, 12 and 13 in the PPTX on Nov 10 (the FIXED line, "Free to try", "a required dissenting seat") are now in the build script. Any speaker-note edits made by hand that night were overwritten.
- [ ] Slides 3, 7, 8 and 9 quote the recordings. The build stops if a quote is no longer in its recording; re-check the slides whenever a replay is re-recorded.
- [ ] If the rules require the coaching acknowledgement and the AI-tools credit (see the credits item above), add them to the last slide. This needs the names from the team.

## After submission: website backlog (review of Mon Nov 9)
Browser review of local `main` (`42c49c4`) at 320, 375, 768, 1440 and 1920 px, both themes. Numbers (G1, #5…) point to [`WEBSITE_REVIEW.md`](WEBSITE_REVIEW.md), which has the reasoning and full acceptance criteria; **New** items aren't in it.
- On Nov 9 these were still broken in the browser: G1, #1, #2, #4, #12, #16, #18. These were still broken in the source: G2, G3, G4, #3 wording, #10. All of them were fixed on Nov 10 (see below).
- Fixed since the review: the Postgres driver (#3 storage note). `backend/requirements.txt` has `asyncpg` and `sqlalchemy[asyncio]`, and the README documents `postgresql+asyncpg://`.
- Good baseline to keep: axe-core 4.10 finds 0 WCAG 2.2 A/AA violations on `/`, `/under-the-hood` and a finished dental replay, in both themes. No page scrolls sideways at any width.
- **Nov 10:** the "Before finals" list below is done in code, except what still has to be checked on the live deploy or an older iPhone. It was committed as `4335f71`, pushed, and Vercel deployed both projects (see the Live table at the top). Each item says where it was checked (Chromium, both themes). axe-core is still at 0 violations, now also on the not-found page and the "can't reach the server" screen. No credit was spent: the meetings were replays, and the one live run was refused by the guard before any model call.
- **Nov 10, later:** #3 + #19, #5, #7, #8 and #9 from "Next" are done, with a backend link check and three re-recordings. One paid live meeting ran end to end. axe-core is at 0 violations on the finished replay, the saved decision, the home page with **Your decisions** and "Decision not found", in both themes. Committed and pushed as `c5e9655`.
- **Nov 10, last batch:** the rest of "Next" is done: #11, #10, #12, #6, G4, #15, #17 and #20 + #21. No paid runs. Checked in Chromium at 320–1920 px: no page scrolls sideways, and no text overflows except the visually hidden table headers on `/under-the-hood`, which are meant to be clipped. axe-core is at 0 violations on `/` (data notice open), a saved decision (delete confirm open), `/under-the-hood` and "Decision not found", in both themes.

### Before finals (Tue Nov 17): anything a judge can click
- [x] **G1: advisor links no longer restart the meeting.** `App.tsx` now compares path and query only, so a `#fragment` never remounts the board. Checked on a finished dental replay: the standings links, the skip link and Back ×2 keep the verdict and a practice signature, and the recording isn't fetched again.
- [x] **New: walkthrough evidence fits on phones.** `.hm-facts li` is `2.4rem minmax(0, 1fr)`, and the source tag ("Link checked host" since the later Nov 10 batch) wraps as a unit (`home.css`). Checked: no text overflows `.hm-win__main` on any of the six steps of either recording at 320, 360, 375, 390 or 414 px.
- [x] **#1: the hero CTA lands on the question.** `goToForm` (`Home.tsx`) scrolls to the section where it fits, otherwise to the question field. Checked: the label and box are visible below the header and the text is kept, at 375, 390, 768, 1440 and 1920 px.
- [x] **#2: the replay header fits at every width.** It also overflowed at 420–799 and 1400–1479 px. Below 800 px the labels shorten and one `2×` button steps through the speeds; the wordmark hides below 600 px and the "Recorded" badge below 560 px; the one-row header starts at 1480 px (`board.css`). Checked: no control past the header's padding, 320–2560 px.
- [x] **#4: a mistyped `/?replay=` shows "Recording not found".** `loadReplay` rejects HTML and empty bodies, and the Board shows the new `NotFound` view with links to all three recordings.
- [x] **#18: tab titles and unknown routes.** A finished meeting's tab reads "Pilot: Should we replace our front-desk phone line… — Crucible"; stopped meetings say "Meeting stopped". Unknown paths get a 404 view ("Nothing was cast here.", `components/NotFound.tsx`).
- [x] **#16: eval copy.** Since Nov 10 the Evaluation section of `/under-the-hood` shows the measured run: risk points, actionability and errors for one prompt, one prompt with research, and the board. It also gives what that does and doesn't show, and three findings from reading the transcripts. The early "0 of 2 / 2 of 2" figure is gone. `EVAL_RUN` in `underthehood/recorded.ts` is copied by hand from the report; update it with each run.
- [x] **#3 wording.** A replay signature now says "practice signature on a recording, not saved".
- [x] **#10: Industry Expert copy.** It now reads "Judges it the way a seasoned operator in your trade would." (`seats.ts`). The seat prompt in `backend/agents/crucible/seats.py` is unchanged.
- [x] **New: no more fake buttons.** The walkthrough's "Convene the board" is now a real button that steps the tour to Research. Accept/Override on the example verdict and the walkthrough's "Your call" step are now a plain caption: "Accept it, or override it with a note."
- [x] **New: the "can't reach the server" screen.** When nothing came back, only the question and one notice show ("Meeting didn't start"), with Try again / Watch a recorded session / Edit my question. The screen reader announces "The meeting stopped." "Everything the board finished is still on this page" appears only when something did finish.
- [x] **G2: no blank page without newer APIs.** `fonts.ts` uses `new Promise`, and `Brief.tsx` parses source URLs in a `try`. Checked in Chromium with both APIs deleted: home and the sourced dental replay render, with 9 source links.
  - [ ] Still check on a real older iPhone (iOS 16) or BrowserStack.
- [x] **G3: the API has a front door** (`backend/guard.py`, wired inside ADK's CORS middleware in `main.py`).
  - **Routes:** `GET /list-apps`, session create, a session's PATCH (ratification or feedback), `GET` and `DELETE`, `/run_sse`, `GET …/decisions` and (since Nov 10) `POST /client-errors` are open. Everything else returns 404 `CRUCIBLE_NOT_FOUND`.
  - **Input checks:** a body cap (413) and strict intake, ratification and feedback checks (422). The server sets the `at` times.
  - **Limits:** per IP, 40 runs and 60 sessions an hour; 100 runs a day in total; at most 3 runs at once; 20 error reports an hour. All but the last are set in `.env` (see the README table).
  - **Frontend:** it shows the server's sentence, e.g. "That's a lot of meetings from one network." The form's `maxLength` values match the caps.
  - [ ] **Now, the guard is live on Vercel:** in the API project, set `CRUCIBLE_CLIENT_IP_HEADER=x-vercel-forwarded-for` and redeploy. Without it the limits key on the socket peer, which on Vercel is probably the platform's proxy rather than the visitor. If so, the per-IP limit is shared by everyone. Then check that two networks get separate limits. Also remember that Vercel counts limits per function instance.
  - [x] **Decided (Nov 10): 40 runs an hour per IP, up from 10,** so a room of judges behind one venue IP isn't cut off. The spend ceiling is the 100-runs-a-day cap and the 3-at-once cap.
  - [ ] **Still open from G3:** server-issued ownership of sessions. Since Nov 10 the owner id must be a random version-4 UUID (`test` or any other guessable id gets 404), and reading or changing a decision needs that id. It is still made by the browser, though, so anyone who learns both IDs can read or PATCH that session.
- [ ] **New: one hosting story, written down.** Done: hosting is Vercel for both projects, the README diagram shows OpenRouter → Claude, and `npm run build` fails without `VITE_API_BASE` (`vite.config.ts`).
  - [ ] Push the Nov 10–12 batch (decision brief, print, lighter intake, feedback, error reports), then check it on https://smith26-crucible.vercel.app: a replay opens as a decision brief, `/?decision=…` reloads, **Your decisions**, and the API answers `POST /client-errors` (204) and refuses `/apps/crucible/users/test/sessions` (404). On Nov 12 the live API still had the older guard.
  - [ ] Confirm `CRUCIBLE_SESSION_DB` (Neon, `postgresql+asyncpg://…`) is set on the API project. Without it, a session created on one function instance may be missing on the one that runs the meeting.
  - [ ] Run one paid live meeting on https://smith26-crucible.vercel.app before the finals. No live meeting has been run through the deployed guard yet.
  - [x] Write the live URLs (Live table above) in the README.
  - [x] The Deploy section of `/under-the-hood` describes the two Vercel projects and Neon, with Cloud Run as the alternative, and the README lists Cloud Run as the alternative too.

### Next: written decision brief and site clarity (Nov 10 live review)

Reviewed the live home page, `/under-the-hood`, and finished bakery/dental recordings; desktop and mobile layouts, both themes. This is a **written reading experience**, not audio narration. Build on the existing brief, citation previews, folding controls and saved decisions rather than duplicating them.

**All six are done** (Nov 10, verified Nov 12). Checked on a production build against a scratch API with seeded saved decisions (the bakery and dental final states), so no paid runs: 375, 768, 1440 and 1920 px, both themes, keyboard, reduced motion. axe-core 4.10 reports 0 WCAG 2.2 A/AA violations on a saved decision (brief and transcript views), the home page with business details open, and `/under-the-hood` with Contents open.

- [x] **The decision brief is the finished-meeting view** (`DecisionBrief.tsx`). A finished replay and a reopened saved decision open as **Decision brief** (a live meeting goes through the same code when its verdict lands; no paid run was done to check it); **Meeting transcript** shows the research, debate and full verdict. The brief reads recommendation → why (with the strongest objection) → before you proceed → action plan and AI tools → what would change it → sources → your call, with a section list beside it (a sticky row of chips on phones). It is built only from the structured verdict and facts; the sources say "Link checked means the page opened … not that anyone checked it backs the claim." Switching views keeps the signed call and fetches nothing. Links into the other view (a seat in the standings, "Make your call in the decision brief") switch views first.
- [x] **Every prerequisite comes before the call.** "Before you proceed" holds the Realist's open blocks, every condition and the escalation note (dental: 1 block, 6 conditions, "Talk to an attorney"). The button reads **Accept the conditional plan**; once accepted, the call says "Not cleared to proceed yet. 7 prerequisites … are still open. Accepting doesn't mark them done." Checked: accept → reload keeps that text.
- [x] **Print / Save as PDF** (`styles/print.css`). Prints the brief in the light theme from either view: question, recommendation, reasons and dissent, prerequisites, plan, tools, what would change it, sources with their full addresses, and the signed call. No header, controls, crucible, transcript or feedback. The first line says "Crucible decision brief · Saved decision" (or "Recorded example, not your decision · Recorded Nov 10 …") and the print date. Checked by printing the dental (8 pages) and bakery (7 pages) decisions to PDF: nothing faded or cut off. **Fixed Nov 12:** a heading could sit alone at a page foot ("Action plan", "AI tools, side by side") because Chromium ignores `break-after: avoid` inside grid; on paper those sections are now plain blocks.
- [x] **Lighter intake.** Only the question and leaning show; the eight business fields sit under **Add business details** ("Optional · 1 of 8 added" once you fill one). The prototype warning comes before the first field. Checked at 375: values survive closing and reopening, an empty question is refused with focus on it, and Tab goes question → leaning → details → **Convene the board**.
- [x] **Homepage trimmed.** The walkthrough keeps the recorded example. The board section now says what each seat contributes in general, and the verdict section shows the four possible calls instead of repeating the bakery verdict.
- [x] **Contents on `/under-the-hood`.** Below 1200 px a sticky **Contents** button names the section being read ("06 Evaluation") and opens a list of every section. Checked at 375 and 768, by mouse and keyboard, with and without reduced motion: the jump lands the heading below the header and focus moves to the section; Escape closes the list and returns focus to the button.

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
- [x] **New: the five seats agree from the start** (Nov 10). It was seen in all three recordings and in all 10 eval scenarios.
  - **Fix:** the Devil's Advocate now argues *for* the owner's leaning in Round 1 when caution is the obvious answer, and against the consensus in Round 2 (`seats.py`). The Strategist leads with the 6–12 month view.
  - **Result in the rerun:** the Devil's Advocate's Round 1 stance differed from the majority's in 5 of 10 scenarios, up from 3. In retail it argued a different plan ("Yes, but only as a short, cancellable, human-verified pilot").
  - [ ] **Still open:** in cleaning it still opened with the others' plan, and the other four seats still tend to converge. A question only each seat answers (the other idea from the review) hasn't been tried.
  - [ ] The three replays predate the fix. Re-record them when the deck no longer quotes them; the Round 1 "Question this" in the dental and HVAC recordings still ends with a stray `}`.
- [x] **#11: a data notice next to Convene** (Nov 10).
  - **Above the button:** "Don't enter patient, customer or payment details. Describe the decision, not the people in it."
  - **"What happens to what you type"** (a disclosure) covers three things:
    - what goes through OpenRouter to Anthropic's Claude models and to web search, with a link to OpenRouter's data policy;
    - what Crucible keeps: the decision, keyed only by a random id in this browser, and a redeploy can wipe it;
    - how to delete it.
  - **Deleting:** every saved decision now ends with **Delete this decision**, a two-step confirm that calls the new guard-allowed `DELETE` session route.
  - **Checked on a seeded local store:** the decision disappears from **Your decisions** and its link then shows "Decision not found". Another owner id's `DELETE` changes nothing.
- [x] **#10: SBDC by state** (Nov 10). `lib/sbdc.ts` sends a Maryland location to the Maryland SBDC and everywhere else (or no location) to America's SBDC locator. The escalation heading now reads "Talk to a Small Business Development Center advisor".
  - **Checked:** a replay edited to `sbdc_advisor` linked to marylandsbdc.org for Silver Spring, MD and to americassbdc.org for Austin, TX.
  - **Footers:** both footers now say Crucible was built and tested on Maryland businesses and point to your local SBDC (in Maryland, the Maryland SBDC). The Chairman's prompt already asks for "the local SBDC".
- [x] **#12: sessions grid** (Nov 10). The three recordings stay in one row. From 768 px the fourth card, "Your business · your question", is a full-width strip in the same three columns: its thumbnail under the first card, the text in the middle, and a 44 px **Convene your board** pill on the right. Mobile order is unchanged. Checked at 1440 and 1920 px.
- [x] **#6: hero copy** (Nov 10). "For small-business owners with a call to make. Five AI advisors research it and argue it out, and you leave with a recommendation, what it depends on, and what to do this week. The final call stays yours." The meta description names the audience too.
- [x] **G4: event checks and an error boundary** (Nov 10).
  - **Checks:** every model answer and saved-state key is checked against the schema (`lib/validate.ts`) before it reaches the board. A misfit is left out with a "Part of this meeting couldn't be read" notice; nothing is invented to fill it.
  - **Boundary:** each view sits in an `ErrorBoundary` with a "This page cracked in the mould." screen offering Reload / Go to the home page.
  - **Checked:**
    - a saved decision whose verdict says `decision: "maybe"` keeps its research and seats and shows the notice;
    - a real render crash (mid-edit `Sessions` code) showed the recovery screen instead of a blank page.
- [x] **#15: Skip effect** (Nov 10). While the build effect runs, the corner button reads **Skip effect**. Any section link (header nav, the index, the skip link) also ends the effect, with every part visible at once. Checked: jumping to Evaluation mid-effect showed all 7 parts immediately, with focus on the section.
- [x] **#17: code-split** (Nov 10). The meeting room and `/under-the-hood` are lazy chunks with their own CSS. The home page now loads one 312 KB JS file (96 KB gzipped) and 57 KB of CSS (12 KB gzipped).

  | Chunk | JS (gzipped) | CSS (gzipped) | Loaded |
  |---|---|---|---|
  | Home + shared | 96 KB | 12 KB | always |
  | Meeting room (`Board`) | 63 KB | 9 KB | first meeting, replay or saved decision |
  | `/under-the-hood` | 17 KB | 7 KB | first visit to it |
  | Before, all in one | 168 KB | 26 KB | always |

  - **Measured** on a local preview with fast 3G and 4× CPU throttling: LCP 1.2 s, CLS 0, no long tasks. That's unchanged from Nov 9; the first paint here is dominated by latency, not bytes.
  - **Verified:** the home page fetched only `index.js` and `index.css`, and opening a replay then fetched `Board.js` and `Board.css`.
  - [x] The Vite warning about extensionless imports in `replaysPlugin.ts` is gone (`.ts` extensions on those imports); `npm run build` prints no warnings.
- [x] **#20 + #21: replay labels and quotes from the files** (Nov 10).
  - **The plugin:** `frontend/replaysPlugin.ts` reads every `public/replays/*.sse` at dev and build time and serves it as virtual modules.
  - **Home page quotes:** picked at build time by rules in `src/lib/featured.ts`, e.g. the first fact of each link outcome, or the Devil's Advocate's first rebuttal and the answers to it. They are shortened only by keeping whole leading sentences, and `(Fn)` is dropped from verdict excerpts.
  - **`/under-the-hood`:** `underthehood/recorded.ts` takes the dental data from the same source. The result figure now shows the recorded verdict headline.
  - **Labels:** each recording shows "Recorded Nov 10, 2026 · Claude Sonnet 5.5 + Haiku 5.5 · web search on": on the home cards, the `/under-the-hood` list, the not-found list, and under the meeting-room controls (shortened on phones; the full text is in the badge's accessible name). The old error recording reads "Recorded Nov 6, 2026 · gemini-3.5-flash-lite · web search off".
  - **Checked:** editing a sentence in a `.sse` changed the page with no change to `content.ts` (then reverted). Some home excerpts changed because the rules now pick them (e.g. bakery F2 replaces F7).

### Keep improving: make every change checkable
- [x] **Eval: a fair baseline, a blind judge, exact cost** (Nov 10, `backend/eval/run_eval.py`; see the README's Evaluate section).
  - **Fair baseline:** besides the plain prompt, a second baseline gets the board's own research, so sources alone don't decide the comparison.
  - **Blind judge:** a judge model grades the three final answers shuffled, unlabeled and with fact IDs removed. Per planted risk it scores 2 (the decision is gated on it), 1 (only mentioned) or 0. It also scores actionability (1–5), lists confident errors, and checks the control for an invented legal blocker. The keyword check stays as a secondary column.
  - **Also new:** `--repeat N`, `--rejudge <run>` (fills in only what a run lacks), and cost per scenario from OpenRouter's per-call `usage.cost`.
  - **Restaurant regex:** the pattern now also accepts "facial template", "HB 1202" and "3-717".
  - **Results:**

    | Run | Risk points: one prompt · + research · board | Actionable | Confident errors | JSON junk in seats |
    |---|---|---|---|---|
    | Before the fixes (`210818`) | 29 · 30 · 30 of 30 | 4.1 · 4.4 · 4.6 | 5 · 5 · 2 | 17 strings |
    | After (`214837`) | 28 · 30 · 30 of 30 | 4.1 · 4.3 · 4.6 | 4 · 3 · 0 | 0 |

  - **Citations checked by hand:** in four scenarios (retail, cleaning, food truck, salon), each re-checked citation by citation, fact IDs on claims the fact doesn't make fell from 42 to 24. Retail went from 25 to 7, but salon went from 3 to 7 (mostly one third-party Vagaro fact read as Vagaro's own claim). The checkers' counting rules differed slightly, so read it as a modest gain.
  - **The control:** the first fixed version made the Chairman turn every legal question into a condition, and the judge flagged an invented blocker in the bakery control. The rule now covers only requirements a fact says apply. A retest (`221043`) passed the control, and the chatbot scenario still made "bound by what the bot says" a gate.
  - [ ] **Each scenario ran once,** and the judge is a Claude model grading Claude answers. Before quoting a difference, run `--repeat 3` (about $0.19 per scenario run, so $5–6 for all ten) and, if possible, a judge from another provider (`--judge-model`).
  - [ ] **The traps are too easy now:** every answer scores 28–30 of 30. Harder scenarios would separate the approaches better, e.g. a risk that only shows up in the research, or two rules that conflict.
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
- [ ] **Learn from real visitors.** Done Nov 10: "Was this useful?" (one tap, then an optional note) is saved on each saved decision, and front-end errors go to `POST /client-errors`, which logs them on the server (checked: a thrown error and an unhandled rejection both reached the API log, 204). The data notice lists both. **Still open:** page analytics and the funnel (hero → form → convene → verdict → signed). Turning on Vercel Web Analytics (cookieless) is a switch in the Vercel dashboard plus one script; update the data notice, which now says "There are no analytics, cookies or third-party trackers", if you do.
