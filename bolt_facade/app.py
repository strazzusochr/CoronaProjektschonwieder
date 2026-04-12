from __future__ import annotations

import json
import os
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(title="GODMODE Superbrain Dispatch Hub")


def _normalize_hf_space_url(raw: str) -> str:
    value = (raw or "").strip()
    if not value:
        return ""
    if ".hf.space" in value:
        return value.rstrip("/")
    match = re.search(r"huggingface\.co/spaces/([^/]+)/([^/?#]+)", value, re.IGNORECASE)
    if not match:
        return value.rstrip("/")
    owner = match.group(1).strip().lower()
    space = match.group(2).strip().lower()
    return f"https://{owner}-{space}.hf.space"


def _first_non_empty(*values: str) -> str:
    for value in values:
        normalized = (value or "").strip()
        if normalized:
            return normalized
    return ""

REPO_ROOT = Path(
    os.environ.get(
        "GODMODE_REPO_ROOT",
        str(Path(__file__).resolve().parent.parent),
    )
).resolve()
RUNTIME_DIR = Path(
    os.environ.get(
        "BOLTDIY_RUNTIME_DIR",
        str(REPO_ROOT / ".godmode_runtime" / "bolt_facade"),
    )
).resolve()
DISPATCH_DIR = RUNTIME_DIR / "dispatch"
PROOF_DIR = RUNTIME_DIR / "proof"
EVIDENCE_DIR = Path(
    os.environ.get("GODMODE_EVIDENCE_DIR", str(RUNTIME_DIR.parent / "evidence"))
).resolve()
AGENT_REGISTRY_PATH = Path(
    os.environ.get("AGENT_REGISTRY_PATH", str(REPO_ROOT / "agent_registry.json"))
).resolve()

MEMORY_VAULT_PATH = Path(
    os.environ.get("MEMORY_VAULT_PATH", str(REPO_ROOT / "memory_vault.md"))
).resolve()
FINAL_PROOF_PATH = Path(
    os.environ.get("FINAL_PROOF_PATH", str(REPO_ROOT / "FINAL_PROOF.md"))
).resolve()
GODMODE_GOAL_PATH = Path(
    os.environ.get("GODMODE_GOAL_PATH", str(REPO_ROOT / "GODMODE_GOAL.md"))
).resolve()

