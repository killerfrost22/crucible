# Crucible — Website Analysis and Improvement Suggestions

## Overall assessment

**Keep the identity; improve the path from question to a trustworthy, usable decision.** Crucible already has a distinctive visual language, meaningful advisor roles, real recorded examples, and an explicit human final decision. It does not need another visual rebrand or more agents to become a stronger prototype.

The highest-priority defects are navigation that resets a meeting, a startup path that can leave the page blank, and missing application-level controls around a publicly exposed AI backend. After those, improve mobile intake, preserve decisions, put the result ahead of the transcript, and make evidence and AI-tool recommendations actionable. The technical presentation is currently more developed than the owner's ability to return to and use a decision.

This document proposes changes; it does not implement them. Application files were not changed for this review.

## Review scope and evidence

Evidence labels used below:

- **Browser-confirmed:** exercised against the current local Vite application in Chromium.
- **Source-confirmed:** visible in the referenced implementation; not necessarily exercised against a deployed backend.
- **Recommendation:** a product/design decision, not a claim that the existing behavior is a defect.
- **[INFERENCE]:** a risk or expected impact that still needs deployment checks or user research.

### What was exercised

| Surface | Review performed |
| --- | --- |
| Home `/` | Screenshots at 375, 768, 1440, and 1920 CSS pixels; light/dark samples; hero-to-intake transfer; example autofill; mobile menu and Escape; walkthrough selection and normal ArrowRight navigation |
| Recorded meetings | Bakery, dental, and HVAC recordings completed through the real replay player; pause/resume, 4× speed, and skip-to-end exercised |
| Decision interactions | Fact citation preview and dismissal; accept; change call; blank override validation; signed override; refresh after signing |
| Failure states | Shipped dental quota-failure recording; unknown replay URL and its actual network response |
| Meeting responsiveness | Dental meeting inspected at 375, 768, 1440, and 1920 pixels; narrow-header geometry measured |
| Technical explainer | `/under-the-hood` inspected at all four required widths; section navigation; build animation; light/dark samples; reduced-motion rendering |
| Boundaries | Additional home document-width checks at 320 and 2560 pixels; these were not full visual reviews |
| Additional regressions | Completed replay → advisor standings link; feature-absence startup simulation using a browser initialization script |
| Implementation | React routing, intake, meeting, evidence, verdict, replay, theme, resources, backend workflow/contracts, installed ADK session routes and database requirements, evaluation scoring, and project documentation |

**Limits:** no paid live AI run, full evaluation suite, production load test, deployed authentication test, calibrated performance benchmark, real mobile-device test, or assistive-technology certification was performed. Width emulation is not a substitute for testing iOS Safari or Android Chrome. Local replay success does not prove live model or deployment reliability.

Representative layout measurements, rounded; these describe the inspected content, not a universal page-size requirement:

| Measurement | 375px phone | 1440px desktop |
| --- | ---: | ---: |
| Home document height | 11,226px | 7,501px |
| Home intake-section start | 8,487px | 5,718px |
| Completed dental meeting height | 17,445px | 11,071px |
| Technical explainer height | 19,162px | 10,952px |

Long pages are not inherently bad. Here, however, repeated explanation and fully expanded transcripts delay the user's task.

## Preserve these strengths

- **The Crucible metaphor:** molten accent, cast verdict, owner hallmark, and stable advisor colors give the product an identity beyond a generic chat interface.
- **Human authority:** “The board advises. You decide,” accept/override, and a required override note are meaningful controls. Blank-note validation worked in the browser.
- **Real recordings:** the replay player demonstrates actual outputs without requiring live inference for every visitor. Keep recordings clearly distinguished from live meetings.
- **Visible disagreement:** rebuttals, concessions, conditions, and remaining dissent are more valuable than a simplistic majority vote.
- **Shared evidence IDs:** in-range fact references open a readable preview. Preserve this while improving source access.
- **Accessibility groundwork:** semantic forms, visible focus treatment, a mobile-menu Escape path, working normal walkthrough arrow navigation, and reduced-motion support already exist. The technical page rendered its content without the build effect under reduced motion.
- **Coherent themes and typography:** light and dark samples retained the same identity. Reuse the token system instead of introducing one-off colors or a second component styling convention.

