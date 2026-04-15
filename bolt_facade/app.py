from __future__ import annotations

import concurrent.futures
import html
import json
import os
import re
import subprocess
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(title="GODMODE Superbrain Dispatch Hub")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
RUNS_DIR = RUNTIME_DIR / "runs"
BOOTSTRAP_DIR = RUNTIME_DIR / "bootstrap"
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
OPENHANDS_FORWARD_TIMEOUT = int(os.environ.get("OPENHANDS_FORWARD_TIMEOUT", str(max(BOLTDIY_FORWARD_TIMEOUT, 420))))
OLLAMAHF_FORWARD_TIMEOUT = int(
    os.environ.get("OLLAMAHF_FORWARD_TIMEOUT", str(max(BOLTDIY_FORWARD_TIMEOUT, 600)))
)
OLLAMAHF_DISPATCH_MAX_TOKENS = int(os.environ.get("OLLAMAHF_DISPATCH_MAX_TOKENS", "512"))
OLLAMAHF_CHAT_RECOVERY_MAX_TOKENS = int(os.environ.get("OLLAMAHF_CHAT_RECOVERY_MAX_TOKENS", "2048"))
BOLTDIY_SPACE_URL = os.environ.get("BOLTDIY_SPACE_URL", "").strip()
BOLTDIY_SPACE_ID = os.environ.get("BOLTDIY_SPACE_ID", "Wrzzzrzr/bolt-diy-godmode").strip()
_HF_TOKEN = os.environ.get("HF_TOKEN", "").strip()
_BOLTDIY_SPACE_TOKEN_RAW = os.environ.get("BOLTDIY_SPACE_TOKEN", "").strip()
BOLTDIY_SPACE_TOKEN = _BOLTDIY_SPACE_TOKEN_RAW or _HF_TOKEN
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
OLLAMAHF_MASTER_KEY = os.environ.get("OLLAMAHF_MASTER_KEY", "").strip() or _HF_TOKEN
OLLAMAHF_BEARER_TOKEN = os.environ.get("OLLAMAHF_BEARER_TOKEN", "").strip() or _HF_TOKEN
OLLAMAHF_BLOCK_CACHE_SECONDS = int(os.environ.get("OLLAMAHF_BLOCK_CACHE_SECONDS", "180"))
OLLAMAHF_DISPATCH_WORKSPACE_FALLBACK = (
    os.environ.get("OLLAMAHF_DISPATCH_WORKSPACE_FALLBACK", "true").strip().lower()
    in {"1", "true", "yes", "on"}
)
OLLAMAHF_WORKSPACE_TASK_ID = os.environ.get("OLLAMAHF_WORKSPACE_TASK_ID", "workspace_overview").strip() or "workspace_overview"
OLLAMAHF_DISPATCH_DRY_RUN = os.environ.get("OLLAMAHF_DISPATCH_DRY_RUN", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
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
LITELLM_URL = os.environ.get("LITELLM_URL", "").strip()
LITELLM_PORT = os.environ.get("LITELLM_PORT", "4000").strip() or "4000"
LITELLM_API_KEY = os.environ.get("LITELLM_API_KEY", "").strip()
OPENHANDS_PUBLIC_URL = os.environ.get("OPENHANDS_PUBLIC_URL", "").strip()
OPENHANDS_INTERNAL_URL = os.environ.get("OPENHANDS_INTERNAL_URL", "http://openhands-godmode:3000").strip()
OPENHANDS_LLM_MODEL = (
    os.environ.get("OPENHANDS_LLM_MODEL", "litellm_proxy/smart-router").strip()
    or "litellm_proxy/smart-router"
)
OPENHANDS_LLM_BASE_URL = (
    os.environ.get("OPENHANDS_LLM_BASE_URL", f"http://litellm-godmode:{LITELLM_PORT}").strip()
    or f"http://litellm-godmode:{LITELLM_PORT}"
)
OPENHANDS_LLM_API_KEY = (
    os.environ.get("OPENHANDS_LLM_API_KEY", "").strip() or LITELLM_API_KEY or "replace-with-litellm-key"
)
N8N_API_URL = os.environ.get("N8N_API_URL", "").strip()
N8N_API_KEY = os.environ.get("N8N_API_KEY", "").strip()
N8N_MEMORY_PROBE_URL = os.environ.get("N8N_MEMORY_PROBE_URL", "").strip()
DEVTOOLS_BRIDGE_URL = os.environ.get("DEVTOOLS_BRIDGE_URL", "http://host.docker.internal:3911").strip()
BOLTDIY_FACADE_INTERNAL_URL = os.environ.get("BOLTDIY_FACADE_INTERNAL_URL", "").strip()
BOOTSTRAP_ALLOW_SCRIPT_START = os.environ.get("BOOTSTRAP_ALLOW_SCRIPT_START", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
BOOTSTRAP_START_SCRIPT = os.environ.get("BOOTSTRAP_START_SCRIPT", "").strip()
BOOTSTRAP_COMMAND_TIMEOUT = int(os.environ.get("BOOTSTRAP_COMMAND_TIMEOUT", "900"))
CONTROL_CENTER_STATUS_CACHE_TTL = int(os.environ.get("CONTROL_CENTER_STATUS_CACHE_TTL", "8"))
DISPATCH_APPEND_PROJECT_LOGS = os.environ.get("DISPATCH_APPEND_PROJECT_LOGS", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
BOOTSTRAP_STATE_PATH = EVIDENCE_DIR / "bootstrap_latest.json"
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
    "autonomy_runs_total": 0,
    "bootstrap_runs_total": 0,
}
OLLAMAHF_LAST_BLOCK: dict[str, Any] = {
    "at": 0.0,
    "reason": "",
    "error": "",
}
AUTONOMY_PROFILES: dict[str, dict[str, Any]] = {
    "app_builder": {
        "label": "App Builder",
        "description": "Planner -> Research -> Reviewer -> Finalize",
        "agents": [
            "local.langgraph.planner",
            "local.langgraph.research",
            "local.langgraph.reviewer",
            "local.langgraph.finalize",
        ],
    },
    "game_builder": {
        "label": "3D Game Builder",
        "description": "External Vision -> Research -> Lead Coder -> QA -> Release (cloud-only chain)",
        "agents": [
            "external.ollamahf.vision",
            "external.ollamahf.research",
            "external.ollamahf.lead_coder",
            "external.ollamahf.qa",
            "external.ollamahf.release",
        ],
    },
    "game_artifact_single": {
        "label": "3D Artifact Builder (Fast Proof)",
        "description": "Single external solo_builder run for one concrete cloud-generated HTML/3D artifact.",
        "agents": [
            "external.ollamahf.solo_builder",
        ],
    },
    "ops_hardening": {
        "label": "Ops Hardening",
        "description": "Reviewer -> OpenHands -> Aider Review -> Finalize",
        "agents": [
            "local.langgraph.reviewer",
            "local.openhands.openhands",
            "local.hf_aider.aider_review",
            "local.langgraph.finalize",
        ],
    },
}
BOOTSTRAP_LOCK = threading.Lock()
CONTROL_CENTER_CACHE_LOCK = threading.Lock()
CONTROL_CENTER_CACHE: dict[str, Any] = {
    "expires_at": 0.0,
    "payload": None,
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


class AutonomyRunRequest(BaseModel):
    goal: str = Field(min_length=3)
    profile_id: str = Field(default="app_builder", min_length=1)
    source: str = Field(default="platform-autonomy", min_length=1)
    repo: str = Field(default="strazzusochr/CoronaProjektschonwieder", min_length=1)
    ref: str = Field(default="main", min_length=1)
    status: str = Field(default="queued", min_length=1)
    halt_on_fail: bool = Field(default=False)


class BootstrapStartRequest(BaseModel):
    include_script_start: bool = Field(default=True)
    source: str = Field(default="platform-control-center", min_length=1)


class PromptExecuteRequest(BaseModel):
    prompt: str = Field(min_length=3)
    source: str = Field(default="platform-prompt", min_length=1)
    repo: str = Field(default="strazzusochr/CoronaProjektschonwieder", min_length=1)
    ref: str = Field(default="main", min_length=1)
    status: str = Field(default="queued", min_length=1)
    agent: str | None = None
    profile_id: str | None = None
    halt_on_fail: bool = Field(default=False)
    async_run: bool = Field(default=True)


class RunCreateRequest(BaseModel):
    goal: str = Field(min_length=3)
    source: str = Field(default="platform-run", min_length=1)
    repo: str = Field(default="strazzusochr/CoronaProjektschonwieder", min_length=1)
    ref: str = Field(default="main", min_length=1)
    status: str = Field(default="queued", min_length=1)
    profile_id: str = Field(default="app_builder", min_length=1)
    selected_agents: list[str] = Field(default_factory=list)
    halt_on_fail: bool = Field(default=False)
    async_run: bool = Field(default=True)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_dirs() -> None:
    DISPATCH_DIR.mkdir(parents=True, exist_ok=True)
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    BOOTSTRAP_DIR.mkdir(parents=True, exist_ok=True)
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


def _bootstrap_default_state() -> dict[str, Any]:
    return {
        "status": "DOWN",
        "ready": False,
        "boot_id": "",
        "started_at": "",
        "finished_at": "",
        "summary": "Bootstrap not started yet.",
        "phases": [],
    }


BOOTSTRAP_STATE: dict[str, Any] = _bootstrap_default_state()
if BOOTSTRAP_STATE_PATH.exists():
    cached_state = _latest_json(BOOTSTRAP_STATE_PATH)
    if isinstance(cached_state, dict) and cached_state.get("status"):
        BOOTSTRAP_STATE = cached_state


def _with_masked_env(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "***"
    return f"{value[:4]}***{value[-2:]}"


def _is_loopback_url(url: str) -> bool:
    candidate = (url or "").strip().lower()
    return candidate.startswith("http://127.0.0.1") or candidate.startswith("http://localhost")


def _n8n_health_url() -> str:
    if N8N_API_URL:
        base = N8N_API_URL.split("/api/")[0].rstrip("/")
        return f"{base}/healthz"
    webhook = N8N_WEBHOOK_URL.strip()
    if webhook:
        base = webhook.split("/webhook/")[0].rstrip("/")
        if base:
            return f"{base}/healthz"
    return "http://n8n-godmode:5678/healthz"


def _service_probe_catalog() -> list[dict[str, str]]:
    langgraph_health = ""
    langgraph_base = (LANGGRAPH_API_INTERNAL_URL or LANGGRAPH_API_URL).rstrip("/")
    if langgraph_base:
        langgraph_health = f"{langgraph_base}/health"

    openhands_base = OPENHANDS_INTERNAL_URL.rstrip("/") if OPENHANDS_INTERNAL_URL else OPENHANDS_PUBLIC_URL.rstrip("/")
    if not openhands_base and OPENHANDS_PUBLIC_URL:
        openhands_base = OPENHANDS_PUBLIC_URL.rstrip("/")
    adapter_base = OPENHANDS_ADAPTER_URL.rstrip("/") if OPENHANDS_ADAPTER_URL else ""
    internal_litellm_base = f"http://litellm-godmode:{LITELLM_PORT}"
    if LITELLM_URL and not _is_loopback_url(LITELLM_URL):
        litellm_base = LITELLM_URL.rstrip("/")
    else:
        litellm_base = internal_litellm_base
    hub_base = BOLTDIY_FACADE_INTERNAL_URL.rstrip("/") if BOLTDIY_FACADE_INTERNAL_URL else "http://127.0.0.1:3901"
    devtools_bridge_base = DEVTOOLS_BRIDGE_URL.rstrip("/") if DEVTOOLS_BRIDGE_URL else "http://host.docker.internal:3911"
    return [
        {"id": "hub", "url": f"{hub_base}/health"},
        {"id": "openhands", "url": openhands_base},
        {"id": "openhands-adapter", "url": f"{adapter_base}/health" if adapter_base else ""},
        {"id": "n8n", "url": _n8n_health_url()},
        {"id": "langgraph", "url": langgraph_health},
        {"id": "litellm", "url": f"{litellm_base}/"},
        {"id": "devtools-bridge", "url": f"{devtools_bridge_base}/health"},
    ]


def _run_preflight_checks() -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    errors: list[str] = []
    warnings: list[str] = []

    required = [
        ("OPENHANDS_LLM_MODEL", OPENHANDS_LLM_MODEL),
        ("OPENHANDS_LLM_BASE_URL", OPENHANDS_LLM_BASE_URL),
        ("OPENHANDS_LLM_API_KEY", OPENHANDS_LLM_API_KEY),
    ]
    for name, value in required:
        ok = bool(value)
        checks.append({"name": name, "ok": ok})
        if not ok:
            errors.append(f"Missing required variable: {name}")

    if (OPENHANDS_LLM_BASE_URL.find("litellm") >= 0 or ":4000" in OPENHANDS_LLM_BASE_URL) and not LITELLM_API_KEY:
        warnings.append("LITELLM_API_KEY is not set; relying on OPENHANDS_LLM_API_KEY fallback for LiteLLM auth.")

    active_agents = AGENT_REGISTRY.get("active_agents", [])
    legacy_agents = AGENT_REGISTRY.get("legacy_agents", [])
    registry_ok = len(active_agents) >= 25 and len(legacy_agents) >= 1 and not AGENT_ALIAS_COLLISIONS
    checks.append(
        {
            "name": "agent_registry",
            "ok": registry_ok,
            "active_agents": len(active_agents),
            "legacy_agents": len(legacy_agents),
            "alias_collisions": AGENT_ALIAS_COLLISIONS,
        }
    )
    if not registry_ok:
        errors.append("Agent registry does not satisfy expected 25 active + 1 legacy without alias collisions.")

    zero_policy_ok = ZERO_COMPUTE_POLICY and not ALLOW_LOCAL_HEAVY
    checks.append(
        {
            "name": "zero_compute_policy",
            "ok": zero_policy_ok,
            "enabled": ZERO_COMPUTE_POLICY,
            "allow_local_heavy_override": ALLOW_LOCAL_HEAVY,
        }
    )
    if not zero_policy_ok:
        errors.append("Zero-compute policy is not strictly enforced (expected enabled + no local heavy override).")

    if not BOLTDIY_SPACE_TOKEN:
        warnings.append("BOLTDIY_SPACE_TOKEN/HF_TOKEN missing: external HF dispatch may stay BLOCKED.")
    if not OLLAMAHF_BEARER_TOKEN:
        warnings.append("OLLAMAHF_BEARER_TOKEN missing: external orchestrator may be BLOCKED.")
    if not N8N_WEBHOOK_URL:
        errors.append("N8N_WEBHOOK_URL missing: mission workflow smoke cannot run.")
    if not N8N_MEMORY_PROBE_URL:
        warnings.append(
            "N8N_MEMORY_PROBE_URL missing: bootstrap memory smoke will be BLOCKED until an execute/webhook path is configured."
        )
    if not BOOTSTRAP_ALLOW_SCRIPT_START:
        warnings.append(
            "BOOTSTRAP_ALLOW_SCRIPT_START=false: one-click script start is disabled and will be reported as BLOCKED when requested."
        )

    return {
        "ok": len(errors) == 0,
        "checks": checks,
        "errors": errors,
        "warnings": warnings,
    }


def _execute_start_script(include_script_start: bool) -> dict[str, Any]:
    if not include_script_start:
        return {"status": "skipped", "reason": "include_script_start=false"}
    if not BOOTSTRAP_ALLOW_SCRIPT_START:
        return {
            "status": "blocked",
            "reason": "BOOTSTRAP_ALLOW_SCRIPT_START=false",
            "recovery": "Set BOOTSTRAP_ALLOW_SCRIPT_START=true and configure BOOTSTRAP_START_SCRIPT.",
        }
    script = BOOTSTRAP_START_SCRIPT.strip()
    if not script:
        return {
            "status": "blocked",
            "reason": "BOOTSTRAP_START_SCRIPT not configured",
            "recovery": "Set BOOTSTRAP_START_SCRIPT to START_GODMODE.sh or an equivalent startup script path.",
        }
    script_path = Path(script)
    if not script_path.exists():
        return {
            "status": "blocked",
            "reason": f"BOOTSTRAP_START_SCRIPT not found: {script}",
            "recovery": "Provide an existing script path inside the runtime environment where bolt-facade executes.",
        }

    if script_path.suffix.lower() == ".ps1":
        cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(script_path)]
    elif script_path.suffix.lower() == ".sh":
        cmd = ["bash", str(script_path)]
    else:
        cmd = [str(script_path)]
    try:
        completed = subprocess.run(  # noqa: S603
            cmd,
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=BOOTSTRAP_COMMAND_TIMEOUT,
            check=False,
        )
    except Exception as exc:  # pragma: no cover - runtime path
        return {"status": "blocked", "reason": f"Bootstrap start script failed: {exc}"}

    stdout_tail = "\n".join(completed.stdout.splitlines()[-40:])
    stderr_tail = "\n".join(completed.stderr.splitlines()[-40:])
    if completed.returncode == 0:
        return {
            "status": "forwarded",
            "command": cmd,
            "returncode": completed.returncode,
            "stdout_tail": stdout_tail,
            "stderr_tail": stderr_tail,
        }
    return {
        "status": "blocked",
        "command": cmd,
        "returncode": completed.returncode,
        "stdout_tail": stdout_tail,
        "stderr_tail": stderr_tail,
        "reason": "Start script returned non-zero exit code.",
        "recovery": "Inspect stdout/stderr tails, fix script runtime dependencies, then rerun bootstrap.",
    }


def _compute_ready_state(
    preflight: dict[str, Any],
    services: dict[str, Any],
    workflow: dict[str, Any],
    service_start: dict[str, Any],
    include_script_start: bool,
) -> tuple[str, bool, str]:
    if not preflight.get("ok", False):
        return "BLOCKED", False, "Preflight checks failed."

    if include_script_start and service_start.get("status") != "forwarded":
        reason = service_start.get("reason", "one-click start script did not run")
        return "BLOCKED", False, f"One-click start blocked: {reason}"

    service_failures = [item for item in services.get("results", []) if not item.get("ok", False)]
    if service_failures:
        return "PARTIAL", False, "Core services are not fully reachable."

    mission_status = workflow.get("mission", {}).get("status")
    memory_status = workflow.get("memory", {}).get("status")
    if mission_status != "forwarded":
        return "BLOCKED", False, "n8n mission workflow smoke did not pass."
    if memory_status != "forwarded":
        return "PARTIAL", False, "n8n memory workflow is not verified."

    return "READY", True, "Platform ready for prompt execution."


def _persist_bootstrap_state(record: dict[str, Any]) -> None:
    BOOTSTRAP_DIR.mkdir(parents=True, exist_ok=True)
    snapshot = BOOTSTRAP_DIR / f"bootstrap_{record['started_at'].replace(':', '-').replace('.', '-')}_{record['boot_id']}.json"
    record["snapshot"] = str(snapshot)
    _write_json(snapshot, record)
    _write_json(BOOTSTRAP_STATE_PATH, record)


def _run_bootstrap(include_script_start: bool, source: str) -> dict[str, Any]:
    boot_id = str(uuid.uuid4())
    started_at = _now_iso()
    phases: list[dict[str, Any]] = []

    preflight = _run_preflight_checks()
    phases.append({"phase": "preflight", "result": preflight})

    start_script_result = _execute_start_script(include_script_start=include_script_start)
    phases.append({"phase": "service_start", "result": start_script_result})

    service_results: list[dict[str, Any]] = []
    service_catalog = _service_probe_catalog()
    probed_services = _probe_catalog_parallel(service_catalog, BOLTDIY_FORWARD_TIMEOUT)
    for item in service_catalog:
        service_id = str(item.get("id", "")).strip()
        url = str(item.get("url", "")).strip()
        probe = probed_services.get(service_id, {"reachable": False, "http_status": None, "error": "missing probe"})
        service_results.append(
            {
                "id": service_id,
                "url": url,
                "ok": int(probe.get("http_status") or 0) == 200,
                "probe": probe,
            }
        )
    services_payload = {"results": service_results}
    phases.append({"phase": "service_health", "result": services_payload})

    smoke_payload = MissionPayload(
        agent="local.langgraph.planner",
        task="Bootstrap n8n mission smoke test.",
        source=source.strip() or "platform-control-center",
        repo="https://github.com/strazzusochr/CoronaProjektschonwieder",
        ref="main",
        status="triggered",
        timestamp=_now_iso(),
    )
    mission_smoke = _dispatch_n8n(smoke_payload)
    memory_smoke = {
        "status": "blocked",
        "reason": "N8N_MEMORY_PROBE_URL not configured",
        "recovery": "Set N8N_MEMORY_PROBE_URL to a real n8n execute/webhook endpoint for memory probe verification.",
    }
    if N8N_MEMORY_PROBE_URL:
        memory_headers: dict[str, str] = {}
        if N8N_API_KEY:
            memory_headers["X-N8N-API-KEY"] = N8N_API_KEY
        memory_smoke = _post_json(
            N8N_MEMORY_PROBE_URL,
            {
                "source": source.strip() or "platform-control-center",
                "timestamp": _now_iso(),
                "event": "bootstrap-memory-smoke",
            },
            BOLTDIY_FORWARD_TIMEOUT,
            headers=memory_headers,
        )
    workflow_payload = {"mission": mission_smoke, "memory": memory_smoke}
    phases.append({"phase": "workflow_smoke", "result": workflow_payload})

    status, ready, summary = _compute_ready_state(
        preflight,
        services_payload,
        workflow_payload,
        service_start=start_script_result,
        include_script_start=include_script_start,
    )
    finished_at = _now_iso()
    record = {
        "status": status,
        "ready": ready,
        "boot_id": boot_id,
        "started_at": started_at,
        "finished_at": finished_at,
        "summary": summary,
        "source": source,
        "phases": phases,
        "policy": {
            "zero_compute_policy": ZERO_COMPUTE_POLICY,
            "allow_local_heavy_override": ALLOW_LOCAL_HEAVY,
        },
        "tokens": {
            "hf_token_present": bool(_HF_TOKEN),
            "bolt_token_present": bool(BOLTDIY_SPACE_TOKEN),
            "ollamahf_bearer_present": bool(OLLAMAHF_BEARER_TOKEN),
            "ollamahf_master_present": bool(OLLAMAHF_MASTER_KEY),
            "masked_hf_token": _with_masked_env(_HF_TOKEN),
        },
    }
    _persist_bootstrap_state(record)
    return record


def _bootstrap_status_snapshot() -> dict[str, Any]:
    with BOOTSTRAP_LOCK:
        return dict(BOOTSTRAP_STATE)


def _probe_http_200(probe: dict[str, Any]) -> bool:
    return int(probe.get("http_status") or 0) == 200


def _runtime_health_ready_for_prompt() -> tuple[bool, str]:
    preflight = _run_preflight_checks()
    if not preflight.get("ok", False):
        errors = preflight.get("errors", [])
        return False, f"Preflight failed: {errors}"

    probe_timeout = max(2, min(BOLTDIY_FORWARD_TIMEOUT, 8))
    service_probes = _probe_catalog_parallel(_service_probe_catalog(), probe_timeout)
    service_failures = [
        f"{service_id}={probe.get('http_status') or probe.get('error') or 'unreachable'}"
        for service_id, probe in service_probes.items()
        if not _probe_http_200(probe)
    ]
    if service_failures:
        return False, "Core service health failed: " + ", ".join(service_failures)

    target_probes = _target_health_status(probe_timeout=probe_timeout)
    routing_failures = [
        f"{target}={probe.get('http_status') or probe.get('error') or 'unreachable'}"
        for target, probe in target_probes.items()
        if not _probe_http_200(probe)
    ]
    if routing_failures:
        return False, "Routing target health failed: " + ", ".join(routing_failures)

    active_count = len(AGENT_REGISTRY.get("active_agents", []))
    legacy_count = len(AGENT_REGISTRY.get("legacy_agents", []))
    if active_count < 25 or legacy_count < 1:
        return False, f"Agent registry incomplete: active={active_count}, legacy={legacy_count}"

    return True, (
        "Runtime health READY: services, routing targets, 25 active agents and 1 legacy agent verified. "
        "One-click script start may still be disabled without blocking prompt execution."
    )


def _is_ready_for_prompt_execution() -> tuple[bool, str]:
    state = _bootstrap_status_snapshot()
    if state.get("status") == "READY" and bool(state.get("ready")):
        return True, "Bootstrap state is READY."
    runtime_ready, runtime_reason = _runtime_health_ready_for_prompt()
    if runtime_ready:
        return True, runtime_reason
    status = state.get("status", "DOWN")
    return False, f"Bootstrap state is {status}; runtime fallback not ready: {runtime_reason}"


def _profile_from_prompt(prompt: str) -> str:
    lowered = prompt.lower()
    if any(keyword in lowered for keyword in ("3d", "webgl", "game", "shader", "render")):
        return "game_builder"
    if any(keyword in lowered for keyword in ("debug", "fix", "hardening", "incident", "stability")):
        return "ops_hardening"
    return "app_builder"


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


def _save_ollamahf_final_code(final_code: str) -> dict[str, Any]:
    artifact_id = f"ollamahf_final_code_{_now_iso().replace(':', '-').replace('.', '-')}_{uuid.uuid4()}"
    artifact_dir = EVIDENCE_DIR / "ollamahf_artifacts"
    artifact_path = artifact_dir / f"{artifact_id}.html"
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_text(final_code, encoding="utf-8", newline="\n")
    return {
        "final_code_artifact": str(artifact_path),
        "final_code_url": f"/artifacts/ollamahf/{artifact_path.name}",
        "final_code_bytes": len(final_code.encode("utf-8")),
    }


def _extract_chat_text(response_payload: Any) -> str:
    if not isinstance(response_payload, dict):
        return ""
    choices = response_payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return ""
    first = choices[0]
    if not isinstance(first, dict):
        return ""
    message = first.get("message")
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str):
            return content.strip()
    text = first.get("text")
    return text.strip() if isinstance(text, str) else ""


def _coerce_html_document(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:html)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    html_match = re.search(r"<!doctype html[\s\S]*", cleaned, flags=re.IGNORECASE)
    if html_match:
        return html_match.group(0).strip()
    html_match = re.search(r"<html[\s\S]*</html>", cleaned, flags=re.IGNORECASE)
    if html_match:
        return "<!doctype html>\n" + html_match.group(0).strip()
    safe_text = html.escape(cleaned)
    return (
        "<!doctype html>\n"
        "<html lang=\"de\">\n"
        "<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
        "<title>Godmode Artifact Recovery</title>"
        "<style>body{margin:0;font-family:system-ui;background:#10151f;color:#f5f7fb}"
        "main{max-width:980px;margin:48px auto;padding:32px;border:1px solid #31415f;border-radius:24px;"
        "background:linear-gradient(135deg,#182237,#111827)}pre{white-space:pre-wrap;line-height:1.5}</style></head>\n"
        f"<body><main><h1>Recovered Cloud Artifact</h1><pre>{safe_text}</pre></main></body>\n"
        "</html>\n"
    )


def _is_lightweight_probe_task(task: str) -> bool:
    lowered = (task or "").lower()
    return any(
        marker in lowered
        for marker in (
            "inventory verification probe",
            "routing gate probe",
            "contract validation probe",
            "bounded openhands smoke test only",
        )
    )


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


def _probe_catalog_parallel(
    catalog: list[dict[str, Any]],
    timeout: int,
) -> dict[str, dict[str, Any]]:
    if not catalog:
        return {}

    max_workers = max(1, min(len(catalog), 12))
    results: dict[str, dict[str, Any]] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map: dict[concurrent.futures.Future[dict[str, Any]], tuple[str, str]] = {}
        for item in catalog:
            item_id = str(item.get("id", "")).strip()
            url = str(item.get("url", "")).strip()
            headers = item.get("headers")
            if not item_id:
                continue
            if not url:
                results[item_id] = {"reachable": False, "http_status": None, "error": "missing url"}
                continue
            future = executor.submit(_probe_url, url, timeout, headers)
            future_map[future] = (item_id, url)

        for future, (item_id, url) in future_map.items():
            try:
                results[item_id] = future.result(timeout=timeout + 1)
            except Exception as exc:  # pragma: no cover - runtime path
                results[item_id] = {
                    "reachable": False,
                    "http_status": None,
                    "url": url,
                    "error": str(exc),
                }
    return results


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

    if _is_lightweight_probe_task(payload.task):
        health = _probe_url(f"{OPENHANDS_ADAPTER_URL.rstrip('/')}/health", 10)
        if health.get("http_status") == 200:
            return {
                "target": "openhands-adapter",
                "status": "forwarded",
                "url": health.get("url"),
                "http_status": health.get("http_status"),
                "response": {"probe_mode": "adapter-health", "health": health},
            }
        return {
            "target": "openhands-adapter",
            "status": "blocked" if health.get("http_status") in {401, 403, 404} else "forward-failed",
            "url": health.get("url"),
            "http_status": health.get("http_status"),
            "reason": "OpenHands adapter health probe failed.",
            "error": health.get("error", ""),
        }

    target = f"{OPENHANDS_ADAPTER_URL.rstrip('/')}/trigger"
    response = _post_json(target, payload.model_dump(), OPENHANDS_FORWARD_TIMEOUT)
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
    def _chat_artifact_recovery(base_url: str, primary_result: dict[str, Any]) -> dict[str, Any]:
        recovery_prompt = (
            "Du bist ein cloud-basierter Artifact-Builder fuer eine All-in-One Entwicklerplattform. "
            "Antworte ausschliesslich mit einem vollstaendigen, standalone HTML-Dokument. "
            "Das HTML muss ohne externe Build-Schritte funktionieren, eine sichtbare 3D/WebGL- oder Canvas-Szene, "
            "HUD, Bedienhinweise und klare visuelle Elemente enthalten. Kein Markdown, keine Erklaerung.\n\n"
            f"Mission:\n{payload.task}"
        )
        chat_result = _post_json(
            f"{base_url}/v1/chat/completions",
            {
                "model": "qwen2.5-coder-7b",
                "messages": [{"role": "user", "content": recovery_prompt}],
                "temperature": 0.0,
                "max_tokens": OLLAMAHF_CHAT_RECOVERY_MAX_TOKENS,
            },
            min(240, max(60, OLLAMAHF_FORWARD_TIMEOUT)),
            headers=_ollama_headers(),
        )
        text = _extract_chat_text(chat_result.get("response"))
        if chat_result.get("status") == "forwarded" and text:
            html_doc = _coerce_html_document(text)
            artifact = _save_ollamahf_final_code(html_doc)
            recovered: dict[str, Any] = {
                "target": "ollama-hf-orchestrator",
                "status": "forwarded",
                "url": chat_result.get("url"),
                "http_status": chat_result.get("http_status"),
                "response": chat_result.get("response"),
                "recovery_used": True,
                "recovery_endpoint": f"{base_url}/v1/chat/completions",
                "recovery_reason": (
                    "Primary /orchestrate path did not return a complete artifact; "
                    "cloud chat-completions recovery produced final_code."
                ),
                "primary_orchestrate_status": primary_result.get("status"),
                "primary_orchestrate_http_status": primary_result.get("http_status"),
                "primary_orchestrate_error": str(primary_result.get("error", ""))[:600],
            }
            recovered.update(artifact)
            return recovered
        return {
            "target": "ollama-hf-orchestrator",
            "status": "blocked",
            "reason": "Primary orchestrate path failed and chat-completions recovery did not produce artifact text.",
            "recovery_used": True,
            "recovery_endpoint": f"{base_url}/v1/chat/completions",
            "recovery_result": chat_result,
            "primary_orchestrate_status": primary_result.get("status"),
            "primary_orchestrate_http_status": primary_result.get("http_status"),
            "primary_orchestrate_error": str(primary_result.get("error", ""))[:600],
        }

    def _workspace_task_fallback(base_url: str, reason: str) -> dict[str, Any]:
        if not OLLAMAHF_DISPATCH_WORKSPACE_FALLBACK:
            return {
                "target": "ollama-hf-orchestrator",
                "status": "blocked",
                "reason": reason,
                "fallback_enabled": False,
            }
        fallback = _post_json(
            f"{base_url}/workspace/api/tasks/run",
            {"task_id": OLLAMAHF_WORKSPACE_TASK_ID},
            min(30, OLLAMAHF_FORWARD_TIMEOUT),
            headers=_ollama_headers(),
        )
        fallback["target"] = "ollama-hf-orchestrator"
        fallback["fallback_used"] = True
        fallback["fallback_endpoint"] = f"{base_url}/workspace/api/tasks/run"
        fallback["fallback_task_id"] = OLLAMAHF_WORKSPACE_TASK_ID
        fallback["fallback_reason"] = reason
        if fallback.get("status") == "forwarded":
            return fallback
        return {
            "target": "ollama-hf-orchestrator",
            "status": "blocked",
            "reason": reason,
            "fallback_used": True,
            "fallback_endpoint": fallback.get("fallback_endpoint"),
            "fallback_task_id": OLLAMAHF_WORKSPACE_TASK_ID,
            "fallback_result": fallback,
        }

    if not OLLAMAHF_BASE_URL:
        return {
            "target": "ollama-hf-orchestrator",
            "status": "blocked",
            "reason": "OLLAMAHF_BASE_URL missing",
        }
    base = OLLAMAHF_BASE_URL.rstrip("/")
    if _is_lightweight_probe_task(payload.task):
        chat_result = _post_json(
            f"{base}/v1/chat/completions",
            {
                "model": "qwen2.5-coder-7b",
                "messages": [
                    {
                        "role": "user",
                        "content": f"Reply with OK for lightweight live probe of {payload.agent}.",
                    }
                ],
                "temperature": 0.0,
                "max_tokens": 16,
            },
            60,
            headers=_ollama_headers(),
        )
        chat_result["target"] = "ollama-hf-orchestrator"
        chat_result["probe_mode"] = "chat-completions-lightweight"
        return chat_result
    now = time.time()
    cache_age = now - float(OLLAMAHF_LAST_BLOCK.get("at", 0.0) or 0.0)
    if (
        OLLAMAHF_BLOCK_CACHE_SECONDS > 0
        and OLLAMAHF_LAST_BLOCK.get("at")
        and cache_age <= OLLAMAHF_BLOCK_CACHE_SECONDS
    ):
        return _workspace_task_fallback(
            OLLAMAHF_BASE_URL.rstrip("/"),
            (
                "External orchestrator is in recent BLOCKED cache window; "
                "primary orchestration skipped."
            ),
        )
    body = {
        "prompt": payload.task,
        "master_key": OLLAMAHF_MASTER_KEY,
        "mode": "single_model",
        "selected_model": "qwen2.5-coder-7b",
        "dry_run": OLLAMAHF_DISPATCH_DRY_RUN,
        "project_profile": "3d_web_game",
        "task_type": "implementation",
        "language": "typescript",
        "framework": "react-three-fiber",
        "output_format": "code",
        "constraints": "zero-local-heavy-compute",
        "max_tokens": OLLAMAHF_DISPATCH_MAX_TOKENS,
        "temperature": 0.0,
    }
    response = _post_json(
        f"{base}/orchestrate",
        body,
        OLLAMAHF_FORWARD_TIMEOUT,
        headers=_ollama_headers(),
    )
    response_payload = response.get("response")
    response_error = str(response.get("error", "")).lower()
    if response.get("status") == "forward-failed":
        if "timed out" in response_error or "timeout" in response_error:
            response["status"] = "blocked"
            response["reason"] = (
                "External orchestrator did not complete within timeout window; "
                "kept as BLOCKED with evidence."
            )
        elif response.get("http_status") in {401, 403, 404, 408, 429, 500, 502, 503, 504}:
            response["status"] = "blocked"
            response["reason"] = "External orchestrator returned non-usable status."
    if (
        response.get("status") == "forwarded"
        and isinstance(response_payload, dict)
        and response_payload.get("dry_run") is True
    ):
        response["status"] = "blocked"
        response["reason"] = "External orchestrator returned dry_run=true for dispatch path."
    if response.get("status") in {"blocked", "forward-failed"}:
        fallback_reason = str(response.get("reason", "") or response.get("error", "")).strip()
        recovery_result = _chat_artifact_recovery(
            base,
            {
                "status": response.get("status"),
                "http_status": response.get("http_status"),
                "reason": fallback_reason,
                "error": str(response.get("error", "")),
            },
        )
        if recovery_result.get("status") == "forwarded":
            OLLAMAHF_LAST_BLOCK["at"] = 0.0
            OLLAMAHF_LAST_BLOCK["reason"] = ""
            OLLAMAHF_LAST_BLOCK["error"] = ""
            return recovery_result
        fallback_result = _workspace_task_fallback(base, fallback_reason or "Primary orchestrate path blocked.")
        if fallback_result.get("status") == "forwarded":
            OLLAMAHF_LAST_BLOCK["at"] = time.time()
            OLLAMAHF_LAST_BLOCK["reason"] = fallback_reason or "Primary orchestrate path blocked."
            OLLAMAHF_LAST_BLOCK["error"] = str(response.get("error", "")).strip()
            return fallback_result
        OLLAMAHF_LAST_BLOCK["at"] = time.time()
        OLLAMAHF_LAST_BLOCK["reason"] = str(response.get("reason", "")).strip()
        OLLAMAHF_LAST_BLOCK["error"] = str(response.get("error", "")).strip()
    elif response.get("status") == "forwarded":
        OLLAMAHF_LAST_BLOCK["at"] = 0.0
        OLLAMAHF_LAST_BLOCK["reason"] = ""
        OLLAMAHF_LAST_BLOCK["error"] = ""
        if isinstance(response_payload, dict) and isinstance(response_payload.get("final_code"), str):
            response.update(_save_ollamahf_final_code(response_payload["final_code"]))
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


def _target_health_status(probe_timeout: int | None = None) -> dict[str, Any]:
    timeout = probe_timeout if probe_timeout is not None else BOLTDIY_FORWARD_TIMEOUT
    probe_catalog: list[dict[str, Any]] = []
    langgraph_url = (LANGGRAPH_API_INTERNAL_URL or LANGGRAPH_API_URL).rstrip("/")
    if langgraph_url:
        probe_catalog.append({"id": "langgraph-local", "url": f"{langgraph_url}/health"})
    else:
        probe_catalog.append({"id": "langgraph-local", "url": ""})

    smol_url = (SMOLAGENTS_URL or SMOLAGENTS_DISPATCH_URL).rstrip("/")
    if smol_url:
        probe_catalog.append({"id": "smolagents", "url": smol_url})
    else:
        probe_catalog.append({"id": "smolagents", "url": ""})

    if OPENHANDS_ADAPTER_URL:
        probe_catalog.append({"id": "openhands-adapter", "url": f"{OPENHANDS_ADAPTER_URL.rstrip('/')}/health"})
    else:
        probe_catalog.append({"id": "openhands-adapter", "url": ""})

    aider_url = (HF_AIDER_DISPATCH_URL or HF_AIDER_URL).rstrip("/")
    if aider_url:
        probe_catalog.append({"id": "hf-aider", "url": aider_url})
    else:
        probe_catalog.append({"id": "hf-aider", "url": ""})

    if OLLAMAHF_BASE_URL:
        probe_catalog.append(
            {
                "id": "ollama-hf-orchestrator",
                "url": f"{OLLAMAHF_BASE_URL.rstrip('/')}/v1/models",
                "headers": _ollama_headers(),
            }
        )
    else:
        probe_catalog.append({"id": "ollama-hf-orchestrator", "url": ""})

    statuses = _probe_catalog_parallel(probe_catalog, timeout)
    return statuses


def _list_autonomy_profiles() -> list[dict[str, Any]]:
    return [
        {
            "id": profile_id,
            "label": profile_data.get("label", profile_id),
            "description": profile_data.get("description", ""),
            "agents": list(profile_data.get("agents", [])),
        }
        for profile_id, profile_data in AUTONOMY_PROFILES.items()
    ]


def _capability_summary() -> dict[str, Any]:
    active_agents = AGENT_REGISTRY.get("active_agents", [])
    status_counts: dict[str, int] = {}
    for agent in active_agents:
        if not isinstance(agent, dict):
            continue
        status_class = str(agent.get("status_class", "UNKNOWN"))
        status_counts[status_class] = status_counts.get(status_class, 0) + 1

    routing = _target_health_status()
    routing_summary = {
        target: {
            "http_status": probe.get("http_status"),
            "status_class": _http_status_to_status_class(probe.get("http_status")),
            "reachable": probe.get("reachable", False),
        }
        for target, probe in routing.items()
    }

    limitations: list[str] = []
    if not OLLAMAHF_BEARER_TOKEN:
        limitations.append("OLLAMAHF_BEARER_TOKEN missing: external orchestrator may be rate-limited or blocked.")
    if not OLLAMAHF_MASTER_KEY:
        limitations.append("OLLAMAHF_MASTER_KEY missing: external orchestrate depth can degrade.")
    if not BOLTDIY_SPACE_TOKEN:
        limitations.append("BOLTDIY_SPACE_TOKEN/HF_TOKEN missing: external HF dispatch may return 401/403/404.")
    if ZERO_COMPUTE_POLICY and not ALLOW_LOCAL_HEAVY:
        limitations.append("Zero-compute policy blocks heavy local runs; heavy tasks must route to remote targets.")

    bootstrap_state = _bootstrap_status_snapshot()
    prompt_ready, prompt_ready_reason = _is_ready_for_prompt_execution()
    if not prompt_ready:
        limitations.append(f"Prompt execution is blocked: {prompt_ready_reason}")

    no_limits_claim = len(limitations) == 0

    return {
        "status": "ok",
        "no_limits_claim": no_limits_claim,
        "active_agents": len(active_agents),
        "legacy_agents": len(AGENT_REGISTRY.get("legacy_agents", [])),
        "agent_status_counts": status_counts,
        "routing_summary": routing_summary,
        "limitations": limitations,
        "bootstrap_status": bootstrap_state.get("status", "DOWN"),
        "prompt_ready": prompt_ready,
        "prompt_ready_reason": prompt_ready_reason,
        "notes": (
            "No-lie rule: if limitations are present, system remains bounded by provider/auth/credit/runtime constraints."
        ),
    }


def _run_autonomy_pipeline(req: AutonomyRunRequest) -> dict[str, Any]:
    profile = AUTONOMY_PROFILES.get(req.profile_id.strip())
    if not profile:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unknown profile_id '{req.profile_id}'. "
                f"Available: {', '.join(sorted(AUTONOMY_PROFILES.keys()))}"
            ),
        )

    agents = [str(agent).strip() for agent in profile.get("agents", []) if str(agent).strip()]
    if not agents:
        raise HTTPException(status_code=422, detail=f"Autonomy profile '{req.profile_id}' has no agents configured.")
    result = _run_agent_chain(
        goal=req.goal.strip(),
        profile_id=req.profile_id.strip(),
        profile_label=str(profile.get("label", req.profile_id.strip())),
        agents=agents,
        source=req.source.strip(),
        repo=req.repo.strip(),
        ref=req.ref.strip(),
        status=req.status.strip(),
        halt_on_fail=req.halt_on_fail,
    )
    METRICS["autonomy_runs_total"] += 1
    return result


