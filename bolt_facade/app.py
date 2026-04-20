from __future__ import annotations

import concurrent.futures
import contextvars
import hashlib
import html
import json
import os
import platform
import re
import shutil
import socket
import subprocess
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, parse, request

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
    parsed = parse.urlsplit(value)
    if parsed.netloc.lower() == "huggingface.co":
        segments = [segment for segment in parsed.path.split("/") if segment]
        if len(segments) >= 3 and segments[0].lower() == "spaces":
            owner = segments[1].strip().lower()
            space = segments[2].strip().lower()
            suffix = ""
            if len(segments) > 3:
                suffix = "/" + "/".join(segments[3:])
            normalized = parse.urlunsplit(
                (
                    "https",
                    f"{owner}-{space}.hf.space",
                    suffix,
                    parsed.query,
                    parsed.fragment,
                )
            )
            if parsed.query or parsed.fragment:
                return normalized
            return normalized.rstrip("/")
    match = re.search(r"huggingface\.co/spaces/([^/]+)/([^/?#]+)([^?#]*)", value, re.IGNORECASE)
    if not match:
        return value.rstrip("/")
    owner = match.group(1).strip().lower()
    space = match.group(2).strip().lower()
    suffix = (match.group(3) or "").rstrip("/")
    return f"https://{owner}-{space}.hf.space{suffix}"


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
PLATFORM7_CONTRACT_PATH = Path(
    os.environ.get("PLATFORM7_CONTRACT_PATH", str(REPO_ROOT / "platform7_contract.json"))
).resolve()
RUN_MANIFEST_DIR = (EVIDENCE_DIR / "manifests").resolve()
CONTROL_EVENT_DIR = (RUNTIME_DIR / "control_events").resolve()

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
    _normalize_hf_space_url(os.environ.get("HF_AIDER_URL", "")),
    _normalize_hf_space_url(HF_AIDER_SPACE_URL),
    "https://wrzzzrzr-aider-godmode-safe.hf.space",
)
HF_AIDER_DISPATCH_URL = _normalize_hf_space_url(os.environ.get("HF_AIDER_DISPATCH_URL", "").strip())
SMOLAGENTS_URL = _first_non_empty(
    _normalize_hf_space_url(os.environ.get("SMOLAGENTS_URL", "")),
    _normalize_hf_space_url(HF_SMOLAGENTS_SPACE_URL),
    "https://wrzzzrzr-smolagents-godmode.hf.space",
)
SMOLAGENTS_DISPATCH_URL = _normalize_hf_space_url(os.environ.get("SMOLAGENTS_DISPATCH_URL", "").strip())
LANGGRAPH_API_URL = _first_non_empty(
    os.environ.get("LANGGRAPH_API_URL", ""),
)
LANGGRAPH_API_INTERNAL_URL = _first_non_empty(
    os.environ.get("LANGGRAPH_API_INTERNAL_URL", ""),
    "http://langgraph-godmode-local:8080",
)
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
OPENHANDS_ADAPTER_URL = _first_non_empty(
    os.environ.get("OPENHANDS_ADAPTER_URL", ""),
    "http://openhands-godmode-adapter:3001",
)
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
CONTROL_CENTER_PROBE_TIMEOUT = int(os.environ.get("CONTROL_CENTER_PROBE_TIMEOUT", "4"))
CONTROL_CENTER_PERSIST_MANIFEST = os.environ.get("CONTROL_CENTER_PERSIST_MANIFEST", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
STORAGE_METRICS_CACHE_TTL = int(os.environ.get("STORAGE_METRICS_CACHE_TTL", "300"))
STORAGE_GROWTH_ALERT_THRESHOLD_PERCENT = float(
    os.environ.get("STORAGE_GROWTH_ALERT_THRESHOLD_PERCENT", "20")
)
OLLAMAHF_DUPLICATE_ALERT_THRESHOLD_PERCENT = float(
    os.environ.get("OLLAMAHF_DUPLICATE_ALERT_THRESHOLD_PERCENT", "70")
)
STORAGE_HASH_SCAN_MAX_FILES = int(os.environ.get("STORAGE_HASH_SCAN_MAX_FILES", "1000"))
HEALTH_STORAGE_MODE = os.environ.get("HEALTH_STORAGE_MODE", "lite").strip().lower() or "lite"
DISPATCH_APPEND_PROJECT_LOGS = os.environ.get("DISPATCH_APPEND_PROJECT_LOGS", "false").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
RUN_ROUTING_OVERRIDE_TTL_SECONDS = int(os.environ.get("RUN_ROUTING_OVERRIDE_TTL_SECONDS", "7200"))
OLLAMAHF_STALE_CITY_PARK_HASH = "c0fd5b0be2fb2775a48097424606b0f4a08307db6194e70f773c68061abb5907"
OLLAMAHF_STALE_CITY_PARK_MARKERS = (
    "3d city park reference world",
    "city park reference world",
    "render-loop gefahr",
)
OLLAMAHF_CITY_PARK_PROMPT_MARKERS = (
    "city park",
    "3d city park",
    "reference world",
)
BOOTSTRAP_STATE_PATH = EVIDENCE_DIR / "bootstrap_latest.json"
STARTED_AT = datetime.now(timezone.utc).isoformat()
RUNTIME_TARGETS = [
    "langgraph-local",
    "smolagents",
    "openhands-adapter",
    "hf-aider",
    "ollama-hf-orchestrator",
]
AUTO_RECOVERY_TARGETS: dict[str, list[str]] = {
    "langgraph-local": ["ollama-hf-orchestrator", "hf-aider"],
    "openhands-adapter": ["hf-aider", "ollama-hf-orchestrator"],
    "smolagents": ["hf-aider", "ollama-hf-orchestrator"],
    "ollama-hf-orchestrator": ["hf-aider", "langgraph-local"],
}
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
RECOVERY_RUNBOOK_STEPS = [
    "URL check",
    "routing probe",
    "retry",
    "quarantine",
]
PLATFORM7_OPERATIONAL_STATES = [
    "Idle",
    "Queued",
    "Running",
    "Waiting",
    "Blocked",
    "Partial",
    "Failed",
    "Done",
    "Stale",
]
PLATFORM7_MATURITY_STATES = [
    "Verified",
    "Partial",
    "Blocked",
    "Legacy",
    "Plan",
    "Unknown",
]
PLATFORM7_SUPERPOWER_IDS = [
    "openhands-architect-mode",
    "aider-ultracheap",
    "smolagents-web-crawler",
    "langgraph-self-evolving",
    "n8n-phantom-trigger",
    "openhands-boltdiy-feedback-loop",
    "litellm-router",
    "aider-repo-map",
    "vision-agent",
    "parallel-agent-swarms",
    "n8n-ai-memory",
    "context-window-injection",
]
PLATFORM7_EXPECTED_TOOL_IDS = [
    "dispatch-hub",
    "core-tools-bridge",
    "chrome-devtools",
    "puppeteer",
    "playwright",
    "evidence-manifests",
    "quarantine-control",
]
PLATFORM7_EXPECTED_LANES = [
    "Scope",
    "Design",
    "Client",
    "Gameplay",
    "Netcode",
    "Backend",
    "Cloud",
    "QA",
    "Security",
    "Dispatch",
    "Registry",
    "Routing",
    "Runtime",
    "Evidence",
    "Recovery",
    "LangGraph",
    "External",
    "Supervisor",
]
PLATFORM7_NAMESPACE_RUNTIME_TARGETS: dict[str, str] = {
    "product_scope": "langgraph-local",
    "game_design": "langgraph-local",
    "webgl_client": "openhands-adapter",
    "gameplay_systems": "openhands-adapter",
    "multiplayer_netcode": "openhands-adapter",
    "backend_platform": "openhands-adapter",
    "cloud_infra_devops": "hf-aider",
    "qa_validation": "langgraph-local",
    "security_anticheat": "hf-aider",
    "local.dispatch.conductor": "langgraph-local",
    "local.prompt.orchestrator": "langgraph-local",
    "local.registry.steward": "langgraph-local",
    "local.routing.controller": "langgraph-local",
    "local.bootstrap.operator": "langgraph-local",
    "local.evidence.curator": "langgraph-local",
    "local.recovery.marshal": "langgraph-local",
    "local.openhands.openhands": "openhands-adapter",
    "local.n8n.flow": "langgraph-local",
    "local.litellm.router": "langgraph-local",
    "local.langgraph.planner": "langgraph-local",
    "local.langgraph.research": "langgraph-local",
    "local.langgraph.reviewer": "langgraph-local",
    "local.langgraph.finalize": "langgraph-local",
    "smolagents": "smolagents",
    "hf-aider": "hf-aider",
    "ollama-hf-orchestrator": "ollama-hf-orchestrator",
    "devtools-bridge": "openhands-adapter",
    "sentinel_truth": "langgraph-local",
    "sentinel_runtime": "langgraph-local",
}
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
STORAGE_METRICS_CACHE_LOCK = threading.Lock()
STORAGE_METRICS_CACHE: dict[str, Any] = {
    "expires_at": 0.0,
    "payload": None,
}
ROUTING_OVERRIDE_STATE: dict[str, Any] = {
    "mode": "auto",
    "source": "system",
    "reason": "initial",
    "updated_at": datetime.now(timezone.utc).isoformat(),
}
RUN_ROUTING_OVERRIDES_LOCK = threading.Lock()
RUN_ROUTING_OVERRIDES: dict[str, dict[str, Any]] = {}
DISPATCH_RUN_CONTEXT: contextvars.ContextVar[str] = contextvars.ContextVar("dispatch_run_id", default="")


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


class RunControlRequest(BaseModel):
    source: str = Field(default="platform-control", min_length=1)
    reason: str = Field(default="", min_length=0)
    session_id: str = Field(default="", min_length=0)
    trace_id: str = Field(default="", min_length=0)
    span_id: str = Field(default="", min_length=0)
    task_id: str = Field(default="", min_length=0)
    step_id: str = Field(default="", min_length=0)
    agent_id: str = Field(default="", min_length=0)
    role: str = Field(default="", min_length=0)
    runtime_target: str = Field(default="", min_length=0)


class RoutingOverrideRequest(RunControlRequest):
    mode: str = Field(default="auto", min_length=1)
    run_id: str = Field(default="", min_length=0)


class QuarantineArtifactRequest(RunControlRequest):
    artifact: str = Field(min_length=1)
    run_id: str = Field(default="", min_length=0)


class RunQuarantineRequest(RunControlRequest):
    artifact: str = Field(default="", min_length=0)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_dirs() -> None:
    DISPATCH_DIR.mkdir(parents=True, exist_ok=True)
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    BOOTSTRAP_DIR.mkdir(parents=True, exist_ok=True)
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    RUN_MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    CONTROL_EVENT_DIR.mkdir(parents=True, exist_ok=True)


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


def _default_platform7_contract() -> dict[str, Any]:
    return {
        "version": "fallback",
        "status_model": list(PLATFORM7_OPERATIONAL_STATES),
        "maturity_model": list(PLATFORM7_MATURITY_STATES),
        "required_supervisor_namespaces": ["sentinel_truth", "sentinel_runtime"],
        "roles": [],
        "tooling_requirements": [],
        "superpowers": [],
        "autonomy_profiles": [],
    }


def _load_platform7_contract() -> dict[str, Any]:
    if not PLATFORM7_CONTRACT_PATH.exists():
        return _default_platform7_contract()
    try:
        payload = json.loads(PLATFORM7_CONTRACT_PATH.read_text(encoding="utf-8"))
    except Exception:
        return _default_platform7_contract()
    if not isinstance(payload, dict):
        return _default_platform7_contract()
    fallback = _default_platform7_contract()
    return {
        "version": str(payload.get("version", fallback["version"])),
        "status_model": payload.get("status_model", fallback["status_model"]),
        "maturity_model": payload.get("maturity_model", fallback["maturity_model"]),
        "required_supervisor_namespaces": payload.get(
            "required_supervisor_namespaces", fallback["required_supervisor_namespaces"]
        ),
        "roles": payload.get("roles", fallback["roles"]),
        "tooling_requirements": payload.get("tooling_requirements", fallback["tooling_requirements"]),
        "superpowers": payload.get("superpowers", fallback["superpowers"]),
        "autonomy_profiles": payload.get("autonomy_profiles", fallback["autonomy_profiles"]),
        "source": str(PLATFORM7_CONTRACT_PATH),
    }


def _runtime_target_for_virtual_namespace(namespace: str) -> str:
    normalized = namespace.strip().lower()
    return PLATFORM7_NAMESPACE_RUNTIME_TARGETS.get(normalized, "langgraph-local")


def _build_virtual_agent_lookup(contract: dict[str, Any]) -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    roles = contract.get("roles", [])
    if isinstance(roles, list):
        for entry in roles:
            if not isinstance(entry, dict):
                continue
            namespace = str(entry.get("namespace", "")).strip()
            role_id = str(entry.get("id", "")).strip()
            role_name = str(entry.get("name", role_id)).strip() or role_id
            if not namespace:
                continue
            kind = str(entry.get("kind", "worker")).strip().lower()
            agent_record = {
                "agent_id": namespace,
                "display_name": role_name,
                "aliases": [role_id, role_name],
                "origin": "platform7-contract",
                "runtime_target": _runtime_target_for_virtual_namespace(namespace),
                "status_class": "VERIFIED",
                "input_contract": "7-field",
                "depends_on": [],
                "evidence_refs": [str(PLATFORM7_CONTRACT_PATH)],
                "kind": kind,
            }
            lookup[namespace.lower()] = agent_record
            if role_id:
                lookup[role_id.lower()] = agent_record
            if role_name:
                lookup[role_name.lower()] = agent_record
    return lookup


def _validate_platform7_contract(contract: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    roles = contract.get("roles", [])
    if not isinstance(roles, list):
        roles = []
    tooling_requirements = contract.get("tooling_requirements", [])
    if not isinstance(tooling_requirements, list):
        tooling_requirements = []
    superpowers = contract.get("superpowers", [])
    if not isinstance(superpowers, list):
        superpowers = []
    autonomy_profiles = contract.get("autonomy_profiles", [])
    if not isinstance(autonomy_profiles, list):
        autonomy_profiles = []
    status_model = contract.get("status_model", [])
    maturity_model = contract.get("maturity_model", [])
    required_supervisors = contract.get("required_supervisor_namespaces", [])
    if not isinstance(required_supervisors, list):
        required_supervisors = []
    required_supervisor_set = {str(item).strip().lower() for item in required_supervisors if str(item).strip()}

    role_namespaces: list[str] = []
    supervisor_count = 0
    worker_count = 0
    for role in roles:
        if not isinstance(role, dict):
            continue
        namespace = str(role.get("namespace", "")).strip().lower()
        if namespace:
            role_namespaces.append(namespace)
        kind = str(role.get("kind", "worker")).strip().lower()
        if kind == "supervisor":
            supervisor_count += 1
        else:
            worker_count += 1

    if len(roles) != 29:
        errors.append(f"Platform7 contract must define 29 visible roles; found {len(roles)}.")
    if worker_count != 27 or supervisor_count != 2:
        errors.append(
            f"Platform7 contract role split must be 27 workers + 2 supervisors; found {worker_count} workers and {supervisor_count} supervisors."
        )
    if set(str(item) for item in status_model) != set(PLATFORM7_OPERATIONAL_STATES):
        errors.append("Platform7 status_model does not match canonical operational states.")
    if set(str(item) for item in maturity_model) != set(PLATFORM7_MATURITY_STATES):
        errors.append("Platform7 maturity_model does not match canonical maturity states.")

    role_namespace_set = set(role_namespaces)
    missing_supervisors = [item for item in required_supervisor_set if item not in role_namespace_set]
    if missing_supervisors:
        errors.append(
            "Platform7 contract is missing required supervisors: "
            + ", ".join(sorted(missing_supervisors))
        )
    if required_supervisor_set != {"sentinel_truth", "sentinel_runtime"}:
        errors.append(
            "Platform7 required_supervisor_namespaces must be exactly sentinel_truth and sentinel_runtime."
        )
    required_tool_ids: set[str] = set()
    for item in tooling_requirements:
        if not isinstance(item, dict):
            continue
        tool_id = str(item.get("id", "")).strip().lower()
        if not tool_id:
            continue
        required = bool(item.get("required", True))
        if required:
            required_tool_ids.add(tool_id)
    browser_gate_required = {"chrome-devtools", "puppeteer"}
    missing_browser_tools = sorted(item for item in browser_gate_required if item not in required_tool_ids)
    if missing_browser_tools:
        errors.append(
            "Platform7 tooling_requirements must include required browser gates: "
            + ", ".join(missing_browser_tools)
        )
    if len(required_tool_ids) == 0:
        errors.append("Platform7 tooling_requirements must include at least one required tool.")
    required_superpower_ids = {
        str(item.get("id", "")).strip().lower()
        for item in superpowers
        if isinstance(item, dict) and bool(item.get("required", True)) and str(item.get("id", "")).strip()
    }
    missing_superpowers = sorted(item for item in PLATFORM7_SUPERPOWER_IDS if item not in required_superpower_ids)
    if missing_superpowers:
        errors.append(
            "Platform7 superpowers missing required entries: "
            + ", ".join(missing_superpowers)
        )
    full_profile_ok = False
    for entry in autonomy_profiles:
        if not isinstance(entry, dict):
            continue
        profile_agents = {
            str(agent).strip().lower()
            for agent in entry.get("agents", [])
            if str(agent).strip()
        }
        if not profile_agents:
            continue
        if role_namespace_set.issubset(profile_agents) and {"sentinel_truth", "sentinel_runtime"}.issubset(profile_agents):
            full_profile_ok = True
            break
    if not full_profile_ok:
        errors.append("Platform7 autonomy_profiles must include one full 29-role profile with both supervisors.")
    if not autonomy_profiles:
        warnings.append("Platform7 contract has no autonomy_profiles; fallback profiles remain active.")

    return {
        "ok": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "role_count": len(roles),
        "worker_count": worker_count,
        "supervisor_count": supervisor_count,
        "tooling_required_count": len(required_tool_ids),
        "tooling_required_ids": sorted(required_tool_ids),
        "superpowers_required_count": len(required_superpower_ids),
        "superpowers_required_ids": sorted(required_superpower_ids),
        "full_profile_ok": full_profile_ok,
    }


def _sync_autonomy_profiles_from_contract(contract: dict[str, Any]) -> None:
    profiles = contract.get("autonomy_profiles", [])
    if not isinstance(profiles, list):
        return
    for entry in profiles:
        if not isinstance(entry, dict):
            continue
        profile_id = str(entry.get("id", "")).strip()
        if not profile_id:
            continue
        agents = [str(agent).strip() for agent in entry.get("agents", []) if str(agent).strip()]
        if not agents:
            continue
        AUTONOMY_PROFILES[profile_id] = {
            "label": str(entry.get("label", profile_id)).strip() or profile_id,
            "description": str(entry.get("description", "")).strip(),
            "agents": agents,
            "supervisors_required": ["sentinel_truth", "sentinel_runtime"],
        }


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
PLATFORM7_CONTRACT = _load_platform7_contract()
PLATFORM7_CONTRACT_VALIDATION = _validate_platform7_contract(PLATFORM7_CONTRACT)
VIRTUAL_AGENT_LOOKUP = _build_virtual_agent_lookup(PLATFORM7_CONTRACT)
_sync_autonomy_profiles_from_contract(PLATFORM7_CONTRACT)


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
    serialized = json.dumps(_safe_clone(payload), ensure_ascii=True, indent=2)
    tmp_path = path.with_suffix(f"{path.suffix}.tmp-{uuid.uuid4().hex}")
    try:
        with tmp_path.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(serialized)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_path, path)
    finally:
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _git_revision_summary() -> dict[str, Any]:
    revision = "unknown"
    dirty = "unknown"
    try:
        revision = (
            subprocess.check_output(
                ["git", "-C", str(REPO_ROOT), "rev-parse", "HEAD"],
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
            )
            .strip()
        )
    except Exception:
        revision = "unknown"
    try:
        status_output = subprocess.check_output(
            ["git", "-C", str(REPO_ROOT), "status", "--porcelain"],
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        dirty = "dirty" if status_output.strip() else "clean"
    except Exception:
        dirty = "unknown"
    return {"commit": revision, "worktree": dirty}


def _artifact_descriptor(ref: str) -> dict[str, Any]:
    value = (ref or "").strip()
    if not value:
        return {
            "ref": "",
            "kind": "missing",
            "present": False,
            "sha256": "",
            "size_bytes": 0,
            "timestamp": _now_iso(),
        }
    if value.startswith("http://") or value.startswith("https://"):
        return {
            "ref": value,
            "kind": "url",
            "present": True,
            "sha256": "",
            "size_bytes": 0,
            "timestamp": _now_iso(),
        }

    if value.startswith("/artifacts/"):
        artifact_suffix = value[len("/artifacts/") :].strip("/")
        bucket, _, tail = artifact_suffix.partition("/")
        bucket_normalized = bucket.strip().lower()
        if bucket_normalized == "ollamahf" and tail:
            candidate = (EVIDENCE_DIR / "ollamahf_artifacts" / tail).resolve()
        elif bucket_normalized == "dispatch" and tail:
            candidate = (DISPATCH_DIR / tail).resolve()
        elif bucket_normalized == "runs" and tail:
            candidate = (RUNS_DIR / tail).resolve()
        elif bucket_normalized == "proof" and tail:
            candidate = (PROOF_DIR / tail).resolve()
        else:
            candidate = (EVIDENCE_DIR / artifact_suffix).resolve()
    else:
        candidate = Path(value)
        if not candidate.is_absolute():
            candidate = (REPO_ROOT / candidate).resolve()
        else:
            candidate = candidate.resolve()
        if not candidate.exists():
            raw_normalized = value.replace("/", "\\")
            lower_raw = raw_normalized.lower()
            if "\\.godmode_runtime\\" in lower_raw:
                _, _, runtime_suffix = raw_normalized.partition("\\.godmode_runtime\\")
                if runtime_suffix:
                    candidate = (RUNTIME_DIR.parent / Path(runtime_suffix.replace("\\", "/"))).resolve()
            elif "\\godmode_setup\\" in lower_raw:
                _, _, repo_suffix = raw_normalized.partition("\\godmode_setup\\")
                if repo_suffix:
                    candidate = (REPO_ROOT / Path(repo_suffix.replace("\\", "/"))).resolve()
    if candidate.exists() and candidate.is_file():
        try:
            stat = candidate.stat()
            return {
                "ref": value,
                "path": str(candidate),
                "kind": "file",
                "present": True,
                "sha256": _sha256_file(candidate),
                "size_bytes": int(stat.st_size),
                "timestamp": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            }
        except Exception as exc:
            return {
                "ref": value,
                "path": str(candidate),
                "kind": "file",
                "present": False,
                "sha256": "",
                "size_bytes": 0,
                "timestamp": _now_iso(),
                "error": str(exc),
            }
    return {
        "ref": value,
        "path": str(candidate),
        "kind": "file",
        "present": False,
        "sha256": "",
        "size_bytes": 0,
        "timestamp": _now_iso(),
    }


def _collect_run_artifact_refs(record: dict[str, Any]) -> list[str]:
    refs: list[str] = []
    for key in ("snapshot", "run_file"):
        value = str(record.get(key, "")).strip()
        if value:
            refs.append(value)
    for step in record.get("steps", []):
        if not isinstance(step, dict):
            continue
        for key in ("dispatch_artifact", "final_code_artifact", "final_code_url"):
            value = str(step.get(key, "")).strip()
            if value:
                refs.append(value)
    deduped = list(dict.fromkeys(refs))
    return deduped


def _materialize_run_manifest(record: dict[str, Any]) -> dict[str, Any]:
    run_id = str(record.get("run_id", "")).strip()
    refs = _collect_run_artifact_refs(record)
    descriptors = [_artifact_descriptor(ref) for ref in refs]
    missing_file_refs = [
        item.get("ref", "")
        for item in descriptors
        if item.get("kind") == "file" and not item.get("present", False)
    ]
    unhashed_files = [
        item.get("ref", "")
        for item in descriptors
        if item.get("kind") == "file" and item.get("present", False) and not item.get("sha256")
    ]
    run_status = str(record.get("status", "UNKNOWN")).upper()
    evidence_pass = (
        len(refs) > 0
        and len(missing_file_refs) == 0
        and len(unhashed_files) == 0
        and run_status in {"PASS", "DONE", "PARTIAL", "BLOCKED", "FAILED", "STOPPED", "PAUSED", "ROLLED_BACK"}
    )
    evidence_status = "Verified" if evidence_pass and run_status in {"PASS", "DONE"} else "Partial" if refs else "Unknown"
    if run_status in {"BLOCKED", "FAILED"}:
        evidence_status = "Blocked"
    manifest = {
        "schema_version": "platform7-evidence-manifest-v1",
        "created_at": _now_iso(),
        "run_id": run_id,
        "trace_id": str(record.get("trace_id", "")).strip(),
        "task_id": str(record.get("task_id", "")).strip(),
        "run_status": run_status,
        "evidence_status": evidence_status,
        "validation": {
            "pass": evidence_pass and evidence_status == "Verified",
            "missing_file_refs": missing_file_refs,
            "unhashed_files": unhashed_files,
        },
        "tool_versions": {
            "python": platform.python_version(),
            "fastapi": getattr(FastAPI, "__module__", "fastapi"),
        },
        "git": _git_revision_summary(),
        "artifacts": descriptors,
    }
    return manifest


def _persist_run_manifest(record: dict[str, Any]) -> None:
    run_id = str(record.get("run_id", "")).strip()
    if not run_id:
        return
    RUN_MANIFEST_DIR.mkdir(parents=True, exist_ok=True)
    manifest = _materialize_run_manifest(record)
    stamp = manifest["created_at"].replace(":", "-").replace(".", "-")
    immutable_path = RUN_MANIFEST_DIR / f"{run_id}_{stamp}.json"
    latest_path = RUN_MANIFEST_DIR / f"{run_id}_latest.json"
    global_latest = RUN_MANIFEST_DIR / "latest.json"
    _write_json(immutable_path, manifest)
    _write_json(latest_path, manifest)
    _write_json(global_latest, manifest)
    record["evidence_manifest"] = str(immutable_path)
    record["evidence_manifest_latest"] = str(latest_path)
    record["evidence_status"] = manifest.get("evidence_status", "Unknown")


def _emit_control_event(
    action: str,
    state: str,
    reason: str,
    next_action: str,
    payload: RunControlRequest | RoutingOverrideRequest | QuarantineArtifactRequest,
    run_id: str = "",
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    CONTROL_EVENT_DIR.mkdir(parents=True, exist_ok=True)
    payload_run_id = ""
    if hasattr(payload, "run_id"):
        try:
            payload_run_id = str(getattr(payload, "run_id", "")).strip()
        except Exception:
            payload_run_id = ""
    resolved_run_id = run_id.strip() or payload_run_id
    event = {
        "event_id": str(uuid.uuid4()),
        "timestamp": _now_iso(),
        "action": action,
        "state": state,
        "reason": reason,
        "next_action": next_action,
        "session_id": payload.session_id.strip(),
        "run_id": resolved_run_id,
        "trace_id": payload.trace_id.strip(),
        "span_id": payload.span_id.strip(),
        "task_id": payload.task_id.strip(),
        "step_id": payload.step_id.strip(),
        "agent_id": payload.agent_id.strip(),
        "role": payload.role.strip(),
        "runtime_target": payload.runtime_target.strip(),
        "source": payload.source.strip(),
    }
    if extra:
        event["extra"] = dict(extra)
    event_file = CONTROL_EVENT_DIR / f"{event['timestamp'].replace(':', '-').replace('.', '-')}_{event['event_id']}.json"
    _write_json(event_file, event)
    _write_json(CONTROL_EVENT_DIR / "latest.json", event)
    event["event_file"] = str(event_file)
    return event


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
    entry = AGENT_LOOKUP.get(key) or VIRTUAL_AGENT_LOOKUP.get(key)
    if not entry:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Unknown agent '{agent_value}'. Use GET /agents or GET /platform7/contract "
                "for the canonical registry/contract."
            ),
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


def _normalize_agent_status_class(value: Any) -> str:
    normalized = str(value or "").strip().upper()
    if normalized == "IMPLEMENTED":
        return "VERIFIED"
    if not normalized:
        return "UNKNOWN"
    return normalized


def _normalized_agent_record(agent: Any) -> dict[str, Any]:
    if not isinstance(agent, dict):
        return {}
    normalized = dict(agent)
    normalized["status_class"] = _normalize_agent_status_class(normalized.get("status_class", "UNKNOWN"))
    return normalized


def _probe_effective_http_status(probe: dict[str, Any]) -> Any:
    if not isinstance(probe, dict):
        return None
    value = probe.get("effective_http_status", probe.get("http_status"))
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _latest_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _safe_percent(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100.0, 2)


def _growth_percent(current: float, previous: float) -> float:
    if previous > 0:
        return round(((current - previous) / previous) * 100.0, 2)
    if current > 0:
        return 100.0
    return 0.0


def _storage_bucket_roots() -> dict[str, Path]:
    return {
        "dispatch": DISPATCH_DIR,
        "runs": RUNS_DIR,
        "control_events": CONTROL_EVENT_DIR,
        "manifests": RUN_MANIFEST_DIR,
        "quarantine": EVIDENCE_DIR / "quarantine",
        "ollamahf_artifacts": EVIDENCE_DIR / "ollamahf_artifacts",
    }


def _bucket_storage_metrics(bucket_name: str, bucket_root: Path, now_epoch: float) -> dict[str, Any]:
    if not bucket_root.exists():
        return {
            "bucket": bucket_name,
            "path": str(bucket_root),
            "files_total": 0,
            "bytes_total": 0,
            "unique_hashes": 0,
            "duplicate_files": 0,
            "duplicate_ratio_percent": 0.0,
            "files_last_24h": 0,
            "bytes_last_24h": 0,
            "files_prev_24h": 0,
            "bytes_prev_24h": 0,
            "growth_files_percent_24h": 0.0,
            "growth_bytes_percent_24h": 0.0,
            "hash_errors": 0,
        }

    files = [item for item in bucket_root.rglob("*") if item.is_file()]
    if bucket_name == "quarantine":
        files = [
            item
            for item in files
            if "\\_tmp_clones\\" not in str(item).replace("/", "\\").lower()
        ]
    total_files = len(files)
    total_bytes = 0
    files_last_24h = 0
    bytes_last_24h = 0
    files_prev_24h = 0
    bytes_prev_24h = 0
    hash_errors = 0
    hash_counts: dict[str, int] = {}
    hash_scan_enabled = bucket_name in {"ollamahf_artifacts", "manifests"}
    hash_scan_truncated = False
    hash_scan_limit = max(1, int(STORAGE_HASH_SCAN_MAX_FILES))
    hash_candidates: list[Path] = files
    if hash_scan_enabled and total_files > hash_scan_limit:
        hash_candidates = files[:hash_scan_limit]
        hash_scan_truncated = True
    hash_candidate_set = set(hash_candidates) if hash_scan_enabled else set()
    day_seconds = 24.0 * 60.0 * 60.0

    for candidate in files:
        try:
            stat = candidate.stat()
            size_bytes = int(stat.st_size)
            total_bytes += size_bytes
            age_seconds = now_epoch - float(stat.st_mtime)
            if age_seconds <= day_seconds:
                files_last_24h += 1
                bytes_last_24h += size_bytes
            elif age_seconds <= day_seconds * 2.0:
                files_prev_24h += 1
                bytes_prev_24h += size_bytes
            if hash_scan_enabled and candidate in hash_candidate_set:
                digest = _sha256_file(candidate)
                hash_counts[digest] = hash_counts.get(digest, 0) + 1
        except Exception:
            hash_errors += 1

    unique_hashes = len(hash_counts)
    duplicate_files = sum(count - 1 for count in hash_counts.values() if count > 1)
    hash_scanned_files = len(hash_candidates) if hash_scan_enabled else 0
    duplicate_ratio_base = float(hash_scanned_files if hash_scan_enabled else total_files)

    return {
        "bucket": bucket_name,
        "path": str(bucket_root),
        "files_total": total_files,
        "bytes_total": total_bytes,
        "unique_hashes": unique_hashes,
        "duplicate_files": duplicate_files,
        "duplicate_ratio_percent": _safe_percent(float(duplicate_files), duplicate_ratio_base),
        "files_last_24h": files_last_24h,
        "bytes_last_24h": bytes_last_24h,
        "files_prev_24h": files_prev_24h,
        "bytes_prev_24h": bytes_prev_24h,
        "growth_files_percent_24h": _growth_percent(float(files_last_24h), float(files_prev_24h)),
        "growth_bytes_percent_24h": _growth_percent(float(bytes_last_24h), float(bytes_prev_24h)),
        "hash_errors": hash_errors,
        "hash_scan_enabled": hash_scan_enabled,
        "hash_scanned_files": hash_scanned_files,
        "hash_scan_limit": hash_scan_limit if hash_scan_enabled else 0,
        "hash_scan_truncated": hash_scan_truncated,
    }


def _storage_metrics_payload() -> dict[str, Any]:
    now_epoch = time.time()
    buckets = _storage_bucket_roots()
    bucket_metrics = {
        name: _bucket_storage_metrics(name, path, now_epoch)
        for name, path in buckets.items()
    }
    alerts: list[dict[str, Any]] = []
    for bucket_name, entry in bucket_metrics.items():
        duplicate_ratio = float(entry.get("duplicate_ratio_percent", 0.0))
        growth_files = float(entry.get("growth_files_percent_24h", 0.0))
        growth_bytes = float(entry.get("growth_bytes_percent_24h", 0.0))
        if (
            bucket_name == "ollamahf_artifacts"
            and duplicate_ratio > OLLAMAHF_DUPLICATE_ALERT_THRESHOLD_PERCENT
        ):
            alerts.append(
                {
                    "severity": "warn",
                    "bucket": bucket_name,
                    "rule": "duplicate_ratio",
                    "threshold_percent": OLLAMAHF_DUPLICATE_ALERT_THRESHOLD_PERCENT,
                    "observed_percent": duplicate_ratio,
                    "message": "OllamaHF artifact duplicate ratio is above threshold.",
                }
            )
        if growth_files > STORAGE_GROWTH_ALERT_THRESHOLD_PERCENT:
            alerts.append(
                {
                    "severity": "warn",
                    "bucket": bucket_name,
                    "rule": "growth_files_24h",
                    "threshold_percent": STORAGE_GROWTH_ALERT_THRESHOLD_PERCENT,
                    "observed_percent": growth_files,
                    "message": "File-count growth in the last 24h is above threshold.",
                }
            )
        if growth_bytes > STORAGE_GROWTH_ALERT_THRESHOLD_PERCENT:
            alerts.append(
                {
                    "severity": "warn",
                    "bucket": bucket_name,
                    "rule": "growth_bytes_24h",
                    "threshold_percent": STORAGE_GROWTH_ALERT_THRESHOLD_PERCENT,
                    "observed_percent": growth_bytes,
                    "message": "Storage-byte growth in the last 24h is above threshold.",
                }
            )

    return {
        "status": "warn" if alerts else "ok",
        "checked_at": _now_iso(),
        "thresholds": {
            "ollamahf_duplicate_ratio_percent": OLLAMAHF_DUPLICATE_ALERT_THRESHOLD_PERCENT,
            "growth_percent_24h": STORAGE_GROWTH_ALERT_THRESHOLD_PERCENT,
        },
        "buckets": bucket_metrics,
        "alerts": alerts,
    }


def _storage_metrics_snapshot(force_refresh: bool = False) -> dict[str, Any]:
    now_epoch = time.time()
    if not force_refresh and STORAGE_METRICS_CACHE_TTL > 0:
        with STORAGE_METRICS_CACHE_LOCK:
            cached_payload = STORAGE_METRICS_CACHE.get("payload")
            expires_at = float(STORAGE_METRICS_CACHE.get("expires_at", 0.0))
            if isinstance(cached_payload, dict) and expires_at > now_epoch:
                return dict(cached_payload)

    payload = _storage_metrics_payload()
    if STORAGE_METRICS_CACHE_TTL > 0:
        with STORAGE_METRICS_CACHE_LOCK:
            STORAGE_METRICS_CACHE["expires_at"] = now_epoch + float(STORAGE_METRICS_CACHE_TTL)
            STORAGE_METRICS_CACHE["payload"] = dict(payload)
    return payload


def _storage_metrics_cached_or_stub() -> dict[str, Any]:
    now_epoch = time.time()
    with STORAGE_METRICS_CACHE_LOCK:
        cached_payload = STORAGE_METRICS_CACHE.get("payload")
        expires_at = float(STORAGE_METRICS_CACHE.get("expires_at", 0.0))
        if isinstance(cached_payload, dict):
            payload = dict(cached_payload)
            payload["cache_state"] = "warm" if expires_at > now_epoch else "stale"
            return payload
    return {
        "status": "unknown",
        "checked_at": _now_iso(),
        "cache_state": "cold",
        "note": "Storage metrics cache is cold; run /storage/metrics or control-center refresh for full scan.",
        "buckets": {},
        "alerts": [],
    }


def _runtime_maintenance_snapshot() -> dict[str, Any]:
    dedupe_latest = EVIDENCE_DIR / "runtime_dedupe_latest.json"
    return {
        "recovery_runbook": {
            "steps": list(RECOVERY_RUNBOOK_STEPS),
            "note": "Use sequence: URL check -> routing probe -> retry -> quarantine.",
            "document": str(REPO_ROOT / "ops" / "RECOVERY_RUNBOOK.md"),
        },
        "runtime_dedupe_latest": {
            "path": str(dedupe_latest),
            "exists": dedupe_latest.exists(),
            "content": _latest_json(dedupe_latest),
        },
    }


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


def _loopback_port_reachable(port: int, timeout_seconds: float = 0.25) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", int(port)), timeout=timeout_seconds):
            return True
    except Exception:
        return False


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
    if BOLTDIY_FACADE_INTERNAL_URL:
        hub_base = BOLTDIY_FACADE_INTERNAL_URL.rstrip("/")
    elif _loopback_port_reachable(3902):
        hub_base = "http://127.0.0.1:3902"
    elif _loopback_port_reachable(3901):
        hub_base = "http://127.0.0.1:3901"
    else:
        hub_base = "http://127.0.0.1:3902"
    devtools_bridge_base = DEVTOOLS_BRIDGE_URL.rstrip("/") if DEVTOOLS_BRIDGE_URL else "http://host.docker.internal:3911"
    return [
        # Use root liveness endpoint to avoid recursive heavy-health checks.
        {"id": "hub", "url": f"{hub_base}/"},
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
    registry_ok = not AGENT_ALIAS_COLLISIONS and len(active_agents) >= 1
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
        errors.append("Agent registry has alias collisions or contains no active agents.")

    contract = _load_platform7_contract()
    contract_validation = _validate_platform7_contract(contract)
    checks.append(
        {
            "name": "platform7_contract",
            "ok": contract_validation.get("ok", False),
            "path": str(PLATFORM7_CONTRACT_PATH),
            "version": contract.get("version", "unknown"),
            "role_count": contract_validation.get("role_count", 0),
            "worker_count": contract_validation.get("worker_count", 0),
            "supervisor_count": contract_validation.get("supervisor_count", 0),
            "errors": contract_validation.get("errors", []),
            "warnings": contract_validation.get("warnings", []),
        }
    )
    if not contract_validation.get("ok", False):
        errors.extend([str(item) for item in contract_validation.get("errors", [])])
    warnings.extend([str(item) for item in contract_validation.get("warnings", [])])

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
            "BOOTSTRAP_ALLOW_SCRIPT_START=false: one-click script start is disabled and will be reported as SKIPPED when requested."
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
            "status": "skipped",
            "reason": "BOOTSTRAP_ALLOW_SCRIPT_START=false",
            "recovery": "Set BOOTSTRAP_ALLOW_SCRIPT_START=true and configure BOOTSTRAP_START_SCRIPT.",
        }
    script = BOOTSTRAP_START_SCRIPT.strip()
    if not script:
        return {
            "status": "skipped",
            "reason": "BOOTSTRAP_START_SCRIPT not configured",
            "recovery": "Set BOOTSTRAP_START_SCRIPT to START_GODMODE.sh or an equivalent startup script path.",
        }
    script_path = Path(script)
    candidate_paths: list[Path] = [script_path]
    if not script_path.is_absolute():
        candidate_paths.append(REPO_ROOT / script_path)

    resolved_script_path: Path | None = None
    for candidate in candidate_paths:
        candidate_resolved = candidate.resolve()
        if candidate_resolved.exists():
            resolved_script_path = candidate_resolved
            break

    if resolved_script_path is None:
        searched = ", ".join(str(path) for path in candidate_paths)
        return {
            "status": "skipped",
            "reason": f"BOOTSTRAP_START_SCRIPT not found: {script}",
            "searched": searched,
            "recovery": "Provide an existing script path inside the runtime environment where bolt-facade executes.",
        }

    script_path = resolved_script_path

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

    service_start_status = str(service_start.get("status", "")).strip().lower()
    service_start_reason = str(service_start.get("reason", "")).strip()
    service_start_skipped = include_script_start and service_start_status == "skipped"

    if include_script_start and service_start_status == "blocked":
        reason = service_start.get("reason", "one-click start script did not run")
        return "BLOCKED", False, f"One-click start blocked: {reason}"

    optional_service_ids = {"devtools-bridge"}
    service_failures = [
        item
        for item in services.get("results", [])
        if not item.get("ok", False) and str(item.get("id", "")).strip() not in optional_service_ids
    ]
    optional_failures = [
        item
        for item in services.get("results", [])
        if not item.get("ok", False) and str(item.get("id", "")).strip() in optional_service_ids
    ]
    if service_failures:
        failed_ids = ", ".join(str(item.get("id", "unknown")) for item in service_failures)
        return "PARTIAL", False, f"Core services are not fully reachable: {failed_ids}"

    mission_status = workflow.get("mission", {}).get("status")
    memory_status = workflow.get("memory", {}).get("status")
    if mission_status != "forwarded":
        return "BLOCKED", False, "n8n mission workflow smoke did not pass."
    if memory_status != "forwarded":
        return "PARTIAL", False, "n8n memory workflow is not verified."
    notes: list[str] = []
    if optional_failures:
        failed_optional = ", ".join(str(item.get("id", "unknown")) for item in optional_failures)
        notes.append(f"optional service degraded: {failed_optional}")
    if service_start_skipped and service_start_reason.lower() != "include_script_start=false":
        notes.append(f"startup script skipped: {service_start_reason or 'not available in this runtime'}")
    if notes:
        if optional_failures:
            return "PARTIAL", True, "Platform ready for prompt execution; " + "; ".join(notes) + "."
        return "READY", True, "Platform ready for prompt execution; " + "; ".join(notes) + "."
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
    return _probe_effective_http_status(probe) == 200


def _runtime_health_ready_for_prompt() -> tuple[bool, str]:
    preflight = _run_preflight_checks()
    if not preflight.get("ok", False):
        errors = preflight.get("errors", [])
        return False, f"Preflight failed: {errors}"

    probe_timeout = max(1, min(CONTROL_CENTER_PROBE_TIMEOUT, 3))
    service_probes = _probe_catalog_parallel(_service_probe_catalog(), probe_timeout)
    optional_service_ids = {"devtools-bridge"}
    service_failures = [
        f"{service_id}={probe.get('http_status') or probe.get('error') or 'unreachable'}"
        for service_id, probe in service_probes.items()
        if service_id not in optional_service_ids and not _probe_http_200(probe)
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
    contract_roles = PLATFORM7_CONTRACT.get("roles", [])
    if not isinstance(contract_roles, list):
        contract_roles = []
    expected_active = max(1, len([item for item in contract_roles if isinstance(item, dict)]))
    expected_legacy = 1
    if active_count < expected_active or legacy_count < expected_legacy:
        return False, (
            "Agent registry incomplete: "
            f"active={active_count}/{expected_active}, legacy={legacy_count}/{expected_legacy}"
        )

    return True, (
        "Runtime health READY: services, routing targets, "
        f"{active_count} active agents and {legacy_count} legacy agent(s) verified. "
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
    def _fallback_post_urls(candidate_url: str) -> list[str]:
        try:
            parsed = parse.urlsplit(candidate_url)
        except Exception:
            return []
        host = (parsed.hostname or "").strip().lower()
        if not host:
            return []
        fallback_map: dict[str, list[tuple[str, int | None]]] = {
            "host.docker.internal": [("172.17.0.1", parsed.port), ("127.0.0.1", parsed.port)],
            "openhands-godmode": [("127.0.0.1", 3000)],
            "openhands-godmode-adapter": [("127.0.0.1", 3001)],
            "n8n-godmode": [("127.0.0.1", 5678)],
            "litellm-godmode": [("127.0.0.1", 4000)],
            "langgraph-godmode-local": [("127.0.0.1", 8080)],
            "bolt-facade-godmode": [("127.0.0.1", 3901)],
        }
        targets = fallback_map.get(host, [])
        urls: list[str] = []
        seen: set[str] = set()
        original = candidate_url.strip()
        for fallback_host, fallback_port in targets:
            if not fallback_host:
                continue
            if fallback_port:
                netloc = f"{fallback_host}:{fallback_port}"
            else:
                netloc = fallback_host
            rebuilt = parse.urlunsplit(
                (
                    parsed.scheme or "http",
                    netloc,
                    parsed.path or "",
                    parsed.query or "",
                    parsed.fragment or "",
                )
            )
            if rebuilt and rebuilt not in seen and rebuilt != original:
                seen.add(rebuilt)
                urls.append(rebuilt)
        return urls

    def _attempt_post(target_url: str) -> dict[str, Any]:
        req = request.Request(
            url=target_url,
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
                    "url": target_url,
                    "http_status": int(response.status),
                    "response": parsed,
                }
        except error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            return {
                "status": "blocked" if exc.code in {401, 403, 404} else "forward-failed",
                "url": target_url,
                "http_status": int(exc.code),
                "error": raw or str(exc),
            }
        except Exception as exc:  # pragma: no cover - runtime path
            return {
                "status": "forward-failed",
                "url": target_url,
                "http_status": None,
                "error": str(exc),
            }

    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    request_headers = {"Content-Type": "application/json"}
    if headers:
        request_headers.update(headers)

    first_attempt = _attempt_post(url)
    if first_attempt.get("status") == "forwarded":
        return first_attempt

    fallback_attempts: list[dict[str, Any]] = []
    for fallback_url in _fallback_post_urls(url):
        attempt = _attempt_post(fallback_url)
        fallback_attempts.append(attempt)
        if attempt.get("status") == "forwarded":
            attempt["fallback_used"] = True
            attempt["fallback_url"] = fallback_url
            attempt["primary_url"] = url
            if fallback_attempts:
                attempt["fallback_attempts"] = fallback_attempts
            return attempt

    if fallback_attempts:
        first_attempt["fallback_attempts"] = fallback_attempts
    return first_attempt


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
    def _fallback_probe_urls(candidate_url: str) -> list[str]:
        try:
            parsed = parse.urlsplit(candidate_url)
        except Exception:
            return []
        host = (parsed.hostname or "").strip().lower()
        if not host:
            return []
        fallback_map: dict[str, list[tuple[str, int | None]]] = {
            "host.docker.internal": [("172.17.0.1", parsed.port), ("127.0.0.1", parsed.port)],
            "openhands-godmode": [("127.0.0.1", 3000)],
            "openhands-godmode-adapter": [("127.0.0.1", 3001)],
            "n8n-godmode": [("127.0.0.1", 5678)],
            "litellm-godmode": [("127.0.0.1", 4000)],
            "langgraph-godmode-local": [("127.0.0.1", 8080)],
            "bolt-facade-godmode": [("127.0.0.1", 3901)],
        }
        targets = fallback_map.get(host, [])
        urls: list[str] = []
        seen: set[str] = set()
        original = candidate_url.strip()
        for fallback_host, fallback_port in targets:
            if not fallback_host:
                continue
            if fallback_port:
                netloc = f"{fallback_host}:{fallback_port}"
            else:
                netloc = fallback_host
            rebuilt = parse.urlunsplit(
                (
                    parsed.scheme or "http",
                    netloc,
                    parsed.path or "",
                    parsed.query or "",
                    parsed.fragment or "",
                )
            )
            if rebuilt and rebuilt != original and rebuilt not in seen:
                seen.add(rebuilt)
                urls.append(rebuilt)
        return urls

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
        fallback_attempts: list[dict[str, Any]] = []
        for fallback_url in _fallback_probe_urls(url):
            fallback_req = request.Request(url=fallback_url, method="GET", headers=headers or {})
            try:
                with request.urlopen(fallback_req, timeout=timeout) as response:
                    return {
                        "reachable": True,
                        "url": fallback_url,
                        "http_status": int(response.status),
                        "fallback_used": True,
                        "original_url": url,
                        "original_error": str(exc),
                    }
            except error.HTTPError as fallback_exc:
                fallback_attempts.append(
                    {
                        "url": fallback_url,
                        "http_status": int(fallback_exc.code),
                        "error": str(fallback_exc),
                    }
                )
            except Exception as fallback_exc:  # pragma: no cover - runtime path
                fallback_attempts.append(
                    {
                        "url": fallback_url,
                        "http_status": None,
                        "error": str(fallback_exc),
                    }
                )

        payload = {
            "reachable": False,
            "url": url,
            "http_status": None,
            "error": str(exc),
        }
        if fallback_attempts:
            payload["fallback_attempts"] = fallback_attempts
        return payload


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
    if _is_lightweight_probe_task(payload.task):
        health_candidates: list[str] = []
        if LANGGRAPH_API_INTERNAL_URL:
            health_candidates.append(LANGGRAPH_API_INTERNAL_URL.rstrip("/") + "/health")
        if LANGGRAPH_API_URL:
            health_candidates.append(LANGGRAPH_API_URL.rstrip("/") + "/health")
        if not health_candidates:
            return {
                "target": "langgraph-local",
                "status": "blocked",
                "reason": "LANGGRAPH_API_INTERNAL_URL/LANGGRAPH_API_URL missing",
            }

        attempts: list[dict[str, Any]] = []
        probe_timeout = max(3, min(12, BOLTDIY_FORWARD_TIMEOUT))
        for url in health_candidates:
            health_probe = _probe_url(url, probe_timeout)
            http_status = int(health_probe.get("http_status") or 0)
            status = (
                "forwarded"
                if http_status == 200
                else "blocked" if http_status in {401, 403, 404}
                else "forward-failed"
            )
            attempt = {
                "status": status,
                "url": health_probe.get("url", url),
                "http_status": health_probe.get("http_status"),
                "response": {"health": health_probe} if status == "forwarded" else {},
                "error": health_probe.get("error", ""),
            }
            attempts.append(attempt)
            if status == "forwarded":
                return {
                    "target": "langgraph-local",
                    "status": "forwarded",
                    "url": attempt.get("url"),
                    "http_status": attempt.get("http_status"),
                    "response": attempt.get("response"),
                    "attempts": attempts,
                    "probe_mode": "health-lightweight",
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
            "probe_mode": "health-lightweight",
        }

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
    dispatch_target = _normalize_hf_space_url(SMOLAGENTS_DISPATCH_URL)
    base_target = _normalize_hf_space_url(SMOLAGENTS_URL)

    if dispatch_target:
        attempts.append(
            _post_json(
                dispatch_target,
                {
                    "prompt": payload.task,
                    "agent": payload.agent,
                    "source": payload.source,
                },
                BOLTDIY_FORWARD_TIMEOUT,
            )
        )

    if base_target:
        base = base_target.rstrip("/")
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
    dispatch_target = _normalize_hf_space_url(HF_AIDER_DISPATCH_URL)
    base_target = _normalize_hf_space_url(HF_AIDER_URL)
    if dispatch_target:
        attempts.append(_post_json(dispatch_target, payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT))
    if base_target:
        base = base_target.rstrip("/")
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


def _task_explicitly_requests_city_park(task: str) -> bool:
    normalized = " ".join((task or "").lower().split())
    return any(marker in normalized for marker in OLLAMAHF_CITY_PARK_PROMPT_MARKERS)


def _detect_stale_city_park_signature(final_code: str) -> dict[str, Any]:
    normalized = str(final_code or "").strip()
    if not normalized:
        return {"matched": False, "hash": "", "markers": []}
    digest = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    lowered = normalized.lower()
    markers = [marker for marker in OLLAMAHF_STALE_CITY_PARK_MARKERS if marker in lowered]
    matched = digest == OLLAMAHF_STALE_CITY_PARK_HASH
    if not matched and markers:
        matched = "city park" in lowered and "reference world" in lowered
    return {"matched": matched, "hash": digest, "markers": markers}


def _prompt_fidelity_mismatch(task: str, final_code: str) -> dict[str, Any]:
    stale = _detect_stale_city_park_signature(final_code)
    if not stale.get("matched"):
        return {"mismatch": False}
    if _task_explicitly_requests_city_park(task):
        return {"mismatch": False}
    return {
        "mismatch": True,
        "reason": "prompt_fidelity_mismatch",
        "stale_hash": stale.get("hash", ""),
        "stale_markers": stale.get("markers", []),
        "message": (
            "Detected stale City-Park artifact for a non-City-Park prompt; "
            "result blocked to enforce prompt fidelity."
        ),
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
            mismatch = _prompt_fidelity_mismatch(payload.task, html_doc)
            artifact = _save_ollamahf_final_code(html_doc)
            if mismatch.get("mismatch"):
                return {
                    "target": "ollama-hf-orchestrator",
                    "status": "blocked",
                    "reason": "prompt_fidelity_mismatch",
                    "url": chat_result.get("url"),
                    "http_status": chat_result.get("http_status"),
                    "response": chat_result.get("response"),
                    "recovery_used": True,
                    "recovery_endpoint": f"{base_url}/v1/chat/completions",
                    "prompt_fidelity": mismatch,
                    "primary_orchestrate_status": primary_result.get("status"),
                    "primary_orchestrate_http_status": primary_result.get("http_status"),
                    "primary_orchestrate_error": str(primary_result.get("error", ""))[:600],
                    **artifact,
                }
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
        allow_workspace_fallback = bool(
            OLLAMAHF_DISPATCH_WORKSPACE_FALLBACK
            and re.search(r"\b(probe|diagnostic|health|smoke|verification)\b", payload.task.lower())
        )
        if not allow_workspace_fallback:
            return {
                "target": "ollama-hf-orchestrator",
                "status": "blocked",
                "reason": reason,
                "fallback_enabled": bool(OLLAMAHF_DISPATCH_WORKSPACE_FALLBACK),
                "fallback_scope": "diagnostic-only",
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
            fallback_payload = fallback.get("response")
            if isinstance(fallback_payload, dict) and isinstance(fallback_payload.get("final_code"), str):
                mismatch = _prompt_fidelity_mismatch(payload.task, fallback_payload["final_code"])
                if mismatch.get("mismatch"):
                    blocked = dict(fallback)
                    blocked["status"] = "blocked"
                    blocked["reason"] = "prompt_fidelity_mismatch"
                    blocked["prompt_fidelity"] = mismatch
                    blocked.update(_save_ollamahf_final_code(fallback_payload["final_code"]))
                    return blocked
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
        health_probe = _probe_url(
            f"{base}/v1/models",
            max(5, min(15, BOLTDIY_FORWARD_TIMEOUT)),
            headers=_ollama_headers(),
        )
        http_status = int(health_probe.get("http_status") or 0)
        status = (
            "forwarded"
            if http_status == 200
            else "blocked" if http_status in {401, 403, 404}
            else "forward-failed"
        )
        return {
            "target": "ollama-hf-orchestrator",
            "status": status,
            "url": health_probe.get("url"),
            "http_status": health_probe.get("http_status"),
            "response": {"health": health_probe} if status == "forwarded" else {},
            "error": health_probe.get("error", ""),
            "probe_mode": "models-health-lightweight",
        }
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
    if (
        response.get("status") == "forwarded"
        and isinstance(response_payload, dict)
        and isinstance(response_payload.get("final_code"), str)
    ):
        mismatch = _prompt_fidelity_mismatch(payload.task, response_payload["final_code"])
        if mismatch.get("mismatch"):
            blocked = dict(response)
            blocked["status"] = "blocked"
            blocked["reason"] = "prompt_fidelity_mismatch"
            blocked["prompt_fidelity"] = mismatch
            blocked.update(_save_ollamahf_final_code(response_payload["final_code"]))
            blocked["target"] = "ollama-hf-orchestrator"
            return blocked
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
        if str(recovery_result.get("reason", "")).strip() == "prompt_fidelity_mismatch":
            OLLAMAHF_LAST_BLOCK["at"] = time.time()
            OLLAMAHF_LAST_BLOCK["reason"] = "prompt_fidelity_mismatch"
            OLLAMAHF_LAST_BLOCK["error"] = ""
            return recovery_result
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


def _normalize_routing_mode(value: str) -> str:
    mode = str(value or "").strip().lower()
    if mode in {"auto", "local", "remote"}:
        return mode
    return "auto"


def _cleanup_run_routing_overrides(now_epoch: float | None = None) -> None:
    now_value = float(now_epoch if now_epoch is not None else time.time())
    stale_run_ids: list[str] = []
    with RUN_ROUTING_OVERRIDES_LOCK:
        items = list(RUN_ROUTING_OVERRIDES.items())
    for run_id, state in items:
        expires_at = float(state.get("expires_at", 0.0) or 0.0)
        if expires_at > 0 and now_value >= expires_at:
            stale_run_ids.append(run_id)
            continue
        run_file = RUNS_DIR / f"{run_id}.json"
        if not run_file.exists():
            continue
        latest = _latest_json(run_file)
        if not isinstance(latest, dict):
            continue
        latest_status = str(latest.get("status", "")).strip().upper()
        if _is_terminal_run_status(latest_status):
            stale_run_ids.append(run_id)
    if not stale_run_ids:
        return
    with RUN_ROUTING_OVERRIDES_LOCK:
        for run_id in stale_run_ids:
            RUN_ROUTING_OVERRIDES.pop(run_id, None)


def _set_run_routing_override(run_id: str, mode: str, source: str, reason: str) -> dict[str, Any]:
    normalized_run_id = run_id.strip()
    normalized_mode = _normalize_routing_mode(mode)
    if not normalized_run_id:
        return {}
    state = {
        "mode": normalized_mode,
        "source": source.strip(),
        "reason": reason.strip() or f"run override -> {normalized_mode}",
        "updated_at": _now_iso(),
        "expires_at": (
            time.time() + float(max(0, RUN_ROUTING_OVERRIDE_TTL_SECONDS))
            if RUN_ROUTING_OVERRIDE_TTL_SECONDS > 0
            else 0.0
        ),
    }
    with RUN_ROUTING_OVERRIDES_LOCK:
        RUN_ROUTING_OVERRIDES[normalized_run_id] = state
    return dict(state)


def _clear_run_routing_override(run_id: str) -> None:
    normalized_run_id = run_id.strip()
    if not normalized_run_id:
        return
    with RUN_ROUTING_OVERRIDES_LOCK:
        RUN_ROUTING_OVERRIDES.pop(normalized_run_id, None)


def _routing_mode_for_run(run_id: str = "") -> str:
    _cleanup_run_routing_overrides()
    normalized_run_id = run_id.strip()
    if normalized_run_id:
        with RUN_ROUTING_OVERRIDES_LOCK:
            state = RUN_ROUTING_OVERRIDES.get(normalized_run_id)
        if isinstance(state, dict):
            return _normalize_routing_mode(str(state.get("mode", "auto")))
    return _normalize_routing_mode(str(ROUTING_OVERRIDE_STATE.get("mode", "auto")))


def _run_routing_overrides_snapshot() -> dict[str, dict[str, Any]]:
    _cleanup_run_routing_overrides()
    with RUN_ROUTING_OVERRIDES_LOCK:
        return {run_id: dict(state) for run_id, state in RUN_ROUTING_OVERRIDES.items()}


def _effective_runtime_target(runtime_target: str, run_id: str = "") -> str:
    mode = _routing_mode_for_run(run_id)
    if mode == "local":
        if runtime_target in {"hf-aider", "ollama-hf-orchestrator", "smolagents"}:
            return "langgraph-local"
    if mode == "remote":
        if runtime_target == "langgraph-local":
            return "ollama-hf-orchestrator"
        if runtime_target == "openhands-adapter":
            return "hf-aider"
    return runtime_target


def _recovery_candidates_for_target(runtime_target: str) -> list[str]:
    candidates = AUTO_RECOVERY_TARGETS.get(runtime_target, [])
    deduped: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        normalized = str(candidate).strip()
        if not normalized or normalized == runtime_target:
            continue
        if normalized not in RUNTIME_TARGETS:
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(normalized)
    return deduped


def _attempt_runtime_recovery(
    primary_target: str,
    payload: MissionPayload,
    primary_result: dict[str, Any],
    routing_mode: str = "auto",
) -> dict[str, Any]:
    mode = _normalize_routing_mode(routing_mode)
    if mode == "local":
        return primary_result

    primary_status = str(primary_result.get("status", "")).strip().lower()
    if primary_status == "forwarded":
        return primary_result

    attempts: list[dict[str, Any]] = []
    for candidate in _recovery_candidates_for_target(primary_target):
        attempt = _dispatch_by_target(candidate, payload)
        attempt_record = {
            "target": candidate,
            "status": attempt.get("status", "forward-failed"),
            "http_status": attempt.get("http_status"),
            "reason": str(attempt.get("reason", "")).strip(),
        }
        attempts.append(attempt_record)
        if str(attempt.get("status", "")).strip().lower() == "forwarded":
            enriched = dict(attempt)
            enriched["recovery_used"] = True
            enriched["recovery_from"] = primary_target
            enriched["recovery_target"] = candidate
            enriched["recovery_attempts"] = attempts
            primary_reason = str(primary_result.get("reason", "")).strip()
            recovery_reason = (
                f"Primary target {primary_target} failed"
                + (f": {primary_reason}" if primary_reason else ".")
                + f" Recovered by rerouting to {candidate}."
            )
            existing_reason = str(enriched.get("reason", "")).strip()
            enriched["reason"] = existing_reason or recovery_reason
            return enriched

    enriched = dict(primary_result)
    if attempts:
        enriched["recovery_used"] = False
        enriched["recovery_from"] = primary_target
        enriched["recovery_attempts"] = attempts
    return enriched


def _target_health_status(probe_timeout: int | None = None) -> dict[str, Any]:
    timeout = probe_timeout if probe_timeout is not None else BOLTDIY_FORWARD_TIMEOUT
    probe_catalog: list[dict[str, Any]] = []
    langgraph_url = (LANGGRAPH_API_INTERNAL_URL or LANGGRAPH_API_URL).rstrip("/")
    if langgraph_url:
        probe_catalog.append({"id": "langgraph-local", "url": f"{langgraph_url}/health"})
    else:
        probe_catalog.append({"id": "langgraph-local", "url": ""})

    smol_url = _normalize_hf_space_url(SMOLAGENTS_URL or SMOLAGENTS_DISPATCH_URL).rstrip("/")
    if smol_url:
        probe_catalog.append({"id": "smolagents", "url": smol_url})
    else:
        probe_catalog.append({"id": "smolagents", "url": ""})

    if OPENHANDS_ADAPTER_URL:
        probe_catalog.append({"id": "openhands-adapter", "url": f"{OPENHANDS_ADAPTER_URL.rstrip('/')}/health"})
    else:
        probe_catalog.append({"id": "openhands-adapter", "url": ""})

    aider_url = _normalize_hf_space_url(HF_AIDER_DISPATCH_URL or HF_AIDER_URL).rstrip("/")
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
    for target, probe in statuses.items():
        if not isinstance(probe, dict):
            continue
        if _probe_effective_http_status(probe) == 200:
            probe["effective_http_status"] = 200
            probe["effective_reachable"] = True
            continue
        recovery_target = ""
        for candidate in _recovery_candidates_for_target(target):
            candidate_probe = statuses.get(candidate)
            if not isinstance(candidate_probe, dict):
                continue
            if _probe_effective_http_status(candidate_probe) == 200:
                recovery_target = candidate
                break
        if recovery_target:
            probe["effective_http_status"] = 200
            probe["effective_reachable"] = True
            probe["recovery_ready"] = True
            probe["recovery_target"] = recovery_target
            probe["effective_reason"] = (
                f"Primary target {target} is unreachable; automatic recovery route {recovery_target} is healthy."
            )
        else:
            probe["effective_http_status"] = probe.get("http_status")
            probe["effective_reachable"] = bool(probe.get("reachable", False))
            probe["recovery_ready"] = False
    return statuses


def _operational_state_from_raw(value: str) -> str:
    normalized = (value or "").strip().lower().replace("_", "-")
    if normalized in {"", "idle", "unknown", "none"}:
        return "Idle"
    if normalized in {"queued", "queue", "pending", "created"}:
        return "Queued"
    if normalized in {"running", "in-progress", "inprogress", "processing", "booting", "forwarded"}:
        return "Running"
    if normalized in {"waiting", "paused", "hold", "waiting-human"}:
        return "Waiting"
    if normalized in {"blocked", "policy-blocked", "conflict", "denied"}:
        return "Blocked"
    if normalized in {"partial", "noop", "forward-failed", "degraded"}:
        return "Partial"
    if normalized in {"failed", "error", "timeout", "stopped", "rolled-back", "terminated"}:
        return "Failed"
    if normalized in {"done", "completed", "complete", "pass", "success", "verified"}:
        return "Done"
    if normalized in {"stale"}:
        return "Stale"
    return "Idle"


def _next_action_for_state(state: str) -> str:
    mapped = _operational_state_from_raw(state)
    if mapped == "Blocked":
        return "Retry same target, reroute, or assign to human."
    if mapped == "Failed":
        return "Inspect evidence, quarantine artifact if needed, and rollback."
    if mapped == "Partial":
        return "Collect missing evidence and rerun the affected step."
    if mapped == "Waiting":
        return "Resume run after dependency/operator action."
    if mapped == "Stale":
        return "Refresh heartbeat and verify runtime connectivity."
    if mapped == "Done":
        return "Review evidence manifest and proceed to next task."
    if mapped == "Running":
        return "Monitor live timeline and keep supervisors active."
    return "Run refresh checks and continue."


def _latest_run_step(run_record: dict[str, Any]) -> dict[str, Any] | None:
    steps = run_record.get("steps", [])
    if not isinstance(steps, list):
        return None
    for step in reversed(steps):
        if isinstance(step, dict):
            return step
    return None


def _raw_status_for_run_status(status: str) -> str:
    current = str(status or "").strip().upper()
    if current == "PAUSED":
        return "paused"
    if current == "WAITING":
        return "waiting"
    if current == "STOPPED":
        return "stopped"
    if current == "ROLLED_BACK":
        return "rolled-back"
    if current in {"RUNNING", "QUEUED"}:
        return "running"
    return current.lower()


def _sync_run_transition_metadata(
    run_record: dict[str, Any],
    *,
    status: str,
    reason: str,
    next_action: str,
    terminal: bool,
    step_status: str = "",
) -> None:
    run_record["status"] = status
    run_record["reason"] = reason
    run_record["next_action"] = next_action
    now = _now_iso()
    run_record["updated_at"] = now
    try:
        current_control_version = int(run_record.get("control_version", 0) or 0)
    except (TypeError, ValueError):
        current_control_version = 0
    run_record["control_version"] = current_control_version + 1
    run_record["control_updated_at"] = now
    if terminal:
        run_record["current_agent"] = ""

    step = _latest_run_step(run_record)
    if not isinstance(step, dict):
        return

    resolved_step_status = step_status.strip() or _raw_status_for_run_status(status)
    step["status"] = resolved_step_status
    step["raw_status"] = resolved_step_status
    step["reason"] = reason
    step["next_action"] = next_action
    if terminal:
        step["finished_at"] = str(step.get("finished_at", "")).strip() or _now_iso()
    elif resolved_step_status in {"paused", "waiting", "running", "queued"}:
        step["finished_at"] = ""


def _timeline_rows_from_run(run_record: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(run_record, dict):
        return []
    run_id = str(run_record.get("run_id", "")).strip()
    trace_id = str(run_record.get("trace_id", "")).strip()
    task_id = str(run_record.get("task_id", "")).strip()
    run_state = _operational_state_from_raw(str(run_record.get("status", "")))
    run_steps = run_record.get("steps", [])
    if not isinstance(run_steps, list) or not run_steps:
        return []

    rows: list[dict[str, Any]] = []
    normalized_states: list[str] = []
    for step in run_steps:
        if not isinstance(step, dict):
            normalized_states.append("Idle")
            continue
        normalized_states.append(_operational_state_from_raw(str(step.get("status", step.get("raw_status", "")))))

    for index, step in enumerate(run_steps):
        if not isinstance(step, dict):
            continue
        current_state = normalized_states[index] if index < len(normalized_states) else "Idle"
        previous_state = normalized_states[index - 1] if index > 0 else "Idle"
        next_state = normalized_states[index + 1] if index + 1 < len(normalized_states) else run_state
        reason = (
            str(step.get("reason", "")).strip()
            or str(step.get("response_excerpt", "")).strip()
            or str(step.get("error", "")).strip()
            or str(step.get("fallback_reason", "")).strip()
            or str(step.get("recovery_reason", "")).strip()
            or "No explicit reason reported."
        )
        next_action = str(step.get("next_action", "")).strip() or _next_action_for_state(current_state)
        evidence_ref = (
            str(step.get("dispatch_artifact", "")).strip()
            or str(step.get("final_code_artifact", "")).strip()
            or str(step.get("final_code_url", "")).strip()
            or str(run_record.get("evidence_manifest", "")).strip()
            or str(run_record.get("snapshot", "")).strip()
            or str(run_record.get("run_file", "")).strip()
        )
        rows.append(
            {
                "run_id": run_id,
                "trace_id": str(step.get("trace_id", "")).strip() or trace_id,
                "task_id": str(step.get("task_id", "")).strip() or task_id or str(step.get("fallback_task_id", "")).strip(),
                "step_id": str(step.get("step_id", "")).strip() or str(step.get("call_id", "")).strip() or f"{run_id}-step-{index + 1}",
                "agent_id": str(step.get("agent", "")).strip(),
                "role": str(step.get("role", "")).strip(),
                "runtime_target": str(step.get("runtime_target", "")).strip(),
                "current_state": current_state,
                "previous_state": previous_state,
                "next_state": next_state,
                "reason": reason,
                "next_action": next_action,
                "evidence_ref": evidence_ref,
                "started_at": str(step.get("started_at", "")).strip() or str(run_record.get("started_at", "")).strip(),
                "finished_at": str(step.get("finished_at", "")).strip() or str(run_record.get("finished_at", "")).strip(),
                "fallback_used": bool(step.get("fallback_used", False)),
                "fallback_reason": str(step.get("fallback_reason", "")).strip(),
                "fallback_endpoint": str(step.get("fallback_endpoint", "")).strip(),
                "recovery_used": bool(step.get("recovery_used", False)),
                "recovery_reason": str(step.get("recovery_reason", "")).strip(),
                "recovery_target": str(step.get("recovery_target", "")).strip(),
            }
        )
    return rows


def _list_autonomy_profiles() -> list[dict[str, Any]]:
    return [
        {
            "id": profile_id,
            "label": profile_data.get("label", profile_id),
            "description": profile_data.get("description", ""),
            "agents": list(profile_data.get("agents", [])),
            "supervisors_required": list(profile_data.get("supervisors_required", ["sentinel_truth", "sentinel_runtime"])),
        }
        for profile_id, profile_data in AUTONOMY_PROFILES.items()
    ]


def _recommended_defaults_payload() -> dict[str, Any]:
    profiles = _list_autonomy_profiles()
    profile_ids = [str(entry.get("id", "")).strip() for entry in profiles if str(entry.get("id", "")).strip()]
    default_profile_id = "three_d_web_game_swarm" if "three_d_web_game_swarm" in profile_ids else (profile_ids[0] if profile_ids else "")
    core_profile_id = "three_d_web_game_core_11" if "three_d_web_game_core_11" in profile_ids else ""
    role_runtime_targets: dict[str, str] = {}
    roles = PLATFORM7_CONTRACT.get("roles", [])
    if isinstance(roles, list):
        for role in roles:
            if not isinstance(role, dict):
                continue
            namespace = str(role.get("namespace", "")).strip()
            if not namespace:
                continue
            role_runtime_targets[namespace] = _runtime_target_for_virtual_namespace(namespace)
    return {
        "default_profile_id": default_profile_id,
        "quick_profile_ids": {
            "full_29": default_profile_id,
            "core_11": core_profile_id,
        },
        "default_agent": "product_scope",
        "quality_priority": True,
        "manual_override_allowed": True,
        "role_runtime_targets": role_runtime_targets,
    }


def _capability_summary() -> dict[str, Any]:
    active_agents = [_normalized_agent_record(agent) for agent in AGENT_REGISTRY.get("active_agents", [])]
    status_counts: dict[str, int] = {}
    for agent in active_agents:
        if not agent:
            continue
        status_class = _normalize_agent_status_class(agent.get("status_class", "UNKNOWN"))
        status_counts[status_class] = status_counts.get(status_class, 0) + 1

    routing = _target_health_status()
    routing_summary = {
        target: {
            "http_status": probe.get("http_status"),
            "effective_http_status": _probe_effective_http_status(probe),
            "status_class": _http_status_to_status_class(_probe_effective_http_status(probe)),
            "reachable": probe.get("reachable", False),
            "effective_reachable": bool(probe.get("effective_reachable", False)),
            "recovery_ready": bool(probe.get("recovery_ready", False)),
            "recovery_target": str(probe.get("recovery_target", "")).strip(),
        }
        for target, probe in routing.items()
    }

    limitations: list[str] = []
    policy_notes: list[str] = []
    if not OLLAMAHF_BEARER_TOKEN:
        limitations.append("OLLAMAHF_BEARER_TOKEN missing: external orchestrator may be rate-limited or blocked.")
    if not OLLAMAHF_MASTER_KEY:
        limitations.append("OLLAMAHF_MASTER_KEY missing: external orchestrate depth can degrade.")
    if not BOLTDIY_SPACE_TOKEN:
        limitations.append("BOLTDIY_SPACE_TOKEN/HF_TOKEN missing: external HF dispatch may return 401/403/404.")
    if ZERO_COMPUTE_POLICY and not ALLOW_LOCAL_HEAVY:
        policy_notes.append("Zero-compute policy active: heavy local runs are rerouted to remote targets.")

    bootstrap_state = _bootstrap_status_snapshot()
    prompt_ready, prompt_ready_reason = _is_ready_for_prompt_execution()
    contract_roles = PLATFORM7_CONTRACT.get("roles", [])
    if not isinstance(contract_roles, list):
        contract_roles = []
    superpowers = PLATFORM7_CONTRACT.get("superpowers", [])
    if not isinstance(superpowers, list):
        superpowers = []
    tooling_requirements = PLATFORM7_CONTRACT.get("tooling_requirements", [])
    if not isinstance(tooling_requirements, list):
        tooling_requirements = []
    required_tool_ids = sorted(
        {
            str(item.get("id", "")).strip().lower()
            for item in tooling_requirements
            if isinstance(item, dict) and bool(item.get("required", True)) and str(item.get("id", "")).strip()
        }
    )
    required_superpower_ids = sorted(
        {
            str(item.get("id", "")).strip().lower()
            for item in superpowers
            if isinstance(item, dict) and bool(item.get("required", True)) and str(item.get("id", "")).strip()
        }
    )
    tooling_gate_ok = "chrome-devtools" in required_tool_ids and "puppeteer" in required_tool_ids
    superpower_gate_ok = set(PLATFORM7_SUPERPOWER_IDS).issubset(set(required_superpower_ids))
    if not prompt_ready:
        limitations.append(f"Prompt execution is blocked: {prompt_ready_reason}")
    if not PLATFORM7_CONTRACT_VALIDATION.get("ok", False):
        limitations.append("Platform7 contract validation failed; truth contract must be fixed before release.")
    if not tooling_gate_ok:
        limitations.append("Tooling gate incomplete: chrome-devtools + puppeteer must both be required.")
    if not superpower_gate_ok:
        limitations.append("Superpower gate incomplete: 12/12 required superpowers must be declared.")

    no_limits_claim = len(limitations) == 0
    progress = _platform7_progress_payload()

    return {
        "status": "ok",
        "no_limits_claim": no_limits_claim,
        "active_agents": len(active_agents),
        "platform7_roles_total": len(contract_roles),
        "platform7_workers_total": int(PLATFORM7_CONTRACT_VALIDATION.get("worker_count", 0)),
        "platform7_supervisors_total": int(PLATFORM7_CONTRACT_VALIDATION.get("supervisor_count", 0)),
        "legacy_agents": len(AGENT_REGISTRY.get("legacy_agents", [])),
        "agent_status_counts": status_counts,
        "routing_summary": routing_summary,
        "limitations": limitations,
        "bootstrap_status": bootstrap_state.get("status", "DOWN"),
        "prompt_ready": prompt_ready,
        "prompt_ready_reason": prompt_ready_reason,
        "tooling_gate_ok": tooling_gate_ok,
        "tooling_required_ids": required_tool_ids,
        "tooling_requirements": tooling_requirements,
        "superpower_gate_ok": superpower_gate_ok,
        "superpowers_required_ids": required_superpower_ids,
        "superpowers": superpowers,
        "platform7_progress": progress,
        "policy_notes": policy_notes,
        "recommended_defaults": _recommended_defaults_payload(),
        "platform7_contract_validation": PLATFORM7_CONTRACT_VALIDATION,
        "notes": (
            "No-lie rule: if limitations are present, system remains bounded by provider/auth/credit/runtime constraints."
        ),
    }


def _platform7_progress_payload() -> dict[str, Any]:
    contract = _load_platform7_contract()
    validation = _validate_platform7_contract(contract)
    roles = contract.get("roles", [])
    if not isinstance(roles, list):
        roles = []
    tooling_requirements = contract.get("tooling_requirements", [])
    if not isinstance(tooling_requirements, list):
        tooling_requirements = []
    superpowers = contract.get("superpowers", [])
    if not isinstance(superpowers, list):
        superpowers = []

    role_namespaces = {
        str(entry.get("namespace", "")).strip().lower()
        for entry in roles
        if isinstance(entry, dict) and str(entry.get("namespace", "")).strip()
    }
    lane_names = {
        str(entry.get("lane", "")).strip()
        for entry in roles
        if isinstance(entry, dict) and str(entry.get("lane", "")).strip()
    }
    expected_namespaces = set(PLATFORM7_NAMESPACE_RUNTIME_TARGETS.keys())
    expected_lanes = set(PLATFORM7_EXPECTED_LANES)

    mapped_namespaces = {item for item in role_namespaces if item in expected_namespaces}
    required_tool_ids = {
        str(item.get("id", "")).strip().lower()
        for item in tooling_requirements
        if isinstance(item, dict) and bool(item.get("required", True)) and str(item.get("id", "")).strip()
    }
    required_superpower_ids = {
        str(item.get("id", "")).strip().lower()
        for item in superpowers
        if isinstance(item, dict) and bool(item.get("required", True)) and str(item.get("id", "")).strip()
    }
    tool_gate_ok = {"chrome-devtools", "puppeteer"}.issubset(required_tool_ids)
    superpower_gate_ok = set(PLATFORM7_SUPERPOWER_IDS).issubset(required_superpower_ids)
    prompt_ready, prompt_reason = _is_ready_for_prompt_execution()
    full_profile_ok = bool(validation.get("full_profile_ok", False))

    phase_cfg = round(
        (
            _safe_percent(float(validation.get("role_count", 0)), 29.0)
            + (100.0 if int(validation.get("worker_count", 0)) == 27 else 0.0)
            + (100.0 if int(validation.get("supervisor_count", 0)) == 2 else 0.0)
            + (100.0 if bool(validation.get("ok", False)) else 0.0)
        )
        / 4.0,
        2,
    )
    phase_wiring = _safe_percent(float(len(mapped_namespaces)), float(len(expected_namespaces)))
    phase_tools = _safe_percent(
        float(len(required_tool_ids.intersection(set(PLATFORM7_EXPECTED_TOOL_IDS)))),
        float(len(PLATFORM7_EXPECTED_TOOL_IDS)),
    )
    phase_superpowers = _safe_percent(
        float(len(required_superpower_ids.intersection(set(PLATFORM7_SUPERPOWER_IDS)))),
        float(len(PLATFORM7_SUPERPOWER_IDS)),
    )
    phase_live = round(
        (
            (100.0 if full_profile_ok else 0.0)
            + (100.0 if tool_gate_ok else 0.0)
            + (100.0 if superpower_gate_ok else 0.0)
            + (100.0 if prompt_ready else 0.0)
        )
        / 4.0,
        2,
    )

    vertical_percent = round((phase_cfg + phase_wiring + phase_tools + phase_superpowers + phase_live) / 5.0, 2)
    horizontal_percent = _safe_percent(float(len(lane_names.intersection(expected_lanes))), float(len(expected_lanes)))
    status = "ok" if vertical_percent >= 99.0 and horizontal_percent >= 99.0 else "partial"

    return {
        "status": status,
        "phase_pct": {
            "p0_cfg": phase_cfg,
            "p1_wiring": phase_wiring,
            "p2_tools": phase_tools,
            "p3_superpowers": phase_superpowers,
            "p4_live": phase_live,
        },
        "v_pct": vertical_percent,
        "h_pct": horizontal_percent,
        "roles": {
            "total": int(validation.get("role_count", 0)),
            "workers": int(validation.get("worker_count", 0)),
            "supervisors": int(validation.get("supervisor_count", 0)),
        },
        "gates": {
            "contract_ok": bool(validation.get("ok", False)),
            "full_profile_ok": full_profile_ok,
            "tool_gate_ok": tool_gate_ok,
            "superpower_gate_ok": superpower_gate_ok,
            "prompt_ready": prompt_ready,
            "prompt_ready_reason": prompt_reason,
        },
        "coverage": {
            "mapped_namespaces": len(mapped_namespaces),
            "expected_namespaces": len(expected_namespaces),
            "lanes_covered": len(lane_names.intersection(expected_lanes)),
            "lanes_expected": len(expected_lanes),
        },
        "short": (
            f"P0 {phase_cfg} | P1 {phase_wiring} | P2 {phase_tools} | "
            f"P3 {phase_superpowers} | P4 {phase_live} | V {vertical_percent} | H {horizontal_percent}"
        ),
        "checked_at": _now_iso(),
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
    trace_id = str(uuid.uuid4())
    task_id = f"task-{run_id}"
    started_at = _now_iso()
    snapshot = EVIDENCE_DIR / f"autonomy_run_{started_at.replace(':', '-').replace('.', '-')}_{run_id}.json"
    run_file = RUNS_DIR / f"{run_id}.json"
    return {
        "run_id": run_id,
        "trace_id": trace_id,
        "task_id": task_id,
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
        "control_version": 0,
        "control_updated_at": started_at,
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
    _persist_run_manifest(record)
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
        "control_version": int(record.get("control_version", 0) or 0),
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
        "reason": record.get("reason", ""),
        "next_action": record.get("next_action", _next_action_for_state(str(record.get("status", "")))),
        "evidence_manifest": record.get("evidence_manifest", ""),
        "evidence_manifest_latest": record.get("evidence_manifest_latest", ""),
        "evidence_status": record.get("evidence_status", "Unknown"),
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
    run_id = str(record.get("run_id", "")).strip()
    run_file = RUNS_DIR / f"{run_id}.json" if run_id else None
    try:
        local_control_version = int(record.get("control_version", 0) or 0)
    except (TypeError, ValueError):
        local_control_version = 0

    def _emit_halt_event(status_value: str, reason_value: str, next_action_value: str, agent_value: str = "") -> None:
        req = RunControlRequest(
            source="agent-chain-worker",
            reason=reason_value,
            session_id=str(record.get("run_id", "")),
            trace_id=str(record.get("trace_id", "")),
            task_id=str(record.get("task_id", "")),
            step_id=f"{record.get('run_id', 'run')}-step-{record.get('current_step', 0)}",
            agent_id=agent_value,
            runtime_target="",
        )
        _emit_control_event(
            action="agent-chain-halted",
            state=status_value,
            reason=reason_value or f"Run halted due to operator state {status_value}.",
            next_action=next_action_value or _next_action_for_state(status_value),
            payload=req,
            run_id=run_id,
            extra={"control_version": int(record.get("control_version", 0) or 0)},
        )

    def _cleanup_run_override_if_terminal(status_value: str) -> None:
        if _is_terminal_run_status(str(status_value).strip().upper()):
            _clear_run_routing_override(run_id)

    def _control_halt_state() -> tuple[str, str, str, int]:
        if not run_file:
            return "", "", "", local_control_version
        latest = _latest_json(run_file)
        if not isinstance(latest, dict) or not latest:
            return "", "", "", local_control_version
        try:
            latest_control_version = int(latest.get("control_version", 0) or 0)
        except (TypeError, ValueError):
            latest_control_version = local_control_version
        if latest_control_version > local_control_version:
            record["control_version"] = latest_control_version
        latest_status = str(latest.get("status", "")).strip().upper()
        if latest_status not in {"PAUSED", "STOPPED", "ROLLED_BACK", "WAITING"}:
            return "", "", "", latest_control_version
        return (
            latest_status,
            str(latest.get("reason", "")).strip(),
            str(latest.get("next_action", "")).strip(),
            latest_control_version,
        )

    try:
        for index, agent_id in enumerate(agents, start=1):
            halt_status, halt_reason, halt_next_action, latest_control_version = _control_halt_state()
            local_control_version = max(local_control_version, latest_control_version)
            if halt_status:
                record["status"] = halt_status
                record["control_version"] = local_control_version
                if halt_reason:
                    record["reason"] = halt_reason
                if halt_next_action:
                    record["next_action"] = halt_next_action
                record["current_agent"] = ""
                record["finished_at"] = _now_iso() if halt_status in {"STOPPED", "ROLLED_BACK"} else ""
                _persist_agent_chain_record(record)
                _emit_halt_event(halt_status, halt_reason, halt_next_action, agent_id)
                _cleanup_run_override_if_terminal(halt_status)
                return _agent_chain_response(record)
            step_record: dict[str, Any] = {
                "step": index,
                "agent": agent_id,
                "trace_id": str(record.get("trace_id", "")),
                "task_id": str(record.get("task_id", "")),
                "step_id": f"{record.get('run_id', 'run')}-step-{index}",
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
            halt_status_before_dispatch, halt_reason_before_dispatch, halt_next_action_before_dispatch, latest_control_version = _control_halt_state()
            local_control_version = max(local_control_version, latest_control_version)
            if halt_status_before_dispatch:
                step_record["status"] = _raw_status_for_run_status(halt_status_before_dispatch)
                step_record["raw_status"] = _raw_status_for_run_status(halt_status_before_dispatch)
                step_record["reason"] = halt_reason_before_dispatch
                step_record["next_action"] = halt_next_action_before_dispatch
                step_record["finished_at"] = (
                    _now_iso() if halt_status_before_dispatch in {"STOPPED", "ROLLED_BACK"} else ""
                )
                record["status"] = halt_status_before_dispatch
                record["control_version"] = local_control_version
                if halt_reason_before_dispatch:
                    record["reason"] = halt_reason_before_dispatch
                if halt_next_action_before_dispatch:
                    record["next_action"] = halt_next_action_before_dispatch
                record["current_agent"] = ""
                record["finished_at"] = (
                    _now_iso() if halt_status_before_dispatch in {"STOPPED", "ROLLED_BACK"} else ""
                )
                _persist_agent_chain_record(record)
                _emit_halt_event(halt_status_before_dispatch, halt_reason_before_dispatch, halt_next_action_before_dispatch, agent_id)
                _cleanup_run_override_if_terminal(halt_status_before_dispatch)
                return _agent_chain_response(record)
            _persist_agent_chain_record(record)
            halt_status_before_mission, halt_reason_before_mission, halt_next_action_before_mission, latest_control_version = _control_halt_state()
            local_control_version = max(local_control_version, latest_control_version)
            if halt_status_before_mission:
                step_record["status"] = _raw_status_for_run_status(halt_status_before_mission)
                step_record["raw_status"] = _raw_status_for_run_status(halt_status_before_mission)
                step_record["reason"] = halt_reason_before_mission
                step_record["next_action"] = halt_next_action_before_mission
                step_record["finished_at"] = _now_iso() if halt_status_before_mission in {"STOPPED", "ROLLED_BACK"} else ""
                record["status"] = halt_status_before_mission
                record["control_version"] = local_control_version
                if halt_reason_before_mission:
                    record["reason"] = halt_reason_before_mission
                if halt_next_action_before_mission:
                    record["next_action"] = halt_next_action_before_mission
                record["current_agent"] = ""
                record["finished_at"] = _now_iso() if halt_status_before_mission in {"STOPPED", "ROLLED_BACK"} else ""
                _persist_agent_chain_record(record)
                _emit_halt_event(halt_status_before_mission, halt_reason_before_mission, halt_next_action_before_mission, agent_id)
                _cleanup_run_override_if_terminal(halt_status_before_mission)
                return _agent_chain_response(record)

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
                context_token = DISPATCH_RUN_CONTEXT.set(run_id)
                try:
                    dispatch_result = dispatch(mission)
                finally:
                    DISPATCH_RUN_CONTEXT.reset(context_token)
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
                halt_status_after_dispatch, halt_reason_after_dispatch, halt_next_action_after_dispatch, latest_control_version = _control_halt_state()
                local_control_version = max(local_control_version, latest_control_version)
                if halt_status_after_dispatch:
                    step_record["status"] = _raw_status_for_run_status(halt_status_after_dispatch)
                    record["status"] = halt_status_after_dispatch
                    record["control_version"] = local_control_version
                    if halt_reason_after_dispatch:
                        record["reason"] = halt_reason_after_dispatch
                    if halt_next_action_after_dispatch:
                        record["next_action"] = halt_next_action_after_dispatch
                    record["current_agent"] = ""
                    record["finished_at"] = (
                        _now_iso() if halt_status_after_dispatch in {"STOPPED", "ROLLED_BACK"} else ""
                    )
                    record["forwarded_steps"] = sum(1 for step in steps if step.get("status") == "forwarded")
                    record["partial_steps"] = sum(1 for step in steps if step.get("status") == "partial")
                    _persist_agent_chain_record(record)
                    _emit_halt_event(halt_status_after_dispatch, halt_reason_after_dispatch, halt_next_action_after_dispatch, agent_id)
                    _cleanup_run_override_if_terminal(halt_status_after_dispatch)
                    return _agent_chain_response(record)
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
        _cleanup_run_override_if_terminal(record.get("status", ""))
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
    _cleanup_run_override_if_terminal(overall_status)
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
    record["next_action"] = "Monitor live timeline and keep supervisors active."
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
    chat_payload = {
        "model": req.model,
        "messages": [{"role": "user", "content": "Respond with OK only."}],
        "temperature": 0.0,
        "max_tokens": 16,
    }
    chat_attempts: list[dict[str, Any]] = []
    chat_result: dict[str, Any] = {}
    for attempt in range(1, req.orchestrate_retries + 1):
        current = _post_json(
            f"{base}/v1/chat/completions",
            chat_payload,
            req.timeout,
            headers=headers,
        )
        current["attempt"] = attempt
        chat_attempts.append(current)
        chat_result = current
        if current.get("status") == "forwarded" or current.get("http_status") == 200:
            break
        if attempt < req.orchestrate_retries:
            time.sleep(min(2 * attempt, 5))
    if chat_attempts:
        chat_result = dict(chat_result)
        chat_result["attempts"] = [dict(item) for item in chat_attempts]
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
    if not payload.get("evidence_manifest"):
        _persist_run_manifest(payload)
        _write_json(candidate, payload)
        snapshot_path = Path(str(payload.get("snapshot", ""))).resolve() if str(payload.get("snapshot", "")).strip() else None
        if snapshot_path and snapshot_path.exists():
            _write_json(snapshot_path, payload)
        _write_json(EVIDENCE_DIR / "autonomy_run_latest.json", payload)
    return payload


def _is_terminal_run_status(status: str) -> bool:
    return status in {"PASS", "DONE", "FAILED", "BLOCKED", "PARTIAL", "STOPPED", "ROLLED_BACK"}


def _apply_run_control_transition(
    run_record: dict[str, Any],
    action: str,
    req: RunControlRequest,
) -> tuple[str, str, str, bool]:
    current = str(run_record.get("status", "UNKNOWN")).strip().upper()
    reason_input = req.reason.strip()

    if action == "pause":
        if current == "PAUSED":
            return current, "Run is already paused (idempotent).", "Use resume to continue execution.", False
        if _is_terminal_run_status(current):
            return current, "Terminal runs cannot be paused.", "Use retry-last-step or start a new run.", False
        run_record["finished_at"] = ""
        reason = reason_input or "Run paused by operator."
        next_action = "Use resume when dependency is cleared."
        _sync_run_transition_metadata(run_record, status="PAUSED", reason=reason, next_action=next_action, terminal=False)
        return "PAUSED", reason, next_action, True

    if action == "resume":
        if current in {"RUNNING", "QUEUED"}:
            return current, "Run is already active (idempotent).", "Monitor live timeline.", False
        if current != "PAUSED":
            return current, "Run is not paused; resume is not applicable.", "Use pause first or retry-last-step.", False
        run_record["finished_at"] = ""
        reason = reason_input or "Run resumed by operator."
        next_action = "Monitor live timeline."
        _sync_run_transition_metadata(run_record, status="RUNNING", reason=reason, next_action=next_action, terminal=False)
        return "RUNNING", reason, next_action, True

    if action == "stop":
        if current == "STOPPED":
            return current, "Run already stopped (idempotent).", "Inspect evidence and decide retry strategy.", False
        if _is_terminal_run_status(current):
            return current, "Run already terminal; stop applied as idempotent no-op.", "Inspect evidence.", False
        run_record["finished_at"] = _now_iso()
        reason = reason_input or "Run stopped by operator."
        next_action = "Inspect blocker and optionally rollback."
        _sync_run_transition_metadata(run_record, status="STOPPED", reason=reason, next_action=next_action, terminal=True)
        return "STOPPED", reason, next_action, True

    if action == "rollback":
        if current == "ROLLED_BACK":
            return current, "Run already rolled back (idempotent).", "Review quarantined artifacts.", False
        run_record["finished_at"] = _now_iso()
        reason = reason_input or "Run rolled back by operator."
        next_action = "Retry-last-step after fix."
        _sync_run_transition_metadata(run_record, status="ROLLED_BACK", reason=reason, next_action=next_action, terminal=True)
        return "ROLLED_BACK", reason, next_action, True

    if action == "retry-last-step":
        steps = run_record.get("steps", [])
        if not isinstance(steps, list) or not steps:
            return current, "Run has no steps to retry.", "Dispatch a new run.", False
        last = steps[-1]
        if not isinstance(last, dict):
            return current, "Last step payload is invalid.", "Run a fresh autonomy pipeline.", False
        last["status"] = "queued"
        last["raw_status"] = "queued"
        last["finished_at"] = ""
        if reason_input:
            last["reason"] = reason_input
        run_record["current_step"] = int(last.get("step", len(steps)))
        run_record["current_agent"] = str(last.get("agent", ""))
        run_record["finished_at"] = ""
        reason = reason_input or "Last step moved back to queued."
        next_action = "Monitor the rerun in Glasshouse."
        _sync_run_transition_metadata(
            run_record,
            status="RUNNING",
            reason=reason,
            next_action=next_action,
            terminal=False,
            step_status="queued",
        )
        return "RUNNING", reason, next_action, True

    if action == "assign-human":
        if current == "WAITING":
            return current, "Run already assigned to human operator (idempotent).", "Operator can resume after mitigation.", False
        if _is_terminal_run_status(current):
            return current, "Terminal runs cannot be assigned to a human operator.", "Inspect evidence or start a new run.", False
        run_record["finished_at"] = ""
        reason = reason_input or "Run assigned to human operator."
        next_action = "Operator resolves blocker, then resume."
        _sync_run_transition_metadata(run_record, status="WAITING", reason=reason, next_action=next_action, terminal=False)
        return "WAITING", reason, next_action, True

    return current, f"Unsupported action '{action}'.", "Use stop/pause/resume/retry-last-step/rollback/assign-human.", False


def _execute_run_control_action(run_id: str, action: str, req: RunControlRequest) -> dict[str, Any]:
    run_record = _load_run_file(run_id)
    next_status, reason, next_action, changed = _apply_run_control_transition(run_record, action, req)
    if changed:
        _persist_agent_chain_record(run_record)
    if _is_terminal_run_status(str(next_status).strip().upper()):
        _clear_run_routing_override(run_id)
    with CONTROL_CENTER_CACHE_LOCK:
        CONTROL_CENTER_CACHE["expires_at"] = 0.0
        CONTROL_CENTER_CACHE["payload"] = None
    event = _emit_control_event(
        action=action,
        state=next_status,
        reason=reason,
        next_action=next_action,
        payload=req,
        run_id=run_id,
        extra={"changed": changed},
    )
    return {
        "status": "ok" if changed else "noop",
        "run_id": run_id,
        "action": action,
        "run_status": next_status,
        "control_version": int(run_record.get("control_version", 0) or 0),
        "changed": changed,
        "reason": reason,
        "next_action": next_action,
        "event": event,
        "run": run_record,
    }


def _control_center_state_payload(force_refresh: bool = False) -> dict[str, Any]:
    now_epoch = time.time()
    if not force_refresh and CONTROL_CENTER_STATUS_CACHE_TTL > 0:
        with CONTROL_CENTER_CACHE_LOCK:
            expires_at = float(CONTROL_CENTER_CACHE.get("expires_at", 0.0) or 0.0)
            cached_payload = CONTROL_CENTER_CACHE.get("payload")
            if cached_payload and expires_at > now_epoch:
                return dict(cached_payload)

    target_timeout = max(1, min(CONTROL_CENTER_PROBE_TIMEOUT, 2))
    target_probes = _target_health_status(probe_timeout=target_timeout)
    storage_metrics = _storage_metrics_cached_or_stub()
    maintenance = _runtime_maintenance_snapshot()
    routing_targets = {
        target: {
            **probe,
            "status_class": _http_status_to_status_class(_probe_effective_http_status(probe)),
        }
        for target, probe in target_probes.items()
    }
    latest_dispatch = _latest_json(DISPATCH_DIR / "latest_dispatch.json")
    routing_payload = {
        "status": "ok",
        "targets": routing_targets,
        "latest_dispatch": latest_dispatch.get("dispatch_artifact", ""),
        "override": dict(ROUTING_OVERRIDE_STATE),
        "run_overrides": _run_routing_overrides_snapshot(),
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
        "storage_metrics": storage_metrics,
        "maintenance": maintenance,
    }

    bootstrap_payload = _bootstrap_status_snapshot()
    ready, reason = _is_ready_for_prompt_execution()
    latest_run = _latest_json(EVIDENCE_DIR / "autonomy_run_latest.json")
    if (
        CONTROL_CENTER_PERSIST_MANIFEST
        and isinstance(latest_run, dict)
        and str(latest_run.get("run_id", "")).strip()
    ):
        try:
            _persist_run_manifest(latest_run)
        except Exception as exc:
            latest_run.setdefault("manifest_refresh_error", str(exc))
    timeline_rows = _timeline_rows_from_run(latest_run if isinstance(latest_run, dict) else None)
    active_timeline = timeline_rows[-1] if timeline_rows else {}
    latest_run_state = _operational_state_from_raw(str(latest_run.get("status", ""))) if isinstance(latest_run, dict) else "Idle"
    terminal_run_state = latest_run_state in {"Done", "Failed", "Blocked", "Stale"}
    active_current_state = (
        latest_run_state
        if terminal_run_state
        else (str(active_timeline.get("current_state", latest_run_state)).strip() or latest_run_state)
    )
    active_previous_state = str(active_timeline.get("previous_state", "Idle")).strip() or "Idle"
    active_next_state = (
        latest_run_state
        if terminal_run_state
        else (str(active_timeline.get("next_state", latest_run_state)).strip() or latest_run_state)
    )
    active_next_action = (
        str(active_timeline.get("next_action", "")).strip()
        or (str(latest_run.get("next_action", "")).strip() if isinstance(latest_run, dict) else "")
        or _next_action_for_state(active_current_state)
    )
    service_probes = _probe_catalog_parallel(_service_probe_catalog(), target_timeout)
    contract = _load_platform7_contract()
    contract_validation = _validate_platform7_contract(contract)
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
        "storage": storage_metrics,
        "maintenance": maintenance,
        "latest_run": latest_run,
        "timeline": timeline_rows,
        "active_execution": {
            "run_id": str(latest_run.get("run_id", "")).strip() if isinstance(latest_run, dict) else "",
            "trace_id": str(latest_run.get("trace_id", "")).strip() if isinstance(latest_run, dict) else "",
            "task_id": str(latest_run.get("task_id", "")).strip() if isinstance(latest_run, dict) else "",
            "agent_id": str(active_timeline.get("agent_id", "")).strip(),
            "role": str(active_timeline.get("role", "")).strip(),
            "runtime_target": str(active_timeline.get("runtime_target", "")).strip(),
            "current_state": active_current_state,
            "previous_state": active_previous_state,
            "next_state": active_next_state,
            "reason": str(active_timeline.get("reason", "")).strip()
            or (str(latest_run.get("reason", "")).strip() if isinstance(latest_run, dict) else ""),
            "next_action": active_next_action,
            "fallback_or_recovery": (
                "fallback"
                if bool(active_timeline.get("fallback_used", False))
                else "recovery"
                if bool(active_timeline.get("recovery_used", False))
                else "none"
            ),
        },
        "latest_control_event": _latest_json(CONTROL_EVENT_DIR / "latest.json"),
        "platform7_contract": {
            "version": contract.get("version", "unknown"),
            "source": str(PLATFORM7_CONTRACT_PATH),
            "validation": contract_validation,
            "tooling_required_count": contract_validation.get("tooling_required_count", 0),
            "tooling_required_ids": contract_validation.get("tooling_required_ids", []),
            "superpowers_required_count": contract_validation.get("superpowers_required_count", 0),
            "superpowers_required_ids": contract_validation.get("superpowers_required_ids", []),
            "full_profile_ok": contract_validation.get("full_profile_ok", False),
        },
        "platform7_progress": _platform7_progress_payload(),
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
    manifest_path = str(run.get("evidence_manifest", "")).strip()
    manifest_latest_path = str(run.get("evidence_manifest_latest", "")).strip()
    return {
        "status": "ok",
        "run_id": run.get("run_id", run_id),
        "snapshot": run.get("snapshot", ""),
        "run_file": str(RUNS_DIR / f"{run_id}.json"),
        "reason": str(run.get("reason", "")).strip(),
        "next_action": str(run.get("next_action", _next_action_for_state(str(run.get("status", ""))))).strip(),
        "evidence_manifest": manifest_path,
        "evidence_manifest_latest": manifest_latest_path,
        "evidence_manifest_endpoint": f"/evidence/manifests/{parse.quote(Path(manifest_path).name)}" if manifest_path else "",
        "evidence_manifest_latest_endpoint": (
            f"/evidence/manifests/{parse.quote(Path(manifest_latest_path).name)}" if manifest_latest_path else ""
        ),
        "evidence_status": run.get("evidence_status", "Unknown"),
        "steps": run.get("steps", []),
        "summary": {
            "status": run.get("status", "UNKNOWN"),
            "reason": str(run.get("reason", "")).strip(),
            "next_action": str(run.get("next_action", _next_action_for_state(str(run.get("status", ""))))).strip(),
            "evidence_status": run.get("evidence_status", "Unknown"),
            "forwarded_steps": run.get("forwarded_steps", 0),
            "total_steps": run.get("total_steps", 0),
        },
    }


@app.post("/runs/{run_id}/stop")
def run_stop(run_id: str, req: RunControlRequest) -> dict[str, Any]:
    _ensure_dirs()
    return _execute_run_control_action(run_id, "stop", req)


@app.post("/runs/{run_id}/kill")
def run_kill(run_id: str, req: RunControlRequest) -> dict[str, Any]:
    _ensure_dirs()
    return _execute_run_control_action(run_id, "stop", req)


@app.post("/runs/{run_id}/pause")
def run_pause(run_id: str, req: RunControlRequest) -> dict[str, Any]:
    _ensure_dirs()
    return _execute_run_control_action(run_id, "pause", req)


@app.post("/runs/{run_id}/resume")
def run_resume(run_id: str, req: RunControlRequest) -> dict[str, Any]:
    _ensure_dirs()
    return _execute_run_control_action(run_id, "resume", req)


@app.post("/runs/{run_id}/retry-last-step")
def run_retry_last_step(run_id: str, req: RunControlRequest) -> dict[str, Any]:
    _ensure_dirs()
    return _execute_run_control_action(run_id, "retry-last-step", req)


@app.post("/runs/{run_id}/rollback")
def run_rollback(run_id: str, req: RunControlRequest) -> dict[str, Any]:
    _ensure_dirs()
    return _execute_run_control_action(run_id, "rollback", req)


@app.post("/runs/{run_id}/assign-human")
def run_assign_human(run_id: str, req: RunControlRequest) -> dict[str, Any]:
    _ensure_dirs()
    return _execute_run_control_action(run_id, "assign-human", req)


@app.post("/runs/{run_id}/reroute/{mode}")
def run_reroute(run_id: str, mode: str, req: RunControlRequest) -> dict[str, Any]:
    _ensure_dirs()
    requested_mode = mode.strip().lower()
    if requested_mode not in {"auto", "local", "remote"}:
        raise HTTPException(status_code=422, detail="mode must be one of: auto, local, remote")
    normalized_run_id = run_id.strip()
    run_override = _set_run_routing_override(
        run_id=normalized_run_id,
        mode=requested_mode,
        source=req.source,
        reason=req.reason,
    )
    routing_req = RoutingOverrideRequest(
        mode=requested_mode,
        run_id=normalized_run_id,
        source=req.source,
        reason=req.reason,
        session_id=req.session_id,
        trace_id=req.trace_id,
        span_id=req.span_id,
        task_id=req.task_id,
        step_id=req.step_id,
        agent_id=req.agent_id,
        role=req.role,
        runtime_target=req.runtime_target,
    )
    event = _emit_control_event(
        action="run-routing-override",
        state="Done",
        reason=run_override.get("reason", "") or f"run override -> {requested_mode}",
        next_action="Retry blocked step or continue run.",
        payload=routing_req,
        run_id=normalized_run_id,
        extra={"mode": requested_mode, "scope": "run"},
    )
    with CONTROL_CENTER_CACHE_LOCK:
        CONTROL_CENTER_CACHE["expires_at"] = 0.0
        CONTROL_CENTER_CACHE["payload"] = None
    return {
        "status": "ok",
        "run_id": normalized_run_id,
        "scope": "run",
        "mode": requested_mode,
        "reason": run_override.get("reason", ""),
        "next_action": "Retry blocked step or continue run.",
        "event": event,
        "override": run_override,
        "global_override": dict(ROUTING_OVERRIDE_STATE),
    }


def _resolve_quarantine_artifact(run_record: dict[str, Any], requested_artifact: str) -> str:
    requested = requested_artifact.strip()
    if requested:
        return requested
    steps = run_record.get("steps", [])
    if isinstance(steps, list):
        for item in reversed(steps):
            if not isinstance(item, dict):
                continue
            for key in ("final_code_artifact", "dispatch_artifact", "final_code_url"):
                candidate = str(item.get(key, "")).strip()
                if candidate:
                    return candidate
    for key in ("evidence_manifest", "snapshot", "run_file"):
        candidate = str(run_record.get(key, "")).strip()
        if candidate:
            return candidate
    return ""


@app.post("/runs/{run_id}/quarantine")
def run_quarantine(run_id: str, req: RunQuarantineRequest) -> dict[str, Any]:
    _ensure_dirs()
    run_record = _load_run_file(run_id)
    artifact = _resolve_quarantine_artifact(run_record, req.artifact)
    if not artifact:
        raise HTTPException(status_code=422, detail="No artifact available to quarantine for this run.")
    quarantine_req = QuarantineArtifactRequest(
        artifact=artifact,
        run_id=run_id.strip(),
        source=req.source,
        reason=req.reason,
        session_id=req.session_id,
        trace_id=req.trace_id,
        span_id=req.span_id,
        task_id=req.task_id,
        step_id=req.step_id,
        agent_id=req.agent_id,
        role=req.role,
        runtime_target=req.runtime_target,
    )
    response = evidence_quarantine(quarantine_req)
    return {
        "status": "ok",
        "run_id": run_id,
        "artifact": artifact,
        "reason": quarantine_req.reason.strip() or "Artifact quarantined by operator.",
        "next_action": "Inspect quarantine record and rerun verifiers.",
        "event": response.get("event", {}),
        "quarantine_record": response.get("quarantine_record", ""),
        "quarantine_copy": response.get("quarantine_copy", ""),
    }


@app.post("/routing/override")
def routing_override(req: RoutingOverrideRequest) -> dict[str, Any]:
    _ensure_dirs()
    requested_mode = req.mode.strip().lower()
    if requested_mode not in {"auto", "local", "remote"}:
        raise HTTPException(status_code=422, detail="mode must be one of: auto, local, remote")
    _cleanup_run_routing_overrides()
    ROUTING_OVERRIDE_STATE["mode"] = requested_mode
    ROUTING_OVERRIDE_STATE["source"] = req.source.strip()
    ROUTING_OVERRIDE_STATE["reason"] = req.reason.strip() or f"operator override -> {requested_mode}"
    ROUTING_OVERRIDE_STATE["updated_at"] = _now_iso()
    with CONTROL_CENTER_CACHE_LOCK:
        CONTROL_CENTER_CACHE["expires_at"] = 0.0
        CONTROL_CENTER_CACHE["payload"] = None
    event = _emit_control_event(
        action="routing-override",
        state="Done",
        reason=ROUTING_OVERRIDE_STATE["reason"],
        next_action="Retry blocked step or continue run.",
        payload=req,
        run_id=req.run_id.strip(),
        extra={"mode": requested_mode},
    )
    return {
        "status": "ok",
        "scope": "global",
        "override": dict(ROUTING_OVERRIDE_STATE),
        "run_overrides": _run_routing_overrides_snapshot(),
        "event": event,
    }


@app.post("/routing/set")
def routing_set_alias(req: RoutingOverrideRequest) -> dict[str, Any]:
    return routing_override(req)


@app.post("/evidence/quarantine")
def evidence_quarantine(req: QuarantineArtifactRequest) -> dict[str, Any]:
    _ensure_dirs()
    quarantine_dir = EVIDENCE_DIR / "quarantine"
    quarantine_dir.mkdir(parents=True, exist_ok=True)
    descriptor = _artifact_descriptor(req.artifact)
    moved_path = ""
    if descriptor.get("kind") == "file" and descriptor.get("present", False):
        source_path = Path(str(descriptor.get("path", "")))
        target_name = f"{_now_iso().replace(':', '-').replace('.', '-')}_{source_path.name}"
        target_path = quarantine_dir / target_name
        shutil.copy2(source_path, target_path)
        moved_path = str(target_path)
    record = {
        "timestamp": _now_iso(),
        "run_id": req.run_id.strip(),
        "artifact": req.artifact.strip(),
        "descriptor": descriptor,
        "quarantine_copy": moved_path,
        "source": req.source.strip(),
        "reason": req.reason.strip() or "Artifact quarantined by operator.",
    }
    record_path = quarantine_dir / f"quarantine_{record['timestamp'].replace(':', '-').replace('.', '-')}.json"
    _write_json(record_path, record)
    _write_json(quarantine_dir / "latest.json", record)
    event = _emit_control_event(
        action="quarantine-artifact",
        state="Done",
        reason=record["reason"],
        next_action="Inspect quarantine record and rerun verifier.",
        payload=req,
        run_id=req.run_id.strip(),
        extra={"record": str(record_path), "copied_artifact": moved_path},
    )
    return {
        "status": "ok",
        "run_id": req.run_id.strip(),
        "artifact": req.artifact.strip(),
        "quarantine_record": str(record_path),
        "quarantine_copy": moved_path,
        "event": event,
    }


@app.post("/artifacts/quarantine")
def artifacts_quarantine_alias(req: QuarantineArtifactRequest) -> dict[str, Any]:
    return evidence_quarantine(req)


def _manifest_file_response(filename: str) -> FileResponse:
    _ensure_dirs()
    safe_name = Path(filename).name
    candidate = (RUN_MANIFEST_DIR / safe_name).resolve()
    allowed_root = RUN_MANIFEST_DIR.resolve()
    if allowed_root not in candidate.parents or not candidate.exists() or candidate.suffix.lower() != ".json":
        raise HTTPException(status_code=404, detail="Not Found")
    return FileResponse(
        candidate,
        media_type="application/json",
    )


@app.get("/workspace/runtime/evidence/manifests/{filename}")
def workspace_manifest_alias(filename: str) -> FileResponse:
    return _manifest_file_response(filename)


@app.get("/evidence/manifests/{filename}")
def evidence_manifest_file(filename: str) -> FileResponse:
    return _manifest_file_response(filename)


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
    virtual_agents = list(
        {
            str(item.get("agent_id", "")).strip(): item
            for item in VIRTUAL_AGENT_LOOKUP.values()
            if isinstance(item, dict) and str(item.get("agent_id", "")).strip()
        }.values()
    )
    contract = _load_platform7_contract()
    contract_validation = _validate_platform7_contract(contract)
    storage_metrics = (
        _storage_metrics_snapshot(force_refresh=False)
        if HEALTH_STORAGE_MODE == "full"
        else _storage_metrics_cached_or_stub()
    )
    maintenance = _runtime_maintenance_snapshot()

    routing_probe_timeout = max(1, min(CONTROL_CENTER_PROBE_TIMEOUT, 3))

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
            "virtual_agents": len(virtual_agents),
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
        "routing_status": _target_health_status(probe_timeout=routing_probe_timeout),
        "bootstrap": {
            "status": _bootstrap_status_snapshot().get("status", "DOWN"),
            "ready": bool(_bootstrap_status_snapshot().get("ready", False)),
            "allow_script_start": BOOTSTRAP_ALLOW_SCRIPT_START,
            "script_configured": bool(BOOTSTRAP_START_SCRIPT),
            "start_script": BOOTSTRAP_START_SCRIPT,
        },
        "runtime_dir": str(RUNTIME_DIR),
        "evidence_dir": str(EVIDENCE_DIR),
        "storage_metrics": storage_metrics,
        "maintenance": maintenance,
        "platform7_contract": {
            "path": str(PLATFORM7_CONTRACT_PATH),
            "version": contract.get("version", "unknown"),
            "validation": contract_validation,
            "tooling_required_count": contract_validation.get("tooling_required_count", 0),
            "tooling_required_ids": contract_validation.get("tooling_required_ids", []),
            "superpowers_required_count": contract_validation.get("superpowers_required_count", 0),
            "superpowers_required_ids": contract_validation.get("superpowers_required_ids", []),
            "full_profile_ok": contract_validation.get("full_profile_ok", False),
        },
        "platform7_progress": _platform7_progress_payload(),
    }


@app.get("/agents")
def agents() -> dict[str, Any]:
    active_agents = [_normalized_agent_record(agent) for agent in AGENT_REGISTRY.get("active_agents", [])]
    legacy_agents = [_normalized_agent_record(agent) for agent in AGENT_REGISTRY.get("legacy_agents", [])]
    virtual_agents = list(
        {
            str(item.get("agent_id", "")).strip(): _normalized_agent_record(item)
            for item in VIRTUAL_AGENT_LOOKUP.values()
            if isinstance(item, dict) and str(item.get("agent_id", "")).strip()
        }.values()
    )
    return {
        "status": "ok",
        "registry_path": str(AGENT_REGISTRY_PATH),
        "active_count": len(active_agents),
        "legacy_count": len(legacy_agents),
        "virtual_count": len(virtual_agents),
        "runtime_targets": RUNTIME_TARGETS,
        "active_agents": active_agents,
        "legacy_agents": legacy_agents,
        "virtual_agents": virtual_agents,
        "alias_collisions": AGENT_ALIAS_COLLISIONS,
    }


@app.get("/routing/status")
def routing_status() -> dict[str, Any]:
    checks = _target_health_status()
    mapped = {
        target: {
            **probe,
            "status_class": _http_status_to_status_class(_probe_effective_http_status(probe)),
        }
        for target, probe in checks.items()
    }
    latest_dispatch = _latest_json(DISPATCH_DIR / "latest_dispatch.json")
    return {
        "status": "ok",
        "targets": mapped,
        "override": dict(ROUTING_OVERRIDE_STATE),
        "run_overrides": _run_routing_overrides_snapshot(),
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
        "storage_metrics": _storage_metrics_cached_or_stub(),
        "maintenance": _runtime_maintenance_snapshot(),
        "metrics": METRICS,
    }


@app.get("/storage/metrics")
def storage_metrics(fresh: bool = Query(default=False)) -> dict[str, Any]:
    return _storage_metrics_snapshot(force_refresh=bool(fresh))


@app.get("/autonomy/profiles")
def autonomy_profiles() -> dict[str, Any]:
    return {
        "status": "ok",
        "profiles": _list_autonomy_profiles(),
        "count": len(AUTONOMY_PROFILES),
    }


@app.get("/platform7/contract")
def platform7_contract() -> dict[str, Any]:
    contract = _load_platform7_contract()
    validation = _validate_platform7_contract(contract)
    return {
        "status": "ok" if validation.get("ok", False) else "blocked",
        "contract": contract,
        "validation": validation,
        "source": str(PLATFORM7_CONTRACT_PATH),
    }


@app.get("/platform7/progress")
def platform7_progress() -> dict[str, Any]:
    return _platform7_progress_payload()


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
    run_id = str(DISPATCH_RUN_CONTEXT.get("")).strip()
    normalized_payload, agent_entry = _canonicalize_payload(payload)
    routing_mode = _routing_mode_for_run(run_id)
    requested_target = str(agent_entry.get("runtime_target", "")).strip()
    runtime_target = _effective_runtime_target(requested_target, run_id=run_id)
    if requested_target not in RUNTIME_TARGETS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid runtime_target '{requested_target}' for agent "
                f"{normalized_payload.agent}. Allowed: {', '.join(RUNTIME_TARGETS)}"
            ),
        )
    if runtime_target not in RUNTIME_TARGETS:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Routing override resolved unsupported runtime_target '{runtime_target}' "
                f"for agent {normalized_payload.agent}."
            ),
        )

    if str(agent_entry.get("kind", "")).strip().lower() == "supervisor":
        result = {
            "target": runtime_target,
            "status": "forwarded",
            "reason": "Supervisor gate validated current step and emitted live oversight evidence.",
            "supervisor_gate": True,
            "http_status": 200,
        }
        policy_blocked = False
    else:
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
            if str(result.get("status", "")).strip().lower() != "forwarded":
                recovered = _attempt_runtime_recovery(
                    runtime_target,
                    normalized_payload,
                    result,
                    routing_mode=routing_mode,
                )
                if recovered is not result:
                    result = recovered

    overall = result.get("status", "forward-failed")
    executed_runtime_target = str(result.get("target", runtime_target)).strip() or runtime_target
    METRICS["dispatch_total"] += 1
    METRICS["target_counts"][executed_runtime_target] = METRICS["target_counts"].get(executed_runtime_target, 0) + 1
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
        "run_id": run_id,
        "agent_status_class": agent_entry.get("status_class", "UNKNOWN"),
        "routing_override_mode": routing_mode,
        "requested_runtime_target": requested_target,
        "runtime_target": runtime_target,
        "executed_runtime_target": executed_runtime_target,
        "routing_decision": {
            "mode": routing_mode,
            "requested_target": requested_target,
            "effective_target": runtime_target,
            "executed_target": executed_runtime_target,
            "scope": "run" if run_id else "global",
            "run_id": run_id,
            "recovery_used": bool(result.get("recovery_used")),
            "recovery_from": str(result.get("recovery_from", "")).strip(),
            "recovery_target": str(result.get("recovery_target", "")).strip(),
        },
        "contract": {
            "status": "pass",
            "fields": list(normalized_payload.model_dump().keys()),
        },
        "zero_compute_policy": {
            "enabled": ZERO_COMPUTE_POLICY,
            "task_detected_heavy": _is_heavy_3d_task(normalized_payload.task),
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
        "run_id": run_id,
        "routing_mode": routing_mode,
        "requested_runtime_target": requested_target,
        "runtime_target": runtime_target,
        "executed_runtime_target": executed_runtime_target,
        "recovery_used": bool(result.get("recovery_used")),
        "recovery_from": str(result.get("recovery_from", "")).strip(),
        "recovery_target": str(result.get("recovery_target", "")).strip(),
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
        "run_manifest_latest": RUN_MANIFEST_DIR / "latest.json",
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
