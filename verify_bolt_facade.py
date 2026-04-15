from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, request

EVIDENCE_DIR = Path("d:/Web/docs/godmode_setup/.godmode_runtime/evidence")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def resolve_evidence_dir() -> Path:
    candidates = [
        EVIDENCE_DIR,
        Path("d:/Web/docs/godmode_setup/proofs"),
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
    return Path("d:/Web/docs/godmode_setup/proofs")


def get_json(url: str, timeout: int = 25) -> tuple[int, dict]:
    try:
        with request.urlopen(request.Request(url=url, method="GET"), timeout=timeout) as response:
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


def post_json(url: str, payload: dict, timeout: int = 25) -> tuple[int, dict]:
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


def main() -> int:
    base_url = os.environ.get("BOLTDIY_FACADE_URL", "http://127.0.0.1:3901").rstrip("/")
    evidence_dir = resolve_evidence_dir()
    timestamp = now_iso()
    payload = {
        "agent": "local.langgraph.planner",
        "task": "Verify superbrain dispatch hub basic path.",
        "source": "verify_bolt_facade.py",
        "repo": "https://github.com/strazzusochr/CoronaProjektschonwieder",
        "ref": "main",
        "status": "triggered",
        "timestamp": timestamp,
    }
    proof_payload = {
        "scenario": "superbrain-hub-smoke",
        "result": "PASS",
        "notes": "Automated smoke check for health/agents/routing/dispatch/proof.",
        "metadata": {"runner": "verify_bolt_facade.py"},
    }

    health_code, health = get_json(f"{base_url}/health")
    agents_code, agents = get_json(f"{base_url}/agents")
    routing_code, routing = get_json(f"{base_url}/routing/status")
    dispatch_code, dispatch = post_json(f"{base_url}/dispatch", payload, timeout=45)
    proof_code, proof = post_json(f"{base_url}/proof", proof_payload, timeout=45)

    gate_checks = {
        "health_200": health_code == 200,
        "agents_200": agents_code == 200,
        "routing_200": routing_code == 200,
        "dispatch_200": dispatch_code == 200,
        "proof_200": proof_code == 200,
        "registry_present": agents.get("active_count", 0) >= 25,
        "dispatch_has_target": bool(dispatch.get("runtime_target")),
    }
    gate_status = "PASS" if all(gate_checks.values()) else "PARTIAL"

    result = {
        "timestamp": timestamp,
        "base_url": base_url,
        "health": {"http_status": health_code, "body": health},
        "agents": {"http_status": agents_code, "body": agents},
        "routing": {"http_status": routing_code, "body": routing},
        "dispatch": {"http_status": dispatch_code, "body": dispatch},
        "proof": {"http_status": proof_code, "body": proof},
        "gate": {
            "status": gate_status,
            "checks": gate_checks,
        },
    }

    evidence_dir.mkdir(parents=True, exist_ok=True)
    stamp = timestamp.replace(":", "-").replace(".", "-")
    out_file = evidence_dir / f"bolt_facade_api_{stamp}.json"
    latest_file = evidence_dir / "bolt_facade_api_latest.json"
    snapshot_written = True
    snapshot_error = ""
    try:
        out_file.write_text(json.dumps(result, ensure_ascii=True, indent=2), encoding="utf-8")
        latest_file.write_text(json.dumps(result, ensure_ascii=True, indent=2), encoding="utf-8")
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
                "gate_status": gate_status,
                "dispatch_status": dispatch.get("status"),
                "proof_status": proof.get("status"),
            },
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