## Release gates — Resolve before broader public use

### G1. Stop in-page advisor links from restarting the meeting

**Browser-confirmed, high severity.** After completing the dental replay, clicking the Industry Expert link in “Where the board stands” changed the fragment to `#seat-card-industry_expert`, removed the verdict, and returned the phase rail to Research. An ordinary navigation action restarted the recording.

**Source:** `frontend/src/App.tsx:16–20,35–39,66–68`; `frontend/src/components/Board.tsx:97–99`; `frontend/src/components/Crucible.tsx:445`. Fragment navigation reaches the global `popstate` handler; the replay route increments the component key and remounts the board. **Source-confirmed live risk:** `/?meeting#…` instead maps to Home, unmounting the live board. The live case was not exercised with paid inference.

**Suggestion:** distinguish route identity (`pathname` and relevant search parameters) from in-page fragments. Reuse the technical page's existing hash-free scroll-and-focus pattern for meeting anchors. In-page navigation must never create a new run or clear existing state.

**Acceptance:** after opening positions and after a verdict, activate every standings link and the keyboard skip link. The same session, phase, results, and owner signature remain; no new recording load or inference request occurs. Back/Forward across fragment history must also preserve the meeting.

### G2. Make basic rendering independent of newer convenience APIs

**Browser-confirmed compatibility simulation.** Removing `Promise.withResolvers` before application initialization produced `TypeError: Promise.withResolvers is not a function`, left `#root` empty, and displayed a blank page. This simulates a missing browser feature; it is not a native Safari test.

**Source:** `frontend/src/lib/fonts.ts:12–18` calls the API synchronously; `frontend/src/main.tsx:20–25` invokes it before React mounts. Separately, `frontend/src/components/Brief.tsx:133` calls `URL.canParse` during research rendering without a feature check; that second absence was not simulated.

**Suggestion:** use widely supported Promise construction and guarded URL parsing, or deliberately supply compatible implementations for the documented browser baseline. Font loading must not prevent application mounting or permanently conceal the page.

**Acceptance:** the landing page and a sourced dental replay remain usable with either convenience API unavailable. Test the declared browser support matrix on real engines, not only Chromium with features removed.

### G3. Protect live inference and decision records at the API boundary

**Source-confirmed public-deployment gate; no deployed exploitation performed.** `backend/main.py:25–30` mounts ADK's API with CORS configuration but no application-level authentication, ownership enforcement, request throttling, or intake size limits. `frontend/src/lib/api.ts:9–16` supplies an anonymous client-chosen UUID, not proof of identity. `backend/agents/crucible/schemas.py:25–39` specifies no input maximums.

The installed ADK 2.13 session routes accept identifiers from the URL; its PATCH handler appends the supplied `state_delta` to session state (`backend/.venv/Lib/site-packages/google/adk/cli/api_server.py:1790–1847`). The frontend only intends to update ratification (`frontend/src/lib/api.ts:78–83`), but the generic server route is not limited to that operation.

**[INFERENCE]:** if deployed directly as documented without an upstream protection layer, others could consume the demo's AI balance, interfere with availability, or read/mutate a decision when its identifiers become known. CORS is not authentication; prepaid credit is not an abuse control or a ceiling on all hosting charges. An external gateway may change the exposure, but none was verified.

**Suggestion:** expose only the required product operations through a small application API. Require server-issued ownership credentials for reading/updating a session; enforce a ratification-only mutation schema and server timestamps. Add bounded input/list sizes, per-owner/IP request and concurrency limits, and an intentional global inference budget. Do not allow the public client to submit arbitrary workflow state. Full account registration is not required to implement session ownership.

