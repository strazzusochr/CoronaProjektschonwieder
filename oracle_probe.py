from __future__ import annotations

import json
import os
import socket
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

EVIDENCE_DIR = Path("d:/Web/docs/godmode_setup/.godmode_runtime/evidence")
PORTS = [22, 3000, 3001, 4000, 5678, 8080, 11434]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def probe_tcp(host: str, port: int, timeout: float = 4.0) -> dict[str, Any]:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        code = sock.connect_ex((host, port))
        return {"port": port, "open": code == 0, "connect_ex": code}
    except Exception as exc:  # pragma: no cover - runtime path
        return {"port": port, "open": False, "error": str(exc)}
    finally:
        sock.close()


def main() -> int:
    timestamp = now_iso()
    verify_enabled = os.environ.get("ORACLE_VERIFY_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}
    verify_force = os.environ.get("ORACLE_VERIFY_FORCE", "false").strip().lower() in {"1", "true", "yes", "on"}
    oracle_ip = os.environ.get("ORACLE_IP", "").strip()
    oracle_enabled = os.environ.get("ORACLE_ENABLED", "false").strip().lower() in {"1", "true", "yes", "on"}
    oracle_placeholder = os.environ.get("ORACLE_PLACEHOLDER", "true").strip().lower() in {"1", "true", "yes", "on"}

    if not verify_enabled:
        payload = {
            "timestamp": timestamp,
            "status": "SKIPPED",
            "reason": "ORACLE_VERIFY_ENABLED is false",
        }
    elif (not oracle_enabled) and oracle_placeholder and (not verify_force):
        payload = {
            "timestamp": timestamp,
            "status": "SKIPPED",
            "reason": "Oracle profile is disabled placeholder (future profile only)",
            "oracle_enabled": oracle_enabled,
            "oracle_placeholder": oracle_placeholder,
            "hint": "Set ORACLE_VERIFY_FORCE=true to force network probing.",
        }
    elif not oracle_ip or "replace-with" in oracle_ip or "placeholder" in oracle_ip:
        payload = {
            "timestamp": timestamp,
            "status": "BLOCKED",
            "reason": "ORACLE_IP is missing or placeholder",
            "oracle_enabled": oracle_enabled,
            "oracle_placeholder": oracle_placeholder,
        }
    else:
        probes = [probe_tcp(oracle_ip, port) for port in PORTS]
        ssh_ok = next((item["open"] for item in probes if item["port"] == 22), False)
        service_ok = any(item["open"] for item in probes if item["port"] != 22)
        gate = "PASS" if ssh_ok and service_ok else "BLOCKED"
        payload = {
            "timestamp": timestamp,
            "status": gate,
            "oracle_ip": oracle_ip,
            "oracle_enabled": oracle_enabled,
            "oracle_placeholder": oracle_placeholder,
            "ssh_gate": "PASS" if ssh_ok else "BLOCKED",
            "service_gate": "PASS" if service_ok else "BLOCKED",
            "probes": probes,
        }

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    stamp = timestamp.replace(":", "-").replace(".", "-")
    out_file = EVIDENCE_DIR / f"oracle_probe_{stamp}.json"
    latest_file = EVIDENCE_DIR / "oracle_probe_latest.json"
    out_file.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")
    latest_file.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")

    print(json.dumps({"status": "ok", "snapshot": str(out_file), "oracle_status": payload.get("status")}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
