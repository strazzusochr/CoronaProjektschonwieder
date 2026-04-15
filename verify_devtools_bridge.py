from __future__ import annotations

import json
import os
import socket
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

REPO_ROOT = Path("d:/Web/docs/godmode_setup")
EVIDENCE_DIR = REPO_ROOT / ".godmode_runtime" / "evidence"
FRONTEND_DIR = REPO_ROOT / "CoronaProjektschonwieder"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_evidence_dir() -> Path:
    candidates = [
        EVIDENCE_DIR,
        REPO_ROOT / "proofs",
    ]
    for candidate in candidates:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            probe = candidate / ".write_test"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
            return candidate
        except Exception:
            continue
    return REPO_ROOT / "proofs"


def _parse_json(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {"data": data}
    except json.JSONDecodeError:
        return {"raw": raw[:4000]}


def get_json(url: str, timeout: int) -> tuple[int, dict[str, Any]]:
    req = request.Request(url=url, method="GET")
    try:
        with request.urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return int(response.status), _parse_json(body)
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return int(exc.code), _parse_json(body)
    except Exception as exc:
        return 0, {"error": str(exc)}


def post_json(url: str, payload: dict[str, Any], timeout: int) -> tuple[int, dict[str, Any]]:
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
            return int(response.status), _parse_json(raw)
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return int(exc.code), _parse_json(raw)
    except Exception as exc:
        return 0, {"error": str(exc)}


def wait_for_port(host: str, port: int, timeout_seconds: int = 25) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=2):
                return True
        except OSError:
            time.sleep(0.5)
    return False