def _response_excerpt(value: Any) -> str:
    if value in (None, "", []):
        return ""
    try:
        text = json.dumps(value, ensure_ascii=True)
    except TypeError:
        text = str(value)
    return text[:500]


def _new_agent_chain_record(
    goal: str,
    profile_id: str,
    profile_label: str,
    agents: list[str],
) -> dict[str, Any]:
    run_id = str(uuid.uuid4())
    started_at = _now_iso()
    snapshot = EVIDENCE_DIR / f"autonomy_run_{started_at.replace(':', '-').replace('.', '-')}_{run_id}.json"
    run_file = RUNS_DIR / f"{run_id}.json"
    return {
        "run_id": run_id,
        "started_at": started_at,
        "finished_at": "",
        "goal": goal,
        "profile_id": profile_id,
        "profile_label": profile_label,
        "agent_chain": agents,
        "current_step": 0,
        "current_agent": "",
        "forwarded_steps": 0,
        "partial_steps": 0,
        "total_steps": len(agents),
        "status": "RUNNING",
        "steps": [],
        "snapshot": str(snapshot),
        "run_file": str(run_file),
        "execution_mode": "background",
    }


def _persist_agent_chain_record(record: dict[str, Any]) -> None:
    snapshot = Path(str(record.get("snapshot", "")))
    run_file = Path(str(record.get("run_file", "")))
    if not snapshot:
        return
    _write_json(snapshot, record)
    _write_json(EVIDENCE_DIR / "autonomy_run_latest.json", record)
    if run_file:
        _write_json(run_file, record)
    with CONTROL_CENTER_CACHE_LOCK:
        CONTROL_CENTER_CACHE["expires_at"] = 0.0
        CONTROL_CENTER_CACHE["payload"] = None


