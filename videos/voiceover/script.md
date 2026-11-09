# Crucible demo — edit and voiceover script

Cut length 9:07.73. Times are positions in `crucible-demo.mp4`. Voices are ElevenLabs (`eleven_multilingual_v2`): narrator **Jessica** (bright female voice; other candidates are in `narrator-samples/`), Industry Expert Bill, AI-Tools Expert Will, Realist Matilda, Strategist Daniel, Devil's Advocate Callum, Chairman George. Every advisor and Chairman line quotes the recorded bakery session (`frontend/public/replays/bakery-second-location.sse`); the matching sentence is highlighted on the advisor's card in its seat color while it is spoken. Yizhan's lines are his own on-camera audio from the Nov 8 retakes in `videos/Retakes/`, noise-reduced and set slightly louder than the narrator; their captions are clean verbatim from a local Whisper transcript.

App scenes are screen recordings of a 1280×720 browser at 2× (2560×1440), reframed in post with eased push-ins on the card, fact or field being discussed.

## Edit

| Scene | Starts | Source | Out |
|---|---|---|---|
| 01-cold-open · Cold open (Maria, 2 a.m.) | 0:00.00 | `Crucible-videos/scene1.MOV` 3.66–10.6 s, 13.8–18.4 s, 18.4–24.3 s | cut |
| 02-problem · The problem (Yizhan on camera) | 0:16.70 | `videos/Retakes/scene2.MOV` 0.0–29.45 s, with the full-screen comparison/chatbot graphic over 3.74–23.18 s | crossfade 0.6s |
| 03-meet-crucible · Meet Crucible (Yizhan on camera) | 0:45.57 | `videos/Retakes/scene3.MOV` 0.3–24.3 s, cutting to the crucible melt from the home-page recording over 4.9–12.0 s | crossfade 0.4s |
| 04-meet-the-board · Meet the board (Yizhan on camera) | 1:09.17 | `videos/Retakes/Scene4 Meet the board.MOV` 0.0–40.95 s, each advisor's card cut in as he names it, and each advisor then seated as a hologram in an empty chair (tracked to the handheld camera; Strategist, Realist, Industry Expert, Devil's Advocate, Chairman); then the board recording for the AI-Tools Expert and the Researcher (narrator) | crossfade 0.4s |
| 05-ask-the-board · Ask the board | 2:04.63 | `videos/Retakes/back-to-maria.mov` 0.2–5.8 s (Maria at the iPad), then screen recording | crossfade 0.3s |
| 06-research · Research | 2:32.27 | screen recording / card | cut |
| 07-round-one · Round 1 | 2:55.57 | screen recording / card | cut |
| 08-round-two · Round 2 | 3:52.33 | screen recording / card | cut |
| 09-verdict · The verdict | 5:06.63 | screen recording / card | cut |
| 10-your-call · Your call | 5:55.80 | screen recording / card | slide left 0.5s |
| 11-more-examples · More decisions | 6:07.27 | screen recording / card | cut |
| 12a-whiteboard · How it's built (Yizhan at the whiteboard) | 6:41.20 | `videos/Retakes/how it works.MOV` 0.0–26.4 s | crossfade 0.5s |
| 12b-under-the-hood · Under the hood | 7:07.10 | screen recording / card | cut |
| 13a-next · What's next (Yizhan on camera) | 8:02.30 | `videos/Retakes/why it matters and what's next.MOV` 0.0–19.3 s | crossfade 0.5s |
| 13b-roadmap · The next 16 weeks | 8:21.10 | screen recording / card | dip to black 0.6s |
| 14-close · Close | 8:41.87 | screen recording / card | cut |
| 15-credits · Credits (team) | 8:50.93 | `crucible-credits.mp4` (Yizhan: photo `videos/Retakes/Yizhan.HEIC`) | end |

## Music (Kevin MacLeod, incompetech.com, CC BY 4.0 — credited in the credits)

| Track | Track position | In the video |
|---|---|---|
| Blue Feather | 0:03.00–0:50.57 | 0:00.00–0:47.57 |
| Inspired | 0:01.50–1:50.70 | 0:45.07–2:34.27 |
| Floating Cities | 0:03.50–2:39.87 | 2:31.77–5:08.13 |
| Deliberate Thought | 0:03.00–1:06.66 | 5:05.63–6:09.30 |
| Inspired | 1:40.00–3:55.83 | 6:06.80–8:22.63 |
| Deliberate Thought | 2:09.56–2:57.16 | 8:20.13–9:07.73 |

Mix: whole soundtrack normalized to −16 LUFS integrated, −1.5 dBTP. Music sits about 16 dB under the narrator, eases up in pauses and crossfades over 2.5 s between tracks. Yizhan's on-camera audio (02, 03, 04, 12a, 13a) is noise-reduced (RNNoise + spectral denoise + a gentle gate), EQ'd for clarity, compressed, and set 2 dB louder than the narrator; the music ducks a further 6 dB under him. `stems/voice.m4a` + `stems/music.m4a` add up to the final soundtrack; `segments/` are the scenes with voice only.

## Lines

### 0:00.00 · Cold open (Maria, 2 a.m.)

- `0:02.20` **Narrator:** It's two in the morning. The bakery closed six hours ago, but Maria is still awake. A storefront just came up for lease on Route 1, and she has one big decision to make. If she gets it wrong, she could lose everything she's built.

### 0:16.70 · The problem (Yizhan on camera)

- `0:16.90` **Yizhan (on camera):** Small businesses make decisions like this all the time, and usually alone.
- `0:20.58` **Yizhan (on camera):** Big companies have a board of directors, analysts, consultants,
- `0:24.30` **Yizhan (on camera):** whose whole job is to make decisions for them and push back on bad decisions.
- `0:29.24` **Yizhan (on camera):** A small business has a search bar,
- `0:30.96` **Yizhan (on camera):** and a regular AI chatbot that tends to agree with anything you say
- `0:34.48` **Yizhan (on camera):** and that you already believe in.
- `0:36.04` **Yizhan (on camera):** That feels good, but it's not advice. It's an echo.
- `0:40.10` **Yizhan (on camera):** What owners need is someone to challenge them before the money is spent.
- `0:44.20` **Yizhan (on camera):** Introducing Crucible.

### 0:45.57 · Meet Crucible (Yizhan on camera)

- `0:46.11` **Yizhan (on camera):** I'm Yizhan. With my teammates Tiffany and Ruijie, we built Crucible.
- `0:49.55` **Yizhan (on camera):** A crucible is a vessel where metal is melted under extreme heat,
- `0:53.29` **Yizhan (on camera):** so the impurities burn off and only the strongest metal remains.
- `0:56.93` **Yizhan (on camera):** That's what we do with ideas.
- `0:59.11` **Yizhan (on camera):** Crucible gives every business owner a board of AI advisors
- `1:02.03` **Yizhan (on camera):** that argue your decision under extreme pressure,
- `1:05.01` **Yizhan (on camera):** until only the good answer survives.
- `1:07.99` **Yizhan (on camera):** Meet your board.

### 1:09.17 · Meet the board (Yizhan on camera)

- `1:09.37` **Yizhan (on camera):** Here's your board.
- `1:10.81` **Yizhan (on camera):** The Strategist thinks in years, not weeks.
- `1:13.35` **Yizhan (on camera):** He asks, where does this decision take you in the long term?
- `1:16.83` **Yizhan (on camera):** The Realist lives in the numbers: cash, time, staffing.
- `1:21.13` **Yizhan (on camera):** He asks, can you actually pull this off?
- `1:23.89` **Yizhan (on camera):** Now the Expert knows your industry: benchmarks, trends,
- `1:27.57` **Yizhan (on camera):** and what has worked for businesses like yours.
- `1:30.23` **Yizhan (on camera):** He asks, what does experience in your industry say?
- `1:33.41` **Yizhan (on camera):** The Devil's Advocate has one job: find the flaw.
- `1:37.21` **Yizhan (on camera):** Every assumption you make, it attacks.
- `1:40.05` **Yizhan (on camera):** Now back to the Chairman, who runs the entire meeting.
- `1:43.25` **Yizhan (on camera):** It doesn't take anyone's side.
- `1:45.07` **Yizhan (on camera):** He hears the entire debate, weighs the evidence, and makes the final call.
- `1:50.17` **Narrator:** The AI-Tools Expert knows which AI products are real, what they cost, and what they plug into.
- `1:57.00` **Narrator:** Before anyone speaks, a Researcher searches the web for the facts they'll all argue from, each one numbered and linked to its source.

### 2:04.63 · Ask the board

- `2:05.43` **Narrator:** Back to Maria. She opens Crucible and types her question: should I open a second location, or invest in delivery first? She's leaning toward the new store.
- `2:17.17` **Narrator:** Then she adds what an advisor would ask: about forty-two thousand dollars a month in revenue, ninety thousand in savings, six months of runway, and no manager, because she bakes every morning herself. And she convenes the board.

### 2:32.27 · Research

- `2:32.96` **Narrator:** First, the Researcher goes to the web. It comes back with thirteen facts, and twelve are verified with a source: build-out costs for bakery space, College Park rents from LoopNet, Prince George's County food-service permit rules, and the commission delivery apps take on every order.
- `2:51.97` **Narrator:** Every advisor now argues from the same evidence.

### 2:55.57 · Round 1

- `2:56.26` **Narrator:** Round one. Each advisor gives an opening position, without seeing the others.
- `3:01.35` **Industry Expert:** Don't open Route 1 now. A second store needs far more than $90,000, and your first store has no manager while you bake every morning.
- `3:11.37` **Strategist:** A second store would drain the runway that protects your first store. Delivery through your own Square channel costs little and tests demand cheaply.
- `3:22.41` **Devil's Advocate:** Opening a second store with $90,000 risks your first store, which pays for everything.
- `3:28.76` **Realist:** A second store would likely cost far more than your $90,000, and you would need a certified food manager on site at both places.
- `3:37.01` **AI-Tools Expert:** Add commission-free Square Online delivery now, then reconsider a smaller space in 6 to 12 months.
- `3:43.50` **Narrator:** Every seat pushes back, even the Devil's Advocate, whose job is to attack the owner's leaning. An echo would have said yes.

### 3:52.33 · Round 2

- `3:53.03` **Narrator:** Round two. Now the advisors answer each other by name, and the Devil's Advocate turns on the room.
- `4:03.76` **Devil's Advocate:** Oppose waiting. Delivery won't fix a near-capped store. The Route 1 space may be leased quickly, and nothing shows a comparable space will appear in 6 to 12 months. Waiting trades a known option for a guess.
- `4:20.32` **Strategist:** Right, and the lock-in is the real cost. But a Route 1 lease might be negotiable on term or guarantee. That's something an attorney should test.
- `4:31.78` **AI-Tools Expert:** Own-channel delivery still costs the $6.99 courier fee, plus card fees. Charge the customer the delivery fee, or small orders lose money.
- `4:41.01` **Narrator:** And the Realist changes its mind.
- `4:43.32` **Realist:** The Strategist's point that delivery tests are cheap and reversible, plus the Devil's Advocate's point that a 5-to-10-year lease locks in costs, moved me from conditional to oppose on signing now.
- `4:55.61` **Narrator:** Nobody won by being loudest. The weak arguments burned off, and the plan got sharper: not never, but not yet, and here's how to find out.

### 5:06.63 · The verdict

- `5:07.43` **Narrator:** Then the Chairman weighs both rounds.
- `5:11.38` **Chairman:** Pilot. Don't sign Route 1 now. Hire a manager and test Square delivery.
- `5:16.66` **Narrator:** Seventy-eight percent confident, with the reasons spelled out. A second site likely costs a hundred and fifty to five hundred thousand dollars, against ninety thousand in savings. It would need its own certified food manager. And a five-to-ten-year lease may carry a personal guarantee.
- `5:33.56` **Narrator:** The dissent stays on the record: the Devil's Advocate warns that waiting may lose Route 1 for good.
- `5:40.19` **Narrator:** And Maria gets steps she can start this week: ask the landlord for the real lease terms, pull her Square reports to find her true profit, turn on Square Online for pickup, and book a free session with the Maryland Small Business Development Center.

### 5:55.80 · Your call

- `5:56.50` **Narrator:** The board advises. Maria decides. She can accept the recommendation, or override it and write down why. Tonight, she can finally sleep.

### 6:07.27 · More decisions

- `6:07.96` **Narrator:** And it works for any decision.
- `6:10.23` **Narrator:** A dental office in Silver Spring asks whether an AI receptionist should answer and record its calls. The board catches Maryland's rule that everyone on a call must agree to recording, and the HIPAA agreement the vendor would have to sign.
- `6:25.08` **Narrator:** An HVAC shop in Frederick wants to text a promotion to every past customer. The board flags federal consent rules for marketing texts, and pilots a small batch of opted-in customers instead.
- `6:37.01` **Narrator:** Same board. Same fight. A clear answer every time.

### 6:41.20 · How it's built (Yizhan at the whiteboard)

- `6:41.20` **Yizhan (at the whiteboard):** Under the hood, each advisor is its own AI agent,
- `6:44.02` **Yizhan (at the whiteboard):** with a distinct role, goals and personality.
- `6:47.24` **Yizhan (at the whiteboard):** Crucible gives them the question and the owner's context,
- `6:50.10` **Yizhan (at the whiteboard):** then runs structured debate rounds, where each agent has to answer the others.
- `6:55.70` **Yizhan (at the whiteboard):** The full transcript goes to the Chairman,
- `6:57.54` **Yizhan (at the whiteboard):** who weighs the strongest arguments into a final decision.
- `7:01.46` **Yizhan (at the whiteboard):** OpenRouter gives a great benefit with AI agents,
- `7:04.30` **Yizhan (at the whiteboard):** where we can use multiple of them at the same time.

### 7:07.10 · Under the hood

- `7:08.20` **Narrator:** In code, Crucible is a graph of seven agents built with Google's Agent Development Kit: a Researcher with live web search, five seats that run in parallel each round, and a Chairman. The seats run on Claude Haiku, the Researcher and Chairman on Claude Sonnet, all through OpenRouter, with a React front end and a FastAPI back end.
- `7:31.43` **Narrator:** Every answer has to fit a strict schema. Facts carry numbers, the Realist's checks are pass, flag or block, and an advisor can rebut anyone but itself. The meeting streams to the browser one step at a time, so you can watch the board think.
- `7:46.58` **Narrator:** And we test it. Ten business scenarios with legal traps planted in them, scored against a single plain AI prompt. In an early test on the dental case, the single prompt missed both planted risks. The board caught both.

### 8:02.30 · What's next (Yizhan on camera)

- `8:02.30` **Yizhan (on camera):** Why it matters? Most small businesses can't afford consultants or a real board.
- `8:08.12` **Yizhan (on camera):** Crucible gives them the same pushback for the price of a question.
- `8:12.80` **Yizhan (on camera):** Next, we want owners to save their decisions,
- `8:15.82` **Yizhan (on camera):** ask follow-ups to any advisor, and build custom boards for their industry.

### 8:21.10 · The next 16 weeks

- `8:22.00` **Narrator:** Over sixteen weeks, that becomes a decision history that records how each call turned out, follow-up questions for any advisor, boards tuned to each industry, real numbers from QuickBooks and Square, and a hand-off to a Maryland SBDC advisor when the stakes are high. And each meeting costs about ten cents.

### 8:41.87 · Close

- `8:43.07` **Narrator:** Crucible. Where decisions are forged. Built by Yizhan, Tiffany and Ruijie.

### 8:50.93 · Credits (team)

- (music only)
