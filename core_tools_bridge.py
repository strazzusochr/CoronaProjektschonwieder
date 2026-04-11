from __future__ import annotations

import json
import os
import subprocess
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = Path(
    os.environ.get("DEVTOOLS_FRONTEND_DIR", str(REPO_ROOT / "CoronaProjektschonwieder"))
).resolve()
TEST_RESULTS_DIR = FRONTEND_DIR / "test-results"

BRIDGE_HOST = os.environ.get("DEVTOOLS_BRIDGE_HOST", "0.0.0.0")
BRIDGE_PORT = int(os.environ.get("DEVTOOLS_BRIDGE_PORT", "3911"))
COMMAND_TIMEOUT = int(os.environ.get("DEVTOOLS_BRIDGE_COMMAND_TIMEOUT", "900"))
STARTED_EPOCH = time.time()
METRICS: dict[str, Any] = {
    "requests_total": 0,
    "run_playwright_total": 0,
    "run_devtools_total": 0,
    "snapshot_devtools_total": 0,
    "ok_total": 0,
    "failed_total": 0,
    "timeout_total": 0,
}


def _latest_snapshot() -> Path | None:
    if not TEST_RESULTS_DIR.exists():
        return None
    snapshots = sorted(TEST_RESULTS_DIR.glob("*.png"), key=lambda path: path.stat().st_mtime)
    return snapshots[-1] if snapshots else None


def _run_command(command: list[str], cwd: Path) -> dict[str, Any]:
    normalized_command = command.copy()
    if os.name == "nt" and normalized_command and normalized_command[0].lower() == "npm":
        normalized_command[0] = "npm.cmd"

    started = time.time()
    try:
        result = subprocess.run(
            normalized_command,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=COMMAND_TIMEOUT,
            check=False,
        )
    except FileNotFoundError as exc:
        return {
            "status": "failed",
            "command": normalized_command,
            "cwd": str(cwd),
            "duration_seconds": round(time.time() - started, 2),
            "exit_code": None,
            "stdout_tail": "",
            "stderr_tail": str(exc),
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "command": normalized_command,
            "cwd": str(cwd),
            "duration_seconds": round(time.time() - started, 2),
            "exit_code": None,
            "stdout_tail": "",
            "stderr_tail": f"Command timed out after {COMMAND_TIMEOUT}s",
        }

    stdout = (result.stdout or "").strip()
    stderr = (result.stderr or "").strip()
    return {
        "status": "ok" if result.returncode == 0 else "failed",
        "command": normalized_command,
        "cwd": str(cwd),
        "duration_seconds": round(time.time() - started, 2),
        "exit_code": result.returncode,
        "stdout_tail": "\n".join(stdout.splitlines()[-40:]),
        "stderr_tail": "\n".join(stderr.splitlines()[-40:]),
    }


def _json_or_empty(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return {}
    raw = handler.rfile.read(length)
    if not raw:
        return {}
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {}


class DevtoolsBridgeHandler(BaseHTTPRequestHandler):
    server_version = "GODMODEDevtoolsBridge/1.0"

    def _send(self, status_code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/metrics":
            self._send(
                200,
                {
                    "status": "ok",
                    "service": "core-tools-bridge",
                    "uptime_seconds": round(time.time() - STARTED_EPOCH, 2),
                    "metrics": METRICS,
                },
            )
            return

        if self.path != "/health":
            self._send(404, {"status": "not-found", "path": self.path})
            return

        self._send(
            200,
            {
                "status": "healthy",
                "service": "core-tools-bridge",
                "frontend_dir": str(FRONTEND_DIR),
                "frontend_exists": FRONTEND_DIR.exists(),
                "test_results_dir": str(TEST_RESULTS_DIR),
                "latest_snapshot": str(_latest_snapshot()) if _latest_snapshot() else "",
                "command_timeout_seconds": COMMAND_TIMEOUT,
            },
        )

    def do_POST(self) -> None:  # noqa: N802
        payload = _json_or_empty(self)

        if self.path == "/run_playwright":
            METRICS["requests_total"] += 1
            METRICS["run_playwright_total"] += 1
            command = payload.get("command") or ["npm", "run", "test:browser"]
            result = _run_command(command, FRONTEND_DIR)
            if result["status"] == "ok":
                METRICS["ok_total"] += 1
            elif result["status"] == "timeout":
                METRICS["timeout_total"] += 1
            else:
                METRICS["failed_total"] += 1
            snapshot = _latest_snapshot()
            self._send(
                200 if result["status"] == "ok" else 500,
                {
                    "status": result["status"],
                    "step": "run_playwright",
                    "result": result,
                    "latest_snapshot": str(snapshot) if snapshot else "",
                },
            )
            return

        if self.path == "/run_devtools":
            METRICS["requests_total"] += 1
            METRICS["run_devtools_total"] += 1
            include_unit_tests = bool(payload.get("include_unit_tests", False))
            steps: list[dict[str, Any]] = []
            steps.append(_run_command(["npm", "run", "build"], FRONTEND_DIR))
            if include_unit_tests:
                steps.append(_run_command(["npm", "test"], FRONTEND_DIR))
            steps.append(_run_command(["npm", "run", "test:browser"], FRONTEND_DIR))
            failed = any(step["status"] != "ok" for step in steps)
            if failed:
                if any(step["status"] == "timeout" for step in steps):
                    METRICS["timeout_total"] += 1
                else:
                    METRICS["failed_total"] += 1
            else:
                METRICS["ok_total"] += 1
            snapshot = _latest_snapshot()
            self._send(
                200 if not failed else 500,
                {
                    "status": "ok" if not failed else "failed",
                    "step": "run_devtools",
                    "steps": steps,
                    "latest_snapshot": str(snapshot) if snapshot else "",
                },
            )
            return

        if self.path == "/snapshot_devtools":
            METRICS["requests_total"] += 1
            METRICS["snapshot_devtools_total"] += 1
            force_run = bool(payload.get("force_run", False))
            snapshot = _latest_snapshot()
            run_result: dict[str, Any] | None = None

            if force_run or snapshot is None:
                run_result = _run_command(["npm", "run", "test:browser"], FRONTEND_DIR)
                snapshot = _latest_snapshot()
                if run_result["status"] == "ok":
                    METRICS["ok_total"] += 1
                elif run_result["status"] == "timeout":
                    METRICS["timeout_total"] += 1
                else:
                    METRICS["failed_total"] += 1

            exists = snapshot is not None and snapshot.exists()
            self._send(
                200 if exists else 500,
                {
                    "status": "ok" if exists else "missing",
                    "step": "snapshot_devtools",
                    "snapshot_path": str(snapshot) if snapshot else "",
                    "snapshot_exists": exists,
                    "triggered_run": run_result is not None,
                    "run_result": run_result,
                },
            )
            return

        self._send(404, {"status": "not-found", "path": self.path})

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return


def main() -> None:
    server = ThreadingHTTPServer((BRIDGE_HOST, BRIDGE_PORT), DevtoolsBridgeHandler)
    print(
        json.dumps(
            {
                "status": "starting",
                "service": "core-tools-bridge",
                "host": BRIDGE_HOST,
                "port": BRIDGE_PORT,
                "frontend_dir": str(FRONTEND_DIR),
            },
            ensure_ascii=True,
        ),
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
