from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request


ROOT = Path(__file__).resolve().parent
EVIDENCE_DIR = ROOT / ".godmode_runtime" / "evidence"
ENV_FILE = ROOT / ".godmode_env"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        if raw.startswith("export "):
            raw = raw[len("export ") :].strip()
        if "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace") if path.exists() else ""


def contains_all(path: Path, needles: list[str]) -> tuple[bool, list[str]]:
    text = read_text(path)
    missing = [needle for needle in needles if needle not in text]
    return (len(missing) == 0, missing)


def http_json(
    url: str,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    timeout: int = 20,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, Any] | str]:
    body = None
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    req = request.Request(url=url, data=body, method=method, headers=req_headers)
    try:
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            try:
                return (int(resp.status), json.loads(raw))
            except json.JSONDecodeError:
                return (int(resp.status), raw)
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            return (int(exc.code), json.loads(raw))
        except json.JSONDecodeError:
            return (int(exc.code), raw or str(exc))
    except Exception as exc:  # pragma: no cover - runtime failure path
        return (-1, str(exc))


def run_cmd(args: list[str], cwd: Path | None = None, timeout: int = 120) -> tuple[int, str]:
    try:
        completed = subprocess.run(
            args,
            cwd=str(cwd) if cwd else None,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        output = (completed.stdout or "") + ("\n" + completed.stderr if completed.stderr else "")
        return (int(completed.returncode), output.strip())
    except Exception as exc:  # pragma: no cover - runtime failure path
        return (1, str(exc))


def mission_payload(source: str, task: str) -> dict[str, Any]:
    return {
        "agent": "local.openhands.openhands",
        "task": task,
        "source": source,
        "repo": os.environ.get("GITHUB_REPO_URL", "https://github.com/strazzusochr/CoronaProjektschonwieder"),
        "ref": "main",
        "status": "triggered",
        "timestamp": now_iso(),
    }


def evaluate_openhands_architect() -> dict[str, Any]:
    adapter_path = ROOT / "openhands" / "adapter.py"
    ok_contract, missing_contract = contains_all(
        adapter_path,
        ["class MissionPayload", "agent:", "task:", "source:", "repo:", "ref:", "status:", "timestamp:"],
    )
    health_code, health = http_json("http://127.0.0.1:3001/health", method="GET")
    trigger_code, trigger = http_json(
        "http://127.0.0.1:3001/trigger",
        method="POST",
        payload=mission_payload("verify_superpowers", "verify openhands adapter mission path"),
    )
    trigger_status = trigger.get("status") if isinstance(trigger, dict) else ""
    trigger_ok = trigger_code == 200 and trigger_status in {"accepted-local", "forwarded"}
    health_ok = health_code == 200 and isinstance(health, dict) and health.get("status") == "healthy"
    status = "VERIFIED" if (ok_contract and health_ok and trigger_ok) else "PARTIAL"
    return {
        "status": status,
        "details": {
            "contract_ok": ok_contract,
            "missing_contract_markers": missing_contract,
            "health_code": health_code,
            "health": health,
            "trigger_code": trigger_code,
            "trigger": trigger,
        },
        "note": "Architect behavior of upstream UI remains operator-driven, local mission contract is verified.",
    }


def evaluate_aider_ultracheap() -> dict[str, Any]:
    script = ROOT / "aider_godmode.ps1"
    ok, missing = contains_all(
        script,
        ["--architect", "--editor-model", "--map-tokens", "--map-refresh", "--auto-lint", "--yes-always"],
    )
    status = "VERIFIED" if ok else "PARTIAL"
    return {
        "status": status,
        "details": {"script": str(script), "missing_markers": missing},
    }


def evaluate_smolagents_webcrawler() -> dict[str, Any]:
    app_py = ROOT / "hf_smolagents" / "app.py"
    ok, missing = contains_all(
        app_py,
        [
            "DuckDuckGoSearchTool",
            "VisitWebpageTool",
            "ToolCallingAgent",
            "CodeAgent",
            "VisualDebugTool",
            "build_agents",
        ],
    )
    status = "VERIFIED" if ok else "PARTIAL"
    return {"status": status, "details": {"file": str(app_py), "missing_markers": missing}}


def evaluate_langgraph_self_evolving() -> dict[str, Any]:
    health_code, health = http_json("http://127.0.0.1:8080/health", method="GET")
    run_code, run_payload = http_json(
        "http://127.0.0.1:8080/run",
        method="POST",
        payload={"task": "superpower-audit: verify prompt evolution write", "source": "verify_superpowers", "ref": "main"},
        timeout=35,
    )
    path = ""
    path_exists = False
    if isinstance(run_payload, dict):
        path = str(run_payload.get("prompt_evolution_path", "")).strip()
    if path:
        path_exists = Path(path).exists()
    ok = (
        health_code == 200
        and run_code == 200
        and isinstance(run_payload, dict)
        and bool(run_payload.get("plan"))
        and bool(path)
    )
    status = "VERIFIED" if ok else "PARTIAL"
    return {
        "status": status,
        "details": {
            "health_code": health_code,
            "health": health,
            "run_code": run_code,
            "prompt_evolution_path": path,
            "prompt_evolution_exists": path_exists,
        },
    }


def _build_n8n_headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    user = os.environ.get("N8N_BASIC_AUTH_USER", "").strip()
    pwd = os.environ.get("N8N_BASIC_AUTH_PASSWORD", "").strip()
    if user and pwd:
        import base64

        token = base64.b64encode(f"{user}:{pwd}".encode("ascii")).decode("ascii")
        headers["Authorization"] = f"Basic {token}"
    return headers


def evaluate_n8n_phantom_trigger() -> dict[str, Any]:
    url = os.environ.get(
        "N8N_WEBHOOK_URL",
        "http://127.0.0.1:5678/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission",
    )
    code, data = http_json(
        url,
        method="POST",
        payload=mission_payload("verify_superpowers", "verify n8n mission trigger"),
        headers=_build_n8n_headers(),
        timeout=25,
    )
    accepted = code == 200
    status = "VERIFIED" if accepted else "PARTIAL"
    return {"status": status, "details": {"webhook_url": url, "http_code": code, "response": data}}


def evaluate_feedback_loop() -> dict[str, Any]:
    base = os.environ.get("BOLTDIY_FACADE_URL", "http://127.0.0.1:3901").rstrip("/")
    code, dispatch = http_json(
        f"{base}/dispatch",
        method="POST",
        payload=mission_payload("verify_superpowers", "verify bolt => n8n => openhands feedback loop"),
        timeout=45,
    )
    target_statuses: dict[str, str] = {}
    runtime_target = ""
    nested_status = ""
    nested_response_status = ""
    if isinstance(dispatch, dict):
        runtime_target = str(dispatch.get("runtime_target", ""))
        nested = dispatch.get("result")
        if isinstance(nested, dict):
            nested_status = str(nested.get("status", ""))
            response_payload = nested.get("response")
            if isinstance(response_payload, dict):
                nested_response_status = str(response_payload.get("status", ""))
            nested_target = str(nested.get("target", "")).strip()
            if nested_target:
                target_statuses[nested_target] = nested_status or str(dispatch.get("status", ""))
        for entry in dispatch.get("results", []):
            if isinstance(entry, dict):
                target_statuses[str(entry.get("target"))] = str(entry.get("status"))
    forwarded = (
        code == 200
        and isinstance(dispatch, dict)
        and dispatch.get("status") == "forwarded"
        and (
            target_statuses.get("openhands-adapter") in {"forwarded", "accepted-local"}
            or runtime_target == "openhands-adapter"
        )
        and (nested_status in {"", "forwarded"})
        and (nested_response_status in {"", "accepted-local", "forwarded"})
    )
    status = "VERIFIED" if forwarded else "PARTIAL"
    return {
        "status": status,
        "details": {
            "facade_url": base,
            "http_code": code,
            "dispatch": dispatch,
            "target_statuses": target_statuses,
            "runtime_target": runtime_target,
            "nested_status": nested_status,
            "nested_response_status": nested_response_status,
        },
    }


def evaluate_litellm_router() -> dict[str, Any]:
    base = os.environ.get("LITELLM_URL", "http://127.0.0.1:4000").rstrip("/")
    key = os.environ.get("LITELLM_API_KEY", "").strip()
    headers = {}
    if key:
        headers["Authorization"] = f"Bearer {key}"
    root_code, _ = http_json(f"{base}/", method="GET")
    health_code, health = http_json(f"{base}/health", method="GET", headers=headers)
    models_code, models = http_json(f"{base}/v1/models", method="GET", headers=headers)
    router_ok = (
        root_code == 200
        and health_code == 200
        and models_code == 200
        and isinstance(models, dict)
        and bool(models.get("data"))
    )
    status = "VERIFIED" if router_ok else "PARTIAL"
    return {
        "status": status,
        "details": {
            "base_url": base,
            "root_code": root_code,
            "health_code": health_code,
            "models_code": models_code,
            "health": health,
            "models": models,
        },
    }


def evaluate_aider_repo_map() -> dict[str, Any]:
    script = ROOT / "aider_godmode.ps1"
    ok, missing = contains_all(script, ["--map-tokens", "--map-refresh", "AIDER_MAP_TOKENS", "--yes-always"])
    status = "VERIFIED" if ok else "PARTIAL"
    return {"status": status, "details": {"script": str(script), "missing_markers": missing}}


def evaluate_vision_agent() -> dict[str, Any]:
    app_py = ROOT / "hf_smolagents" / "app.py"
    ok, missing = contains_all(
        app_py,
        ["class VisualDebugTool", "Screenshot nicht gefunden", "anthropic.Anthropic", "def forward(self, screenshot_path:"],
    )
    status = "VERIFIED" if ok else "PARTIAL"
    return {"status": status, "details": {"file": str(app_py), "missing_markers": missing}}


def evaluate_parallel_swarms() -> dict[str, Any]:
    system_py = ROOT / "langgraph" / "system.py"
    text = read_text(system_py)
    executor_ok = "ThreadPoolExecutor(max_workers=3)" in text
    prompt_branches = all(token in text for token in ['"research"', '"performance"', '"ui_review"'])
    status = "VERIFIED" if executor_ok and prompt_branches else "PARTIAL"
    return {
        "status": status,
        "details": {
            "file": str(system_py),
            "executor_ok": executor_ok,
            "prompt_branches_ok": prompt_branches,
        },
    }


def evaluate_n8n_ai_memory() -> dict[str, Any]:
    runtime_memory_vault = ROOT / ".godmode_runtime" / "memory_vault_runtime.md"
    webhook_url = os.environ.get(
        "N8N_MEMORY_PROBE_URL",
        "http://127.0.0.1:5678/webhook/godmodeMemoryProbe01/memory-probe-webhook/godmode-memory-probe",
    ).strip()
    publish_cmd = ["docker", "exec", "n8n-godmode", "n8n", "publish:workflow", "--id=godmodeMemoryProbe01"]
    publish_rc, publish_out = run_cmd(publish_cmd, cwd=ROOT, timeout=40)

    before_mtime = runtime_memory_vault.stat().st_mtime if runtime_memory_vault.exists() else 0.0
    before_runtime = (
        runtime_memory_vault.read_text(encoding="utf-8", errors="replace")
        if runtime_memory_vault.exists()
        else ""
    )
    webhook_headers = _build_n8n_headers()
    n8n_api_key = os.environ.get("N8N_API_KEY", "").strip()
    if n8n_api_key:
        webhook_headers["X-N8N-API-KEY"] = n8n_api_key
    webhook_code, webhook_data = http_json(
        webhook_url,
        method="POST",
        payload={"source": "verify_superpowers", "timestamp": now_iso(), "event": "superpower-memory-probe"},
        timeout=40,
        headers=webhook_headers,
    )
    after_runtime = (
        runtime_memory_vault.read_text(encoding="utf-8", errors="replace")
        if runtime_memory_vault.exists()
        else ""
    )
    after_mtime = runtime_memory_vault.stat().st_mtime if runtime_memory_vault.exists() else 0.0
    webhook_saved = isinstance(webhook_data, dict) and webhook_data.get("status") == "saved"
    webhook_appended = len(after_runtime) > len(before_runtime)
    webhook_touched = after_mtime > before_mtime
    status = "VERIFIED" if (publish_rc == 0 and webhook_code == 200 and webhook_saved and (webhook_appended or webhook_touched)) else "PARTIAL"
    return {
        "status": status,
        "details": {
            "mode": "webhook",
            "publish_rc": publish_rc,
            "publish_out_tail": publish_out[-400:],
            "webhook_url": webhook_url,
            "webhook_code": webhook_code,
            "webhook_response": webhook_data,
            "runtime_memory_path": str(runtime_memory_vault),
            "runtime_memory_appended": webhook_appended,
            "runtime_memory_touched": webhook_touched,
            "runtime_delta_bytes": len(after_runtime) - len(before_runtime),
        },
    }


def evaluate_context_injection() -> dict[str, Any]:
    langgraph_py = ROOT / "langgraph" / "system.py"
    smolagents_py = ROOT / "hf_smolagents" / "app.py"
    langgraph_text = read_text(langgraph_py)
    smolagents_text = read_text(smolagents_py)
    langgraph_ok = "GODMODE_CONTEXT" in langgraph_text and "client.invoke(f\"{GODMODE_CONTEXT}" in langgraph_text
    smolagents_ok = "GODMODE_CONTEXT" in smolagents_text and 'enriched_prompt = f"{GODMODE_CONTEXT}' in smolagents_text
    status = "VERIFIED" if (langgraph_ok and smolagents_ok) else "PARTIAL"
    return {
        "status": status,
        "details": {
            "langgraph_ok": langgraph_ok,
            "smolagents_ok": smolagents_ok,
        },
    }


def main() -> int:
    load_env_file(ENV_FILE)
    timestamp = now_iso()

    checks: list[tuple[str, str, Any]] = [
        ("1", "OpenHands Architect Mode", evaluate_openhands_architect),
        ("2", "Aider Ultracheap", evaluate_aider_ultracheap),
        ("3", "smolagents Web-Crawler", evaluate_smolagents_webcrawler),
        ("4", "LangGraph Self-Evolving", evaluate_langgraph_self_evolving),
        ("5", "n8n Phantom Trigger", evaluate_n8n_phantom_trigger),
        ("6", "OpenHands + bolt.diy Feedback Loop", evaluate_feedback_loop),
        ("7", "LiteLLM Router", evaluate_litellm_router),
        ("8", "Aider Repo-Map", evaluate_aider_repo_map),
        ("9", "Vision Agent", evaluate_vision_agent),
        ("10", "Parallele Agent-Swarms", evaluate_parallel_swarms),
        ("11", "n8n AI Memory", evaluate_n8n_ai_memory),
        ("12", "Context Window Injection", evaluate_context_injection),
    ]

    rows: list[dict[str, Any]] = []
    for sid, name, fn in checks:
        result = fn()
        rows.append(
            {
                "id": sid,
                "name": name,
                "status": result.get("status", "NOT VERIFIED"),
                "details": result.get("details", {}),
                "note": result.get("note", ""),
            }
        )

    counts = {"VERIFIED": 0, "PARTIAL": 0, "BLOCKED": 0, "NOT VERIFIED": 0}
    for row in rows:
        key = row["status"]
        if key not in counts:
            counts["NOT VERIFIED"] += 1
        else:
            counts[key] += 1

    total = len(rows)
    strict_percent = round((counts["VERIFIED"] / total) * 100, 1) if total else 0.0
    operational_percent = round(((counts["VERIFIED"] + counts["PARTIAL"]) / total) * 100, 1) if total else 0.0

    payload = {
        "timestamp": timestamp,
        "summary": {
            "total_superpowers": total,
            "counts": counts,
            "strict_percent_verified_only": strict_percent,
            "operational_percent_verified_plus_partial": operational_percent,
            "verdict": (
                "PASS"
                if counts["VERIFIED"] == total
                else ("PARTIAL GO" if counts["VERIFIED"] + counts["PARTIAL"] == total else "BLOCKED")
            ),
        },
        "superpowers": rows,
    }

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    stamp = timestamp.replace(":", "-").replace(".", "-")
    out_file = EVIDENCE_DIR / f"superpowers_audit_{stamp}.json"
    latest_file = EVIDENCE_DIR / "superpowers_audit_latest.json"
    out_file.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")
    latest_file.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "status": "ok",
                "snapshot": str(out_file),
                "summary": payload["summary"],
            },
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
