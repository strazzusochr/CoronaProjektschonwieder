from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import lancedb
import pandas as pd
import os
import time

app = FastAPI()

# Ensure data directory exists
os.makedirs("data/lancedb", exist_ok=True)

# LanceDB Vector Database Initialization
db = lancedb.connect("data/lancedb")
table_name = "agent_memories"

# Initialize table if not exists
if table_name not in db.table_names():
    # Schema for agent memories
    schema = {
        "vector": [0.0] * 128, # Placeholder for embeddings
        "agent_id": "str",
        "action": "str",
        "timestamp": 0.0
    }
    db.create_table(table_name, data=[schema])

table = db.open_table(table_name)

class AgentState(BaseModel):
    agent_id: str
    x: float
    y: float
    z: float
    mood: str = "NEUTRAL"

@app.get("/")
async def root():
    return {"status": "V4 AI_ENGINE ACTIVE", "engine": "Python 3.14.3", "db": "LanceDB Connected"}

# V4 Pro: Multi-Agent AI Logic
@app.post("/decide_npcs")
async def decide_npcs(request: Request):
    data = await request.json()
    npcs = data.get("npcs", {})
    env = data.get("environment", {"tension": 0.1})
    
    updated_npcs = {}
    
    for npc_id, npc in npcs.items():
        pos = npc.get("position", [0, 0, 0])
        action = npc.get("action", "IDLE")
        
        # Simple Simulation Logic (WANDER)
        # Wir verschieben die Position leicht zufällig
        dx = (random.random() - 0.5) * 0.2
        dz = (random.random() - 0.5) * 0.2
        
        new_pos = [
            pos[0] + dx,
            pos[1], # Y bleibt am Boden
            pos[2] + dz
        ]
        
        # Grenzen checken (Grid Box)
        if abs(new_pos[0]) > 10: new_pos[0] = pos[0]
        if abs(new_pos[2]) > 10: new_pos[2] = pos[2]
        
        updated_npcs[npc_id] = {
            "id": npc_id,
            "position": new_pos,
            "action": "WANDER" if random.random() > 0.1 else "IDLE",
            "mood": "NEUTRAL",
            "type": npc.get("type", "civilian")
        }
    
    return {"updated_npcs": updated_npcs, "timestamp": time.time()}

@app.get("/health")
async def health():
    return {"status": "ok", "version": "V4.0-PRO"}

@app.post("/decide")
async def decide_action(state: AgentState):
    # Simple Agent Logic: Move towards the center if far
    dist = (state.x**2 + state.y**2 + state.z**2)**0.5
    
    action = "WANDER"
    if dist > 5:
        action = "RETURN_TO_CENTER"
    elif state.mood == "AGITATED":
        action = "PROTEST"
    
    # Store memory in LanceDB
    memory_data = pd.DataFrame([{
        "vector": [0.0] * 128,
        "agent_id": state.agent_id,
        "action": action,
        "timestamp": time.time()
    }])
    table.add(memory_data)
    
    return {
        "agent_id": state.agent_id,
        "suggested_action": action,
        "new_target": [0, 1, 0] if action == "RETURN_TO_CENTER" else None
    }
