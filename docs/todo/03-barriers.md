# Barriers to copying

Ordered by how long a copier would need to catch up.

**Not barriers** (copyable in days): the board idea, the seat prompts, the UI and crucible animation, the name, and the models.

Items marked **Before Sun Nov 8** matter for the submission. Everything else is the 16-week plan.

## 1. Proof that the board catches real risks
**Why it's hard to copy:** prompts can be copied. A scored track record has to be built and run, and both owners and judges trust numbers.

**What we have:** `backend/eval/run_eval.py` and `scenarios.json`. That's 10 scenarios with planted risks, one of them a control. Each final answer (one plain prompt, one prompt given the board's research, and the board's verdict) is graded blind by a judge model, with a keyword check as a second column. The full run is in [`results/20261110-214837/report.md`](../../backend/eval/results/20261110-214837/report.md).

- [x] **For the finals:** run all 10 scenarios and commit `report.md` (Nov 10, Ruijie's item in `TODO.md`).
- [x] **For the finals:** put the board-vs-single-prompt table in the pitch. Slide 10 of `docs/finals/crucible-finals.pptx` (Nov 12) shows it as measured: one prompt catches most traps too (28 of 30 risk points against the board's 30); the board makes fewer confident errors (0 against 4) and more actionable plans (4.6 against 4.1).
- [ ] Grow to 100+ scenarios across industries and states. Have a professional (attorney, CPA, SBDC advisor) write or check each trap.
- [ ] Keep a held-out set that never goes into the repo or the prompts, so the score can't be gamed and nobody can tune to it.
- [ ] Re-run after every prompt or model change, and publish the score with the date and model names.

## 2. A reviewed rule base
**Why it's hard to copy:** compliance rules differ by state and industry, and they change. A rule base that is cited, dated and reviewed by experts takes months to build. Web search alone gives unverified answers; see F1 in [`02-differentiators.md`](02-differentiators.md).

**What we have:** the Researcher's web search, plus `check_sources` (since Nov 10), which opens each source link and records whether it loaded and when. That shows the page exists, not that it backs the claim. No stored rules: in the Nov 10 dental recording, the all-party consent fact (F1) cites a vendor blog, not the statute.

- [ ] Start with the rules behind the 10 scenarios:
  - call-recording consent and the HIPAA BAA
  - TCPA consent and opt-out for marketing texts
  - managers sharing tip pools under the FLSA
  - classifying workers as contractors
  - facial recognition in job interviews, and hiring bias
  - chatbot quotes that bind the business
  - client data pasted into free AI apps
  - the true cost of a merchant cash advance
  - notice requirements for biometric cameras
- [ ] For each rule, record: the statute or regulation, a plain-English summary, the source link, when it was last checked, and who reviewed it.
- [ ] Make the Researcher check the rule base before searching the web, and mark facts from it as verified with the citation.
- [ ] Flag any rule that hasn't been reviewed in 6 months.
- [ ] Expand state by state: Maryland first, then DC and Virginia.

## 3. Outcome data
**Why it's hard to copy:** a copier starts with no history. After a year, Crucible could tell an owner what happened to businesses that took similar advice. That only comes from real users over time.

**What we have:**
- **The signed call:** the owner's accept/override choice and note, stored in the session.
- **Reopening (since Nov 10):** the owner's browser can reopen a decision from `/?decision=<id>`, signed call included, and the home page lists them under **Your decisions**.
- **The catch:** sessions are wiped on every redeploy unless `CRUCIBLE_SESSION_DB` points to Postgres (see `README.md`).

- [ ] Store sessions in Postgres so decisions survive redeploys. The driver is installed; confirm `CRUCIBLE_SESSION_DB` (Neon) is set on the Vercel API project.
- [ ] Check in at 30, 60 and 90 days: did you follow the recommendation, what happened, would you decide the same way again?
- [ ] Ask the owner's consent before using outcomes in aggregate, and remove business identifiers.
- [ ] Feed outcomes back as evidence for the Chairman, e.g. "Of N owners who piloted first, M kept the tool."

## 4. A verified AI-tool catalog
**Why it's hard to copy:** this is the hackathon brief's "Angie's List" ask. Prices, BAAs, integrations and data terms change often, so keeping them checked is ongoing work a copier would also have to staff. Ratings come from board verdicts and real outcomes, not user reviews.

**What we have:** since Nov 10, each tool the board names carries:
- `url`: the official site;
- `price_fact`: the fact ID whose source states the price, when the Researcher found a pricing page;
- `pilot_test`: a keep-or-stop rule.

The verdict also has a no-new-tool option. In the Nov 10 recordings only the bakery's DoorDash price comes from a vendor pricing page (F9). Dental's RingCentral and HVAC's Housecall Pro are still "unknown".

- [ ] Seed the catalog with the tools the board names in the Nov 10 recordings: RingCentral AI Receptionist, Weave, DoorDash Marketplace, Housecall Pro Automated Texts, …
- [ ] For each tool, record: price tiers, whether the vendor signs a BAA, integrations (Dentrix, QuickBooks, Square, Housecall Pro…), whether it trains on customer data, contract term, the date checked, and the source.
- [ ] Have the AI-Tools Expert pick from the catalog first, then search for new tools and add them to a review queue.
- [ ] Rate tools by how often the board recommends them for similar businesses plus outcome data, and show the sample size.

## 5. Trusted partners and referrals
**Why it's hard to copy:** relationships take time and can't be copied with code. An owner trusts a referral from their SBDC advisor more than an ad.

**What we have:** the Chairman already sends owners to the Maryland SBDC and to an attorney (in the dental run's next steps and `escalate_to`).

- [ ] After the hackathon, ask the organizers about introducing Crucible to the [Maryland SBDC](https://www.marylandsbdc.org/about-us). It's a partnership of the SBA, the State of Maryland and UMD, and it offers Technology and AI Advisory Services.
- [ ] Build the hand-off: when the Chairman escalates, send the decision record to an SBDC advisor or a vetted professional, with the owner's OK.
- [ ] Talk to community lenders (CDFIs) about financing decisions, like the food-truck merchant cash advance scenario.

## 6. Real business data (a weak barrier)
**Why it's only weakly protective:** Claude for Small Business and others already connect to QuickBooks and similar tools, so this is expected, not a moat. It still matters: it lets the Realist check real cash and call logs instead of whatever the owner typed.

**What we have:** none. The dental run's next steps ask the owner to pull RingCentral call logs by hand.

- [ ] Add read-only connectors first: QuickBooks, Square, RingCentral call logs.
- [ ] Have the Realist cite the owner's own data as facts with their own IDs.

## Don't hand copiers the hard parts
**What we have:**
- The repo is private (GitHub returns 404 to anyone not logged in).
- Seat prompts and Researcher instructions live only in `backend/agents/crucible/seats.py`.
- The frontend ships only seat titles and one-line roles.
- The OpenRouter prepaid credit caps what the public demo can spend.

- [ ] Keep scenarios, the rule base, the catalog and the prompts on the server. Never bundle them into the frontend.
- [x] Rate-limit the public demo link so nobody can scrape verdicts in bulk. `backend/guard.py` (live since Nov 10):
  - per IP, 40 runs and 60 sessions an hour (10 and 30 until Nov 10, raised so a room of judges behind one venue IP isn't cut off); 100 runs a day in total; at most 3 at once
  - ADK's raw session listing is closed; a decision opens only with the owner's random id, and the decisions list returns summaries only
  - the per-IP part needs `CRUCIBLE_CLIENT_IP_HEADER` on Vercel; see `TODO.md`
- [ ] Before the finals, decide with the organizers what the team can show publicly, given that UMD owns the submission.

## One line for the video
"Anyone can copy five prompts. They can't copy a tested track record, a reviewed rule base, or real outcomes, and that's what our 16 weeks build."
