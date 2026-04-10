from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib import request

EVIDENCE_DIR = Path("d:/Web/docs/godmode_setup/.godmode_runtime/evidence")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_json(url: str, timeout: int = 25) -> dict:
    with request.urlopen(request.Request(url=url, method="GET"), timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8", errors="replace"))


def post_json(url: str, payload: dict, timeout: int = 25) -> dict:
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    req = request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8", errors="replace"))


def main() -> int:
    base_url = os.environ.get("BOLTDIY_FACADE_URL", "http://127.0.0.1:3901").rstrip("/")
    timestamp = now_iso()
    payload = {
        "agent": "Aider-Cloud",
        "task": "Verify bolt facade dispatch path",
        "source": "hf_pilot_actual",
        "repo": "https://github.com/strazzusochr/CoronaProjektschonwieder",
        "ref": "main",
        "status": "triggered",
        "timestamp": timestamp,
    }
    proof_payload = {
        "scenario": "bolt-facade-api-smoke",
        "result": "PASS",
        "notes": "Automated local smoke check for health/dispatch/proof endpoints.",
        "metadata": {"runner": "verify_bolt_facade.py"},
    }

    health = get_json(f"{base_url}/health")
    dispatch = post_json(f"{base_url}/dispatch", payload, timeout=45)
    proof = post_json(f"{base_url}/proof", proof_payload, timeout=45)

    result = {
        "timestamp": timestamp,
        "base_url": base_url,
        "health": health,
        "dispatch": dispatch,
        "proof": proof,
    }

    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    stamp = timestamp.replace(":", "-").replace(".", "-")
    out_file = EVIDENCE_DIR / f"bolt_facade_api_{stamp}.json"
    latest_file = EVIDENCE_DIR / "bolt_facade_api_latest.json"
    out_file.write_text(json.dumps(result, ensure_ascii=True, indent=2), encoding="utf-8")
    latest_file.write_text(json.dumps(result, ensure_ascii=True, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "status": "ok",
                "snapshot": str(out_file),
                "dispatch_status": dispatch.get("status"),
                "proof_status": proof.get("status"),
            },
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