def _agent_chain_response(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": record.get("status", "UNKNOWN"),
        "run_id": record.get("run_id", ""),
        "goal": record.get("goal", ""),
        "profile_label": record.get("profile_label", ""),
        "current_step": record.get("current_step", 0),
        "current_agent": record.get("current_agent", ""),
        "forwarded_steps": record.get("forwarded_steps", 0),
        "partial_steps": record.get("partial_steps", 0),
        "total_steps": record.get("total_steps", 0),
        "profile_id": record.get("profile_id", ""),
        "agent_chain": record.get("agent_chain", []),
        "started_at": record.get("started_at", ""),
        "finished_at": record.get("finished_at", ""),
        "snapshot": record.get("snapshot", ""),
        "run_file": record.get("run_file", ""),
        "steps": record.get("steps", []),
    }


def _execute_agent_chain_record(
    record: dict[str, Any],
    source: str,
    repo: str,
    ref: str,
    status: str,
    halt_on_fail: bool,
) -> dict[str, Any]:
    agents = [str(agent).strip() for agent in record.get("agent_chain", []) if str(agent).strip()]
    steps: list[dict[str, Any]] = record.setdefault("steps", [])
    profile_id = str(record.get("profile_id", "unknown")).strip() or "unknown"
    goal = str(record.get("goal", "")).strip()

    try:
        for index, agent_id in enumerate(agents, start=1):
            step_record: dict[str, Any] = {
                "step": index,
                "agent": agent_id,
                "status": "running",
                "call_id": "",
                "runtime_target": "",
                "dispatch_artifact": "",
                "reason": "",
                "http_status": None,
                "response_excerpt": "",
                "started_at": _now_iso(),
                "finished_at": "",
            }
            record["current_step"] = index
            record["current_agent"] = agent_id
            record["status"] = "RUNNING"
            steps.append(step_record)
            _persist_agent_chain_record(record)

            mission = MissionPayload(
                agent=agent_id,
                task=f"[AUTONOMY:{profile_id}] step {index}/{len(agents)} :: {goal}",
                source=source,
                repo=repo,
                ref=ref,
                status=status,
                timestamp=_now_iso(),
            )
            try:
                dispatch_result = dispatch(mission)
                raw_step_status = str(dispatch_result.get("status", "forward-failed"))
                step_result = dispatch_result.get("result", {}) if isinstance(dispatch_result.get("result", {}), dict) else {}
                fallback_used = bool(step_result.get("fallback_used"))
                step_status = "partial" if raw_step_status == "forwarded" and fallback_used else raw_step_status
                fallback_reason = str(step_result.get("fallback_reason", "")).strip()
                reason = step_result.get("reason", "") or step_result.get("error", "")
                if fallback_used and not reason:
                    reason = (
                        "Primary orchestrate path did not produce a full implementation proof; "
                        "workspace fallback answered instead."
                    )
                step_record.update(
                    {
                        "status": step_status,
                        "call_id": dispatch_result.get("call_id"),
                        "runtime_target": dispatch_result.get("runtime_target"),
                        "dispatch_artifact": dispatch_result.get("dispatch_artifact"),
                        "reason": reason,
                        "http_status": step_result.get("http_status"),
                        "raw_status": raw_step_status,
                        "fallback_used": fallback_used,
                        "fallback_reason": fallback_reason,
                        "fallback_endpoint": step_result.get("fallback_endpoint", ""),
                        "fallback_task_id": step_result.get("fallback_task_id", ""),
                        "recovery_used": bool(step_result.get("recovery_used")),
                        "recovery_endpoint": step_result.get("recovery_endpoint", ""),
                        "recovery_reason": step_result.get("recovery_reason", ""),
                        "primary_orchestrate_status": step_result.get("primary_orchestrate_status", ""),
                        "primary_orchestrate_http_status": step_result.get("primary_orchestrate_http_status"),
                        "final_code_artifact": step_result.get("final_code_artifact", ""),
                        "final_code_url": step_result.get("final_code_url", ""),
                        "final_code_bytes": step_result.get("final_code_bytes", 0),
                        "response_excerpt": _response_excerpt(
                            step_result.get("response") or step_result.get("events_preview") or step_result.get("http")
                        ),
                        "finished_at": _now_iso(),
                    }
                )
                record["forwarded_steps"] = sum(1 for step in steps if step.get("status") == "forwarded")
                record["partial_steps"] = sum(1 for step in steps if step.get("status") == "partial")
                _persist_agent_chain_record(record)
                if halt_on_fail and step_status != "forwarded":
                    break
            except HTTPException as exc:
                step_record.update(
                    {
                        "status": "blocked",
                        "reason": str(exc.detail),
                        "response_excerpt": str(exc.detail)[:500],
                        "finished_at": _now_iso(),
                    }
                )
                _persist_agent_chain_record(record)
                if halt_on_fail:
                    break
    except Exception as exc:  # pragma: no cover - background safety net
        record["status"] = "BLOCKED"
        record["current_agent"] = ""
        record["finished_at"] = _now_iso()
        record["reason"] = f"agent-chain-worker-crashed: {exc}"
        _persist_agent_chain_record(record)
        return _agent_chain_response(record)

    forwarded = sum(1 for step in steps if step.get("status") == "forwarded")
    partial = sum(1 for step in steps if step.get("status") == "partial")
    if forwarded == len(agents):
        overall_status = "PASS"
    elif forwarded > 0 or partial > 0:
        overall_status = "PARTIAL"
    else:
        overall_status = "BLOCKED"

    record["finished_at"] = _now_iso()
    record["current_step"] = len(steps)
    record["current_agent"] = ""
    record["forwarded_steps"] = forwarded
    record["partial_steps"] = partial
    record["status"] = overall_status
    _persist_agent_chain_record(record)
    return _agent_chain_response(record)


