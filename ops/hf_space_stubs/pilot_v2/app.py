from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI
import uvicorn


app = FastAPI(title="GODMODE Pilot v2 Stub")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "godmode-pilot-v2-stub",
        "time": now_iso(),
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "healthy",
        "service": "godmode-pilot-v2-stub",
        "time": now_iso(),
    }


@app.post("/run")
def run(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "accepted",
        "service": "godmode-pilot-v2-stub",
        "payload": payload,
        "time": now_iso(),
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port)
