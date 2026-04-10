from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field

app = FastAPI(title="GODMODE bolt.diy Hybrid Facade")

REPO_ROOT = Path(__file__).resolve().parent.parent
RUNTIME_DIR = Path(
    os.environ.get(
        "BOLTDIY_RUNTIME_DIR",
        str(REPO_ROOT / ".godmode_runtime" / "bolt_facade"),
    )
).resolve()
DISPATCH_DIR = RUNTIME_DIR / "dispatch"
PROOF_DIR = RUNTIME_DIR / "proof"

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
N8N_WEBHOOK_URL = os.environ.get("N8N_WEBHOOK_URL", "").strip()
OPENHANDS_ADAPTER_URL = os.environ.get("OPENHANDS_ADAPTER_URL", "").strip()


class MissionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent: str
    task: str
    source: str
    repo: str
    ref: str
    status: str
    timestamp: str


class ProofPayload(BaseModel):
    scenario: str = Field(default="bolt-facade-proof")
    result: str
    commit_sha: str | None = None
    screenshot_path: str | None = None
    notes: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_dirs() -> None:
    DISPATCH_DIR.mkdir(parents=True, exist_ok=True)
    PROOF_DIR.mkdir(parents=True, exist_ok=True)


def _append_line(path: Path, line: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(line.rstrip() + "\n")


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(payload, handle, ensure_ascii=True, indent=2)


def _post_json(url: str, payload: dict[str, Any], timeout: int) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    req = request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
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


def _probe_url(url: str, timeout: int) -> dict[str, Any]:
    req = request.Request(url=url, method="GET")
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


def _dispatch_external_bolt(payload: MissionPayload) -> dict[str, Any]:
    if BOLTDIY_MODE != "hybrid":
        return {
            "target": "bolt-external",
            "status": "skipped",
            "reason": f"BOLTDIY_MODE={BOLTDIY_MODE}",
        }

    if not BOLTDIY_SPACE_URL:
        return {
            "target": "bolt-external",
            "status": "blocked",
            "reason": "BOLTDIY_SPACE_URL is empty",
        }

    candidates = _space_candidates(BOLTDIY_SPACE_URL)
    api_base = candidates["api"].rstrip("/")
    attempts: list[dict[str, Any]] = []

    if api_base:
        attempts.append(_post_json(f"{api_base}/dispatch", payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT))
        if attempts[-1]["status"] != "forwarded":
            attempts.append(_post_json(f"{api_base}/trigger", payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT))

    if any(item["status"] == "forwarded" for item in attempts):
        forwarded = [item for item in attempts if item["status"] == "forwarded"][0]
        return {
            "target": "bolt-external",
            "status": "forwarded",
            "attempts": attempts,
            "active_url": forwarded["url"],
        }

    probe_url = candidates["web"] or candidates["api"]
    probe = _probe_url(probe_url, BOLTDIY_FORWARD_TIMEOUT) if probe_url else {
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

    response = _post_json(N8N_WEBHOOK_URL, payload.model_dump(), BOLTDIY_FORWARD_TIMEOUT)
    response["target"] = "n8n"
    return response


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


@app.get("/")
def root() -> dict[str, Any]:
    return {"status": "online", "service": "bolt-facade"}


@app.get("/health")
def health() -> dict[str, Any]:
    _ensure_dirs()
    candidates = _space_candidates(BOLTDIY_SPACE_URL)
    external_probe = {
        "status": "disabled",
        "probe": {},
    }
    if BOLTDIY_MODE == "hybrid" and BOLTDIY_SPACE_URL:
        probe_target = candidates["web"] or candidates["api"]
        external_probe = {
            "status": "probed",
            "probe": _probe_url(probe_target, BOLTDIY_FORWARD_TIMEOUT) if probe_target else {},
        }

    return {
        "status": "healthy",
        "service": "bolt-facade",
        "mode": BOLTDIY_MODE,
        "dispatch_order": ["bolt-facade", "n8n", "openhands-adapter"],
        "targets": {
            "bolt_space_url": BOLTDIY_SPACE_URL or "",
            "n8n_webhook_url": N8N_WEBHOOK_URL or "",
            "openhands_adapter_url": OPENHANDS_ADAPTER_URL or "",
        },
        "external_bolt_probe": external_probe,
        "runtime_dir": str(RUNTIME_DIR),
    }


@app.post("/dispatch")
def dispatch(payload: MissionPayload) -> dict[str, Any]:
    _ensure_dirs()
    call_id = str(uuid.uuid4())
    started_at = _now_iso()

    results = [
        _dispatch_external_bolt(payload),
        _dispatch_n8n(payload),
        _dispatch_openhands(payload),
    ]

    forwarded = [entry for entry in results if entry.get("status") == "forwarded"]
    blocked = [entry for entry in results if entry.get("status") == "blocked"]

    overall = "forwarded" if forwarded else "blocked" if blocked else "forward-failed"
    fallback_persisted = results[0].get("status") != "forwarded"

    record = {
        "call_id": call_id,
        "started_at": started_at,
        "mode": BOLTDIY_MODE,
        "overall_status": overall,
        "fallback_persisted": fallback_persisted,
        "payload": payload.model_dump(),
        "results": results,
    }

    dispatch_file = DISPATCH_DIR / f"{started_at.replace(':', '-').replace('.', '-')}_{call_id}.json"
    latest_file = DISPATCH_DIR / "latest_dispatch.json"
    _write_json(dispatch_file, record)
    _write_json(latest_file, record)

    _append_line(
        MEMORY_VAULT_PATH,
        (
            f"- {started_at} BOLT_DISPATCH: status={overall} source={payload.source} "
            f"repo={payload.repo} call_id={call_id}"
        ),
    )
    _append_line(
        GODMODE_GOAL_PATH,
        f"BOLT_DISPATCH {started_at} status={overall} call_id={call_id}",
    )

    return {
        "status": overall,
        "call_id": call_id,
        "fallback_persisted": fallback_persisted,
        "dispatch_artifact": str(dispatch_file),
        "results": results,
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
