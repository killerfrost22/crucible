"""Checks that the Researcher's source links open, without letting model output reach private networks.

Each http(s) source is fetched with GET (closed after the headers; some servers reject HEAD) and gets
`check = {"status", "checked_at", "http_status"}`:
  ok           the final response after redirects is 2xx
  broken       404 or 410, or the host name doesn't resolve
  unreachable  anything else: 401/403/429/5xx, timeouts, TLS errors, too many redirects, refused targets

The URLs come from model output the owner can steer, so every connection, redirect hops included, may
only go to http/https on the default port and to a host whose every resolved address is public. The
check happens where the socket is opened, against the address actually dialled, so DNS rebinding
between the check and the connect is not possible.
"""

from __future__ import annotations

import asyncio
import copy
import ipaddress
import logging
import socket
from datetime import UTC, datetime
from typing import Any

import anyio
import httpcore
import httpx

log = logging.getLogger(__name__)

LINK_TIMEOUT = 5.0
TOTAL_TIMEOUT = 8.0
MAX_REDIRECTS = 3
USER_AGENT = "Mozilla/5.0 (compatible; CrucibleLinkCheck/1.0)"

_DEFAULT_PORTS = {"http": 80, "https": 443}
_REDIRECTS = {301, 302, 303, 307, 308}
_NO_SUCH_HOST = {socket.EAI_NONAME, getattr(socket, "EAI_NODATA", socket.EAI_NONAME)}

IP = ipaddress.IPv4Address | ipaddress.IPv6Address


class _NoSuchHost(Exception):
    pass


class _Refused(Exception):
    pass


def is_link(source: Any) -> bool:
    return isinstance(source, str) and source.strip().lower().startswith(("http://", "https://"))


def is_public(ip: IP) -> bool:
    """True only for globally routable unicast addresses, including any IPv4 address embedded in IPv6."""
    if isinstance(ip, ipaddress.IPv6Address):
        embedded = ip.ipv4_mapped or ip.sixtofour or (ip.teredo[1] if ip.teredo else None)
        if embedded is not None and not is_public(embedded):
            return False
    return ip.is_global and not (
        ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved or ip.is_unspecified
    )


async def public_addresses(host: str, port: int) -> list[str]:
    """`host`'s addresses, IPv4 first; refuses the host if any address is not public."""
    try:
        infos = await anyio.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        if error.errno in _NO_SUCH_HOST:
            raise _NoSuchHost(host) from error
        raise httpcore.ConnectError(str(error)) from error
    addresses = list(dict.fromkeys(str(info[4][0]) for info in infos))
    parsed = [ipaddress.ip_address(a) for a in addresses]
    if not parsed or not all(is_public(ip) for ip in parsed):
        raise _Refused(host)
    return sorted(addresses, key=lambda a: ipaddress.ip_address(a).version)


class _PublicOnlyBackend(httpcore.AsyncNetworkBackend):
    """Resolves and vets every host before dialling it; dials the vetted address, never the name."""

    def __init__(self, inner: httpcore.AsyncNetworkBackend) -> None:
        self._inner = inner

    async def connect_tcp(
        self, host: str, port: int, timeout: float | None = None, local_address: str | None = None, socket_options: Any = None
    ) -> httpcore.AsyncNetworkStream:
        last: Exception | None = None
        for address in await public_addresses(host, port):
            try:
                return await self._inner.connect_tcp(
                    address, port, timeout=timeout, local_address=local_address, socket_options=socket_options
                )
            except (httpcore.ConnectError, httpcore.ConnectTimeout) as error:
                last = error
        assert last is not None
        raise last

    async def connect_unix_socket(self, path: str, timeout: float | None = None, socket_options: Any = None) -> Any:
        raise _Refused(path)

    async def sleep(self, seconds: float) -> None:
        await self._inner.sleep(seconds)


def _client() -> httpx.AsyncClient:
    transport = httpx.AsyncHTTPTransport(retries=0)
    # httpx has no public hook for the network backend; its pool keeps it here (httpcore 1.x).
    pool = transport._pool
    pool._network_backend = _PublicOnlyBackend(pool._network_backend)
    return httpx.AsyncClient(
        transport=transport,
        headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"},
        timeout=httpx.Timeout(LINK_TIMEOUT),
        follow_redirects=False,
        trust_env=False,  # no proxies from the environment: they would dial on our behalf, unvetted
    )


def _allowed(url: httpx.URL) -> bool:
    return url.scheme in _DEFAULT_PORTS and bool(url.host) and url.port is None and not url.userinfo


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


async def _probe(client: httpx.AsyncClient, url: str) -> tuple[str, int | None]:
    code: int | None = None
    try:
        async with asyncio.timeout(LINK_TIMEOUT):
            target = httpx.URL(url)
            for _ in range(MAX_REDIRECTS + 1):
                if not _allowed(target):
                    return "unreachable", None
                async with client.stream("GET", target) as response:
                    code = response.status_code
                    location = response.headers.get("location")
                if code not in _REDIRECTS or not location:
                    break
                target = target.join(location)
            else:
                return "unreachable", code  # too many redirects
    except _NoSuchHost:
        return "broken", None
    except Exception as error:  # refused targets, timeouts, TLS and protocol errors, malformed URLs
        log.debug("link check for %s failed: %r", url, error)
        return "unreachable", None
    if 200 <= code < 300:
        return "ok", code
    return ("broken" if code in (404, 410) else "unreachable"), code


async def check_link(client: httpx.AsyncClient, url: str) -> dict[str, Any]:
    status, code = await _probe(client, url)
    return {"status": status, "checked_at": _now(), "http_status": code}


async def check_evidence(evidence: dict[str, Any]) -> dict[str, Any]:
    """A copy of `evidence` where every fact with an http(s) source carries its `check`."""
    checked = copy.deepcopy(evidence)
    facts = [f for f in checked.get("facts") or [] if isinstance(f, dict) and is_link(f.get("source"))]
    if not facts:
        return checked
    urls = list(dict.fromkeys(f["source"].strip() for f in facts))
    async with _client() as client:
        tasks = {url: asyncio.create_task(check_link(client, url)) for url in urls}
        await asyncio.wait(tasks.values(), timeout=TOTAL_TIMEOUT)
        for task in tasks.values():
            task.cancel()
        await asyncio.gather(*tasks.values(), return_exceptions=True)
    timed_out = {"status": "unreachable", "checked_at": _now(), "http_status": None}
    results = {
        url: task.result() if task.done() and not task.cancelled() and task.exception() is None else timed_out
        for url, task in tasks.items()
    }
    for fact in facts:
        fact["check"] = dict(results[fact["source"].strip()])
    return checked