def _start_agent_chain_background(
    goal: str,
    profile_id: str,
    profile_label: str,
    agents: list[str],
    source: str,
    repo: str,
    ref: str,
    status: str,
    halt_on_fail: bool,
) -> dict[str, Any]:
    record = _new_agent_chain_record(goal, profile_id, profile_label, agents)
    record["execution_mode"] = "background"
    record["reason"] = "Run accepted; agent chain is executing in the background."
    _persist_agent_chain_record(record)
    thread = threading.Thread(
        target=_execute_agent_chain_record,
        args=(record, source, repo, ref, status, halt_on_fail),
        daemon=True,
    )
    thread.start()
    METRICS["autonomy_runs_total"] += 1
    return _agent_chain_response(record)


def _run_agent_chain(
    goal: str,
    profile_id: str,
    profile_label: str,
    agents: list[str],
    source: str,
    repo: str,
    ref: str,
    status: str,
    halt_on_fail: bool,
) -> dict[str, Any]:
    record = _new_agent_chain_record(goal, profile_id, profile_label, agents)
    record["execution_mode"] = "foreground"
    _persist_agent_chain_record(record)
    result = _execute_agent_chain_record(record, source, repo, ref, status, halt_on_fail)
    METRICS["autonomy_runs_total"] += 1
    return result


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
        # Keep probe payload lightweight so endpoint availability is measured,
        # not long code-generation latency.
        "output_format": "text",
        "max_tokens": 64,
        "temperature": 0.0,
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
        orchestrate_result = dict(orchestrate_result)
        orchestrate_result["attempts"] = [dict(item) for item in orchestrate_attempts]
    results = {
        "models": models_result,
        "chat_completions": chat_result,
        "orchestrate": orchestrate_result,
    }
    success_count = 0
    for name, item in results.items():
        if name == "orchestrate":
            response_payload = item.get("response")
            if isinstance(response_payload, dict) and response_payload.get("dry_run") is True:
                continue
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


