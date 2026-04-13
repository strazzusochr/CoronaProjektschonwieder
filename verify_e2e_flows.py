from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, request

REPO_ROOT = Path("d:/Web/docs/godmode_setup")
FRONTEND_ROOT = REPO_ROOT / "CoronaProjektschonwieder"
DEFAULT_HUB = "http://127.0.0.1:3901"
DEFAULT_N8N_WEBHOOK = (
    "http://127.0.0.1:5678/webhook/godmodeMissionTrigger01/mission-webhook/godmode-mission"
)
EVIDENCE_DIR_CANDIDATES = [
    REPO_ROOT / ".godmode_runtime" / "evidence",
    REPO_ROOT / "proofs",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_json_load(raw: str) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
        return {"value": parsed}
    except json.JSONDecodeError:
        return {"raw": raw}


def http_post_json(url: str, payload: dict, timeout: int = 45) -> tuple[int, dict]:
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
            return int(response.status), safe_json_load(raw)
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        return int(exc.code), safe_json_load(raw)
    except Exception as exc:  # noqa: BLE001
        return 0, {"error": str(exc)}


def dispatch_mission(
    base_url: str,
    agent: str,
    task: str,
    source: str,
    repo: str,
    ref: str,
    status: str = "triggered",
) -> dict:
    payload = {
        "agent": agent,
        "task": task,
        "source": source,
        "repo": repo,
        "ref": ref,
        "status": status,
        "timestamp": now_iso(),
    }
    code, body = http_post_json(f"{base_url}/dispatch", payload, timeout=60)
    return {
        "http_status": code,
        "body": body,
        "ok": code == 200 and body.get("status") == "forwarded",
    }


def run_cmd(cmd: list[str], cwd: Path) -> dict:
    resolved_cmd = list(cmd)
    head = resolved_cmd[0].lower()
    if os.name == "nt":
        if head == "npm":
            resolved_cmd[0] = "npm.cmd"
        elif head == "npx":
            resolved_cmd[0] = "npx.cmd"
    proc = subprocess.run(  # noqa: S603
        resolved_cmd,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    return {
        "cmd": resolved_cmd,
        "returncode": proc.returncode,
        "ok": proc.returncode == 0,
        "stdout_tail": "\n".join(proc.stdout.splitlines()[-60:]),
        "stderr_tail": "\n".join(proc.stderr.splitlines()[-60:]),
    }


def resolve_evidence_dir() -> Path:
    for candidate in EVIDENCE_DIR_CANDIDATES:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            probe = candidate / ".write_test"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
            return candidate
        except Exception:  # noqa: BLE001
            continue
    return REPO_ROOT / ".godmode_runtime" / "evidence"


def bool_all(*flags: bool) -> bool:
    return all(flags)


def write_report_with_fallback(report: dict, stamp: str) -> tuple[Path, Path]:
    payload = json.dumps(report, ensure_ascii=True, indent=2)
    errors: list[str] = []
    for candidate in EVIDENCE_DIR_CANDIDATES:
        try:
            candidate.mkdir(parents=True, exist_ok=True)
            out_file = candidate / f"e2e_flows_ae_{stamp}.json"
            latest_file = candidate / "e2e_flows_ae_latest.json"
            out_file.write_text(payload, encoding="utf-8")
            latest_file.write_text(payload, encoding="utf-8")
            return out_file, latest_file
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{candidate}: {exc}")
            continue

    fallback = resolve_evidence_dir()
    out_file = fallback / f"e2e_flows_ae_{stamp}.json"
    latest_file = fallback / "e2e_flows_ae_latest.json"
    if errors:
        report.setdefault("write_errors", errors)
    out_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")
    latest_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")
    return out_file, latest_file


def find_latest_playwright_screenshot(test_results_dir: Path) -> dict:
    png_files = sorted(
        [path for path in test_results_dir.glob("*.png") if path.is_file()],
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    if not png_files:
        return {
            "exists": False,
            "path": "",
            "size_bytes": 0,
            "timestamp": "",
            "candidates": [],
        }

    latest = png_files[0]
    stat = latest.stat()
    return {
        "exists": stat.st_size > 0,
        "path": str(latest),
        "size_bytes": int(stat.st_size),
        "timestamp": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
        "candidates": [str(path) for path in png_files[:10]],
    }


def main() -> int:
    hub = os.environ.get("BOLTDIY_FACADE_URL", DEFAULT_HUB).rstrip("/")
    n8n_webhook = os.environ.get("N8N_WEBHOOK_URL", DEFAULT_N8N_WEBHOOK).strip()
    repo_url = "https://github.com/strazzusochr/CoronaProjektschonwieder"
    ref = "main"
    ts = now_iso()

    # Flow A: Goal -> Pilot -> Dispatch -> Agents -> Browser -> Proof -> Done
    flow_a_dispatch = dispatch_mission(
        hub,
        "local.pilot.aider_cloud",
        "Flow A verification mission",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_a_browser = run_cmd(["npm", "run", "test:browser"], FRONTEND_ROOT)
    flow_a_core_ok = bool_all(flow_a_dispatch["ok"], flow_a_browser["ok"])
    flow_a_full_ok = flow_a_core_ok

    # Flow B: Push -> n8n -> Tests -> Review -> Fix -> Merge (runtime gate approximation)
    flow_b_n8n_payload = {
        "agent": "local.pilot.aider_cloud",
        "task": "Flow B n8n mission trigger",
        "source": "verify_e2e_flows.py",
        "repo": repo_url,
        "ref": ref,
        "status": "triggered",
        "timestamp": now_iso(),
    }
    flow_b_n8n_code, flow_b_n8n_body = http_post_json(n8n_webhook, flow_b_n8n_payload, timeout=60)
    flow_b_tests = run_cmd(["npm", "test"], FRONTEND_ROOT)
    flow_b_build = run_cmd(["npm", "run", "build"], FRONTEND_ROOT)
    flow_b_review = dispatch_mission(
        hub,
        "local.langgraph.reviewer",
        "Flow B review phase",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_b_fix = dispatch_mission(
        hub,
        "external.ollamahf.lead_coder",
        "Flow B fix phase",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_b_merge_check = run_cmd(["git", "-C", str(REPO_ROOT), "rev-parse", "origin/main"], REPO_ROOT)
    flow_b_core_ok = bool_all(
        flow_b_n8n_code == 200,
        flow_b_tests["ok"],
        flow_b_build["ok"],
        flow_b_review["ok"],
        flow_b_merge_check["ok"],
    )
    flow_b_full_ok = bool_all(flow_b_core_ok, flow_b_fix["ok"])

    # Flow C: bolt.diy -> OpenHands -> n8n -> feedback
    flow_c_openhands = dispatch_mission(
        hub,
        "local.openhands.openhands",
        "Flow C openhands dispatch",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_c_n8n_code, flow_c_n8n_body = http_post_json(
        n8n_webhook,
        {
            "agent": "local.openhands.openhands",
            "task": "Flow C n8n hop",
            "source": "verify_e2e_flows.py",
            "repo": repo_url,
            "ref": ref,
            "status": "triggered",
            "timestamp": now_iso(),
        },
        timeout=60,
    )
    flow_c_feedback = dispatch_mission(
        hub,
        "external.ollamahf.qa",
        "Flow C feedback loop",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_c_core_ok = bool_all(flow_c_openhands["ok"], flow_c_n8n_code == 200)
    flow_c_full_ok = bool_all(flow_c_core_ok, flow_c_feedback["ok"])

    # Flow D: LangGraph -> OpenHands / Aider / smolagents
    flow_d_langgraph = dispatch_mission(
        hub,
        "local.langgraph.planner",
        "Flow D langgraph orchestration",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_d_openhands = dispatch_mission(
        hub,
        "local.openhands.openhands",
        "Flow D openhands branch",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_d_aider = dispatch_mission(
        hub,
        "local.hf_aider.aider_core",
        "Flow D aider branch",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_d_smol = dispatch_mission(
        hub,
        "local.smolagents.web_researcher",
        "Flow D smolagents branch",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_d_core_ok = bool_all(
        flow_d_langgraph["ok"],
        flow_d_openhands["ok"],
        flow_d_aider["ok"],
        flow_d_smol["ok"],
    )
    flow_d_full_ok = flow_d_core_ok

    # Flow E: Vision / screenshot / bugfix loop
    flow_e_browser = run_cmd(["npm", "run", "test:browser"], FRONTEND_ROOT)
    screenshot_info = find_latest_playwright_screenshot(FRONTEND_ROOT / "test-results")
    flow_e_vision = dispatch_mission(
        hub,
        "external.ollamahf.vision",
        f"Flow E vision analyze screenshot at {screenshot_info['path'] or 'missing'}",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_e_fix = dispatch_mission(
        hub,
        "external.ollamahf.lead_coder",
        "Flow E apply bugfix proposal from vision analysis",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_e_finalize = dispatch_mission(
        hub,
        "local.langgraph.finalize",
        "Flow E finalize patch cycle",
        "verify_e2e_flows.py",
        repo_url,
        ref,
    )
    flow_e_core_ok = bool_all(
        flow_e_browser["ok"],
        screenshot_info["exists"],
        flow_e_finalize["ok"],
    )
    flow_e_full_ok = bool_all(flow_e_core_ok, flow_e_vision["ok"], flow_e_fix["ok"])

    flows = {
        "A": {
            "status_core": "VERIFIED" if flow_a_core_ok else "BLOCKED",
            "status_full": "VERIFIED" if flow_a_full_ok else "BLOCKED",
            "status": "VERIFIED" if flow_a_full_ok else "PARTIAL" if flow_a_core_ok else "BLOCKED",
            "dispatch": flow_a_dispatch,
            "browser": flow_a_browser,
        },
        "B": {
            "status_core": "VERIFIED" if flow_b_core_ok else "BLOCKED",
            "status_full": "VERIFIED" if flow_b_full_ok else "BLOCKED",
            "status": "VERIFIED" if flow_b_full_ok else "PARTIAL" if flow_b_core_ok else "BLOCKED",
            "n8n_http_status": flow_b_n8n_code,
            "n8n_body": flow_b_n8n_body,
            "tests": flow_b_tests,
            "build": flow_b_build,
            "review": flow_b_review,
            "fix": flow_b_fix,
            "merge_check": flow_b_merge_check,
        },
        "C": {
            "status_core": "VERIFIED" if flow_c_core_ok else "BLOCKED",
            "status_full": "VERIFIED" if flow_c_full_ok else "BLOCKED",
            "status": "VERIFIED" if flow_c_full_ok else "PARTIAL" if flow_c_core_ok else "BLOCKED",
            "openhands": flow_c_openhands,
            "n8n_http_status": flow_c_n8n_code,
            "n8n_body": flow_c_n8n_body,
            "feedback": flow_c_feedback,
        },
        "D": {
            "status_core": "VERIFIED" if flow_d_core_ok else "BLOCKED",
            "status_full": "VERIFIED" if flow_d_full_ok else "BLOCKED",
            "status": "VERIFIED" if flow_d_full_ok else "PARTIAL" if flow_d_core_ok else "BLOCKED",
            "langgraph": flow_d_langgraph,
            "openhands": flow_d_openhands,
            "aider": flow_d_aider,
            "smolagents": flow_d_smol,
        },
        "E": {
            "status_core": "VERIFIED" if flow_e_core_ok else "BLOCKED",
            "status_full": "VERIFIED" if flow_e_full_ok else "BLOCKED",
            "status": "VERIFIED" if flow_e_full_ok else "PARTIAL" if flow_e_core_ok else "BLOCKED",
            "browser": flow_e_browser,
            "screenshot": screenshot_info,
            "vision": flow_e_vision,
            "fix": flow_e_fix,
            "finalize": flow_e_finalize,
        },
    }

    verified_full = sum(1 for item in flows.values() if item["status_full"] == "VERIFIED")
    verified_core = sum(1 for item in flows.values() if item["status_core"] == "VERIFIED")
    full_flow_percent = round((verified_full / 5.0) * 100.0, 2)
    core_flow_percent = round((verified_core / 5.0) * 100.0, 2)
    all_verified_full = verified_full == 5
    all_verified_core = verified_core == 5

    report = {
        "timestamp": ts,
        "status": "PASS" if all_verified_full else "PARTIAL",
        "core_status": "PASS" if all_verified_core else "PARTIAL",
        "full_status": "PASS" if all_verified_full else "PARTIAL",
        "hub_base_url": hub,
        "n8n_webhook_url": n8n_webhook,
        "verified_flows": verified_full,
        "verified_flows_core": verified_core,
        "total_flows": 5,
        "flow_percent": full_flow_percent,
        "flow_percent_core": core_flow_percent,
        "flows": flows,
    }

    stamp = ts.replace(":", "-").replace(".", "-")
    out_file, latest_file = write_report_with_fallback(report, stamp)

    print(
        json.dumps(
            {
                "status": "ok",
                "snapshot": str(out_file),
                "flow_percent": full_flow_percent,
                "flow_percent_core": core_flow_percent,
                "verified_flows": verified_full,
                "verified_flows_core": verified_core,
                "total_flows": 5,
            },
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
