from __future__ import annotations

import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, request

REPO_ROOT = Path("d:/Web/docs/godmode_setup")
FRONTEND_ROOT = REPO_ROOT / "CoronaProjektschonwieder"
HUB_URL = "http://127.0.0.1:3901/dispatch"

PAYLOAD_FILE = REPO_ROOT / "final_build_test_payload.json"
LOG_FILE = REPO_ROOT / "final_build_test_log.txt"
RESULT_FILE = REPO_ROOT / "final_build_test_result.json"
MANIFEST_FILE = REPO_ROOT / "final_build_artifact_manifest.json"
SCREENSHOT_FILE = REPO_ROOT / "final_build_screenshot.png"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def post_json(url: str, payload: dict, timeout: int = 45) -> tuple[int, dict]:
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
            return int(response.status), json.loads(raw) if raw else {}
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw) if raw else {"raw": raw}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return int(exc.code), payload
    except Exception as exc:  # noqa: BLE001
        return 0, {"error": str(exc)}


def run_cmd(cmd: list[str], cwd: Path) -> dict:
    normalized = list(cmd)
    if normalized and normalized[0].lower() == "npm":
        normalized[0] = "npm.cmd"
    proc = subprocess.run(  # noqa: S603
        normalized,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    return {
        "cmd": normalized,
        "returncode": proc.returncode,
        "ok": proc.returncode == 0,
        "stdout_tail": "\n".join(proc.stdout.splitlines()[-120:]),
        "stderr_tail": "\n".join(proc.stderr.splitlines()[-120:]),
    }


def latest_screenshot(test_results_dir: Path) -> Path | None:
    png_files = sorted(
        [path for path in test_results_dir.glob("*.png") if path.is_file()],
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    return png_files[0] if png_files else None


def main() -> int:
    timestamp = now_iso()
    missions = [
        {
            "agent": "local.langgraph.planner",
            "task": "Final build test: plan and sequence release closure checks for build/test/proof.",
            "source": "run_final_build_test.py",
            "repo": "https://github.com/strazzusochr/CoronaProjektschonwieder",
            "ref": "main",
            "status": "triggered",
            "timestamp": timestamp,
        },
        {
            "agent": "local.openhands.openhands",
            "task": "Final build test: execute implementation guidance and verify one-click readiness.",
            "source": "run_final_build_test.py",
            "repo": "https://github.com/strazzusochr/CoronaProjektschonwieder",
            "ref": "main",
            "status": "triggered",
            "timestamp": now_iso(),
        },
        {
            "agent": "external.ollamahf.lead_coder",
            "task": "Final build test: external superbrain coding path validation for the 3d web demo artifact flow.",
            "source": "run_final_build_test.py",
            "repo": "https://github.com/strazzusochr/CoronaProjektschonwieder",
            "ref": "main",
            "status": "triggered",
            "timestamp": now_iso(),
        },
    ]
    PAYLOAD_FILE.write_text(json.dumps({"missions": missions}, indent=2), encoding="utf-8")

    dispatch_results = []
    for mission in missions:
        code, body = post_json(HUB_URL, mission, timeout=60)
        dispatch_results.append(
            {
                "agent": mission["agent"],
                "http_status": code,
                "status": body.get("status", "unknown"),
                "runtime_target": body.get("runtime_target", ""),
                "dispatch_artifact": body.get("dispatch_artifact", ""),
                "reason": body.get("reason") or body.get("result", {}).get("reason", ""),
                "error": body.get("result", {}).get("error", ""),
            }
        )

    build_cmd = run_cmd(["npm", "run", "build"], FRONTEND_ROOT)
    browser_cmd = run_cmd(["npm", "run", "test:browser"], FRONTEND_ROOT)

    screenshot_src = latest_screenshot(FRONTEND_ROOT / "test-results")
    screenshot_exists = screenshot_src is not None and screenshot_src.exists()
    if screenshot_exists:
        shutil.copyfile(screenshot_src, SCREENSHOT_FILE)

    dist_dir = FRONTEND_ROOT / "dist"
    dist_files = sorted(
        [
            str(path.relative_to(REPO_ROOT))
            for path in dist_dir.rglob("*")
            if path.is_file()
        ]
    ) if dist_dir.exists() else []

    manifest = {
        "timestamp": now_iso(),
        "dist_dir": str(dist_dir),
        "dist_file_count": len(dist_files),
        "dist_files_sample": dist_files[:120],
        "screenshot_source": str(screenshot_src) if screenshot_src else "",
        "screenshot_target": str(SCREENSHOT_FILE),
        "screenshot_written": SCREENSHOT_FILE.exists(),
    }
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    log_lines = [
        f"FINAL BUILD TEST @ {timestamp}",
        "",
        "DISPATCH RESULTS:",
        json.dumps(dispatch_results, indent=2, ensure_ascii=True),
        "",
        "BUILD RESULT:",
        json.dumps(build_cmd, indent=2, ensure_ascii=True),
        "",
        "BROWSER RESULT:",
        json.dumps(browser_cmd, indent=2, ensure_ascii=True),
        "",
        "MANIFEST:",
        json.dumps(manifest, indent=2, ensure_ascii=True),
    ]
    LOG_FILE.write_text("\n".join(log_lines), encoding="utf-8")

    dispatch_ok = all(
        item["http_status"] == 200 and item["status"] == "forwarded"
        for item in dispatch_results
    )
    status = "PASS" if all(
        [
            dispatch_ok,
            build_cmd["ok"],
            browser_cmd["ok"],
            screenshot_exists,
            SCREENSHOT_FILE.exists(),
            len(dist_files) > 0,
        ]
    ) else "FAIL"

    blockers: list[str] = []
    if not dispatch_ok:
        blockers.append("Dispatch did not forward for all selected agents.")
    if not build_cmd["ok"]:
        blockers.append("npm run build failed.")
    if not browser_cmd["ok"]:
        blockers.append("npm run test:browser failed.")
    if not screenshot_exists:
        blockers.append("No Playwright screenshot produced.")
    if not SCREENSHOT_FILE.exists():
        blockers.append("final_build_screenshot.png was not written.")
    if len(dist_files) == 0:
        blockers.append("No build artifacts in frontend dist directory.")

    result = {
        "timestamp": now_iso(),
        "status": status,
        "dispatch_ok": dispatch_ok,
        "build_ok": build_cmd["ok"],
        "browser_ok": browser_cmd["ok"],
        "screenshot_ok": SCREENSHOT_FILE.exists(),
        "dist_ok": len(dist_files) > 0,
        "artifacts": {
            "payload": str(PAYLOAD_FILE),
            "log": str(LOG_FILE),
            "result": str(RESULT_FILE),
            "manifest": str(MANIFEST_FILE),
            "screenshot": str(SCREENSHOT_FILE),
        },
        "blockers": blockers,
    }
    RESULT_FILE.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