**Acceptance:** missing/wrong credentials cannot read or mutate another session; arbitrary verdict/evidence PATCHes are rejected; oversized intake and over-limit requests fail before model calls. Only intended routes are public. Verify this on the actual deployment before inviting unrestricted live traffic.

### G4. Validate streamed data and preserve a recoverable UI

**Source-confirmed risk; malformed-event failure was not injected.** `frontend/src/lib/board.ts:93–109` casts event objects into application types without validating required fields or enums. Render paths dereference those fields, including `frontend/src/components/Board.tsx:78–80` and `frontend/src/components/Verdict.tsx:46–50`. The source review found no React error boundary.

**Suggestion:** validate live and recorded events at the shared boundary and keep the last valid partial board when data is invalid. Add a route-level error boundary with a truthful recovery action. Do not silently replace missing critical evidence or dissent with empty arrays, or invent a default decision to keep the screen rendering.

**Acceptance:** an invalid decision enum, missing required verdict field, or incompatible replay version yields a clear error with valid partial results retained—not a blank page, invented recommendation, or false “no objections.”


## Priority 1 — Complete the owner's journey

### 1. Make the mobile CTA land on an actually visible input

**Browser-confirmed.** At 375px, entering a question in the hero and selecting “Convene your board” transferred the text and focused `#question`, but the textarea's top remained approximately **966px below the viewport top** in an 812px-high viewport. The screen showed another introduction and process list instead of the focused input.

**Cause in source:** `frontend/src/home/Home.tsx:32–38` scrolls the whole `#convene` section into view, then focuses the question with `preventScroll: true`. On a phone, the introduction precedes the form vertically.

**Suggestion:** scroll the form/question container below the sticky header, not the enclosing marketing section. Collapse or relocate the repeated four-step introduction on phones. Make the first CTA's label reflect that it continues to context collection rather than immediately starting inference.

**Acceptance:** after the hero CTA at 375px, the user's question and its label are visible, focused, preserved, and not covered by the header. Repeat with the on-screen keyboard on a real phone.

### 2. Recompose the narrow replay header

**Browser-confirmed.** In the completed dental recording at 375px, the header row extended to x=401. The theme control occupied x=357–401, so part of it was clipped. The page reported a 375px document width: a document-level overflow check alone missed the component overflow.

**Relevant implementation:** `frontend/src/components/Board.tsx:100–152`, `frontend/src/styles/board.css`.

**Suggestion:** keep New, playback state, and one playback action in the first row. Move speed into a compact selector or a second row; keep theme fully reachable. Give the phase rail an intentional small-screen presentation rather than relying on clipped content.

**Acceptance:** every header control and its focus ring fit at 360, 375, 390, 414, and 768px, in both themes and all replay states. Check component bounds, not only document `scrollWidth`.

### 3. Preserve decisions and stop claiming persistence that does not exist

**Browser-confirmed:** accepting and signing an override worked, including the note and timestamp. After refreshing and completing the same replay again, the signature disappeared. The confirmation had said **“kept on this device (recorded session)”**, but the inspected browser storage contained only the theme preference.

**Source-confirmed:** `frontend/src/components/Verdict.tsx:227–250` displays the persistence wording. `frontend/src/App.tsx:12–20` intentionally does not resume live meetings from the URL. The existing team roadmap already acknowledges lost boards and inaccessible saved ratifications in `TODO.md:30–31`.

**Separate storage prerequisite, source-confirmed:** `README.md:69,109–111` recommends a plain `postgresql://` URL, but `backend/requirements.txt` installs neither the ADK database extra nor an async Postgres driver. The installed `DatabaseSessionService` requires SQLAlchemy's asyncio support and an asynchronous driver (`backend/.venv/Lib/site-packages/google/adk/sessions/database_session_service.py:357–365,398–422`). Align the dependencies and documented URL, e.g. the supported `postgresql+asyncpg://` configuration, before presenting Postgres as a working durability switch. No Postgres startup was attempted in this review.

