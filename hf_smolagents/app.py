import os
from smolagents import (
    CodeAgent, ToolCallingAgent, HfApiModel,
    DuckDuckGoSearchTool, VisitWebpageTool,
    PythonInterpreterTool, FinalAnswerTool, Tool
)
from smolagents.agents import ManagedAgent
import gradio as gr
import base64
import anthropic

# ── SUPERPOWER 9: VISION TOOL ────────────────────────────────
class VisualDebugTool(Tool):
    name = "visual_inspector"
    description = "Analysiert Screenshot der laufenden App und findet Bugs/Issues"
    inputs = {"screenshot_path": {"type": "string", "description": "Pfad zum Screenshot"}}
    output_type = "string"

    def forward(self, screenshot_path: str) -> str:
        try:
            with open(screenshot_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode()
            
            client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
            response = client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1024,
                messages=[{"role": "user", "content": [
                    {"type": "image", "source": {"type": "base64",
                     "media_type": "image/png", "data": img_b64}},
                    {"type": "text", "text": "Analysiere diese Web App. Finde Bugs, Performance-Probleme und UX-Issues."}
                ]}]
            )
            return response.content[0].text
        except Exception as e:
            return f"Fehler bei visueller Analyse: {str(e)}"

# ── MODELLE KONFIGURIEREN ─────────────────────────────────────
model_claude = HfApiModel(
    model_id="anthropic/claude-sonnet-4-5",
    token=os.environ.get("HF_TOKEN"),
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY")
)

# ── TOOLS DEFINIEREN ──────────────────────────────────────────
search_tool = DuckDuckGoSearchTool()
web_tool = VisitWebpageTool()
python_tool = PythonInterpreterTool()
answer_tool = FinalAnswerTool()
vision_tool = VisualDebugTool()

# ── AGENTEN ERSTELLEN ─────────────────────────────────────────

# Web Research Agent (Superpower 3)
web_agent = ToolCallingAgent(
    tools=[search_tool, web_tool, answer_tool],
    model=model_claude,
    name="WebResearcher",
    description="Searches the web and extracts advanced developer information",
    max_steps=15
)

# Code Writer Agent (Superpower 1)
code_agent = CodeAgent(
    tools=[python_tool, vision_tool, answer_tool],
    model=model_claude,
    name="CodeWriter",
    description="Writes, executes, and VISUALLY debugs code",
    max_steps=25,
    additional_authorized_imports=["numpy", "json", "os", "re", "math"]
)

# Manager Agent orchestriert alles
manager_agent = CodeAgent(
    tools=[answer_tool],
    model=model_claude,
    managed_agents=[
        ManagedAgent(agent=web_agent, name="web_researcher"),
        ManagedAgent(agent=code_agent, name="code_writer")
    ],
    name="GODMODE_Manager",
    max_steps=50
)

# ── GRADIO INTERFACE ──────────────────────────────────────────
def run_agent(prompt: str, agent_type: str):
    if agent_type == "Manager (Multi-Agent)":
        result = manager_agent.run(prompt)
    elif agent_type == "Web Research":
        result = web_agent.run(prompt)
    else:
        result = code_agent.run(prompt)
    return str(result)

with gr.Blocks(title="GODMODE Agents", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🤖 GODMODE Multi-Agent System (smolagents)")
    with gr.Row():
        agent_selector = gr.Dropdown(
            ["Manager (Multi-Agent)", "Web Research", "Code Writer"],
            value="Manager (Multi-Agent)", label="Agent auswählen"
        )
    prompt_input = gr.Textbox(label="Dein Task", lines=3)
    run_btn = gr.Button("🚀 STARTEN", variant="primary")
    output = gr.Textbox(label="Ergebnis", lines=15)
    run_btn.click(run_agent, [prompt_input, agent_selector], output)

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