def _set_bootstrap_state(record: dict[str, Any]) -> None:
    global BOOTSTRAP_STATE
    with BOOTSTRAP_LOCK:
        BOOTSTRAP_STATE = dict(record)
    _persist_bootstrap_state(record)
    with CONTROL_CENTER_CACHE_LOCK:
        CONTROL_CENTER_CACHE["expires_at"] = 0.0
        CONTROL_CENTER_CACHE["payload"] = None


def _bootstrap_worker(include_script_start: bool, source: str) -> None:
    try:
        record = _run_bootstrap(include_script_start=include_script_start, source=source)
    except Exception as exc:  # pragma: no cover - runtime path
        record = {
            "status": "BLOCKED",
            "ready": False,
            "boot_id": str(uuid.uuid4()),
            "started_at": _now_iso(),
            "finished_at": _now_iso(),
            "summary": f"Bootstrap failed with exception: {exc}",
            "phases": [],
        }
        _persist_bootstrap_state(record)
    _set_bootstrap_state(record)


def _load_run_file(run_id: str) -> dict[str, Any]:
    candidate = RUNS_DIR / f"{run_id}.json"
    if not candidate.exists():
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")
    payload = _latest_json(candidate)
    if not payload:
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' evidence is empty.")
    return payload


def _control_center_state_payload(force_refresh: bool = False) -> dict[str, Any]:
    now_epoch = time.time()
    if not force_refresh and CONTROL_CENTER_STATUS_CACHE_TTL > 0:
        with CONTROL_CENTER_CACHE_LOCK:
            expires_at = float(CONTROL_CENTER_CACHE.get("expires_at", 0.0) or 0.0)
            cached_payload = CONTROL_CENTER_CACHE.get("payload")
            if cached_payload and expires_at > now_epoch:
                return dict(cached_payload)

    target_timeout = max(2, min(BOLTDIY_FORWARD_TIMEOUT, 8))
    target_probes = _target_health_status(probe_timeout=target_timeout)
    routing_targets = {
        target: {
            **probe,
            "status_class": _http_status_to_status_class(probe.get("http_status")),
        }
        for target, probe in target_probes.items()
    }
    latest_dispatch = _latest_json(DISPATCH_DIR / "latest_dispatch.json")
    routing_payload = {
        "status": "ok",
        "targets": routing_targets,
        "latest_dispatch": latest_dispatch.get("dispatch_artifact", ""),
        "checked_at": _now_iso(),
    }

    active_agents = AGENT_REGISTRY.get("active_agents", [])
    legacy_agents = AGENT_REGISTRY.get("legacy_agents", [])
    health_payload = {
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
        "routing_status": target_probes,
        "bootstrap": {
            "status": _bootstrap_status_snapshot().get("status", "DOWN"),
            "ready": bool(_bootstrap_status_snapshot().get("ready", False)),
            "allow_script_start": BOOTSTRAP_ALLOW_SCRIPT_START,
            "script_configured": bool(BOOTSTRAP_START_SCRIPT),
            "start_script": BOOTSTRAP_START_SCRIPT,
        },
        "runtime_dir": str(RUNTIME_DIR),
        "evidence_dir": str(EVIDENCE_DIR),
    }

    bootstrap_payload = _bootstrap_status_snapshot()
    ready, reason = _is_ready_for_prompt_execution()
    latest_run = _latest_json(EVIDENCE_DIR / "autonomy_run_latest.json")
    service_probes = _probe_catalog_parallel(_service_probe_catalog(), target_timeout)
    payload = {
        "status": "ok",
        "ready_for_prompt_execute": ready,
        "ready_reason": "" if ready else reason,
        "bootstrap": bootstrap_payload,
        "health": health_payload,
        "routing": routing_payload,
        "agents": {
            "active_count": len(AGENT_REGISTRY.get("active_agents", [])),
            "legacy_count": len(AGENT_REGISTRY.get("legacy_agents", [])),
            "alias_collisions": AGENT_ALIAS_COLLISIONS,
        },
        "service_probes": service_probes,
        "latest_run": latest_run,
        "computed_at": _now_iso(),
        "cache_ttl_seconds": CONTROL_CENTER_STATUS_CACHE_TTL,
    }
    if CONTROL_CENTER_STATUS_CACHE_TTL > 0:
        with CONTROL_CENTER_CACHE_LOCK:
            CONTROL_CENTER_CACHE["expires_at"] = now_epoch + float(CONTROL_CENTER_STATUS_CACHE_TTL)
            CONTROL_CENTER_CACHE["payload"] = dict(payload)
    return payload


