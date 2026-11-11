"""Front door for the public API: route allowlist, input checks and spend limits, ahead of ADK.

ADK's FastAPI app exposes every ADK route (dev endpoints, session listing, raw state writes) and
each `/run_sse` costs 12 paid model calls, so `Guard` admits only what the frontend and the eval
scripts use:

  GET   /list-apps                                     deploy check
  POST  /apps/crucible/users/{user}/sessions           body ignored (no client-chosen ids or state)
  POST  /run_sse                                       one Intake, validated before any model call
  PATCH /apps/crucible/users/{user}/sessions/{session} ratification only; `at` is set by the server
  GET   /apps/crucible/users/{user}/sessions/{session} reopen one decision (ADK's route, unchanged)
  DELETE /apps/crucible/users/{user}/sessions/{session} the owner deletes a decision (ADK's route, unchanged)
  GET   /apps/crucible/users/{user}/decisions          the user's decisions, summarised (served here)

plus OPTIONS on those paths. The user id is a random UUID kept in the owner's browser and acts as
its secret; ADK's raw session listing stays closed and `decisions` returns only small summaries.
Rejections are JSON `{"code", "detail"}` (and `retry_after_s` with a `Retry-After` header on 429s).
`Guard` is pure ASGI, so SSE streams pass through unbuffered, and it must sit inside ADK's CORS
middleware so that browsers can read its errors (see main.py).

Limits live in this process's memory: they are exact only with a single instance.
"""

from __future__ import annotations

import ipaddress
import json
import logging
import math
import os
import re
import time
from collections import deque
from collections.abc import Awaitable, Callable, MutableMapping
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

import anyio
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

Scope = MutableMapping[str, Any]
Message = MutableMapping[str, Any]
Receive = Callable[[], Awaitable[Message]]
Send = Callable[[Message], Awaitable[None]]
ASGIApp = Callable[[Scope, Receive, Send], Awaitable[None]]

log = logging.getLogger(__name__)

APP_NAME = "crucible"
HOUR = 3600.0
DAY = 86400.0
SWEEP_EVERY = 300.0

_ID = r"[^/]{1,128}"
_SESSIONS_PATH = re.compile(rf"/apps/{APP_NAME}/users/{_ID}/sessions")
_SESSION_PATH = re.compile(rf"/apps/{APP_NAME}/users/{_ID}/sessions/{_ID}")
_DECISIONS_PATH = re.compile(rf"/apps/{APP_NAME}/users/{_ID}/decisions")
MAX_DECISIONS = 50
_DECISION_KINDS = ("proceed", "pilot", "defer", "reject")
_HISTORY_UNAVAILABLE = "Crucible couldn't load your past decisions. Try again in a minute."


@dataclass(frozen=True)
class Limits:
    """Guard settings; 0 disables a limit."""

    runs_per_ip_per_hour: int = 10
    sessions_per_ip_per_hour: int = 30
    runs_per_day: int = 100
    max_concurrent_runs: int = 3
    max_body_bytes: int = 16384
    # Header holding the client IP as appended by a proxy you trust; empty = the socket peer.
    client_ip_header: str = ""
    # Which entry of that comma-separated header, counted from the right (1 = last).
    client_ip_hop: int = 1

    @classmethod
    def from_env(cls) -> Limits:
        def number(name: str, default: int, minimum: int = 0) -> int:
            raw = os.getenv(name, "").strip()
            if not raw:
                return default
            try:
                value = int(raw)
            except ValueError:
                raise ValueError(f"{name} must be a whole number, got {raw!r}") from None
            if value < minimum:
                raise ValueError(f"{name} must be at least {minimum}, got {value}")
            return value

        return cls(
            runs_per_ip_per_hour=number("CRUCIBLE_RUNS_PER_IP_PER_HOUR", cls.runs_per_ip_per_hour),
            sessions_per_ip_per_hour=number("CRUCIBLE_SESSIONS_PER_IP_PER_HOUR", cls.sessions_per_ip_per_hour),
            runs_per_day=number("CRUCIBLE_RUNS_PER_DAY", cls.runs_per_day),
            max_concurrent_runs=number("CRUCIBLE_MAX_CONCURRENT_RUNS", cls.max_concurrent_runs),
            max_body_bytes=number("CRUCIBLE_MAX_BODY_BYTES", cls.max_body_bytes),
            client_ip_header=os.getenv("CRUCIBLE_CLIENT_IP_HEADER", "").strip().lower(),
            client_ip_hop=number("CRUCIBLE_CLIENT_IP_HOP", cls.client_ip_hop, minimum=1),
        )