def _npm_executable() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def start_preview_server(port: int) -> tuple[subprocess.Popen[str] | None, str]:
    npm = _npm_executable()
    command = [npm, "run", "preview", "--", "--host", "127.0.0.1", "--port", str(port)]
    try:
        process = subprocess.Popen(
            command,
            cwd=str(FRONTEND_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except Exception as exc:
        return None, str(exc)
    if wait_for_port("127.0.0.1", port, timeout_seconds=30):
        return process, ""
    try:
        process.terminate()
    except Exception:
        pass
    return None, f"Preview server did not bind to port {port} in time."


def stop_process(process: subprocess.Popen[str] | None) -> None:
    if process is None:
        return
    if process.poll() is not None:
        return
    try:
        process.terminate()
        process.wait(timeout=8)
    except Exception:
        try:
            process.kill()
        except Exception:
            pass


def is_direct_call_pass(step: dict[str, Any]) -> bool:
    if step.get("http_status") != 200:
        return False
    body = step.get("body", {})
    status = str(body.get("status", "")).lower()
    return status in {"ok", "forwarded"}


def is_adapter_call_pass(step: dict[str, Any]) -> bool:
    if step.get("http_status") != 200:
        return False
    body = step.get("body", {})
    if str(body.get("status", "")).lower() != "forwarded":
        return False
    data = body.get("data", {})
    if not isinstance(data, dict):
        return False
    inner_status = str(data.get("status", "")).lower()
    return inner_status in {"ok", "forwarded"}


def main() -> int:
    base_bridge = os.environ.get("DEVTOOLS_BRIDGE_BASE_URL", "http://127.0.0.1:3911").rstrip("/")
    base_adapter = os.environ.get("OPENHANDS_ADAPTER_BASE_URL", "http://127.0.0.1:3001").rstrip("/")
    timeout = int(os.environ.get("DEVTOOLS_VERIFY_TIMEOUT", "900"))
    evidence_dir = resolve_evidence_dir()
    timestamp = now_iso()

    bridge_health_code, bridge_health = get_json(f"{base_bridge}/health", timeout=20)
    adapter_health_code, adapter_health = get_json(f"{base_adapter}/health", timeout=20)

    preview_error = ""
    run_playwright_direct: dict[str, Any] = {}
    run_playwright_adapter: dict[str, Any] = {}
    # Let Playwright's own webServer/reuseExistingServer handling own port 4173.
    # Starting an extra preview process here races with direct `npm run test:browser`
    # runs and can corrupt Playwright artifacts under parallel verification.
    direct_code, direct_body = post_json(
        f"{base_bridge}/run_playwright",
        {"command": [_npm_executable(), "run", "test:browser"]},
        timeout=timeout,
    )
    run_playwright_direct = {"http_status": direct_code, "body": direct_body}

    adapter_code, adapter_body = post_json(
        f"{base_adapter}/run_playwright",
        {"args": {"command": [_npm_executable(), "run", "test:browser"]}},
        timeout=timeout,
    )
    run_playwright_adapter = {"http_status": adapter_code, "body": adapter_body}

    run_devtools_direct_code, run_devtools_direct_body = post_json(
        f"{base_bridge}/run_devtools",
        {"include_unit_tests": False},
        timeout=timeout,
    )
    run_devtools_direct = {"http_status": run_devtools_direct_code, "body": run_devtools_direct_body}

    run_devtools_adapter_code, run_devtools_adapter_body = post_json(
        f"{base_adapter}/run_devtools",
        {"args": {"include_unit_tests": False}},
        timeout=timeout,
    )
    run_devtools_adapter = {"http_status": run_devtools_adapter_code, "body": run_devtools_adapter_body}

    snapshot_direct_code, snapshot_direct_body = post_json(
        f"{base_bridge}/snapshot_devtools",
        {"force_run": False},
        timeout=120,
    )
    snapshot_direct = {"http_status": snapshot_direct_code, "body": snapshot_direct_body}

    snapshot_adapter_code, snapshot_adapter_body = post_json(
        f"{base_adapter}/snapshot_devtools",
        {"args": {"force_run": False}},
        timeout=120,
    )
    snapshot_adapter = {"http_status": snapshot_adapter_code, "body": snapshot_adapter_body}

    checks = {
        "bridge_health_200": bridge_health_code == 200,
        "adapter_health_200": adapter_health_code == 200,
        "run_playwright_direct_pass": is_direct_call_pass(run_playwright_direct),
        "run_playwright_adapter_pass": is_adapter_call_pass(run_playwright_adapter),
        "run_devtools_direct_pass": is_direct_call_pass(run_devtools_direct),
        "run_devtools_adapter_pass": is_adapter_call_pass(run_devtools_adapter),
        "snapshot_direct_pass": is_direct_call_pass(snapshot_direct),
        "snapshot_adapter_pass": is_adapter_call_pass(snapshot_adapter),
        "port_4173_reuse_scenario_ready": preview_error == "",
    }
    gate_status = "PASS" if all(checks.values()) else "PARTIAL"

    report = {
        "timestamp": timestamp,
        "bridge_base_url": base_bridge,
        "adapter_base_url": base_adapter,
        "preview_port_reuse": {
            "port": 4173,
            "ready": preview_error == "",
            "error": preview_error,
        },
        "health": {
            "bridge": {"http_status": bridge_health_code, "body": bridge_health},
            "adapter": {"http_status": adapter_health_code, "body": adapter_health},
        },
        "calls": {
            "run_playwright_direct": run_playwright_direct,
            "run_playwright_adapter": run_playwright_adapter,
            "run_devtools_direct": run_devtools_direct,
            "run_devtools_adapter": run_devtools_adapter,
            "snapshot_direct": snapshot_direct,
            "snapshot_adapter": snapshot_adapter,
        },
        "gate": {
            "status": gate_status,
            "checks": checks,
        },
    }

    stamp = timestamp.replace(":", "-").replace(".", "-")
    out_file = evidence_dir / f"devtools_bridge_{stamp}.json"
    latest_file = evidence_dir / "devtools_bridge_latest.json"
    out_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")
    latest_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "status": "ok",
                "snapshot": str(out_file),
                "gate_status": gate_status,
                "checks_passed": sum(1 for ok in checks.values() if ok),
                "checks_total": len(checks),
            },
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
