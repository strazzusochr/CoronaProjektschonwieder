from __future__ import annotations

import base64
import os
from pathlib import Path

import anthropic
import gradio as gr
from smolagents import (
    CodeAgent,
    DuckDuckGoSearchTool,
    FinalAnswerTool,
    HfApiModel,
    PythonInterpreterTool,
    Tool,
    ToolCallingAgent,
    VisitWebpageTool,
)
from smolagents.agents import ManagedAgent

GODMODE_CONTEXT = """
You are operating inside the GODMODE stack.
- Prefer repo-aware, verifiable recommendations.
- When browsing or researching, return implementation-ready findings.
- When coding, favor explicit fixes and browser-verifiable outcomes.
"""


class VisualDebugTool(Tool):
    name = "visual_inspector"
    description = "Analysiert einen Screenshot der laufenden App und findet Bugs."
    inputs = {
        "screenshot_path": {
            "type": "string",
            "description": "Pfad zu einer PNG-Datei",
        }
    }
    output_type = "string"

    def forward(self, screenshot_path: str) -> str:
        path = Path(screenshot_path)
        if not path.exists():
            return f"Screenshot nicht gefunden: {path}"

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return (
                "Visual inspection is unavailable because ANTHROPIC_API_KEY is not set. "
                "Provide the key via .godmode_env or Hugging Face Space secrets."
            )

        try:
            with path.open("rb") as handle:
                image_b64 = base64.b64encode(handle.read()).decode()

            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model=os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-20240620"),
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": image_b64,
                                },
                            },
                            {
                                "type": "text",
                                "text": (
                                    "Analysiere diese Web App. Finde Bugs, Performance-Probleme "
                                    "und UX-Issues. Gib nur die wichtigsten Befunde zurueck."
                                ),
                            },
                        ],
                    }
                ],
            )
            return response.content[0].text
        except Exception as exc:  # pragma: no cover - remote API behaviour
            return f"Fehler bei visueller Analyse: {exc}"


def build_model() -> HfApiModel:
    return HfApiModel(
        model_id=os.environ.get("SMOLAGENTS_MODEL_ID", "anthropic/claude-sonnet-4-5"),
        token=os.environ.get("HF_TOKEN"),
        base_url=os.environ.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1"),
        api_key=os.environ.get("OPENROUTER_API_KEY"),
    )


def build_agents() -> tuple[CodeAgent, ToolCallingAgent, CodeAgent]:
    model = build_model()
    answer_tool = FinalAnswerTool()
    web_agent = ToolCallingAgent(
        tools=[DuckDuckGoSearchTool(), VisitWebpageTool(), answer_tool],
        model=model,
        name="WebResearcher",
        description="Searches the web and extracts advanced developer information",
        max_steps=15,
    )
    code_agent = CodeAgent(
        tools=[PythonInterpreterTool(), VisualDebugTool(), answer_tool],
        model=model,
        name="CodeWriter",
        description="Writes, executes, and visually debugs code",
        max_steps=25,
        additional_authorized_imports=["json", "math", "os", "re"],
    )
    manager_agent = CodeAgent(
        tools=[answer_tool],
        model=model,
        managed_agents=[
            ManagedAgent(agent=web_agent, name="web_researcher"),
            ManagedAgent(agent=code_agent, name="code_writer"),
        ],
        name="GODMODE_Manager",
        max_steps=50,
    )
    return manager_agent, web_agent, code_agent


def run_agent(prompt: str, agent_type: str) -> str:
    prompt = prompt.strip()
    if not prompt:
        return "Bitte gib zuerst eine Mission ein."

    try:
        manager_agent, web_agent, code_agent = build_agents()
    except Exception as exc:
        return f"Agent bootstrap failed: {exc}"

    enriched_prompt = f"{GODMODE_CONTEXT}\n\nMISSION:\n{prompt}"

    if agent_type == "Manager (Multi-Agent)":
        result = manager_agent.run(enriched_prompt)
    elif agent_type == "Web Research":
        result = web_agent.run(enriched_prompt)
    else:
        result = code_agent.run(enriched_prompt)
    return str(result)


with gr.Blocks(title="GODMODE Agents", theme=gr.themes.Soft()) as demo:
    gr.Markdown(
        "# GODMODE Multi-Agent System (smolagents)\n"
        "Web research, code execution, and screenshot-based visual debugging."
    )
    with gr.Row():
        agent_selector = gr.Dropdown(
            ["Manager (Multi-Agent)", "Web Research", "Code Writer"],
            value="Manager (Multi-Agent)",
            label="Agent auswaehlen",
        )
    prompt_input = gr.Textbox(label="Mission", lines=3)
    run_btn = gr.Button("STARTEN", variant="primary")
    output = gr.Textbox(label="Ergebnis", lines=15)
    run_btn.click(run_agent, [prompt_input, agent_selector], output)


if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