**Suggestion:** make this one cohesive feature: a stable decision URL, read-only restoration, saved ratification, and a recent-decisions entry point. Persist replay practice signatures locally if that wording remains. Restore existing live state without restarting AI inference or spending credit. Until persistence exists, say “for this viewing session” instead of “kept on this device.”

**Storage acceptance:** a clean install starts with the documented durable-store configuration; a signed decision survives a backend restart/redeployment and remains readable only by its owner. A single container with local SQLite is not durable hosted history.

**Acceptance:** reload, reopen, and browser Back do not silently discard a completed decision or signature; restoration performs no new AI run. Access must be restricted to the correct owner, not merely a guessable URL.

### 4. Give invalid recordings an explicit not-found state

**Browser-confirmed.** Opening `/?replay=not-a-recording` fetched `/replays/not-a-recording.sse`, which returned **200 with `text/html`** from the local SPA fallback. It was accepted as an empty recording. The UI showed “Loading your question…,” unfinished seats, and “No recommendation in this session,” with no explanatory alert.

**Source:** `frontend/src/lib/replay.ts:30–34` checks HTTP success but not recording content; `frontend/vercel.json:1–3` rewrites every path to the HTML application shell. The deployed response was not tested.

**Suggestion:** reject HTML and empty/invalid replay payloads, and prevent missing static replay assets from becoming successful application-shell responses. Present “Recording not found” with a link to available recordings and New decision.

**Acceptance:** unknown, empty, and malformed recordings produce an explicit recoverable state; known recordings continue to play normally.

### 5. Put the decision brief ahead of the full transcript

**Browser-confirmed:** the dental meeting expanded into a long research sheet, every opening argument, every rebuttal, and a lengthy verdict. On the inspected phone layout, “Your call” began roughly 17,059px down the document. The verdict begins well before that, but its conditions and explanations still separate the user from signing.

**Source:** `frontend/src/components/Board.tsx:158–223`; `frontend/src/components/Verdict.tsx:105–184`.

**Suggestion:** provide a completed-state summary first: recommendation, three decisive reasons, strongest objection, unresolved gates, and next action. Place Accept/Override next to that summary on phones too. Keep the full evidence and debate available through clearly labeled expandable sections and jump links. During a meeting, offer “Verdict ready” rather than forcibly moving someone who is reading an argument.

**Acceptance:** a first-time owner can identify the recommendation, critical condition, objection, and next step without reading the full transcript. Evidence remains one deliberate action away; nothing important is deleted or hidden behind an unlabeled control.

### 6. State the audience and practical outcome earlier

**Recommendation.** The headline is memorable, but its supporting copy describes the mechanism—five advisors, two rounds—more clearly than the business outcome. The first screen does not explicitly identify small-business owners. Architecture counts such as “12 AI calls” are useful to judges, not the primary buying reason.

**Source:** `frontend/src/home/Home.tsx:95–132`; `frontend/src/home/homeContent.ts:81–88`; `README.md:1–12`.

**Suggestion:** retain the headline and use outcome-oriented supporting copy, for example:

> An AI board for small-business owners. Compare your options, uncover practical risks, and leave with a decision and a plan—including which AI tools fit your business.

Show one concise, sourced decision example near the first CTA. Keep the large C as a brand accent, but do not make it carry all of the product demonstration.

**Acceptance:** an unfamiliar owner can explain who this is for, what to bring, and what they receive before opening the technical explainer. Confirm through short user sessions rather than assuming the copy converts better.

### 7. Turn AI-tool endorsements into a usable comparison and adoption plan

**Browser- and source-confirmed:** the verdict displays tool name, cost text, intended use, compatibility text, and a caveat. In the dental example, costs were “unknown; quote required,” integrations were explicitly unverified, and the tool names were not product/source links. These caveats are honest, but the user must do substantial work after the recommendation.

**Source:** `frontend/src/components/Verdict.tsx:155–171`.

**Suggestion:** add a compact comparison of viable options, including the user's existing software and a no-new-tool alternative. Distinguish vendor-confirmed pricing/integration from estimates and unknowns. Include official product/pricing links, exact plan assumptions, retrieval date, setup steps, required approvals, and a pilot success/exit criterion. Do not invent a price to fill an empty cell or label a proposed integration as deployed.

