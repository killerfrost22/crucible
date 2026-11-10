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

One meeting is **12 model calls** (Researcher + 5 + 5 + Chairman) plus a link check. With the default models, measured runs cost **$0.06–0.12** and take **75–100 s** (four runs on Nov 10; it was 50–85 s before the link check and the longer tool and verdict fields), mostly the Researcher's web search and the Chairman.

## How it works

```mermaid
flowchart TB
  UI["React frontend"]
  API["FastAPI + Google ADK"]
  UI -- "POST /run_sse (intake JSON)<br>PATCH session (ratification)<br>GET session · GET decisions" --> API
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
| `frontend/src/home/` | Home page `/`: the product, the five seats, an example verdict, recorded sessions, and the question form (`#convene`) |
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

All routes come from ADK (sessions, `/run_sse`, session PATCH/GET) except the past-decisions list. The guard sits in front of them:

- Only the six routes the frontend and `record_replay.py` use are public. ADK's raw session listing stays closed.
- Intakes and ratifications are validated, and runs are rate-limited before any model is called (see [guard limits](#configuration)).
- Rejections are JSON: `{"code": "CRUCIBLE_…", "detail": "…"}`.
- `GET /apps/crucible/users/{user}/decisions` is served by the guard from ADK's session listing: id, time, question, decision, headline, signed, finished; newest 50.
- The user id is a random UUID kept in the owner's browser, and it acts as its secret.

</details>

<details>
<summary><b>Frontend</b> · meeting room, themes, motion</summary>
<br>

- **Meeting room** (`Board.tsx`, `Crucible.tsx`): seat cards arrive as each SSE event lands. In the crucible, each opening position adds to the melt and rebuttals refine it; glowing lines connect seats, and concessions throw sparks. The Chairman's verdict pours out as a cast bar stamped with the decision, and the owner's call is stamped next to it.
- **The brief** (`DecisionBrief` in `Verdict.tsx`): once the verdict lands, a card under the question shows the decision, up to three reasons, the strongest objection, the open gates (including any Realist block), the first next step and **Your call**. The research and the debate stay open below it, each with a Show/Hide toggle.
- **Saved decisions:** as soon as a live meeting's session exists, the URL becomes `/?decision=<session id>`. Reloading or reopening that link rebuilds the board from the saved session state (`boardFromState` in `lib/board.ts`) and shows the signed call; nothing reruns. The link only opens in the browser that holds the owner id, and anywhere else it shows "Decision not found". The home page lists this browser's decisions under **Your decisions**.
- **Honest labels:** a fact says *Link checked (date)*, *Couldn't open link*, *Link broken*, *Source found* (recordings from before the link check) or *No source*. Its F-number preview has an **Open source** link. The confidence is shown as the Chairman's own estimate. Tools are compared side by side: official link, where the price came from (a fact, or "AI estimate"), a pilot test, and the no-new-tool option.
- **Themes:** every colour is a token in `frontend/src/styles/tokens.css`, defined once for dark and once for light. `index.html` picks the theme before first paint (saved choice, else the OS setting), and `ThemeToggle` switches it on every page.
- **"Built by many hands"** (`underthehood/buildFx.ts`): one cursor per advisor assembles the `/under-the-hood` page. It is skipped under reduced motion.

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
> `cd backend && .venv/Scripts/adk web --port 8001 agents`. On first launch it asks about telemetry; answer `n`.

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
| `CRUCIBLE_RUNS_PER_IP_PER_HOUR` | `10` | Board runs per client IP in any 60 minutes | 429 `CRUCIBLE_RATE_LIMIT` |
| `CRUCIBLE_SESSIONS_PER_IP_PER_HOUR` | `30` | New sessions per client IP in any 60 minutes | 429 `CRUCIBLE_RATE_LIMIT` |
| `CRUCIBLE_RUNS_PER_DAY` | `100` | Board runs in any 24 hours, all clients together | 429 `CRUCIBLE_DAILY_LIMIT` |
| `CRUCIBLE_MAX_CONCURRENT_RUNS` | `3` | Runs streaming at once; a slot frees when the stream ends, fails, or the client leaves | 503 `CRUCIBLE_BUSY` |
| `CRUCIBLE_MAX_BODY_BYTES` | `16384` | Request body size | 413 `CRUCIBLE_INTAKE_TOO_LARGE` |

</details>

## Evaluate

Ten trap scenarios in `eval/scenarios.json`, each with planted risks (`must_catch`), e.g. Maryland's all-party call-recording consent, or the FLSA rule against managers taking from a tip pool.

```bash
cd backend
.venv/Scripts/python.exe eval/run_eval.py                               # all 10 scenarios (130 calls)
.venv/Scripts/python.exe eval/run_eval.py --only bakery-price-increase  # one scenario
```

The report counts the planted risks each approach surfaced:

| Column | What it scores |
|---|---|
| Baseline | One plain prompt, same model as the Chairman |
| Board | Anywhere in the full board's evidence or debate |
| Verdict | The Chairman's final recommendation alone |

Output: `eval/results/<timestamp>/report.md`, plus a full transcript per scenario.

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
