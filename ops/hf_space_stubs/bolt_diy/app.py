from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn


class MissionPayload(BaseModel):
    agent: str = "unknown"
    task: str = ""
    source: str = "unknown"
    repo: str = ""
    ref: str = "main"
    status: str = "queued"
    timestamp: str = ""


app = FastAPI(title="GODMODE bolt.diy Stub")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "bolt-diy-godmode-stub",
        "time": now_iso(),
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "healthy",
        "service": "bolt-diy-godmode-stub",
        "time": now_iso(),
    }


@app.post("/dispatch")
def dispatch(payload: MissionPayload) -> dict[str, Any]:
    return {
        "status": "forwarded",
        "target": "bolt-diy-godmode-stub",
        "received": payload.model_dump(),
        "time": now_iso(),
    }


@app.post("/trigger")
def trigger(payload: MissionPayload) -> dict[str, Any]:
    return {
        "status": "accepted",
        "target": "bolt-diy-godmode-stub",
        "received": payload.model_dump(),
        "time": now_iso(),
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "7860"))
    uvicorn.run(app, host="0.0.0.0", port=port)
