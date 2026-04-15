from __future__ import annotations

import json
import operator
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Annotated, Any

from fastapi import FastAPI
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel
from typing_extensions import TypedDict

# SUPERPOWER 12: shared context injection for every orchestrated node.
GODMODE_CONTEXT = """
[CORE IDENTITY]
You are an elite senior software engineer with 20 years experience.
You have deep expertise in: React Three Fiber, Three.js, TypeScript,
cloud architecture, multi-agent systems, and operational debugging.

[BEHAVIORAL RULES]
1. NEVER produce broken code on purpose.
2. VERIFY the likely runtime path before recommending changes.
3. Prefer explicit contracts and recoverable behavior over magic.
4. Keep outputs concise, implementation-focused, and production-minded.

[CURRENT STACK]
- Canonical repo root: d:/Web/docs/godmode_setup
- Canonical frontend: CoronaProjektschonwieder
- Canonical pilot: hf_pilot_actual
- External-only canonical bolt.diy on Hugging Face
- Mission proof files: GODMODE_GOAL.md, FINAL_PROOF.md, memory_vault.md
"""

REPO_ROOT = Path(__file__).resolve().parents[1]
PROMPT_EVOLUTION_PATH = Path(
    os.environ.get(
        "PROMPT_EVOLUTION_PATH",
        str(REPO_ROOT / "langgraph" / "prompt_evolution.json"),
    )
)


class GodmodeState(TypedDict, total=False):
    messages: Annotated[list[str], operator.add]
    task: str
    plan: str
    swarm_outputs: dict[str, str]
    review: str
    prompt_evolution: dict[str, str]
    final_result: str
    backend: str


class Task(BaseModel):
    task: str
    source: str = "langgraph-api"
    ref: str = "main"


def _get_backend() -> tuple[str, Any | None]:
    # 1. Prioritize LiteLLM Router for fallbacks and cost-based routing
    openai_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("LITELLM_API_KEY") or "sk-dummy"
    openai_base = os.environ.get("OPENAI_BASE_URL") or os.environ.get("LITELLM_URL")
    if openai_base:
        return (
            "openai-compatible",
            ChatOpenAI(
                model=os.environ.get("MODEL_ROUTER_NAME", "smart-router"),
                api_key=openai_key,
                base_url=openai_base,
            ),
        )

    # 2. Fallback to direct Anthropic API if explicitly required
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if anthropic_key:
        return (
            "anthropic",
            ChatAnthropic(
                model=os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20240620"),
                api_key=anthropic_key,
            ),
        )

    return ("offline-fallback", None)


def _offline_response(role: str, prompt: str, reason: str | None = None) -> str:
    suffix = ""
    if reason:
        compact_reason = " ".join(reason.split())
        suffix = f" :: degraded from live backend: {compact_reason[:220]}"
    return f"[offline:{role}] {prompt[:220]} :: fallback response generated without live model keys.{suffix}"


def _invoke(role: str, prompt: str) -> tuple[str, str]:
    backend, client = _get_backend()
    if client is None:
        return (backend, _offline_response(role, prompt))

    try:
        response = client.invoke(f"{GODMODE_CONTEXT}\n\n[{role.upper()}]\n{prompt}")
    except Exception as exc:
        return (f"{backend}-degraded", _offline_response(role, prompt, reason=str(exc)))

    content = getattr(response, "content", response)
    if isinstance(content, list):
        text = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )
        return (backend, text)
    return (backend, str(content))


def planner_node(state: GodmodeState) -> GodmodeState:
    backend, plan = _invoke(
        "planner",
        (
            "Create a high-signal execution plan for this mission. "
            "Include platform steps, code path, verification path, and proof path.\n\n"
            f"MISSION: {state['task']}"
        ),
    )
    return {"plan": plan, "messages": [plan], "backend": backend}