@app.post("/bootstrap/start")
def bootstrap_start(req: BootstrapStartRequest) -> dict[str, Any]:
    _ensure_dirs()
    with BOOTSTRAP_LOCK:
        current = dict(BOOTSTRAP_STATE)
        if current.get("status") == "BOOTING":
            return {
                "status": "BOOTING",
                "ready": False,
                "message": "Bootstrap already in progress.",
                "bootstrap": current,
            }
        booting_record = {
            "status": "BOOTING",
            "ready": False,
            "boot_id": str(uuid.uuid4()),
            "started_at": _now_iso(),
            "finished_at": "",
            "summary": "Bootstrap in progress.",
            "source": req.source.strip(),
            "phases": [],
        }
    _set_bootstrap_state(booting_record)
    thread = threading.Thread(
        target=_bootstrap_worker,
        args=(req.include_script_start, req.source.strip()),
        daemon=True,
    )
    thread.start()
    METRICS["bootstrap_runs_total"] += 1
    return {
        "status": "BOOTING",
        "ready": False,
        "message": "Bootstrap started.",
        "bootstrap": booting_record,
    }


@app.get("/bootstrap/status")
def bootstrap_status() -> dict[str, Any]:
    _ensure_dirs()
    state = _bootstrap_status_snapshot()
    ready, reason = _is_ready_for_prompt_execution()
    return {
        "status": "ok",
        "bootstrap": state,
        "ready_for_prompt_execute": ready,
        "ready_reason": reason,
    }