BOLTDIY_MODE = os.environ.get("BOLTDIY_MODE", "hybrid").strip().lower()
BOLTDIY_FORWARD_TIMEOUT = int(os.environ.get("BOLTDIY_FORWARD_TIMEOUT", "20"))
BOLTDIY_SPACE_URL = os.environ.get("BOLTDIY_SPACE_URL", "").strip()
BOLTDIY_SPACE_ID = os.environ.get("BOLTDIY_SPACE_ID", "Wrzzzrzr/bolt-diy-godmode").strip()
_BOLTDIY_SPACE_TOKEN_RAW = os.environ.get("BOLTDIY_SPACE_TOKEN", "").strip()
BOLTDIY_SPACE_TOKEN = _BOLTDIY_SPACE_TOKEN_RAW or os.environ.get("HF_TOKEN", "").strip()
HF_AIDER_SPACE_URL = os.environ.get("HF_AIDER_SPACE_URL", "").strip()
HF_SMOLAGENTS_SPACE_URL = os.environ.get("HF_SMOLAGENTS_SPACE_URL", "").strip()
HF_AIDER_URL = _first_non_empty(
    os.environ.get("HF_AIDER_URL", ""),
    _normalize_hf_space_url(HF_AIDER_SPACE_URL),
    "https://wrzzzrzr-aider-godmode-safe.hf.space",
)
HF_AIDER_DISPATCH_URL = os.environ.get("HF_AIDER_DISPATCH_URL", "").strip()
SMOLAGENTS_URL = _first_non_empty(
    os.environ.get("SMOLAGENTS_URL", ""),
    _normalize_hf_space_url(HF_SMOLAGENTS_SPACE_URL),
    "https://wrzzzrzr-smolagents-godmode.hf.space",
)
SMOLAGENTS_DISPATCH_URL = os.environ.get("SMOLAGENTS_DISPATCH_URL", "").strip()
LANGGRAPH_API_URL = os.environ.get("LANGGRAPH_API_URL", "").strip()
LANGGRAPH_API_INTERNAL_URL = os.environ.get("LANGGRAPH_API_INTERNAL_URL", "").strip()
OLLAMAHF_BASE_URL = os.environ.get(
    "OLLAMAHF_BASE_URL",
    "https://cgjgj-ollamahftrae.hf.space",
).strip()
OLLAMAHF_MASTER_KEY = os.environ.get("OLLAMAHF_MASTER_KEY", "").strip()
OLLAMAHF_BEARER_TOKEN = os.environ.get("OLLAMAHF_BEARER_TOKEN", "").strip()
ZERO_COMPUTE_POLICY = os.environ.get("ZERO_COMPUTE_POLICY", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
ALLOW_LOCAL_HEAVY = os.environ.get("GODMODE_ALLOW_LOCAL_HEAVY", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL", "").strip()
OPENHANDS_ADAPTER_URL = os.environ.get("OPENHANDS_ADAPTER_URL", "").strip()
STARTED_AT = datetime.now(timezone.utc).isoformat()
RUNTIME_TARGETS = [
    "langgraph-local",
    "smolagents",
    "openhands-adapter",
    "hf-aider",
    "ollama-hf-orchestrator",
]
LOCAL_HEAVY_BLOCKED_TARGETS = {"langgraph-local", "smolagents", "openhands-adapter"}
HEAVY_TASK_KEYWORDS = (
    "three.js",
    "webgl",
    "3d",
    "render",
    "shader",
    "raytracing",
    "physics simulation",
    "game loop",
)
METRICS: dict[str, Any] = {
    "dispatch_total": 0,
    "dispatch_forwarded_total": 0,
    "dispatch_blocked_total": 0,
    "dispatch_failed_total": 0,
    "policy_denied_total": 0,
    "target_counts": {target: 0 for target in RUNTIME_TARGETS},
    "proof_total": 0,
}


class MissionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent: str = Field(min_length=1)
    task: str = Field(min_length=1)
    source: str = Field(min_length=1)
    repo: str = Field(min_length=1)
    ref: str = Field(min_length=1)
    status: str = Field(min_length=1)
    timestamp: str = Field(min_length=1)


class ProofPayload(BaseModel):
    scenario: str = Field(default="bolt-facade-proof")
    result: str
    commit_sha: str | None = None
    screenshot_path: str | None = None
    notes: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class OllamaProbeRequest(BaseModel):
    task: str = Field(default="Probe OllamaHfTrae external orchestrator with live run.")
    model: str = Field(default="qwen2.5-coder-7b")
    timeout: int = Field(default=180, ge=5, le=900)
    dry_run: bool = Field(default=False)
    orchestrate_retries: int = Field(default=3, ge=1, le=5)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_dirs() -> None:
    DISPATCH_DIR.mkdir(parents=True, exist_ok=True)
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)


def _load_agent_registry() -> dict[str, Any]:
    default_registry = {
        "version": "missing",
        "runtime_targets": RUNTIME_TARGETS,
        "active_agents": [],
        "legacy_agents": [],
    }
    if not AGENT_REGISTRY_PATH.exists():
        return default_registry
    try:
        return json.loads(AGENT_REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return default_registry


def _build_agent_lookup(registry: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, list[str]]]:
    lookup: dict[str, dict[str, Any]] = {}
    collisions: dict[str, list[str]] = {}
    for group in ("active_agents", "legacy_agents"):
        for agent in registry.get(group, []):
            if not isinstance(agent, dict):
                continue
            agent_id = str(agent.get("agent_id", "")).strip()
            if not agent_id:
                continue
            keys = [agent_id]
            aliases = agent.get("aliases", [])
            if isinstance(aliases, list):
                keys.extend(str(alias).strip() for alias in aliases if str(alias).strip())
            for key in keys:
                normalized = key.lower()
                existing = lookup.get(normalized)
                if existing and existing.get("agent_id") != agent_id:
                    collisions.setdefault(normalized, sorted({existing["agent_id"], agent_id}))
                    continue
                lookup[normalized] = agent
    for key in collisions:
        lookup.pop(key, None)
    return lookup, collisions


AGENT_REGISTRY = _load_agent_registry()
AGENT_LOOKUP, AGENT_ALIAS_COLLISIONS = _build_agent_lookup(AGENT_REGISTRY)


def _append_line(path: Path, line: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(line.rstrip() + "\n")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    def _safe_clone(value: Any, seen: set[int] | None = None) -> Any:
        if seen is None:
            seen = set()

        if isinstance(value, dict):
            marker = id(value)
            if marker in seen:
                return "<circular-ref>"
            seen.add(marker)
            cloned = {str(k): _safe_clone(v, seen) for k, v in value.items()}
            seen.remove(marker)
            return cloned

        if isinstance(value, list):
            marker = id(value)
            if marker in seen:
                return ["<circular-ref>"]
            seen.add(marker)
            cloned = [_safe_clone(item, seen) for item in value]
            seen.remove(marker)
            return cloned

        return value

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(_safe_clone(payload), handle, ensure_ascii=True, indent=2)


def _normalize_timestamp(value: str) -> str:
    raw = value.strip()
    candidate = raw.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError as exc:  # pragma: no cover - input validation
        raise HTTPException(status_code=422, detail=f"Invalid timestamp: {raw}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def _resolve_agent_entry(agent_value: str) -> dict[str, Any]:
    key = agent_value.strip().lower()
    if key in AGENT_ALIAS_COLLISIONS:
        collisions = ", ".join(AGENT_ALIAS_COLLISIONS[key])
        raise HTTPException(
            status_code=422,
            detail=f"Ambiguous agent alias '{agent_value}'. Use a namespaced id. Candidates: {collisions}",
        )
    entry = AGENT_LOOKUP.get(key)
    if not entry:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown agent '{agent_value}'. Use GET /agents for the canonical registry.",
        )
    return entry


def _canonicalize_payload(payload: MissionPayload) -> tuple[MissionPayload, dict[str, Any]]:
    entry = _resolve_agent_entry(payload.agent)
    canonical_timestamp = _normalize_timestamp(payload.timestamp)
    canonical_agent = str(entry["agent_id"])
    normalized = payload.model_copy(
        update={
            "agent": canonical_agent,
            "timestamp": canonical_timestamp,
            "task": payload.task.strip(),
            "source": payload.source.strip(),
            "repo": payload.repo.strip(),
            "ref": payload.ref.strip(),
            "status": payload.status.strip(),
        }
    )
    return normalized, entry


def _is_heavy_3d_task(task: str) -> bool:
    lowered = task.lower()
    return any(keyword in lowered for keyword in HEAVY_TASK_KEYWORDS)


def _http_status_to_status_class(value: Any) -> str:
    try:
        code = int(value)
    except (TypeError, ValueError):
        return "NOT VERIFIED"
    if code == 200:
        return "VERIFIED"
    if code in {401, 403, 404, 408, 429, 500, 502, 503, 504}:
        return "BLOCKED"
    return "PARTIAL"


def _latest_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _auth_headers() -> dict[str, str]:
    headers: dict[str, str] = {}
    if BOLTDIY_SPACE_TOKEN:
        headers["Authorization"] = f"Bearer {BOLTDIY_SPACE_TOKEN}"
    return headers


def _ollama_headers() -> dict[str, str]:
    headers: dict[str, str] = {}
    if OLLAMAHF_BEARER_TOKEN:
        headers["Authorization"] = f"Bearer {OLLAMAHF_BEARER_TOKEN}"
    return headers


def _post_json(
    url: str,
    payload: dict[str, Any],
    timeout: int,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    request_headers = {"Content-Type": "application/json"}
    if headers:
        request_headers.update(headers)
    req = request.Request(
        url=url,
        data=body,
        headers=request_headers,
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
            parsed: Any
            try:
                parsed = json.loads(raw) if raw else {}
            except json.JSONDecodeError:
                parsed = {"raw": raw}
            return {
                "status": "forwarded",
                "url": url,
                "http_status": int(response.status),
                "response": parsed,
            }
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return {
            "status": "blocked" if exc.code in {401, 403, 404} else "forward-failed",
            "url": url,
            "http_status": int(exc.code),
            "error": raw or str(exc),
        }
    except Exception as exc:  # pragma: no cover - runtime path
        return {
            "status": "forward-failed",
            "url": url,
            "http_status": None,
            "error": str(exc),
        }


def _probe_url(url: str, timeout: int, headers: dict[str, str] | None = None) -> dict[str, Any]:
    req = request.Request(url=url, method="GET", headers=headers or {})
    try:
        with request.urlopen(req, timeout=timeout) as response:
            return {
                "reachable": True,
                "url": url,
                "http_status": int(response.status),
            }
    except error.HTTPError as exc:
        return {
            "reachable": exc.code < 500,
            "url": url,
            "http_status": int(exc.code),
            "error": str(exc),
        }
    except Exception as exc:  # pragma: no cover - runtime path
        return {
            "reachable": False,
            "url": url,
            "http_status": None,
            "error": str(exc),
        }


def _space_candidates(space_url: str) -> dict[str, str]:
    if not space_url:
        return {"api": "", "web": ""}

    if "hf.space" in space_url:
        clean = space_url.rstrip("/")
        return {
            "api": clean,
            "web": clean,
        }

    match = re.search(r"huggingface\.co/spaces/([^/]+)/([^/]+)", space_url)
    if not match:
        clean = space_url.rstrip("/")
        return {"api": clean, "web": clean}

    owner = match.group(1)
    space = match.group(2)
    hf_space_host = f"https://{owner}-{space}.hf.space"
    hf_web = f"https://huggingface.co/spaces/{owner}/{space}"
    return {"api": hf_space_host, "web": hf_web}


def _resolve_boltdiy_space_url() -> str:
    if BOLTDIY_SPACE_URL:
        return BOLTDIY_SPACE_URL

    if "/" in BOLTDIY_SPACE_ID:
        owner, space = BOLTDIY_SPACE_ID.split("/", 1)
        owner = owner.strip()
        space = space.strip()
        if owner and space:
            return f"https://huggingface.co/spaces/{owner}/{space}"

    return ""


def _n8n_webhook_candidates(webhook_url: str) -> list[str]:
    clean = webhook_url.strip().rstrip("/")
    if not clean:
        return []

    candidates: list[str] = [clean]
    long_suffix = "/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission"
    short_suffix = "/webhook/godmode-mission"

    if short_suffix in clean:
        candidates.append(clean.replace(short_suffix, long_suffix))
    elif long_suffix in clean:
        candidates.append(clean.replace(long_suffix, short_suffix))
    elif "/webhook/" in clean:
        base = clean.split("/webhook/")[0]
        candidates.append(f"{base}{long_suffix}")
        candidates.append(f"{base}{short_suffix}")

    # Preserve order while removing duplicates
    return list(dict.fromkeys(candidates))


def _dispatch_external_bolt(payload: MissionPayload) -> dict[str, Any]:
    if BOLTDIY_MODE != "hybrid":
        return {
            "target": "bolt-external",
            "status": "skipped",
            "reason": f"BOLTDIY_MODE={BOLTDIY_MODE}",
        }

    resolved_space_url = _resolve_boltdiy_space_url()

    if not resolved_space_url:
        return {
            "target": "bolt-external",
            "status": "blocked",
            "reason": "BOLTDIY_SPACE_URL and BOLTDIY_SPACE_ID are empty/invalid",
        }

    candidates = _space_candidates(resolved_space_url)
    api_base = candidates["api"].rstrip("/")
    attempts: list[dict[str, Any]] = []

    auth = _auth_headers()
    candidate_paths = ["/dispatch", "/trigger", "/api/dispatch", "/api/trigger"]
    if api_base:
        for path in candidate_paths:
            attempt = _post_json(
                f"{api_base}{path}",
                payload.model_dump(),
                BOLTDIY_FORWARD_TIMEOUT,
                headers=auth,
            )
            attempts.append(attempt)
            if attempt.get("status") == "forwarded":
                break

    if any(item["status"] == "forwarded" for item in attempts):
        forwarded = [item for item in attempts if item["status"] == "forwarded"][0]
        return {
            "target": "bolt-external",
            "status": "forwarded",
            "token_present": bool(BOLTDIY_SPACE_TOKEN),
            "attempts": attempts,
            "active_url": forwarded["url"],
        }

    probe_url = candidates["web"] or candidates["api"]
    probe = _probe_url(probe_url, BOLTDIY_FORWARD_TIMEOUT, headers=auth) if probe_url else {
        "reachable": False,
        "error": "no_probe_url",
        "http_status": None,
    }
    probe_status = probe.get("http_status")
    terminal_status = "forward-failed"
    if probe_status in {401, 403, 404} or not probe.get("reachable", False):
        terminal_status = "blocked"

    return {
        "target": "bolt-external",
        "status": terminal_status,
        "token_present": bool(BOLTDIY_SPACE_TOKEN),
        "attempts": attempts,
        "probe": probe,
    }


def _dispatch_n8n(payload: MissionPayload) -> dict[str, Any]:
    if payload.source.strip().lower() == "n8n":
        return {
            "target": "n8n",
            "status": "skipped",
            "reason": "source is n8n (loop prevention)",
        }

    if not N8N_WEBHOOK_URL:
        return {
            "target": "n8n",
            "status": "blocked",
            "reason": "N8N_WEBHOOK_URL is empty",
        }

    attempts: list[dict[str, Any]] = []
    for candidate in _n8n_webhook_candidates(N8N_WEBHOOK_URL):
        attempt = _post_json(candidate, payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT)
        attempts.append(attempt)
        if attempt.get("status") == "forwarded":
            return {
                "target": "n8n",
                "status": attempt.get("status"),
                "url": attempt.get("url"),
                "http_status": attempt.get("http_status"),
                "response": attempt.get("response"),
                "attempts": attempts,
            }

    first_attempt = attempts[0] if attempts else {
        "status": "blocked",
        "url": N8N_WEBHOOK_URL,
        "error": "no webhook candidates",
        "http_status": None,
    }
    return {
        "target": "n8n",
        "status": first_attempt.get("status"),
        "url": first_attempt.get("url"),
        "http_status": first_attempt.get("http_status"),
        "error": first_attempt.get("error"),
        "response": first_attempt.get("response"),
        "attempts": attempts,
    }


def _dispatch_openhands(payload: MissionPayload) -> dict[str, Any]:
    if not OPENHANDS_ADAPTER_URL:
        return {
            "target": "openhands-adapter",
            "status": "blocked",
            "reason": "OPENHANDS_ADAPTER_URL is empty",
        }

    target = f"{OPENHANDS_ADAPTER_URL.rstrip('/')}/trigger"
    response = _post_json(target, payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT)
    response["target"] = "openhands-adapter"
    return response


def _dispatch_langgraph(payload: MissionPayload) -> dict[str, Any]:
    candidates = []
    if LANGGRAPH_API_INTERNAL_URL:
        candidates.append(LANGGRAPH_API_INTERNAL_URL.rstrip("/") + "/run")
    if LANGGRAPH_API_URL:
        candidates.append(LANGGRAPH_API_URL.rstrip("/") + "/run")
    if not candidates:
        return {
            "target": "langgraph-local",
            "status": "blocked",
            "reason": "LANGGRAPH_API_INTERNAL_URL/LANGGRAPH_API_URL missing",
        }
    body = {
        "task": payload.task,
        "source": payload.source,
        "ref": payload.ref,
    }
    attempts = [_post_json(url, body, BOLTDIY_FORWARD_TIMEOUT) for url in candidates]
    forwarded = next((item for item in attempts if item.get("status") == "forwarded"), None)
    if forwarded:
        return {
            "target": "langgraph-local",
            "status": "forwarded",
            "url": forwarded.get("url"),
            "http_status": forwarded.get("http_status"),
            "response": forwarded.get("response"),
            "attempts": attempts,
        }
    first = attempts[0]
    return {
        "target": "langgraph-local",
        "status": first.get("status", "forward-failed"),
        "url": first.get("url"),
        "http_status": first.get("http_status"),
        "error": first.get("error"),
        "response": first.get("response"),
        "attempts": attempts,
    }


def _dispatch_smolagents(payload: MissionPayload) -> dict[str, Any]:
    attempts: list[dict[str, Any]] = []

    if SMOLAGENTS_DISPATCH_URL:
        attempts.append(
            _post_json(
                SMOLAGENTS_DISPATCH_URL,
                {
                    "prompt": payload.task,
                    "agent": payload.agent,
                    "source": payload.source,
                },
                BOLTDIY_FORWARD_TIMEOUT,
            )
        )

    if SMOLAGENTS_URL:
        base = SMOLAGENTS_URL.rstrip("/")
        attempts.extend(
            [
                _post_json(
                    f"{base}/run",
                    {"prompt": payload.task, "agent_type": "Manager (Multi-Agent)"},
                    BOLTDIY_FORWARD_TIMEOUT,
                ),
                _post_json(
                    f"{base}/api/run",
                    {"prompt": payload.task, "agent_type": "Manager (Multi-Agent)"},
                    BOLTDIY_FORWARD_TIMEOUT,
                ),
                _post_json(
                    f"{base}/gradio_api/call/run_agent",
                    {"data": [payload.task, "Manager (Multi-Agent)"]},
                    BOLTDIY_FORWARD_TIMEOUT,
                ),
            ]
        )

    if not attempts:
        return {
            "target": "smolagents",
            "status": "blocked",
            "reason": "SMOLAGENTS_DISPATCH_URL/SMOLAGENTS_URL missing",
        }

    forwarded = next((item for item in attempts if item.get("status") == "forwarded"), None)
    if forwarded:
        return {
            "target": "smolagents",
            "status": "forwarded",
            "url": forwarded.get("url"),
            "http_status": forwarded.get("http_status"),
            "response": forwarded.get("response"),
            "attempts": attempts,
        }
    first = attempts[0]
    return {
        "target": "smolagents",
        "status": first.get("status", "forward-failed"),
        "url": first.get("url"),
        "http_status": first.get("http_status"),
        "error": first.get("error"),
        "response": first.get("response"),
        "attempts": attempts,
    }


def _dispatch_hf_aider(payload: MissionPayload) -> dict[str, Any]:
    def _aider_label(agent_value: str) -> str:
        value = (agent_value or "").lower()
        if "review" in value:
            return "Aider-Review"
        if "core" in value:
            return "Aider-Core"
        return "Aider-Cloud"

    attempts: list[dict[str, Any]] = []
    if HF_AIDER_DISPATCH_URL:
        attempts.append(_post_json(HF_AIDER_DISPATCH_URL, payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT))
    if HF_AIDER_URL:
        base = HF_AIDER_URL.rstrip("/")
        gradio_data = [payload.task, payload.repo, payload.ref, _aider_label(payload.agent)]
        attempts.extend(
            [
                _post_json(
                    f"{base}/gradio_api/run/build_outputs",
                    {"data": gradio_data},
                    BOLTDIY_FORWARD_TIMEOUT,
                ),
                _post_json(
                    f"{base}/gradio_api/call/build_outputs",
                    {"data": gradio_data},
                    BOLTDIY_FORWARD_TIMEOUT,
                ),
                _post_json(f"{base}/mission", payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT),
                _post_json(f"{base}/trigger", payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT),
                _post_json(f"{base}/api/mission", payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT),
            ]
        )
    if not attempts:
        return {
            "target": "hf-aider",
            "status": "blocked",
            "reason": "HF_AIDER_DISPATCH_URL/HF_AIDER_URL missing",
        }

    forwarded = next((item for item in attempts if item.get("status") == "forwarded"), None)
    if forwarded:
        return {
            "target": "hf-aider",
            "status": "forwarded",
            "url": forwarded.get("url"),
            "http_status": forwarded.get("http_status"),
            "response": forwarded.get("response"),
            "attempts": attempts,
        }
    first = attempts[0]
    return {
        "target": "hf-aider",
        "status": first.get("status", "forward-failed"),
        "url": first.get("url"),
        "http_status": first.get("http_status"),
        "error": first.get("error"),
        "response": first.get("response"),
        "attempts": attempts,
    }


def _dispatch_ollamahf(payload: MissionPayload) -> dict[str, Any]:
    if not OLLAMAHF_BASE_URL:
        return {
            "target": "ollama-hf-orchestrator",
            "status": "blocked",
            "reason": "OLLAMAHF_BASE_URL missing",
        }
    base = OLLAMAHF_BASE_URL.rstrip("/")
    body = {
        "prompt": payload.task,
        "master_key": OLLAMAHF_MASTER_KEY,
        "mode": "single_model",
        "selected_model": "qwen2.5-coder-7b",
        "dry_run": True,
        "project_profile": "3d_web_game",
        "task_type": "implementation",
        "language": "typescript",
        "framework": "react-three-fiber",
        "output_format": "code",
        "constraints": "zero-local-heavy-compute",
    }
    response = _post_json(
        f"{base}/orchestrate",
        body,
        BOLTDIY_FORWARD_TIMEOUT,
        headers=_ollama_headers(),
    )
    response["target"] = "ollama-hf-orchestrator"
    return response


TARGET_DISPATCHERS = {
    "langgraph-local": _dispatch_langgraph,
    "smolagents": _dispatch_smolagents,
    "openhands-adapter": _dispatch_openhands,
    "hf-aider": _dispatch_hf_aider,
    "ollama-hf-orchestrator": _dispatch_ollamahf,
}


def _dispatch_by_target(runtime_target: str, payload: MissionPayload) -> dict[str, Any]:
    dispatcher = TARGET_DISPATCHERS.get(runtime_target)
    if not dispatcher:
        return {
            "target": runtime_target,
            "status": "blocked",
            "reason": f"unsupported runtime_target={runtime_target}",
        }
    return dispatcher(payload)


def _target_health_status() -> dict[str, Any]:
    statuses: dict[str, Any] = {}
    langgraph_url = (LANGGRAPH_API_INTERNAL_URL or LANGGRAPH_API_URL).rstrip("/")
    if langgraph_url:
        statuses["langgraph-local"] = _probe_url(f"{langgraph_url}/health", BOLTDIY_FORWARD_TIMEOUT)
    else:
        statuses["langgraph-local"] = {"reachable": False, "http_status": None, "error": "missing url"}

    smol_url = (SMOLAGENTS_URL or SMOLAGENTS_DISPATCH_URL).rstrip("/")
    if smol_url:
        statuses["smolagents"] = _probe_url(smol_url, BOLTDIY_FORWARD_TIMEOUT)
    else:
        statuses["smolagents"] = {"reachable": False, "http_status": None, "error": "missing url"}

    if OPENHANDS_ADAPTER_URL:
        statuses["openhands-adapter"] = _probe_url(
            f"{OPENHANDS_ADAPTER_URL.rstrip('/')}/health",
            BOLTDIY_FORWARD_TIMEOUT,
        )
    else:
        statuses["openhands-adapter"] = {"reachable": False, "http_status": None, "error": "missing url"}

    aider_url = (HF_AIDER_DISPATCH_URL or HF_AIDER_URL).rstrip("/")
    if aider_url:
        statuses["hf-aider"] = _probe_url(aider_url, BOLTDIY_FORWARD_TIMEOUT)
    else:
        statuses["hf-aider"] = {"reachable": False, "http_status": None, "error": "missing url"}

    if OLLAMAHF_BASE_URL:
        statuses["ollama-hf-orchestrator"] = _probe_url(
            f"{OLLAMAHF_BASE_URL.rstrip('/')}/v1/models",
            BOLTDIY_FORWARD_TIMEOUT,
            headers=_ollama_headers(),
        )
    else:
        statuses["ollama-hf-orchestrator"] = {
            "reachable": False,
            "http_status": None,
            "error": "missing url",
        }
    return statuses


def _run_ollama_probe(req: OllamaProbeRequest) -> dict[str, Any]:
    base = OLLAMAHF_BASE_URL.rstrip("/")
    headers = _ollama_headers()
    models_result = _probe_url(f"{base}/v1/models", req.timeout, headers=headers)
    chat_result = _post_json(
        f"{base}/v1/chat/completions",
        {
            "model": req.model,
            "messages": [{"role": "user", "content": "Respond with OK only."}],
            "temperature": 0.0,
            "max_tokens": 16,
        },
        req.timeout,
        headers=headers,
    )
    orchestrate_payload: dict[str, Any] = {
        "prompt": req.task,
        "mode": "single_model",
        "selected_model": req.model,
        "dry_run": req.dry_run,
        "task_type": "verification",
        "project_profile": "3d_web_game",
        "language": "typescript",
        "framework": "react-three-fiber",
        "output_format": "code",
    }
    if OLLAMAHF_MASTER_KEY:
        orchestrate_payload["master_key"] = OLLAMAHF_MASTER_KEY

    orchestrate_attempts: list[dict[str, Any]] = []
    orchestrate_result: dict[str, Any] = {}
    for attempt in range(1, req.orchestrate_retries + 1):
        current = _post_json(
            f"{base}/orchestrate",
            orchestrate_payload,
            req.timeout,
            headers=headers,
        )
        current["attempt"] = attempt
        orchestrate_attempts.append(current)
        orchestrate_result = current
        if current.get("status") == "forwarded" or current.get("http_status") == 200:
            break
        if attempt < req.orchestrate_retries:
            time.sleep(min(2 * attempt, 5))
    if orchestrate_attempts:
        orchestrate_result["attempts"] = orchestrate_attempts
    results = {
        "models": models_result,
        "chat_completions": chat_result,
        "orchestrate": orchestrate_result,
    }
    success_count = 0
    for item in results.values():
        if item.get("status") == "forwarded":
            success_count += 1
        elif item.get("http_status") == 200:
            success_count += 1
    return {
        "status": "PASS" if success_count == 3 else "PARTIAL" if success_count > 0 else "BLOCKED",
        "successful_probes": success_count,
        "total_probes": 3,
        "results": results,
    }


@app.get("/")
def root() -> dict[str, Any]:
    return {"status": "online", "service": "superbrain-dispatch-hub"}


@app.get("/health")
def health() -> dict[str, Any]:
    _ensure_dirs()
    active_agents = AGENT_REGISTRY.get("active_agents", [])
    legacy_agents = AGENT_REGISTRY.get("legacy_agents", [])

    return {
        "status": "healthy",
        "service": "superbrain-dispatch-hub",
        "contract": "agent/task/source/repo/ref/status/timestamp",
        "runtime_targets": RUNTIME_TARGETS,
        "zero_compute_policy": {
            "enabled": ZERO_COMPUTE_POLICY,
            "allow_local_heavy_override": ALLOW_LOCAL_HEAVY,
            "blocked_targets_for_heavy": sorted(LOCAL_HEAVY_BLOCKED_TARGETS),
        },
        "registry": {
            "path": str(AGENT_REGISTRY_PATH),
            "active_agents": len(active_agents),
            "legacy_agents": len(legacy_agents),
            "alias_collisions": AGENT_ALIAS_COLLISIONS,
        },
        "targets": {
            "smolagents_url": SMOLAGENTS_URL or "",
            "smolagents_dispatch_url": SMOLAGENTS_DISPATCH_URL or "",
            "langgraph_api_internal_url": LANGGRAPH_API_INTERNAL_URL or "",
            "langgraph_api_url": LANGGRAPH_API_URL or "",
            "hf_aider_url": HF_AIDER_URL or "",
            "hf_aider_dispatch_url": HF_AIDER_DISPATCH_URL or "",
            "ollamahf_base_url": OLLAMAHF_BASE_URL or "",
            "bolt_space_id": BOLTDIY_SPACE_ID or "",
            "n8n_webhook_url": N8N_WEBHOOK_URL or "",
            "openhands_adapter_url": OPENHANDS_ADAPTER_URL or "",
        },
        "routing_status": _target_health_status(),
        "runtime_dir": str(RUNTIME_DIR),
        "evidence_dir": str(EVIDENCE_DIR),
    }


@app.get("/agents")
def agents() -> dict[str, Any]:
    return {
        "status": "ok",
        "registry_path": str(AGENT_REGISTRY_PATH),
        "active_count": len(AGENT_REGISTRY.get("active_agents", [])),
        "legacy_count": len(AGENT_REGISTRY.get("legacy_agents", [])),
        "runtime_targets": RUNTIME_TARGETS,
        "active_agents": AGENT_REGISTRY.get("active_agents", []),
        "legacy_agents": AGENT_REGISTRY.get("legacy_agents", []),
        "alias_collisions": AGENT_ALIAS_COLLISIONS,
    }


@app.get("/routing/status")
def routing_status() -> dict[str, Any]:
    checks = _target_health_status()
    mapped = {
        target: {
            **probe,
            "status_class": _http_status_to_status_class(probe.get("http_status")),
        }
        for target, probe in checks.items()
    }
    latest_dispatch = _latest_json(DISPATCH_DIR / "latest_dispatch.json")
    return {
        "status": "ok",
        "targets": mapped,
        "latest_dispatch": latest_dispatch.get("dispatch_artifact", ""),
        "checked_at": _now_iso(),
    }


@app.get("/metrics")
def metrics() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "superbrain-dispatch-hub",
        "started_at": STARTED_AT,
        "zero_compute_policy": ZERO_COMPUTE_POLICY,
        "metrics": METRICS,
    }


@app.post("/dispatch")
def dispatch(payload: MissionPayload) -> dict[str, Any]:
    _ensure_dirs()
    call_id = str(uuid.uuid4())
    started_at = _now_iso()
    normalized_payload, agent_entry = _canonicalize_payload(payload)
    runtime_target = str(agent_entry.get("runtime_target", "")).strip()
    if runtime_target not in RUNTIME_TARGETS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid runtime_target '{runtime_target}' for agent "
                f"{normalized_payload.agent}. Allowed: {', '.join(RUNTIME_TARGETS)}"
            ),
        )

    is_heavy = _is_heavy_3d_task(normalized_payload.task)
    policy_blocked = (
        ZERO_COMPUTE_POLICY
        and is_heavy
        and (not ALLOW_LOCAL_HEAVY)
        and runtime_target in LOCAL_HEAVY_BLOCKED_TARGETS
    )
    if policy_blocked:
        result = {
            "target": runtime_target,
            "status": "blocked",
            "reason": (
                "ZERO_COMPUTE_POLICY denied heavy 3D/KI task on local runtime target. "
                "Route to remote target or disable policy explicitly."
            ),
        }
        METRICS["policy_denied_total"] += 1
    else:
        result = _dispatch_by_target(runtime_target, normalized_payload)

    overall = result.get("status", "forward-failed")
    METRICS["dispatch_total"] += 1
    METRICS["target_counts"][runtime_target] = METRICS["target_counts"].get(runtime_target, 0) + 1
    if overall == "forwarded":
        METRICS["dispatch_forwarded_total"] += 1
    elif overall == "blocked":
        METRICS["dispatch_blocked_total"] += 1
    else:
        METRICS["dispatch_failed_total"] += 1

    record = {
        "call_id": call_id,
        "started_at": started_at,
        "hub_mode": "superbrain",
        "overall_status": overall,
        "payload": normalized_payload.model_dump(),
        "requested_agent": payload.agent,
        "canonical_agent": normalized_payload.agent,
        "agent_origin": agent_entry.get("origin", "unknown"),
        "agent_status_class": agent_entry.get("status_class", "UNKNOWN"),
        "runtime_target": runtime_target,
        "contract": {
            "status": "pass",
            "fields": list(normalized_payload.model_dump().keys()),
        },
        "zero_compute_policy": {
            "enabled": ZERO_COMPUTE_POLICY,
            "task_detected_heavy": is_heavy,
            "policy_blocked": policy_blocked,
        },
        "result": result,
    }

    dispatch_file = DISPATCH_DIR / f"{started_at.replace(':', '-').replace('.', '-')}_{call_id}.json"
    latest_file = DISPATCH_DIR / "latest_dispatch.json"
    record["dispatch_artifact"] = str(dispatch_file)
    _write_json(dispatch_file, record)
    _write_json(latest_file, record)

    _append_line(
        MEMORY_VAULT_PATH,
        (
            f"- {started_at} SUPERBRAIN_DISPATCH: agent={normalized_payload.agent} "
            f"target={runtime_target} status={overall} call_id={call_id}"
        ),
    )
    _append_line(
        GODMODE_GOAL_PATH,
        f"SUPERBRAIN_DISPATCH {started_at} agent={normalized_payload.agent} target={runtime_target} status={overall} call_id={call_id}",
    )

    return {
        "status": overall,
        "call_id": call_id,
        "agent": normalized_payload.agent,
        "runtime_target": runtime_target,
        "policy_blocked": policy_blocked,
        "dispatch_artifact": str(dispatch_file),
        "result": result,
    }


@app.post("/probe/ollama")
def probe_ollama(req: OllamaProbeRequest) -> dict[str, Any]:
    _ensure_dirs()
    started_at = _now_iso()
    probe = _run_ollama_probe(req)
    record = {
        "started_at": started_at,
        "base_url": OLLAMAHF_BASE_URL,
        "request": req.model_dump(),
        "probe": probe,
    }
    file_name = f"ollama_probe_{started_at.replace(':', '-').replace('.', '-')}.json"
    snapshot = EVIDENCE_DIR / file_name
    latest = EVIDENCE_DIR / "ollama_probe_latest.json"
    _write_json(snapshot, record)
    _write_json(latest, record)
    return {
        "status": probe.get("status", "BLOCKED"),
        "successful_probes": probe.get("successful_probes", 0),
        "total_probes": probe.get("total_probes", 3),
        "snapshot": str(snapshot),
        "results": probe.get("results", {}),
    }


@app.get("/evidence/latest")
def evidence_latest() -> dict[str, Any]:
    _ensure_dirs()
    files = {
        "dispatch_latest": DISPATCH_DIR / "latest_dispatch.json",
        "proof_latest": PROOF_DIR / "latest_proof.json",
        "ollama_probe_latest": EVIDENCE_DIR / "ollama_probe_latest.json",
        "superbrain_gate_latest": EVIDENCE_DIR / "superbrain_gate_latest.json",
        "security_rotation_latest": EVIDENCE_DIR / "security_rotation_check_latest.json",
    }
    payload = {
        key: {
            "path": str(path),
            "exists": path.exists(),
            "content": _latest_json(path),
        }
        for key, path in files.items()
    }
    return {
        "status": "ok",
        "generated_at": _now_iso(),
        "evidence": payload,
    }


@app.post("/proof")
def proof(payload: ProofPayload) -> dict[str, Any]:
    _ensure_dirs()
    proof_id = str(uuid.uuid4())
    created_at = _now_iso()

    record = {
        "proof_id": proof_id,
        "created_at": created_at,
        "payload": payload.model_dump(),
    }

    proof_file = PROOF_DIR / f"{created_at.replace(':', '-').replace('.', '-')}_{proof_id}.json"
    latest_file = PROOF_DIR / "latest_proof.json"
    _write_json(proof_file, record)
    _write_json(latest_file, record)
    METRICS["proof_total"] += 1

    _append_line(
        FINAL_PROOF_PATH,
        (
            f"- {created_at} BOLT_PROOF: result={payload.result} "
            f"scenario={payload.scenario} proof_id={proof_id}"
        ),
    )
    _append_line(
        MEMORY_VAULT_PATH,
        (
            f"- {created_at} BOLT_PROOF: result={payload.result} "
            f"scenario={payload.scenario} proof_id={proof_id}"
        ),
    )
    _append_line(
        GODMODE_GOAL_PATH,
        f"BOLT_PROOF {created_at} result={payload.result} proof_id={proof_id}",
    )

    return {
        "status": "recorded",
        "proof_id": proof_id,
        "proof_artifact": str(proof_file),
    }