**Acceptance:** an owner can see why the recommended option beats an alternative, what still needs confirmation, and the next concrete adoption step. This also makes AI discovery, comparison, and adoption a visible output rather than a side note to general business advice.

## Priority 1 — Improve trust before encouraging reliance

### 8. Replace uncalibrated confidence percentages with meaningful uncertainty

**Browser-confirmed:** completed examples displayed “72% confident,” “78% confident,” and “90%” styling. No calibration evidence was established in this review.

**Source:** `frontend/src/components/Verdict.tsx:46–50,84–102`; `frontend/src/content.ts:81–86`.

**[INFERENCE]:** users may read a precise percentage as a measured probability of business success or factual correctness.

**Suggestion:** prefer an evidence summary: what supports the recommendation, which assumptions remain open, and what would change it. If retaining a number, label it as model-reported confidence, define what it measures, and do not present it as calibrated accuracy.

**Acceptance:** no decision display implies a measured probability without supporting evaluation. Critical unknowns remain prominent even when the model gives itself high confidence.

### 9. Make “Verified” an auditable evidence claim

**Source-confirmed:** `frontend/src/components/Brief.tsx:114–141` maps `fact.verified` to “Verified” and shows the source hostname. `frontend/src/components/Notices.tsx:89–107` shows the claim and status in the citation preview, but not its source link. The home content correctly notes that the HVAC recording had no web access (`frontend/src/home/homeContent.ts:9–17`).

**Backend evidence:** `backend/agents/crucible/schemas.py:45–53` makes verification a model-populated boolean; `backend/agents/crucible/seats.py:179–197` supplies the sourcing instruction. The reviewed workflow does not independently establish that a returned source supports its claim, while `/under-the-hood` says verification happens only when a search result backs it. Search-enabled configuration and model self-attestation are not equivalent to checked provenance.

**Suggestion:** distinguish “source found,” “source supports this claim,” “user-provided,” and “not verified.” A source URL alone does not establish correctness. Show source title, publication/retrieval date where available, supporting excerpt, and whether the source is a regulator, vendor, or other publisher. Put Open source inside the citation preview so a user does not need to scroll back through the entire research sheet.

**Acceptance:** every affirmative evidence label traces to a supporting source record; unsourced or unsupported claims remain visibly uncertain. A user can inspect the original source directly from a verdict citation. Recorded and current live evidence are not conflated.

### 10. Remove misleading human-experience and compliance implications

**Browser-confirmed:** the Industry Expert says “Has run a business like yours for twenty years.” An AI persona has not actually operated a business. A footer prototype disclaimer does not fully correct that local claim.

**Suggestion:** describe the analytical role, e.g. “Examines the decision from an experienced operator's perspective.” Keep legal/compliance checks framed as preliminary issue identification, not a legal clearance. Keep professional escalation and unresolved gates next to the decision, not only in the footer.

**Localization:** `frontend/src/components/Verdict.tsx:16–20,174–182` hardcodes a Maryland SBDC referral even though intake accepts arbitrary locations. Either make the prototype's Maryland scope explicit or route referrals by the user's jurisdiction; do not imply Maryland guidance applies everywhere.

**Acceptance:** no advisor claims real credentials or lived experience it does not possess; “pass” is not represented as professional certification or permission to act.

### 11. Explain data handling before the user submits business information

**Browser-confirmed:** the intake asks for business details, goals, tools, and constraints; no privacy or data-handling link was present in the inspected home-page links. The footer says the product is a hackathon prototype and AI can be wrong, which is useful but addresses a different concern.

**Source context:** `frontend/src/home/IntakeForm.tsx`; model routing and storage configuration in `README.md:57–71,109–111`.

**Suggestion:** add a short notice beside submission explaining what is sent to AI/search providers, what is stored, whether a meeting is private, retention/deletion behavior, and how to request deletion. Warn against entering customer, patient, payment, or other sensitive personal information into this prototype. State the actual behavior; do not claim zero retention or confidentiality without provider and deployment support.

