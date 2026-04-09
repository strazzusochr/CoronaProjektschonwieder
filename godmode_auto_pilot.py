import os
import requests
import json
import time

# --- CONFIGURATION ---
GOALS_FILE = "GODMODE_GOAL.md"
MEMORY_VAULT = "memory_vault.md"
HF_SPACE_URL = "https://wrzzzrzr-aider-godmode-safe.hf.space"  # Aider IDE URL

def read_current_goal():
    if os.path.exists(GOALS_FILE):
        with open(GOALS_FILE, "r") as f:
            return f.read().strip()
    return "No goal set."

def trigger_cloud_agent(task):
    print(f"GODMODE_PILOT: Triggering Cloud Agent for task: {task}", flush=True)
    # In a real autonomous loop, this would use SSH or a direct API.
    # For this simulation, we log the intent and prepare the n8n webhook payload.
    payload = {
        "agent": "Aider-Cloud",
        "task": task,
        "timestamp": time.time(),
        "status": "triggered"
    }
    
    # Simulate sending to n8n Phantom Trigger
    print("GODMODE_PILOT: Sending payload to n8n Phantom Trigger...", flush=True)
    # requests.post(os.environ.get("N8N_WEBHOOK_URL"), json=payload)
    
    return True

def main():
    print("GODMODE_PILOT: ACTIVATED", flush=True)
    while True:
        goal = read_current_goal()
        
        # Only process if it is a new goal (doesn't start with PROCESSED or DONE)
        if not goal.startswith("PROCESSED:") and not goal.startswith("DONE:") and goal != "No goal set.":
            print(f"Processing New Goal: {goal[:50]}...", flush=True)
            success = trigger_cloud_agent(goal)
            if success:
                print("Goal triggered successfully.", flush=True)
                # Mark as processing
                with open(GOALS_FILE, "w") as f:
                    f.write(f"PROCESSED: {goal}")
        else:
            print(f"Waiting... Current Status: {goal[:20]}...", flush=True)
        
        print("Sleeping for 60 seconds... (Autonomous Monitoring)", flush=True)
        time.sleep(60)

if __name__ == "__main__":
    main()
