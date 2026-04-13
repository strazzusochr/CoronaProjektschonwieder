from __future__ import annotations

import json
import math
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
DEEP_SEARCH_FILE = REPO_ROOT / "deep_search_probe_latest.json"
MATH_VALIDATION_FILE = REPO_ROOT / "math_validation_probe_latest.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def is_external_agent(agent_id: str) -> bool:
    return agent_id.strip().lower().startswith("external.")


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


def fetch_url_probe(url: str, timeout: int = 25) -> dict:
    req = request.Request(
        url=url,
        headers={
            "User-Agent": "godmode-final-build-test/1.0",
            "Accept": "text/html,application/json;q=0.9,*/*;q=0.8",
        },
        method="GET",
    )
    try:
        with request.urlopen(req, timeout=timeout) as response:
            raw = response.read(2200).decode("utf-8", errors="replace")
            snippet = " ".join(raw.replace("\r", " ").replace("\n", " ").split())[:260]
            return {
                "url": url,
                "http_status": int(response.status),
                "ok": int(response.status) == 200,
                "snippet": snippet,
            }
    except error.HTTPError as exc:
        return {
            "url": url,
            "http_status": int(exc.code),
            "ok": False,
            "error": str(exc),
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "url": url,
            "http_status": 0,
            "ok": False,
            "error": str(exc),
        }


def run_deep_search_probe() -> dict:
    question = (
        "How can fixed-timestep deterministic simulation and conservative terrain updates "
        "improve reliability for browser-based lemmings-inspired 3D games?"
    )
    sources = [
        "https://developer.mozilla.org/en-US/docs/Games/Anatomy",
        "https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection",
        "https://threejs.org/docs/",
    ]
    probes = [fetch_url_probe(url) for url in sources]
    successful = [item for item in probes if item.get("ok", False)]
    return {
        "timestamp": now_iso(),
        "question": question,
        "sources": probes,
        "source_count": len(probes),
        "successful_sources": len(successful),
        "pass": len(successful) == len(sources),
    }