**Acceptance:** the user can understand the data boundary before making a live request, and a documented deletion path matches the deployed storage behavior.

## Priority 2 — Improve visual hierarchy, accessibility, and proof

### 12. Remove the large empty area in recorded sessions

**Browser-confirmed:** desktop recorded sessions use three cards across, followed by a fourth “Your business” card. The second row leaves a large blank two-column region, especially conspicuous in the light theme.

**Relevant source:** the `Sessions` section in `frontend/src/home/Home.tsx` and its rules in `frontend/src/styles/home.css`.

**Suggestion:** keep the three recordings in one row and use a full-width start-your-own strip below; alternatively use a balanced 2×2 layout. Reduce repeated section introductions so examples lead more directly into intake.

**Acceptance:** the fourth item does not leave an accidental-looking two-thirds-row void at 1440 or 1920px; mobile reading order remains coherent.

### 13. Collect decision-critical context progressively

**Recommendation.** The example chips are helpful and worked. The full form nonetheless presents many fields at once; most are optional, although jurisdiction, budget, and existing software can be crucial to the answer.

**Suggestion:** group the flow into Question → Relevant context → Review and convene. Do not force every field for every question. Ask a targeted clarification when an omitted fact materially changes a legal or feasibility assessment; otherwise show the assumption explicitly. Make comma-separated goals and tools easier to enter with examples or removable chips.

**Acceptance:** missing critical context does not become a silently invented fact; users can distinguish required information from optional enrichment without reading a dense form.

### 14. Finish the accessibility details without discarding the existing groundwork

**Browser-confirmed:** normal walkthrough keyboard navigation and mobile-menu Escape worked. **Source-confirmed:** small visual boxes are not the whole touch target: replay speed buttons gain a 44px-high effective area through a pseudo-element (`frontend/src/styles/board.css:322–331`), and citations also have enlarged hit regions (`frontend/src/styles/cards.css:385–390`). Do not report their visual bounding boxes alone as WCAG failures.

**Remaining source-level concerns:** route changes update scroll/title but do not deliberately focus the new main landmark (`frontend/src/App.tsx:41–45`). The tour pauses on mouse hover but not keyboard focus (`frontend/src/home/Showcase.tsx:256–298`), so selection can advance while a keyboard user is reading. That timed-focus case was not reproduced. Enlarged citation regions also warrant real touch checks for neighboring-target overlap.

**Suggestion:** move focus to the new main/heading after an intentional page transition; pause the tour while focus is inside it; ensure arrow movement remains relative to the focused tab. Audit effective hit regions, not only painted size. Check sticky-header focus visibility, citation reading/closing, screen-reader phase/error/decision announcements, and touch equivalents for hover-driven relationships. Keep dissent and statuses understandable without color alone.

**Acceptance:** keyboard-only completion, touch citation inspection, 200% text zoom, and real screen-reader phase/error/decision announcements work across routes and themes. Do not claim an accessibility conformance level from this review alone.

### 15. Make the technical explainer informative without making animation a prerequisite

**Browser-confirmed:** the named-cursor build effect is distinctive. Jumping to Evaluation during the normal-motion effect initially showed construction guides before the section's text was visually assembled. Reduced motion exposed all content without the effect. The explainer is also a very long page on phones.

**Source:** `frontend/src/underthehood/UnderTheHood.tsx:83–157`; `frontend/src/underthehood/buildFx.ts`.

**Suggestion:** retain the effect as an optional demonstration, but add a clearly discoverable “Show content / Skip effect” control. Never delay access to requested section content. Use short overview summaries with expandable implementation details; keep costs, measured latency, pipeline, and evaluation evidence easy for judges to find.

**Acceptance:** a direct section jump presents readable content immediately, even while the decorative effect is running; reduced-motion users receive every fact and action without restarting the effect.

### 16. Replace static “running now” evaluation copy with dated evidence