@app.get("/control-center/state")
def control_center_state(fresh: bool = Query(default=False)) -> dict[str, Any]:
    _ensure_dirs()
    return _control_center_state_payload(force_refresh=fresh)


@app.post("/runs")
def create_run(req: RunCreateRequest) -> dict[str, Any]:
    _ensure_dirs()
    ready, reason = _is_ready_for_prompt_execution()
    if not ready:
        raise HTTPException(status_code=409, detail=f"Run blocked: {reason}")

    selected_agents = [item.strip() for item in req.selected_agents if item.strip()]
    if selected_agents:
        canonical_agents: list[str] = []
        for candidate in selected_agents:
            entry = _resolve_agent_entry(candidate)
            canonical_agents.append(str(entry.get("agent_id", candidate)).strip())
        if req.async_run:
            return _start_agent_chain_background(
                goal=req.goal.strip(),
                profile_id="custom_selected",
                profile_label="Custom Selected Agents",
                agents=canonical_agents,
                source=req.source.strip(),
                repo=req.repo.strip(),
                ref=req.ref.strip(),
                status=req.status.strip(),
                halt_on_fail=req.halt_on_fail,
            )
        return _run_agent_chain(
            goal=req.goal.strip(),
            profile_id="custom_selected",
            profile_label="Custom Selected Agents",
            agents=canonical_agents,
            source=req.source.strip(),
            repo=req.repo.strip(),
            ref=req.ref.strip(),
            status=req.status.strip(),
            halt_on_fail=req.halt_on_fail,
        )

    autonomy_req = AutonomyRunRequest(
        goal=req.goal.strip(),
        profile_id=req.profile_id.strip(),
        source=req.source.strip(),
        repo=req.repo.strip(),
        ref=req.ref.strip(),
        status=req.status.strip(),
        halt_on_fail=req.halt_on_fail,
    )
    if req.async_run:
        profile = AUTONOMY_PROFILES.get(autonomy_req.profile_id.strip())
        if not profile:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Unknown profile_id '{autonomy_req.profile_id}'. "
                    f"Available: {', '.join(sorted(AUTONOMY_PROFILES.keys()))}"
                ),
            )
        agents = [str(agent).strip() for agent in profile.get("agents", []) if str(agent).strip()]
        if not agents:
            raise HTTPException(status_code=422, detail=f"Autonomy profile '{autonomy_req.profile_id}' has no agents configured.")
        return _start_agent_chain_background(
            goal=autonomy_req.goal.strip(),
            profile_id=autonomy_req.profile_id.strip(),
            profile_label=str(profile.get("label", autonomy_req.profile_id.strip())),
            agents=agents,
            source=autonomy_req.source.strip(),
            repo=autonomy_req.repo.strip(),
            ref=autonomy_req.ref.strip(),
            status=autonomy_req.status.strip(),
            halt_on_fail=autonomy_req.halt_on_fail,
        )
    return _run_autonomy_pipeline(autonomy_req)


