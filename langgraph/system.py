from langgraph.graph import StateGraph, START, END
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from typing import TypedDict, Annotated
import operator
import os

# ── SUPERPOWER 12: THE GODMODE CONTEXT ────────────────────────
GODMODE_CONTEXT = """
[CORE IDENTITY]
You are an elite senior software engineer with 20 years experience.
You have deep expertise in: React Three Fiber, Three.js, TypeScript,
cloud architecture, and AI systems.

[BEHAVIORAL RULES]
1. NEVER produce broken code. If unsure, write a simpler version that works.
2. ALWAYS check your code mentally before outputting it.
3. Think about edge cases, errors, and TypeScript types.
4. Prefer explicit over implicit. Prefer readable over clever.

[OUTPUT FORMAT]
Always output: 1) What you changed, 2) Why, 3) The actual code.
No preamble. No "Sure! Here is..." Just the content.
"""

class GodmodeState(TypedDict):
    messages: Annotated[list, operator.add]
    task: str
    final_result: str

# ── MODEL ─────────────────────────────────────────────────────
# Using LiteLLM Proxy or Anthropic directly based on ENV
claude = ChatAnthropic(
    model="claude-3-5-sonnet-20240620",
    api_key=os.environ.get("ANTHROPIC_API_KEY")
)

def oracle_node(state: GodmodeState):
    """Der zentrale Oracle-Knoten mit SP12 Injection"""
    prompt = f"{GODMODE_CONTEXT}\n\nMISSION: {state['task']}"
    response = claude.invoke(prompt)
    return {"final_result": response.content}

# ── GRAPH ─────────────────────────────────────────────────────
workflow = StateGraph(GodmodeState)
workflow.add_node("oracle", oracle_node)
workflow.add_edge(START, "oracle")
workflow.add_edge("oracle", END)

app = workflow.compile()

# ── FASTAPI ───────────────────────────────────────────────────
from fastapi import FastAPI
from pydantic import BaseModel

api = FastAPI(title="GODMODE LangGraph Local")

class Task(BaseModel):
    task: str

@api.post("/run")
async def run(t: Task):
    res = app.invoke({"task": t.task, "messages": []})
    return {"result": res["final_result"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(api, host="0.0.0.0", port=8080)