**Browser-confirmed:** Evaluation said “The full ten-scenario eval is being run now.” This is static page copy, not an observed connection to a running evaluation job. The page appropriately distinguishes an early lightweight-model dental result from the current recorded dental meeting; preserve that distinction.

**Source-confirmed evaluation limitations:** `backend/eval/run_eval.py:44–54,76–82` uses broad keyword matches, scores the whole board transcript as one result, and gives the baseline no equivalent research step. This is not yet a controlled measurement of the benefit of deliberation. No completed report artifact was found in the reviewed repository.

Before publishing comparative claims, equalize source access, make final-verdict quality the primary comparison, check false positives and the no-legal-trap control, and report repeated runs with full model configuration. Transcript-level risk mentions can remain a secondary diagnostic; they are not the same as an actionable final decision.

**Suggestion:** publish the latest completed report with date, model/setup, scenario count, scoring method, misses, and transcript/report links. If the full run is not complete, say so without implying live progress. Distinguish source coverage, planted-risk detection, recommendation quality, and business outcomes: they are different measurements.

**Acceptance:** every numerical quality claim has an inspectable artifact and identifies the configuration evaluated. Do not imply board superiority from one hand-picked example or exact-word keyword matching alone.

### 17. Reduce initial resource work before adding more effects

**Source-confirmed:** `frontend/src/App.tsx:1–8` eagerly imports the meeting and technical explainer; `frontend/src/main.tsx:1–14` imports all route styles and full font-family styles. Existing `frontend/dist/assets/` contains a roughly 505KB JavaScript file, 121KB CSS file, and multiple font subsets. These are existing, uncompressed artifact sizes, not a fresh build or measured network transfer.

**Suggestion:** lazy-load non-home routes/effects, request only necessary font subsets, and keep critical content visible while fonts load. Preserve font fallbacks and reduced-motion behavior. Check a production build under mobile network/CPU constraints before claiming a performance win.

**Acceptance:** home does not fetch or execute the whole technical-page effect before it is needed; production LCP, CLS, and INP are measured and compared under the same conditions. No performance score is claimed here.

### 18. Add shareable metadata and intentional URL behavior

**Source-confirmed:** `frontend/index.html:1–28` has a title, description, favicon, and empty client-rendered root, but no Open Graph/Twitter preview or canonical metadata. `frontend/src/App.tsx:16–20` falls back to Home for unrecognized non-replay paths. The board title remains “The board is meeting” even after a recorded verdict is complete.

**Suggestion:** add an honest branded share preview and route-appropriate metadata. Give missing routes a clear not-found path. Set a completed decision title to its outcome/question. Prerender public marketing/explainer content if search discovery is a goal; do not publish private decision content for indexing.

**Acceptance:** a shared public landing/explainer link has a useful preview; unknown routes are not silently presented as valid pages; completed decisions are distinguishable in browser tabs/history; private decisions are excluded from public indexing and protected by authorization.

## Priority 1 — Operational reliability and maintainability

### 19. Recover from interrupted live meetings without silently spending again

**Source-confirmed; not exercised with live models.** `frontend/src/lib/useBoardRun.ts:77–105` detects an incomplete closed stream but has no state restoration or event-resume path. `frontend/src/App.tsx:52–55,79` retries by starting a new session. The installed ADK SSE handler cancels work when the connection closes; current behavior should not be described as a durable background job.

**Suggestion:** distinguish “resume/read this decision” from “start a new paid meeting.” Make any cancellation and repeat-spend consequence explicit. Add a stop action and bounded idle/error handling, preserving valid partial results. If network-resilient continuation is required, give the run a server-owned lifetime and resume from stored events rather than merely reconnecting the existing request. Do not retry exhausted credit as though it were a short-lived rate limit.

**Acceptance:** refresh, network loss, and retry have documented outcomes; a user never accidentally pays for a second meeting while trying to retrieve the first. A completed decision is retrievable without inference. The live deployment is exercised end to end before its availability is claimed.