@app.get("/runs/{run_id}")
def get_run(run_id: str) -> dict[str, Any]:
    _ensure_dirs()
    return {"status": "ok", "run": _load_run_file(run_id)}


@app.get("/runs/{run_id}/evidence")
def get_run_evidence(run_id: str) -> dict[str, Any]:
    _ensure_dirs()
    run = _load_run_file(run_id)
    return {
        "status": "ok",
        "run_id": run.get("run_id", run_id),
        "snapshot": run.get("snapshot", ""),
        "run_file": str(RUNS_DIR / f"{run_id}.json"),
        "steps": run.get("steps", []),
        "summary": {
            "status": run.get("status", "UNKNOWN"),
            "forwarded_steps": run.get("forwarded_steps", 0),
            "total_steps": run.get("total_steps", 0),
        },
    }


@app.get("/artifacts/ollamahf/{filename}")
def get_ollamahf_artifact(filename: str) -> FileResponse:
    _ensure_dirs()
    safe_name = Path(filename).name
    candidate = (EVIDENCE_DIR / "ollamahf_artifacts" / safe_name).resolve()
    allowed_root = (EVIDENCE_DIR / "ollamahf_artifacts").resolve()
    if allowed_root not in candidate.parents or not candidate.exists() or candidate.suffix.lower() != ".html":
        raise HTTPException(status_code=404, detail="Artifact not found.")
    return FileResponse(
        candidate,
        media_type="text/html",
    )


@app.post("/prompt/execute")
def prompt_execute(req: PromptExecuteRequest) -> dict[str, Any]:
    _ensure_dirs()
    ready, reason = _is_ready_for_prompt_execution()
    if not ready:
        raise HTTPException(status_code=409, detail=f"Prompt execution blocked: {reason}")

    if req.agent and req.agent.strip():
        mission = MissionPayload(
            agent=req.agent.strip(),
            task=req.prompt.strip(),
            source=req.source.strip(),
            repo=req.repo.strip(),
            ref=req.ref.strip(),
            status=req.status.strip(),
            timestamp=_now_iso(),
        )
        normalized, _ = _canonicalize_payload(mission)
        dispatch_result = dispatch(mission)
        return {
            "status": "ok",
            "mode": "single-agent",
            "ready_state": _bootstrap_status_snapshot().get("status", "UNKNOWN"),
            "mission_payload": normalized.model_dump(),
            "dispatch": dispatch_result,
        }

    selected_profile = req.profile_id.strip() if req.profile_id and req.profile_id.strip() else _profile_from_prompt(req.prompt)
    run_req = RunCreateRequest(
        goal=req.prompt.strip(),
        source=req.source.strip(),
        repo=req.repo.strip(),
        ref=req.ref.strip(),
        status=req.status.strip(),
        profile_id=selected_profile,
        selected_agents=[],
        halt_on_fail=req.halt_on_fail,
        async_run=req.async_run,
    )
    run_result = create_run(run_req)
    return {
        "status": "ok",
        "mode": "multi-agent",
        "selected_profile": selected_profile,
        "prompt": req.prompt.strip(),
        "run": run_result,
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
        "bootstrap": {
            "status": _bootstrap_status_snapshot().get("status", "DOWN"),
            "ready": bool(_bootstrap_status_snapshot().get("ready", False)),
            "allow_script_start": BOOTSTRAP_ALLOW_SCRIPT_START,
            "script_configured": bool(BOOTSTRAP_START_SCRIPT),
            "start_script": BOOTSTRAP_START_SCRIPT,
        },
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


@app.get("/autonomy/profiles")
def autonomy_profiles() -> dict[str, Any]:
    return {
        "status": "ok",
        "profiles": _list_autonomy_profiles(),
        "count": len(AUTONOMY_PROFILES),
    }


@app.get("/autonomy/capabilities")
def autonomy_capabilities() -> dict[str, Any]:
    return _capability_summary()


@app.post("/autonomy/run")
def autonomy_run(req: AutonomyRunRequest) -> dict[str, Any]:
    _ensure_dirs()
    if not req.goal.strip():
        raise HTTPException(status_code=422, detail="goal must not be empty")
    return _run_autonomy_pipeline(req)


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

    if DISPATCH_APPEND_PROJECT_LOGS:
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

    with CONTROL_CENTER_CACHE_LOCK:
        CONTROL_CENTER_CACHE["expires_at"] = 0.0
        CONTROL_CENTER_CACHE["payload"] = None

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
        "bootstrap_latest": BOOTSTRAP_STATE_PATH,
        "run_latest": EVIDENCE_DIR / "autonomy_run_latest.json",
        "autonomy_run_latest": EVIDENCE_DIR / "autonomy_run_latest.json",
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

    if DISPATCH_APPEND_PROJECT_LOGS:
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