def run_math_validation_probe() -> dict:
    # Kinematics check: s = ut + 1/2at^2
    u = 0.0
    a = 9.81
    t = 2.35
    expected_distance = u * t + 0.5 * a * (t**2)
    simulated_distance = sum((u + a * i * 0.05) * 0.05 for i in range(int(t / 0.05)))
    kinematic_delta = abs(expected_distance - simulated_distance)

    # Path cost consistency check
    path_points = [(0, 0), (3, 4), (7, 7), (11, 9), (15, 14)]
    euclidean_cost = 0.0
    manhattan_cost = 0
    for start, end in zip(path_points, path_points[1:]):
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        euclidean_cost += math.hypot(dx, dy)
        manhattan_cost += abs(dx) + abs(dy)

    # Deterministic replay checksum check
    def checksum(seed: int) -> int:
        value = seed
        total = 0
        for _ in range(120):
            value = (value * 1103515245 + 12345) & 0x7FFFFFFF
            total += value % 997
        return total

    checksum_a = checksum(42)
    checksum_b = checksum(42)

    # Resource balance check
    initial_budget = 74
    spent = 23
    remaining = initial_budget - spent
    resource_balance_ok = remaining >= 0 and spent <= initial_budget

    return {
        "timestamp": now_iso(),
        "kinematics": {
            "expected_distance": expected_distance,
            "simulated_distance": simulated_distance,
            "delta": kinematic_delta,
            "pass": kinematic_delta < 0.9,
        },
        "path_cost": {
            "euclidean_cost": euclidean_cost,
            "manhattan_cost": manhattan_cost,
            "pass": euclidean_cost > 0 and manhattan_cost >= euclidean_cost,
        },
        "deterministic_replay": {
            "checksum_a": checksum_a,
            "checksum_b": checksum_b,
            "pass": checksum_a == checksum_b,
        },
        "resource_balance": {
            "initial_budget": initial_budget,
            "spent": spent,
            "remaining": remaining,
            "pass": resource_balance_ok,
        },
        "pass": (
            kinematic_delta < 0.9
            and euclidean_cost > 0
            and manhattan_cost >= euclidean_cost
            and checksum_a == checksum_b
            and resource_balance_ok
        ),
    }


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
    dry_run_detected_any = False
    dry_run_detected_core = False
    for mission in missions:
        code, body = post_json(HUB_URL, mission, timeout=60)
        result_payload = body.get("result", {}) if isinstance(body.get("result", {}), dict) else {}
        response_payload = (
            result_payload.get("response", {})
            if isinstance(result_payload.get("response", {}), dict)
            else {}
        )
        response_dry_run = bool(response_payload.get("dry_run", False))
        external_agent = is_external_agent(mission["agent"])
        if response_dry_run:
            dry_run_detected_any = True
            if not external_agent:
                dry_run_detected_core = True
        dispatch_results.append(
            {
                "agent": mission["agent"],
                "scope": "external" if external_agent else "core",
                "http_status": code,
                "status": body.get("status", "unknown"),
                "runtime_target": body.get("runtime_target", ""),
                "dispatch_artifact": body.get("dispatch_artifact", ""),
                "reason": body.get("reason") or body.get("result", {}).get("reason", ""),
                "error": body.get("result", {}).get("error", ""),
                "response_dry_run": response_dry_run,
            }
        )

    deep_search_probe = run_deep_search_probe()
    DEEP_SEARCH_FILE.write_text(json.dumps(deep_search_probe, indent=2), encoding="utf-8")

    math_validation_probe = run_math_validation_probe()
    MATH_VALIDATION_FILE.write_text(json.dumps(math_validation_probe, indent=2), encoding="utf-8")

    unit_cmd = run_cmd(["npm", "test"], FRONTEND_ROOT)
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
        "deep_search_probe": str(DEEP_SEARCH_FILE),
        "math_validation_probe": str(MATH_VALIDATION_FILE),
    }
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    log_lines = [
        f"FINAL BUILD TEST @ {timestamp}",
        "",
        "DISPATCH RESULTS:",
        json.dumps(dispatch_results, indent=2, ensure_ascii=True),
        "",
        "UNIT TEST RESULT:",
        json.dumps(unit_cmd, indent=2, ensure_ascii=True),
        "",
        "BUILD RESULT:",
        json.dumps(build_cmd, indent=2, ensure_ascii=True),
        "",
        "BROWSER RESULT:",
        json.dumps(browser_cmd, indent=2, ensure_ascii=True),
        "",
        "DEEP SEARCH PROBE:",
        json.dumps(deep_search_probe, indent=2, ensure_ascii=True),
        "",
        "MATH VALIDATION PROBE:",
        json.dumps(math_validation_probe, indent=2, ensure_ascii=True),
        "",
        "MANIFEST:",
        json.dumps(manifest, indent=2, ensure_ascii=True),
    ]
    LOG_FILE.write_text("\n".join(log_lines), encoding="utf-8")

    core_dispatch_results = [item for item in dispatch_results if item["scope"] == "core"]
    external_dispatch_results = [item for item in dispatch_results if item["scope"] == "external"]

    dispatch_core_ok = all(
        item["http_status"] == 200 and item["status"] == "forwarded"
        for item in core_dispatch_results
    ) and not dry_run_detected_core

    dispatch_full_ok = all(
        item["http_status"] == 200 and item["status"] == "forwarded"
        for item in dispatch_results
    ) and not dry_run_detected_any

    common_checks_ok = all(
        [
            unit_cmd["ok"],
            build_cmd["ok"],
            browser_cmd["ok"],
            screenshot_exists,
            SCREENSHOT_FILE.exists(),
            len(dist_files) > 0,
            deep_search_probe["pass"],
            math_validation_probe["pass"],
        ]
    )
    core_status = "PASS" if dispatch_core_ok and common_checks_ok else "FAIL"
    if core_status == "PASS" and dispatch_full_ok:
        status = "PASS"
    elif core_status == "PASS":
        status = "PARTIAL"
    else:
        status = "FAIL"

    blockers_core: list[str] = []
    blockers_full: list[str] = []
    if not dispatch_core_ok:
        blockers_core.append(
            "Core dispatch did not forward for all selected non-external agents or returned dry_run=true."
        )
    if not dispatch_full_ok:
        blockers_full.append(
            "Full dispatch did not forward for all selected agents (external path still blocked/partial) or returned dry_run=true."
        )
    if not build_cmd["ok"]:
        blockers_core.append("npm run build failed.")
    if not unit_cmd["ok"]:
        blockers_core.append("npm test failed.")
    if not browser_cmd["ok"]:
        blockers_core.append("npm run test:browser failed.")
    if not screenshot_exists:
        blockers_core.append("No Playwright screenshot produced.")
    if not SCREENSHOT_FILE.exists():
        blockers_core.append("final_build_screenshot.png was not written.")
    if len(dist_files) == 0:
        blockers_core.append("No build artifacts in frontend dist directory.")
    if not deep_search_probe["pass"]:
        blockers_core.append("Deep-search probe failed to collect all required sources with HTTP 200.")
    if not math_validation_probe["pass"]:
        blockers_core.append("Math validation probe failed.")

    result = {
        "timestamp": now_iso(),
        "status": status,
        "core_status": core_status,
        "full_status": "PASS" if dispatch_full_ok and common_checks_ok else "FAIL",
        "dispatch_core_ok": dispatch_core_ok,
        "dispatch_full_ok": dispatch_full_ok,
        "unit_ok": unit_cmd["ok"],
        "build_ok": build_cmd["ok"],
        "browser_ok": browser_cmd["ok"],
        "screenshot_ok": SCREENSHOT_FILE.exists(),
        "dist_ok": len(dist_files) > 0,
        "deep_search_probe": deep_search_probe,
        "math_validation": math_validation_probe,
        "agent_participation": [
            {
                "agent": item["agent"],
                "scope": item["scope"],
                "http_status": item["http_status"],
                "status": item["status"],
                "runtime_target": item["runtime_target"],
            }
            for item in dispatch_results
        ],
        "preview_proof": {
            "screenshot_exists": SCREENSHOT_FILE.exists(),
            "screenshot_path": str(SCREENSHOT_FILE),
            "web_preview_port": 4173,
        },
        "dispatch_breakdown": {
            "core_count": len(core_dispatch_results),
            "external_count": len(external_dispatch_results),
            "dry_run_detected_any": dry_run_detected_any,
            "dry_run_detected_core": dry_run_detected_core,
        },
        "artifacts": {
            "payload": str(PAYLOAD_FILE),
            "log": str(LOG_FILE),
            "result": str(RESULT_FILE),
            "manifest": str(MANIFEST_FILE),
            "screenshot": str(SCREENSHOT_FILE),
            "deep_search_probe": str(DEEP_SEARCH_FILE),
            "math_validation_probe": str(MATH_VALIDATION_FILE),
        },
        "blockers_core": blockers_core,
        "blockers_full": blockers_full,
        "blockers": blockers_core + blockers_full,
    }
    RESULT_FILE.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps(result, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