### 20. Keep recordings and deployment claims tied to the actual configuration

**Source-confirmed:** the featured HVAC recording uses the older Gemini/model-knowledge setup, while the technical page describes the current OpenRouter setup. `TODO.md:36` already tracks re-recording HVAC. The shipped error recording demonstrates an older quota failure, not a captured OpenRouter credit-exhaustion response. `frontend/src/lib/api.ts:4` falls back to `http://localhost:8000` if the production API URL is absent.

**Suggestion:** label each replay with recording date, model configuration, and research mode, or feature a current sourced recording. Publish only the event fields needed for the demo; reviewed replay envelopes also contain internal orchestration/model-thought-marked content that the product UI does not need. Inspect exports for business/personal data and provider diagnostics before publishing them. Do not treat obscuring prompts as a security boundary.

Fail production configuration checks when the API URL is absent rather than calling a visitor's localhost. Distinguish planned hosting from observed deployment and distinguish provider inference spending from infrastructure costs.

**Acceptance:** a public-build browser request reaches the intended API origin; recording labels match their payloads; replay exports contain approved display data only; real deployment and credit-error claims have corresponding observations/artifacts. No live deployment was verified in this review.

### 21. Enforce decision invariants and reduce sources of future drift

**Source-confirmed:** a Realist block ruling out an unqualified “proceed,” required professional escalation, and endorsed-tool continuity are instructions in `backend/agents/crucible/seats.py:205–221`, not deterministic postconditions. Most length/range limits in `backend/agents/crucible/schemas.py` are descriptions rather than enforced bounds. Source contracts help structure outputs; they do not establish business-rule correctness.

**Suggestion:** validate final output against decision-critical invariants and surface unresolved blocks next to the recommendation. Flag out-of-range citations and unsupported tool carryover rather than displaying them as established. Generate or validate frontend contracts against backend schemas; consolidate the existing scroll/focus and reduced-motion conventions; derive home/technical replay excerpts from approved recording data instead of manually synchronizing copies. Keep small regression checks focused on session preservation, replay parsing, output boundaries, and decision invariants—not snapshotting incidental wording.

**Acceptance:** a verdict cannot appear as an unconditional green light while an unresolved material block is concealed in a seat card. Contract and recording changes identify affected UI content, and one shared in-page navigation behavior works across all three surfaces.

## Suggested implementation order

1. Resolve release gates: meeting-reset navigation, startup compatibility, public API ownership/abuse protection, and recoverable data validation.
2. Fix the mobile intake landing, clipped replay header, and invalid-recording state; correct inaccurate storage wording.
3. Complete durable decision restoration and a concise completed-state brief; make source access and AI-tool adoption steps useful from that brief.
4. Tighten evidence/confidence/credential/data-handling claims and decision invariants before encouraging reliance.
5. Balance the sessions grid, simplify repeated explanation, make the technical effect skippable, and attach fair evaluation artifacts.
6. Verify live deployment/configuration, interrupted-run behavior, production performance, and real-device accessibility; then make targeted resource/metadata improvements.

Keep the current React/FastAPI/ADK architecture unless a measured issue requires changing it. A framework migration, more advisor personas, simulated human credentials, or extra decorative animation would not resolve the observed problems.

## Design reference and review standard

The local `AGENTS.md` calls for award-level typography, hierarchy, motion, responsiveness, accessibility, and an original brand moment. [Awwwards' current Sites of the Day directory](https://www.awwwards.com/websites/sites_of_the_day/) was consulted, and the listed [Grail product site](https://grail-app.com/) was inspected in the browser. Its immediate product artifacts and coherent metaphor are useful principles; its layout, artwork, loading treatment, and decorative interaction are not a template to copy. [FWA](https://thefwa.com/) was consulted as an additional reference directory, not treated as an accessibility certification or a source of measured Crucible scores.

For Crucible, the signature moment should demonstrate **a decision becoming better through evidence and disagreement**. Preserve the forge, but make the resulting decision easier to understand, act on, and find again.