# ── Request bodies ────────────────────────────────────────────────────────────


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


ListItem = Annotated[str, Field(max_length=100)]


class _Profile(_Strict):
    name: str = Field("", max_length=200)
    industry: str = Field("", max_length=200)
    location: str = Field("", max_length=200)
    size: str = Field("", max_length=200)
    current_tools: list[ListItem] = Field(default_factory=list, max_length=20)
    budget: str = Field("", max_length=200)
    goals: list[ListItem] = Field(default_factory=list, max_length=20)
    constraints: str = Field("", max_length=2000)


class _Intake(_Strict):
    question: str = Field(max_length=1000)
    leaning: str = Field("", max_length=500)
    profile: _Profile = Field(default_factory=_Profile)

    @field_validator("question")
    @classmethod
    def _not_blank(cls, question: str) -> str:
        # The workflow's Intake needs 3 characters; catch it here instead of mid-stream.
        if len(question.strip()) < 3:
            raise ValueError("blank question")
        return question


class _Part(_Strict):
    text: str


class _NewMessage(_Strict):
    role: Literal["user"] = "user"
    parts: list[_Part] = Field(min_length=1, max_length=1)


class _RunRequest(_Strict):
    appName: Literal["crucible"]
    userId: str = Field(min_length=1, max_length=128)
    sessionId: str = Field(min_length=1, max_length=128)
    newMessage: _NewMessage
    streaming: bool = False


class _Ratification(_Strict):
    action: Literal["accept", "override"]
    note: str = Field(max_length=2000)
    at: str = Field(max_length=64)

    @model_validator(mode="after")
    def _override_needs_note(self) -> _Ratification:
        if self.action == "override" and not self.note.strip():
            raise ValueError("override without a note")
        return self


class _StateDelta(_Strict):
    ratification: _Ratification


class _RatifyRequest(_Strict):
    stateDelta: _StateDelta


_FIELD_LABELS = {
    "question": "your question",
    "leaning": "your leaning",
    "name": "the business name",
    "industry": "the industry",
    "location": "the location",
    "size": "the business size",
    "budget": "the budget",
    "constraints": "the constraints",
    "current_tools": "the current tools list",
    "goals": "the goals list",
}
_UNREADABLE = "Crucible couldn't read that request. Reload the page and try again."


def _intake_problem(error: ValidationError) -> str:
    """One sentence for the owner about the first thing wrong with their intake."""
    first = error.errors()[0]
    loc = [part for part in first["loc"] if isinstance(part, str)]
    label = _FIELD_LABELS.get(loc[-1]) if loc else None
    limit = (first.get("ctx") or {}).get("max_length")
    if loc == ["question"] and first["type"] in ("missing", "value_error"):
        return "Describe the decision you're weighing in at least a few words."
    if label and limit is not None and first["type"] == "string_too_long":
        if isinstance(first["loc"][-1], int):
            return f"Each item in {label} must be {limit:,} characters or fewer."
        return f"{label.capitalize()} is too long: keep it to {limit:,} characters or fewer."
    if label and limit is not None and first["type"] == "too_long":
        return f"{label.capitalize()} has too many items: list {limit} or fewer."
    return _UNREADABLE