def swarm_node(state: GodmodeState) -> GodmodeState:
    prompts = {
        "research": (
            "Collect implementation constraints, integration touchpoints, and external "
            f"dependencies for this mission.\n\nPLAN:\n{state['plan']}"
        ),
        "performance": (
            "Focus on runtime, startup, health checks, and failure isolation for the "
            f"same mission.\n\nPLAN:\n{state['plan']}"
        ),
        "ui_review": (
            "Focus on browser verification, operator visibility, and UX-facing "
            f"stability concerns.\n\nPLAN:\n{state['plan']}"
        ),
    }

    swarm_outputs: dict[str, str] = {}
    backend_name = state.get("backend", "offline-fallback")

    def _run(item: tuple[str, str]) -> tuple[str, str, str]:
        name, prompt = item
        backend, result = _invoke(name, prompt)
        return name, backend, result

    with ThreadPoolExecutor(max_workers=3) as executor:
        for name, backend, result in executor.map(_run, prompts.items()):
            backend_name = backend
            swarm_outputs[name] = result

    return {
        "swarm_outputs": swarm_outputs,
        "messages": list(swarm_outputs.values()),
        "backend": backend_name,
    }


def reviewer_node(state: GodmodeState) -> GodmodeState:
    review_prompt = (
        "Review this GODMODE execution packet. Highlight the safest implementation "
        "path, missing contracts, and final acceptance criteria.\n\n"
        f"PLAN:\n{state['plan']}\n\nSWARM:\n{json.dumps(state['swarm_outputs'], indent=2)}"
    )
    backend, review = _invoke("reviewer", review_prompt)
    return {"review": review, "messages": [review], "backend": backend}


def meta_optimizer_node(state: GodmodeState) -> GodmodeState:
    evolution = {
        "planner_prompt": "Prefer implementation-safe plans with explicit proof steps.",
        "swarm_prompt": "Split work into research, runtime/perf, and UX/operator concerns.",
        "reviewer_prompt": "Prefer risk-first verification guidance and concrete acceptance.",
        "last_backend": state.get("backend", "offline-fallback"),
    }

    meta_prompt = (
        "Summarize how this orchestration should improve next time. Return concise "
        "prompt-improvement guidance.\n\n"
        f"REVIEW:\n{state['review']}"
    )
    _, meta_response = _invoke("meta-optimizer", meta_prompt)
    evolution["last_meta_summary"] = meta_response

    PROMPT_EVOLUTION_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROMPT_EVOLUTION_PATH.write_text(
        json.dumps(evolution, indent=2) + "\n",
        encoding="utf-8",
    )
    return {
        "prompt_evolution": evolution,
        "messages": [meta_response],
    }


def finalize_node(state: GodmodeState) -> GodmodeState:
    final_result = (
        f"PLAN\n{state['plan']}\n\n"
        f"REVIEW\n{state['review']}\n\n"
        f"SWARM\n{json.dumps(state['swarm_outputs'], indent=2)}"
    )
    return {"final_result": final_result}


workflow = StateGraph(GodmodeState)
workflow.add_node("planner", planner_node)
workflow.add_node("swarm", swarm_node)
workflow.add_node("reviewer", reviewer_node)
workflow.add_node("meta_optimizer", meta_optimizer_node)
workflow.add_node("finalize", finalize_node)
workflow.add_edge(START, "planner")
workflow.add_edge("planner", "swarm")
workflow.add_edge("swarm", "reviewer")
workflow.add_edge("reviewer", "meta_optimizer")
workflow.add_edge("meta_optimizer", "finalize")
workflow.add_edge("finalize", END)
graph_app = workflow.compile()

api = FastAPI(title="GODMODE LangGraph Local")


@api.get("/")
def root() -> dict[str, str]:
    return {"status": "LangGraph GODMODE API is ONLINE", "state": "Running"}


@api.get("/health")
def health() -> dict[str, Any]:
    backend, _ = _get_backend()
    return {
        "status": "healthy",
        "backend": backend,
        "prompt_evolution_path": str(PROMPT_EVOLUTION_PATH),
        "prompt_evolution_exists": PROMPT_EVOLUTION_PATH.exists(),
    }


@api.post("/run")
async def run(t: Task) -> dict[str, Any]:
    result = graph_app.invoke({"task": t.task, "messages": []})
    return {
        "status": "ok",
        "backend": result.get("backend", "offline-fallback"),
        "plan": result.get("plan", ""),
        "swarm_outputs": result.get("swarm_outputs", {}),
        "review": result.get("review", ""),
        "result": result.get("final_result", ""),
        "prompt_evolution_path": str(PROMPT_EVOLUTION_PATH),
    }


@api.post("/execute")
async def execute(t: Task) -> dict[str, Any]:
    return await run(t)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(api, host="0.0.0.0", port=int(os.environ.get("LANGGRAPH_PORT", "8080")))
