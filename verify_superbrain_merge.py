from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, request

REPO_ROOT = Path("d:/Web/docs/godmode_setup")
DOCS = [
    REPO_ROOT / "GODMODE_FORENSIC_HANDBUCH.html",
    REPO_ROOT / "KONTROLLPROTOKOLL_00_07.md",
    REPO_ROOT / "STACK_OPERATIONS.md",
    REPO_ROOT / "AGENT_SUPERBRAIN_KONTROLLPROTOKOLL.md",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_evidence_dir() -> Path:
    candidates = [
        REPO_ROOT / ".godmode_runtime" / "evidence",
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


def get_json(url: str, timeout: int = 30) -> tuple[int, dict]:
    req = request.Request(url=url, method="GET")
    try:
        with request.urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return int(response.status), json.loads(body) if body else {}
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        payload = {"raw": raw}
        try:
            payload = json.loads(raw) if raw else payload
        except json.JSONDecodeError:
            pass
        return int(exc.code), payload
    except Exception as exc:
        return 0, {"error": str(exc)}


def post_json(url: str, payload: dict, timeout: int = 30) -> tuple[int, dict]:
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
        payload = {"raw": raw}
        try:
            payload = json.loads(raw) if raw else payload
        except json.JSONDecodeError:
            pass
        return int(exc.code), payload
    except Exception as exc:
        return 0, {"error": str(exc)}


def weighted_beta_core(
    inventory_pct: float,
    contract_pct: float,
    routing_pct: float,
    doc_pct: float,
) -> float:
    # Beta-Core is the local/selfhosted release tier:
    # external orchestration remains part of GA-Full only.
    return round(
        (inventory_pct * 0.30)
        + (contract_pct * 0.25)
        + (routing_pct * 0.30)
        + (doc_pct * 0.15),
        2,
    )


def weighted_ga_full(
    inventory_live_pct: float,
    contract_pct: float,
    routing_live_pct: float,
    external_pct: float,
    doc_pct: float,
) -> float:
    return round(
        (inventory_live_pct * 0.25)
        + (contract_pct * 0.20)
        + (routing_live_pct * 0.25)
        + (external_pct * 0.15)
        + (doc_pct * 0.15),
        2,
    )


def env_int(name: str, default: int, minimum: int, maximum: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return max(minimum, min(maximum, value))


def git_status_lines() -> list[str]:
    try:
        completed = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            check=False,
        )
    except Exception:
        return []
    if completed.returncode != 0:
        return []
    return [line.rstrip() for line in completed.stdout.splitlines() if line.strip()]


def main() -> int:
    base_url = os.environ.get("BOLTDIY_FACADE_URL", "http://127.0.0.1:3901").rstrip("/")
    forward_timeout = env_int("BOLTDIY_FORWARD_TIMEOUT", 20, 3, 180)
    dispatch_timeout = env_int("SUPERBRAIN_DISPATCH_TIMEOUT", forward_timeout + 5, 3, 240)
    external_dispatch_timeout = env_int(
        "SUPERBRAIN_EXTERNAL_DISPATCH_TIMEOUT",
        max(dispatch_timeout, 90),
        10,
        900,
    )
    # External probes can legitimately take multiple minutes under HF queue/load.
    ollama_task_timeout = env_int("SUPERBRAIN_OLLAMA_TASK_TIMEOUT", 360, 30, 900)
    ollama_probe_timeout = env_int(
        "SUPERBRAIN_OLLAMA_PROBE_TIMEOUT",
        max(900, ollama_task_timeout * 3),
        120,
        1800,
    )
    ollama_orchestrate_retries = env_int("SUPERBRAIN_OLLAMA_ORCHESTRATE_RETRIES", 2, 1, 3)
    evidence_dir = resolve_evidence_dir()
    timestamp = now_iso()
    dirty_before = git_status_lines()

    health_code, health = get_json(f"{base_url}/health")
    agents_code, agents = get_json(f"{base_url}/agents")
    routing_code, routing = get_json(f"{base_url}/routing/status")

    active_agents = agents.get("active_agents", [])
    legacy_agents = agents.get("legacy_agents", [])
    inventory_gate = {
        "expected_active": 25,
        "actual_active": len(active_agents),
        "expected_legacy": 1,
        "actual_legacy": len(legacy_agents),
        "unique_ids": len({item.get("agent_id") for item in active_agents + legacy_agents}),
        "status": "PASS" if len(active_agents) == 25 and len(legacy_agents) == 1 else "FAIL",
    }
    inventory_gate_pct = 100.0 if inventory_gate["status"] == "PASS" else 0.0

    valid_payload = {
        "agent": "local.langgraph.planner",
        "task": "Contract validation probe.",
        "source": "verify_superbrain_merge.py",
        "repo": "https://github.com/strazzusochr/CoronaProjektschonwieder",
        "ref": "main",
        "status": "triggered",
        "timestamp": timestamp,
    }
    checks = []

    code, _ = post_json(f"{base_url}/dispatch", valid_payload, timeout=dispatch_timeout)
    checks.append({"name": "valid_payload", "pass": code == 200, "http_status": code})

    alias_payload = dict(valid_payload)
    alias_payload["agent"] = "Aider-Cloud"
    code, _ = post_json(f"{base_url}/dispatch", alias_payload, timeout=dispatch_timeout)
    checks.append({"name": "legacy_alias_payload", "pass": code == 200, "http_status": code})

    unknown_payload = dict(valid_payload)
    unknown_payload["agent"] = "unknown.agent"
    code, _ = post_json(f"{base_url}/dispatch", unknown_payload, timeout=dispatch_timeout)
    checks.append({"name": "unknown_agent_rejected", "pass": code == 422, "http_status": code})

    missing_field_payload = dict(valid_payload)
    missing_field_payload.pop("timestamp", None)
    code, _ = post_json(f"{base_url}/dispatch", missing_field_payload, timeout=dispatch_timeout)
    checks.append({"name": "missing_field_rejected", "pass": code == 422, "http_status": code})

    extra_field_payload = dict(valid_payload)
    extra_field_payload["unexpected"] = "x"
    code, _ = post_json(f"{base_url}/dispatch", extra_field_payload, timeout=dispatch_timeout)
    checks.append({"name": "extra_field_rejected", "pass": code == 422, "http_status": code})

    contract_passed = sum(1 for item in checks if item["pass"])
    contract_pct = round((contract_passed / len(checks)) * 100.0, 2)

    routing_agents = {
        "langgraph-local": "local.langgraph.planner",
        "smolagents": "local.smolagents.godmode_manager",
        "openhands-adapter": "local.openhands.openhands",
        "hf-aider": "local.hf_aider.aider_core",
        "ollama-hf-orchestrator": "external.ollamahf.solo_builder",
    }
    routing_dispatch_results = {}
    live_targets = 0
    blocked_targets_with_evidence = 0
    checked_targets = 0
    for target, agent_id in routing_agents.items():
        payload = dict(valid_payload)
        payload["agent"] = agent_id
        payload["task"] = f"Routing gate probe for {target}"
        timeout_value = external_dispatch_timeout if agent_id.startswith("external.") else dispatch_timeout
        code, body = post_json(f"{base_url}/dispatch", payload, timeout=timeout_value)
        status = body.get("status", "unknown")
        result_payload = body.get("result", {})
        has_blocked_evidence = (
            status == "blocked"
            and bool(body.get("dispatch_artifact"))
            and (
                bool(body.get("reason"))
                or bool(result_payload.get("reason"))
                or bool(result_payload.get("error"))
                or bool(result_payload.get("attempts"))
            )
        )
        checked_targets += 1
        if status == "forwarded":
            live_targets += 1
        elif has_blocked_evidence:
            blocked_targets_with_evidence += 1
        routing_dispatch_results[target] = {
            "http_status": code,
            "status": status,
            "runtime_target": body.get("runtime_target"),
            "policy_blocked": body.get("policy_blocked"),
            "dispatch_artifact": body.get("dispatch_artifact"),
            "reason": body.get("reason") or result_payload.get("reason", ""),
            "error": result_payload.get("error", ""),
        }

    routing_live_pct = round((live_targets / 5.0) * 100.0, 2)
    routing_gate_pct = round(((live_targets + blocked_targets_with_evidence) / 5.0) * 100.0, 2)

    inventory_forwarded = 0
    inventory_blocked = 0
    inventory_checked = 0
    inventory_probe_results: dict[str, dict] = {}
    for item in active_agents:
        agent_id = str(item.get("agent_id", "")).strip()
        if not agent_id:
            continue
        payload = dict(valid_payload)
        payload["agent"] = agent_id
        payload["task"] = f"Inventory verification probe for {agent_id}"
        if agent_id.startswith("external."):
            timeout_value = external_dispatch_timeout
        elif ".openhands." in agent_id or agent_id.startswith("local.pilot."):
            timeout_value = max(dispatch_timeout, 120)
        else:
            timeout_value = dispatch_timeout
        code, body = post_json(f"{base_url}/dispatch", payload, timeout=timeout_value)
        status = str(body.get("status", "unknown"))
        inventory_checked += 1
        if status == "forwarded":
            inventory_forwarded += 1
        elif status == "blocked":
            inventory_blocked += 1
        inventory_probe_results[agent_id] = {
            "http_status": code,
            "status": status,
            "runtime_target": body.get("runtime_target", ""),
            "dispatch_artifact": body.get("dispatch_artifact", ""),
            "reason": body.get("reason") or body.get("result", {}).get("reason", ""),
            "error": body.get("result", {}).get("error", ""),
        }

    legacy_compliant = sum(
        1
        for item in legacy_agents
        if str(item.get("status_class", "")).upper() in {"LEGACY", "VERIFIED"}
    )
    verified_entries = inventory_forwarded + legacy_compliant
    inventory_verified_pct = round((verified_entries / 26.0) * 100.0, 2)
    inventory_live_pct = round((inventory_forwarded / 25.0) * 100.0, 2) if active_agents else 0.0

    probe_code, probe = post_json(
        f"{base_url}/probe/ollama",
        {
            "task": "External gate probe for superbrain merge.",
            "model": "qwen2.5-coder-7b",
            "timeout": ollama_task_timeout,
            "dry_run": False,
            "orchestrate_retries": ollama_orchestrate_retries,
        },
        timeout=ollama_probe_timeout,
    )
    external_success_raw = int(probe.get("successful_probes", 0))
    probe_results = probe.get("results", {}) if isinstance(probe.get("results", {}), dict) else {}
    orchestrate_block = probe_results.get("orchestrate", {}) if isinstance(probe_results.get("orchestrate", {}), dict) else {}
    orchestrate_response = (
        orchestrate_block.get("response", {})
        if isinstance(orchestrate_block.get("response", {}), dict)
        else {}
    )
    orchestrate_dry_run = bool(orchestrate_response.get("dry_run", False))
    external_success = external_success_raw
    if orchestrate_dry_run and external_success > 0:
        # Do not count dry-run orchestration as full external runtime proof.
        external_success -= 1
    external_pct = round((external_success / 3.0) * 100.0, 2)

    synced_docs = 0
    doc_results = {}
    for doc in DOCS:
        exists = doc.exists()
        contains_marker = False
        if exists:
            text = doc.read_text(encoding="utf-8", errors="replace")
            contains_marker = "Superbrain Merge 2026-04-12" in text
        if exists and contains_marker:
            synced_docs += 1
        doc_results[str(doc)] = {
            "exists": exists,
            "contains_sync_marker": contains_marker,
        }

    doc_pct = round((synced_docs / 4.0) * 100.0, 2)

    dirty_after = git_status_lines()
    dirty_before_set = set(dirty_before)
    dirty_after_set = set(dirty_after)
    dirty_new_entries = sorted(dirty_after_set - dirty_before_set)
    dirty_resolved_entries = sorted(dirty_before_set - dirty_after_set)
    dirty_tree_gate_pass = len(dirty_new_entries) == 0

    beta_core_pct = weighted_beta_core(
        inventory_gate_pct,
        contract_pct,
        routing_gate_pct,
        doc_pct,
    )
    ga_full_pct = weighted_ga_full(
        inventory_live_pct,
        contract_pct,
        routing_live_pct,
        external_pct,
        doc_pct,
    )

    report = {
        "timestamp": timestamp,
        "base_url": base_url,
        "health_gate": {"http_status": health_code, "status": health.get("status", "unknown")},
        "inventory_gate": inventory_gate,
        "inventory_probe": {
            "checked_active_agents": inventory_checked,
            "forwarded_active_agents": inventory_forwarded,
            "blocked_active_agents": inventory_blocked,
            "live_percent_active": inventory_live_pct,
            "verified_entries": verified_entries,
            "verified_percent_all_entries": inventory_verified_pct,
            "legacy_compliant_entries": legacy_compliant,
            "results": inventory_probe_results,
        },
        "contract_gate": {"checks": checks, "passed": contract_passed, "total": len(checks), "percent": contract_pct},
        "routing_gate": {
            "checked_targets": checked_targets,
            "live_targets": live_targets,
            "blocked_targets_with_evidence": blocked_targets_with_evidence,
            "live_percent": routing_live_pct,
            "gate_percent": routing_gate_pct,
            "results": routing_dispatch_results,
            "routing_health_http_status": routing_code,
            "routing_health": routing,
        },
        "external_gate": {
            "probe_http_status": probe_code,
            "probe_status": probe.get("status", "unknown"),
            "successful_probes_raw": external_success_raw,
            "successful_probes": external_success,
            "total_probes": 3,
            "percent": external_pct,
            "orchestrate_dry_run_detected": orchestrate_dry_run,
            "probe": probe,
        },
        "doc_gate": {
            "synced_docs": synced_docs,
            "total_docs": 4,
            "percent": doc_pct,
            "results": doc_results,
        },
        "repo_hygiene_gate": {
            "status": "PASS" if dirty_tree_gate_pass else "FAIL",
            "dirty_before_count": len(dirty_before),
            "dirty_after_count": len(dirty_after),
            "new_entries_after_verify": dirty_new_entries,
            "resolved_entries_during_verify": dirty_resolved_entries,
        },
        "progress": {
            "inventory_verified_percent": inventory_verified_pct,
            "inventory_gate_percent": inventory_gate_pct,
            "inventory_live_percent": inventory_live_pct,
            "contract_percent": contract_pct,
            "routing_live_percent": routing_live_pct,
            "routing_gate_percent": routing_gate_pct,
            "external_percent": external_pct,
            "doc_percent": doc_pct,
            "beta_core_percent": beta_core_pct,
            "ga_full_percent": ga_full_pct,
        },
        "freigabe": {
            "beta_core_go": all(
                [
                    inventory_gate["status"] == "PASS",
                    contract_pct == 100.0,
                    routing_gate_pct == 100.0,
                    doc_pct == 100.0,
                ]
            ),
            "ga_full_go": all(
                [
                    inventory_gate["status"] == "PASS",
                    inventory_live_pct == 100.0,
                    contract_pct == 100.0,
                    routing_live_pct == 100.0,
                    external_pct == 100.0,
                    doc_pct == 100.0,
                ]
            ),
        },
    }

    evidence_dir.mkdir(parents=True, exist_ok=True)
    stamp = timestamp.replace(":", "-").replace(".", "-")
    out_file = evidence_dir / f"superbrain_gate_{stamp}.json"
    latest_file = evidence_dir / "superbrain_gate_latest.json"
    snapshot_written = True
    snapshot_error = ""
    try:
        out_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")
        latest_file.write_text(json.dumps(report, ensure_ascii=True, indent=2), encoding="utf-8")
    except PermissionError as exc:
        snapshot_written = False
        snapshot_error = str(exc)

    print(
        json.dumps(
            {
            "status": "ok",
            "snapshot": str(out_file),
            "snapshot_written": snapshot_written,
            "snapshot_write_error": snapshot_error,
            "inventory_verified_percent": inventory_verified_pct,
            "inventory_gate_percent": inventory_gate_pct,
            "inventory_live_percent": inventory_live_pct,
            "contract_percent": contract_pct,
            "routing_live_percent": routing_live_pct,
            "routing_gate_percent": routing_gate_pct,
            "external_percent": external_pct,
            "doc_percent": doc_pct,
            "beta_core_percent": beta_core_pct,
            "ga_full_percent": ga_full_pct,
        },
        ensure_ascii=True,
    )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