def _ratification_problem(error: ValidationError) -> str:
    first = error.errors()[0]
    if first["type"] == "value_error":
        return "Add a short note saying why you're overriding the board."
    if first["type"] == "string_too_long" and first["loc"][-1] == "note":
        return "Your note is too long: keep it to 2,000 characters or fewer."
    return "Crucible couldn't save your decision. Reload the page and try again."


def _parse_json(body: str | bytes) -> Any:
    try:
        return json.loads(body)
    except (ValueError, RecursionError):
        return None


# ── Limits ────────────────────────────────────────────────────────────────────


class SlidingWindow:
    """At most `limit` admissions per key in any `span` seconds; limit 0 admits everything."""

    def __init__(self, limit: int, span: float) -> None:
        self.limit = limit
        self.span = span
        self._hits: dict[str, deque[float]] = {}

    def retry_after(self, key: str, now: float) -> float | None:
        """Seconds until `key` may be admitted again, or None if it may be admitted now."""
        hits = self._hits.get(key)
        if not self.limit or hits is None:
            return None
        while hits and hits[0] <= now - self.span:
            hits.popleft()
        if len(hits) < self.limit:
            return None
        return hits[0] + self.span - now

    def record(self, key: str, now: float) -> None:
        if self.limit:
            self._hits.setdefault(key, deque()).append(now)

    def sweep(self, now: float) -> None:
        """Forget keys whose admissions have all expired."""
        for key in [k for k, hits in self._hits.items() if not hits or hits[-1] <= now - self.span]:
            del self._hits[key]


def _ip_key(raw: str) -> str | None:
    """Rate-limit key for an address: the IP itself, or its /64 for IPv6 (one subscriber)."""
    try:
        ip = ipaddress.ip_address(raw.strip().strip("[]"))
    except ValueError:
        return None
    if ip.version == 6:
        if ip.ipv4_mapped is not None:
            return str(ip.ipv4_mapped)
        return str(ipaddress.ip_network(f"{ip}/64", strict=False))
    return str(ip)


def _count(n: int, noun: str) -> str:
    return f"{n} {noun}{'' if n == 1 else 's'}"


def _wait_phrase(seconds: float) -> str:
    minutes = seconds / 60
    if minutes < 1.5:
        return "a minute"
    if minutes < 90:
        return f"{round(minutes)} minutes"
    return f"{round(minutes / 60)} hours"


# ── Middleware ────────────────────────────────────────────────────────────────


class _BodyTooLarge(Exception):
    pass


class _Disconnected(Exception):
    pass


