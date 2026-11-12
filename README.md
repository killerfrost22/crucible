<p align="center">
  <a href="https://smith26-crucible.vercel.app">
    <img src="videos/crucible-thumbnail.jpg" alt="Crucible" width="720">
  </a>
</p>

<h3 align="center">An AI board of advisors for small-business owners</h3>

<p align="center">
  Bring a decision. Five AI advisors research it and debate it over two rounds,<br>
  a Chairman recommends, and <b>the owner makes the final call</b>.
</p>

<p align="center">
  <a href="https://smith26-crucible.vercel.app"><b>Try it live</b></a>
  &nbsp;·&nbsp;
  <a href="https://smith26-crucible.vercel.app/under-the-hood">How it's built</a>
  &nbsp;·&nbsp;
  <a href="#run-locally">Run locally</a>
  &nbsp;·&nbsp;
  <a href="#deploy">Deploy</a>
</p>

<p align="center">
  <img alt="Python 3.14" src="https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white">
  <img alt="Google ADK 2.13" src="https://img.shields.io/badge/Google%20ADK-2.13-4285F4?logo=google&logoColor=white">
  <img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
  <img alt="Claude via OpenRouter" src="https://img.shields.io/badge/Claude-via%20OpenRouter-D97757?logo=anthropic&logoColor=white">
</p>

<br>

## The board

| Seat | Job |
|---|---|
| **Industry Expert** | What an experienced operator in this industry would do |
| **AI-Tools Expert** | Real AI products that would help carry out the decision, with cost and fit |
| **Realist** | Legal, compliance, money, and goals checks: *pass / flag / block* |
| **Strategist** | Second- and third-order effects; the next move after this one |
| **Devil's Advocate** | The strongest honest case against the leading option |
| **Chairman** | Weighs the debate and recommends: *proceed / pilot / defer / reject* |

One meeting is **12 model calls** (Researcher + 5 + 5 + Chairman) plus a link check. With the default models a meeting costs about **$0.12**, summed from OpenRouter's per-call charges for two eval meetings on Nov 10. It takes **70–120 s**: the board alone took 72–120 s in 22 eval runs, and one live meeting took 103 s end to end. Most of it is the Researcher's web search and the Chairman.

## How it works

```mermaid
flowchart TB
  UI["React frontend"]
  API["FastAPI + Google ADK"]
  UI -- "POST /run_sse (intake JSON)<br>PATCH session (ratification)<br>GET / DELETE session · GET decisions" --> API
  API -. "SSE: one event per finished node" .-> UI
  API --> W
  subgraph W["ADK graph workflow"]
    direction LR
    I[intake] --> R[Researcher] --> S[check_sources] --> R1["Round 1<br>5 seats in parallel"] --> R2["Round 2<br>5 rebuttals in parallel"] --> C[Chairman]
  end
  W --> LLM[("OpenRouter → Claude")]
```

| Path | What lives there |
|---|---|
| `backend/agents/crucible/agent.py` | The workflow graph: ADK 2.x `Workflow` + `JoinNode`; seats in a round run in parallel |
| `backend/agents/crucible/schemas.py` | Pydantic schemas for every model output, mirrored in `frontend/src/types.ts` |
| `backend/agents/crucible/seats.py` | Seat charges and the briefing each seat sees; seats cite shared evidence as F1, F2… |
| `backend/agents/crucible/sources.py` | `check_sources`: opens every cited link after the Researcher |
| `backend/main.py` | ADK's FastAPI app |
| `backend/guard.py` | Request guard in front of ADK, plus the past-decisions route |
| `backend/eval/` | Eval harness, trap scenarios, and the replay recorder |
| `frontend/src/home/` | Home page `/`: the product, a walkthrough of a recorded meeting, what each seat contributes, the four possible calls, recorded sessions, and the question form (`#convene`) |
| `frontend/src/underthehood/` | `/under-the-hood`, the technical explainer |
| `frontend/src/components/` | The meeting room: `Board.tsx` and `Crucible.tsx` |