class Guard:
    """Pure ASGI middleware; see the module docstring."""

    def __init__(self, app: ASGIApp, limits: Limits | None = None) -> None:
        self.app = app
        self.limits = limits or Limits.from_env()
        self.runs_per_ip = SlidingWindow(self.limits.runs_per_ip_per_hour, HOUR)
        self.sessions_per_ip = SlidingWindow(self.limits.sessions_per_ip_per_hour, HOUR)
        self.runs_per_day = SlidingWindow(self.limits.runs_per_day, DAY)
        self.active_runs = 0
        self._last_sweep = time.monotonic()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "lifespan":
            await self.app(scope, receive, send)
            return
        if scope["type"] != "http":
            # No websocket route is public (ADK's /run_live included); closing before accept is a 403.
            await send({"type": "websocket.close", "code": 1008})
            return

        route = _route(scope["method"], scope["path"])
        if route is None:
            await _reject(send, 404, "CRUCIBLE_NOT_FOUND", "Crucible doesn't offer that.")
            return
        if route == "pass":
            await self.app(scope, receive, send)
            return

        try:
            body = await self._read_body(scope, receive)
        except _BodyTooLarge:
            await _reject(
                send, 413, "CRUCIBLE_INTAKE_TOO_LARGE",
                "That's more than Crucible can read at once. Shorten your question or business details and try again.",
            )
            return
        except _Disconnected:
            return

        now = time.monotonic()
        if now - self._last_sweep > SWEEP_EVERY:
            self._last_sweep = now
            for window in (self.runs_per_ip, self.sessions_per_ip, self.runs_per_day):
                window.sweep(now)

        if route == "session":
            await self._create_session(scope, receive, send, now)
        elif route == "ratify":
            await self._ratify(scope, receive, send, body)
        elif route == "decisions":
            await self._decisions(scope, receive, send)
        else:
            await self._run(scope, receive, send, body, now)

    async def _read_body(self, scope: Scope, receive: Receive) -> bytes:
        cap = self.limits.max_body_bytes
        if cap:
            declared = _header(scope, b"content-length")
            if declared is not None and (not declared.isdigit() or int(declared) > cap):
                raise _BodyTooLarge
        chunks: list[bytes] = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                raise _Disconnected
            chunk = message.get("body", b"")
            size += len(chunk)
            if cap and size > cap:
                raise _BodyTooLarge
            chunks.append(chunk)
            if not message.get("more_body", False):
                return b"".join(chunks)

    async def _create_session(self, scope: Scope, receive: Receive, send: Send, now: float) -> None:
        ip = self.client_ip(scope)
        wait = self.sessions_per_ip.retry_after(ip, now)
        if wait is not None:
            log.warning("session limit hit for %s", ip)
            await _reject(
                send, 429, "CRUCIBLE_RATE_LIMIT",
                f"This network has opened {_count(self.limits.sessions_per_ip_per_hour, 'decision')} in the last hour, "
                f"the most Crucible allows. Try again in {_wait_phrase(wait)}.",
                retry_after=wait,
            )
            return
        self.sessions_per_ip.record(ip, now)
        # The client may not choose the session id, initial state or events.
        await self.app(_with_body(scope, b"{}"), _replay(b"{}", receive), send)

    async def _ratify(self, scope: Scope, receive: Receive, send: Send, body: bytes) -> None:
        try:
            request = _RatifyRequest.model_validate(_parse_json(body))
        except ValidationError as error:
            await _reject(send, 422, "CRUCIBLE_RATIFICATION_INVALID", _ratification_problem(error))
            return
        ratification = request.stateDelta.ratification
        at = datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        forwarded = json.dumps(
            {"stateDelta": {"ratification": {"action": ratification.action, "note": ratification.note, "at": at}}}
        ).encode()
        await self.app(_with_body(scope, forwarded), _replay(forwarded, receive), send)

    async def _decisions(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Lists the user's sessions through ADK's own route, then answers with one summary per decision."""
        listing: Scope = {**scope, "path": scope["path"].removesuffix("/decisions") + "/sessions", "query_string": b""}
        if scope.get("raw_path"):
            listing["raw_path"] = scope["raw_path"].removesuffix(b"/decisions") + b"/sessions"
        status = 500
        chunks: list[bytes] = []

        async def capture(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
            elif message["type"] == "http.response.body":
                chunks.append(message.get("body", b""))

        try:
            await self.app(listing, _replay(b"", receive), capture)
        except Exception:
            log.exception("listing sessions failed")
            await _reject(send, 500, "CRUCIBLE_HISTORY_UNAVAILABLE", _HISTORY_UNAVAILABLE)
            return
        if status != 200:
            log.warning("listing sessions answered %d", status)
            await _reject(send, status if status >= 400 else 502, "CRUCIBLE_HISTORY_UNAVAILABLE", _HISTORY_UNAVAILABLE)
            return
        sessions = _parse_json(b"".join(chunks))
        if not isinstance(sessions, list):
            await _reject(send, 502, "CRUCIBLE_HISTORY_UNAVAILABLE", _HISTORY_UNAVAILABLE)
            return
        await _send_json(send, 200, {"decisions": _summarise(sessions)})

    async def _run(self, scope: Scope, receive: Receive, send: Send, body: bytes, now: float) -> None:
        try:
            request = _RunRequest.model_validate(_parse_json(body))
        except ValidationError:
            await _reject(send, 422, "CRUCIBLE_INTAKE_INVALID", _UNREADABLE)
            return
        intake = _parse_json(request.newMessage.parts[0].text)
        if not isinstance(intake, dict):
            await _reject(send, 422, "CRUCIBLE_INTAKE_INVALID", _UNREADABLE)
            return
        try:
            _Intake.model_validate(intake)
        except ValidationError as error:
            await _reject(send, 422, "CRUCIBLE_INTAKE_INVALID", _intake_problem(error))
            return

        ip = self.client_ip(scope)
        wait = self.runs_per_ip.retry_after(ip, now)
        if wait is not None:
            log.warning("run limit hit for %s", ip)
            await _reject(
                send, 429, "CRUCIBLE_RATE_LIMIT",
                f"This network has convened the board {_count(self.limits.runs_per_ip_per_hour, 'time')} in the last hour, "
                f"the most Crucible allows. Try again in {_wait_phrase(wait)}.",
                retry_after=wait,
            )
            return
        wait = self.runs_per_day.retry_after("*", now)
        if wait is not None:
            log.warning("daily run budget spent")
            await _reject(
                send, 429, "CRUCIBLE_DAILY_LIMIT",
                f"The board has held its {_count(self.limits.runs_per_day, 'meeting')} for today. "
                f"Try again in {_wait_phrase(wait)}, or watch a recorded session.",
                retry_after=wait,
            )
            return
        if self.limits.max_concurrent_runs and self.active_runs >= self.limits.max_concurrent_runs:
            log.warning("all %d run slots busy", self.active_runs)
            await _reject(
                send, 503, "CRUCIBLE_BUSY",
                "The board is already meeting with other owners. Try again in a minute or two.",
            )
            return

        self.runs_per_ip.record(ip, now)
        self.runs_per_day.record("*", now)
        self.active_runs += 1
        try:
            await self._stream(scope, receive, send, body)
        finally:
            self.active_runs -= 1

    async def _stream(self, scope: Scope, receive: Receive, send: Send, body: bytes) -> None:
        """Runs an admitted request; a client disconnect mid-stream cancels it, freeing the slot at once."""
        disconnected = anyio.Event()
        body_sent = False
        response_done = False

        async def downstream_receive() -> Message:
            nonlocal body_sent
            if not body_sent:
                body_sent = True
                return {"type": "http.request", "body": body, "more_body": False}
            await disconnected.wait()
            return {"type": "http.disconnect"}

        async def downstream_send(message: Message) -> None:
            nonlocal response_done
            if message["type"] == "http.response.body" and not message.get("more_body", False):
                response_done = True
            await send(message)

        try:
            async with anyio.create_task_group() as group:

                async def watch() -> None:
                    while (await receive())["type"] != "http.disconnect":
                        pass
                    disconnected.set()
                    if not response_done:
                        group.cancel_scope.cancel()

                group.start_soon(watch)
                await self.app(scope, downstream_receive, downstream_send)
                group.cancel_scope.cancel()
        except BaseExceptionGroup as errors:
            # Re-raise the app's own error, not anyio's wrapper around it.
            error: BaseException = errors
            while isinstance(error, BaseExceptionGroup) and len(error.exceptions) == 1:
                error = error.exceptions[0]
            raise error

    def client_ip(self, scope: Scope) -> str:
        """The caller's address as appended by the configured trusted proxy, else the socket peer."""
        name = self.limits.client_ip_header.encode("latin-1")
        if name:
            values = [v.decode("latin-1") for k, v in scope.get("headers", []) if k == name]
            entries = [entry.strip() for entry in ",".join(values).split(",") if entry.strip()]
            if len(entries) >= self.limits.client_ip_hop:
                key = _ip_key(entries[-self.limits.client_ip_hop])
                if key:
                    return key
        client = scope.get("client")
        return (_ip_key(str(client[0])) if client else None) or "unknown"


def _route(method: str, path: str) -> str | None:
    """"pass", "session", "ratify", "decisions" or "run" for an allowlisted request, else None."""
    if path == "/list-apps":
        kinds = {"GET": "pass"}
    elif path == "/run_sse":
        kinds = {"POST": "run"}
    elif _SESSIONS_PATH.fullmatch(path):
        kinds = {"POST": "session"}
    elif _SESSION_PATH.fullmatch(path):
        kinds = {"GET": "pass", "PATCH": "ratify", "DELETE": "pass"}
    elif _DECISIONS_PATH.fullmatch(path):
        kinds = {"GET": "decisions"}
    else:
        return None
    return "pass" if method == "OPTIONS" else kinds.get(method)


def _summarise(sessions: list[Any]) -> list[dict[str, Any]]:
    """One entry per session that holds an intake, newest first, at most MAX_DECISIONS."""
    entries: list[tuple[float, dict[str, Any]]] = []
    for session in sessions:
        state = session.get("state") if isinstance(session, dict) else None
        intake = state.get("intake") if isinstance(state, dict) else None
        if not isinstance(intake, dict) or not isinstance(session.get("id"), str):
            continue
        verdict = state.get("verdict") if isinstance(state.get("verdict"), dict) else None
        ratification = state.get("ratification") if isinstance(state.get("ratification"), dict) else {}
        updated = session.get("lastUpdateTime")
        updated = float(updated) if isinstance(updated, (int, float)) else 0.0
        decision = verdict.get("decision") if verdict else None
        headline = verdict.get("headline") if verdict else None
        signed = ratification.get("action")
        question = intake.get("question")
        entries.append((updated, {
            "id": session["id"],
            "updated_at": datetime.fromtimestamp(updated, UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "question": question if isinstance(question, str) else "",
            "decision": decision if decision in _DECISION_KINDS else None,
            "headline": headline if isinstance(headline, str) else None,
            "signed": signed if signed in ("accept", "override") else None,
            "finished": verdict is not None,
        }))
    entries.sort(key=lambda entry: entry[0], reverse=True)
    return [summary for _, summary in entries[:MAX_DECISIONS]]


def _header(scope: Scope, name: bytes) -> str | None:
    for key, value in scope.get("headers", []):
        if key == name:
            return value.decode("latin-1").strip()
    return None


def _with_body(scope: Scope, body: bytes) -> Scope:
    """`scope` with headers describing `body` instead of the original request body."""
    headers = [(k, v) for k, v in scope["headers"] if k not in (b"content-length", b"transfer-encoding")]
    headers.append((b"content-length", str(len(body)).encode()))
    return {**scope, "headers": headers}


def _replay(body: bytes, receive: Receive) -> Receive:
    """A receive channel that yields the already-read `body`, then defers to the client's."""
    sent = False

    async def replay() -> Message:
        nonlocal sent
        if not sent:
            sent = True
            return {"type": "http.request", "body": body, "more_body": False}
        return await receive()

    return replay


async def _reject(send: Send, status: int, code: str, detail: str, retry_after: float | None = None) -> None:
    payload: dict[str, Any] = {"code": code, "detail": detail}
    headers: list[tuple[bytes, bytes]] = []
    if retry_after is not None:
        seconds = max(1, math.ceil(retry_after))
        payload["retry_after_s"] = seconds
        headers.append((b"retry-after", str(seconds).encode()))
    await _send_json(send, status, payload, headers)


async def _send_json(send: Send, status: int, payload: Any, extra_headers: list[tuple[bytes, bytes]] | None = None) -> None:
    body = json.dumps(payload).encode()
    headers = [
        (b"content-type", b"application/json"),
        (b"cache-control", b"no-store"),
        *(extra_headers or ()),
        (b"content-length", str(len(body)).encode()),
    ]
    await send({"type": "http.response.start", "status": status, "headers": headers})
    await send({"type": "http.response.body", "body": body})