### Under the hood

<details>
<summary><b>Source link checking</b> · <code>sources.py</code></summary>
<br>

After the Researcher, every fact whose source is an http(s) URL is opened and gets `check: {status, checked_at, http_status}`.

- **Request:** GET, closed after the headers; at most 3 redirects; 5 s per link, 8 s in all.
- **Status:**
  - `ok`: 2xx after redirects
  - `broken`: 404/410, or the host doesn't resolve
  - `unreachable`: anything else (401/403/429/5xx, timeouts, TLS errors, refused targets)
- **What seats see:** broken links are marked `(link broken)`.
- **Safety:** the links come from model output, so only http/https on default ports to public addresses are fetched. Every resolved address of every hop must be public, and the vetted address is the one dialled.

</details>

<details>
<summary><b>Request guard</b> · <code>guard.py</code></summary>
<br>

All routes come from ADK (sessions, `/run_sse`, session PATCH/GET/DELETE) except the past-decisions list and the error-report route. The guard sits in front of them:

- Only the eight routes the frontend and `record_replay.py` use are public; one of them is `DELETE` on a session, so an owner can delete a decision. ADK's raw session listing stays closed.
- Intakes, ratifications and feedback answers are validated (a session PATCH can carry only one of the last two, and the server sets its `at`), and runs are rate-limited before any model is called (see [guard limits](#configuration)).
- Rejections are JSON: `{"code": "CRUCIBLE_…", "detail": "…"}`.
- `GET /apps/crucible/users/{user}/decisions` is served by the guard from ADK's session listing: id, time, question, decision, headline, signed, finished; newest 50.
- `POST /client-errors` takes a front-end error report (kind, message, stack, page path; never what the owner typed), writes it to the server log and answers 204. Past 20 an hour from one IP, reports are dropped.
- The user id is a random version-4 UUID kept in the owner's browser, and it acts as its secret. Any other id, such as `test`, gets 404.

</details>

<details>
<summary><b>Frontend</b> · meeting room, themes, motion</summary>
<br>

- **Meeting room** (`Board.tsx`, `Crucible.tsx`): seat cards arrive as each SSE event lands. In the crucible, each opening position adds to the melt and rebuttals refine it; glowing lines connect seats, and concessions throw sparks. The Chairman's verdict pours out as a cast bar stamped with the decision, and the owner's call is stamped next to it.
- **The decision brief** (`DecisionBrief.tsx`): a finished meeting opens as a **Decision brief**, with the **Meeting transcript** (research, debate, full verdict) one click away; nothing reruns when you switch. The brief reads in order: recommendation, why (with the strongest objection), before you proceed (every condition and unresolved Realist block), action plan and AI tools, what would change it, the sources it cites, and **Your call**. Accepting approves a conditional plan and says which prerequisites are still open; it doesn't mark them done. **Print / Save as PDF** prints the brief in the light theme, whichever view is showing, without controls, animation or transcript (`styles/print.css`); a recording prints as "Recorded example, not your decision".
- **Saved decisions:** as soon as a live meeting's session exists, the URL becomes `/?decision=<session id>`. Reloading or reopening that link rebuilds the board from the saved session state (`boardFromState` in `lib/board.ts`) and shows the signed call; nothing reruns. The link only opens in the browser that holds the owner id, and anywhere else it shows "Decision not found". The home page lists this browser's decisions under **Your decisions**, and each saved decision ends with **Delete this decision** (a two-step confirm).
- **Question form:** only the question is required. The eight business-detail fields sit under **Add business details**, and a short warning against entering patient, customer or payment details comes before the first field. "What happens to what you type" says what goes to OpenRouter, Anthropic and web search, what Crucible keeps, what an error report contains, and how to delete a decision.
- **Feedback and errors:** a saved decision ends with "Was this useful?": one tap saves the answer on the decision, then an optional note. In production builds, uncaught errors, unhandled rejections and render errors are reported to `POST /client-errors` (`lib/errorReport.ts`), at most five distinct messages per page load. There are no analytics or cookies.
- **Honest labels:** a fact says *Link checked (date)*, *Couldn't open link*, *Link broken*, *Source found* (recordings from before the link check) or *No source*. Its F-number preview has an **Open source** link. The confidence is shown as the Chairman's own estimate. Tools are compared side by side: official link, where the price came from (a fact, or "AI estimate"), a pilot test, and the no-new-tool option. SBDC referrals link to the Maryland SBDC for a Maryland business and to America's SBDC locator anywhere else (`lib/sbdc.ts`).
- **Safety net:** every answer, live, recorded or saved, is checked against the schema in `lib/validate.ts` before it reaches the page. A misfit is left out and reported ("Part of this meeting couldn't be read"); nothing is invented to fill it. A render error anywhere in a view shows a recovery screen (`ErrorBoundary.tsx`) instead of a blank page.
- **Loading:** the meeting room and `/under-the-hood` are lazy chunks with their own CSS, so the home page doesn't download them.
- **Themes:** every colour is a token in `frontend/src/styles/tokens.css`, defined once for dark and once for light. `index.html` picks the theme before first paint (saved choice, else the OS setting), and `ThemeToggle` switches it on every page.
- **"Built by many hands"** (`underthehood/buildFx.ts`): one cursor per advisor assembles the `/under-the-hood` page. It is skipped under reduced motion; **Skip effect** in the corner, or any section link, ends it at once with everything visible. Below 1200 px, where the header's section links are hidden, a sticky **Contents** control names the section being read and jumps to any other.

</details>

## Run locally

> [!NOTE]
> Commands are for Windows. Requires **Python 3.14** and **Node 24**.

1. Put `OPENROUTER_API_KEY=...` in a `.env` at the repo root. [`.env.example`](.env.example) lists every setting.

2. Start the backend → http://127.0.0.1:8000

   ```bash
   cd backend
   python -m venv .venv
   .venv/Scripts/python.exe -m pip install -r requirements.txt
   .venv/Scripts/python.exe main.py
   ```

3. In a second terminal, start the frontend → http://localhost:5173

   ```bash
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

> [!TIP]
> ADK's developer UI lets you inspect single runs, events, and state:
> `cd backend && .venv/Scripts/adk web --port 8001 agents`. On first launch it asks about telemetry; answer `n`. If the
> `adk` launcher fails with "Unable to create process" (the `.venv` was created in another folder), run
> `.venv/Scripts/python.exe -m google.adk.cli web --port 8001 agents` instead.

### Configuration

Settings live in the repo-root `.env` locally, or in environment variables when deployed.

<details>
<summary><b>Models and keys</b></summary>
<br>

| Variable | Default | Notes |
|---|---|---|
| `OPENROUTER_API_KEY` | — | Needed for `openrouter/...` models (the defaults). Prepaid credit is a hard spend cap. |
| `GEMINI_API_KEY` | — | Optional; only for bare Gemini model names such as `gemini-3.5-flash-lite` |
| `CRUCIBLE_SEAT_MODEL` | `openrouter/anthropic/claude-haiku-5.5` | The five seats |
| `CRUCIBLE_<SEAT>_MODEL` | — | Per-seat override, e.g. `CRUCIBLE_REALIST_MODEL`, `CRUCIBLE_DEVILS_ADVOCATE_MODEL` |
| `CRUCIBLE_RESEARCHER_MODEL` | `openrouter/anthropic/claude-sonnet-5.5` | Gets `:online` (web search) appended when search is on |
| `CRUCIBLE_CHAIR_MODEL` | `openrouter/anthropic/claude-sonnet-5.5` | |
| `CRUCIBLE_WEB_SEARCH` | `true` | OpenRouter web search (~$0.007/run) or, for Gemini names, Google Search (billed key only) |

`openrouter/...` names go through LiteLLM; bare Gemini names go to Google directly. The free Gemini tier allows about 20 requests a day per model and has no web search, so it suits local experiments only.

</details>

<details>
<summary><b>Server and sessions</b></summary>
<br>

| Variable | Default | Notes |
|---|---|---|
| `CRUCIBLE_ALLOW_ORIGINS` | `http://localhost:5173` | Comma-separated frontend origins |
| `CRUCIBLE_SESSION_DB` | ADK local store | `sqlite:///sessions.db`, `postgresql+asyncpg://…?ssl=require` |
| `CRUCIBLE_CLIENT_IP_HEADER` | — (socket peer) | Header the per-IP limits read, e.g. `x-forwarded-for`. See [client IPs](#rate-limits-and-client-ips) for the value per host. |
| `CRUCIBLE_CLIENT_IP_HOP` | `1` | Which entry of that header, counted from the right (`1` = last) |

</details>

<details>
<summary><b>Guard limits</b> · <code>0</code> turns a limit off</summary>
<br>

| Variable | Default | Limits | Rejection |
|---|---|---|---|
| `CRUCIBLE_RUNS_PER_IP_PER_HOUR` | `40` | Board runs per client IP in any 60 minutes | 429 `CRUCIBLE_RATE_LIMIT` |
| `CRUCIBLE_SESSIONS_PER_IP_PER_HOUR` | `60` | New sessions per client IP in any 60 minutes | 429 `CRUCIBLE_RATE_LIMIT` |
| `CRUCIBLE_RUNS_PER_DAY` | `100` | Board runs in any 24 hours, all clients together | 429 `CRUCIBLE_DAILY_LIMIT` |
| `CRUCIBLE_MAX_CONCURRENT_RUNS` | `3` | Runs streaming at once; a slot frees when the stream ends, fails, or the client leaves | 503 `CRUCIBLE_BUSY` |
| `CRUCIBLE_MAX_BODY_BYTES` | `16384` | Request body size | 413 `CRUCIBLE_INTAKE_TOO_LARGE` |

</details>

## Evaluate

Ten trap scenarios in `eval/scenarios.json`, each with planted risks (`must_catch`), e.g. Maryland's all-party call-recording consent, or the FLSA rule against managers taking from a tip pool. `bakery-price-increase` is the control: no legal trap.

```bash
cd backend
.venv/Scripts/python.exe eval/run_eval.py                                   # all 10 scenarios
.venv/Scripts/python.exe eval/run_eval.py --only bakery-price-increase      # one scenario
.venv/Scripts/python.exe eval/run_eval.py --repeat 3                        # three board runs per scenario
.venv/Scripts/python.exe eval/run_eval.py --rejudge eval/results/<run>      # grade an earlier run again
```

Each scenario gets three answers, all on the Chairman's model or from it:

| Answer | What it is |
|---|---|
| Baseline | One plain prompt, no research |
| Baseline + research | The same prompt, given the board's own research, so sources alone don't decide the comparison |
| Board | The Chairman's verdict |

A judge model (`--judge-model`, the Chairman's model by default) grades the three blind: shuffled, unlabeled, fact IDs removed. For each planted risk, 2 = the recommendation is gated on it or changed by it, 1 = only mentioned, 0 = absent. It also scores how actionable each answer is (1–5) and lists claims it's confident are wrong. For the control, it checks for an invented legal blocker. A regex keyword check stays in the report as a secondary column.

- **Output:** `eval/results/<timestamp>/report.md`, plus a full transcript per scenario, the judge's grades and quotes, the board's time and what OpenRouter charged (board, and the whole scenario).
- **Reading the transcripts:** `review.md` next to a report logs the problems found by hand, each with a quote and a fix.

| Run (Nov 10) | What it is | Risk points: one prompt · + research · board | Confident errors |
|---|---|---|---|
| [`20261110-210818`](backend/eval/results/20261110-210818/report.md) | Before the prompt fixes; read by hand in [`review.md`](backend/eval/results/20261110-210818/review.md) | 29 · 30 · 30 of 30 | 5 · 5 · 2 |
| [`20261110-214837`](backend/eval/results/20261110-214837/report.md) | After the fixes from `review.md` | 28 · 30 · 30 of 30 | 4 · 3 · 0 |
| [`20261110-221043`](backend/eval/results/20261110-221043/report.md) | The control and the chatbot scenario again, after narrowing the Chairman's legal-condition rule | 4 · 4 · 4 of 4 | 0 · 0 · 0 |

On these traps a single prompt on Claude Sonnet 5.5 catches the planted risks too; the board's measured edge is fewer wrong claims and more actionable answers. Both of those are graded by a Claude judge, and each scenario ran once.

## Recorded replays

Replays are real runs saved as SSE. The frontend plays them back with the original timing, so demos work without quota.

```bash
cd backend   # the API must be running
.venv/Scripts/python.exe eval/record_replay.py dental-ai-receptionist
.venv/Scripts/python.exe eval/record_replay.py demos/bakery-second-location.json --out bakery-take-2
```

- **Input:** a scenario id from `eval/scenarios.json`, or a demo intake file under `eval/demos/`.
- **Output:** `frontend/public/replays/<name>.sse`, or `<name>-error.sse` if the run failed.
- **Show it on the home page:** add it to `REPLAYS` in `frontend/src/lib/replay.ts` to list it under "Watch a recorded session".
- **Quotes and labels follow the file:** `frontend/replaysPlugin.ts` reads every `public/replays/*.sse` at dev and build time. The home page quotes (`src/lib/featured.ts`, picked by rule and shortened only by whole sentences) and the `/under-the-hood` dental data (`src/underthehood/recorded.ts`) come from it, and so does each recording's label: its date, models and whether web search was on. Re-recording updates them all, with no copy to edit; in dev the page reloads on its own.
- **Open any replay directly:** `http://localhost:5173/?replay=<name>`. The meeting header has pause, 1×/2×/4×, and skip-to-end controls.
- **Test the error screen:** `dental-ai-receptionist-error` is a real failed run, where the Chairman hit a quota limit.

## Demo video

The video's meeting is the `bakery-second-location` replay: the best of three real takes, and the one where the board disagreed most.

| In `videos/` | What it is |
|---|---|
| `crucible-demo.mp4` | The finished video, with burned-in captions |
| `crucible-demo-no-captions.mp4` | The same cut without captions |
| `crucible-demo.srt` | Captions |
| `crucible-thumbnail.jpg` | YouTube thumbnail, 1280×720 |
| `Crucible video script.pdf`, `Video scenes.pdf` | Script and scene breakdown |
| `segments/` | Per-scene clips |
| `stems/` | Voice and music stems |
| `voiceover/` | The voiceover and its timed edit script |

> [!NOTE]
> The video and audio files are not in git (GitHub rejects files over 100 MB). Only the captions, scripts, scene PDFs, and thumbnail are committed.

## Deploy

| Live | URL |
|---|---|
| Frontend | https://smith26-crucible.vercel.app |
| Backend | https://hacks2026-corkboard-api.vercel.app |

### Frontend → Vercel

Root directory `frontend`; env `VITE_API_BASE=<backend URL>`. Vite inlines it at build time, so redeploy after changing it. `npm run build` fails when it is unset, so a deploy can't silently point visitors at `localhost`.

### Backend → Vercel

Each request can land on a different function instance, so sessions must live in Postgres.

1. Create a Vercel project from this repo with Root Directory `backend`. Vercel detects FastAPI from `requirements.txt` and serves `app` from `main.py`; `.python-version` selects Python 3.14.
2. Add **Storage → Neon Postgres**. Take the **unpooled** connection string (asyncpg's prepared-statement cache doesn't mix with transaction pooling) and rewrite it as:
   ```
   postgresql+asyncpg://USER:PASSWORD@HOST/DB?ssl=require
   ```
   ADK needs the `+asyncpg` driver, and asyncpg rejects `sslmode` and `channel_binding`.
3. Set the environment variables. Tables are created on first use.

   | Variable | Value |
   |---|---|
   | `OPENROUTER_API_KEY` | your key |
   | `CRUCIBLE_SESSION_DB` | the URL from step 2 |
   | `CRUCIBLE_ALLOW_ORIGINS` | `https://<your-app>.vercel.app` |
   | `CRUCIBLE_CLIENT_IP_HEADER` | `x-vercel-forwarded-for` |

4. Check: `curl https://<backend>.vercel.app/list-apps` returns `["crucible"]`.

### Backend → Cloud Run (alternative)

Builds `backend/Dockerfile` remotely. One instance keeps ADK's sessions consistent.

```bash
printf %s "sk-or-..." | gcloud secrets create openrouter-key --data-file=-   # printf: no trailing newline in the key
gcloud secrets add-iam-policy-binding openrouter-key --role roles/secretmanager.secretAccessor \
  --member serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com
gcloud run deploy crucible-api --source backend --region us-east1 --allow-unauthenticated \
  --min-instances 1 --max-instances 1 \
  --set-secrets OPENROUTER_API_KEY=openrouter-key:latest \
  --set-env-vars CRUCIBLE_ALLOW_ORIGINS=https://<your-app>.vercel.app,CRUCIBLE_CLIENT_IP_HEADER=x-forwarded-for
```

Without `CRUCIBLE_SESSION_DB`, ADK detects Cloud Run and keeps sessions in memory, so they reset on redeploy.

### Rate limits and client IPs

The guard keeps its limits in memory, per process. They are exact on Cloud Run with `--max-instances 1`; on Vercel each function instance counts separately, so the real ceilings are a multiple of the settings.

> [!IMPORTANT]
> At a venue, many visitors can share one public IP (NAT). Keep `CRUCIBLE_RUNS_PER_IP_PER_HOUR` loose for demos and rely on `CRUCIBLE_RUNS_PER_DAY` and `CRUCIBLE_MAX_CONCURRENT_RUNS` as the spend cap.

The client IP must come from a header your host sets, never from a value the caller can choose:

| Host | `CRUCIBLE_CLIENT_IP_HEADER` | `CRUCIBLE_CLIENT_IP_HOP` |
|---|---|---|
| Local / direct | — | — |
| Cloud Run (`*.run.app`) | `x-forwarded-for` | `1` |
| Cloud Run behind an external Application Load Balancer | `x-forwarded-for` | `2` |
| Vercel | `x-vercel-forwarded-for` | `1` |

<details>
<summary><b>Why these values</b></summary>
<br>

- **Local / direct:** the socket peer is the caller.
- **Cloud Run:** Google's front end appears to append the address it saw to whatever the caller sent, so only the last entry is trustworthy. This is inferred from the docs and an [example request](https://issuetracker.google.com/issues/239503543), not yet confirmed on our deploy: after deploying, check that two different networks get separate limits. The leftmost entry, "generally the client" ([Cloud Run functions headers](https://docs.cloud.google.com/functions/docs/reference/headers)), is spoofable. Without this setting every request shares the front end's address, so per-IP limits act as global limits.
- **Cloud Run behind a load balancer:** the LB appends `CLIENT_IP,LOAD_BALANCER_IP` and does not verify earlier entries ([LB docs](https://docs.cloud.google.com/load-balancing/docs/https#x-forwarded-for_header)).
- **Vercel:** Vercel overwrites `x-forwarded-for` "to prevent IP spoofing"; `x-vercel-forwarded-for` has the same value even if another proxy sits in front ([Vercel request headers](https://vercel.com/docs/headers/request-headers#x-forwarded-for)).

</details>

## Team

| Yizhan | Ruijie | Tiffany |
|:---:|:---:|:---:|
| Developer | Tester | Video producer |

Music in the demo video: Kevin MacLeod ([incompetech.com](https://incompetech.com)), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
