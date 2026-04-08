from fastapi import FastAPI
import os
import time
import requests
import subprocess
import threading
import uvicorn

app = FastAPI()

# --- CONFIGURATION FROM SECRETS ---
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
GITHUB_USER = "strazzusochr"
REPO_NAME = "CoronaProjektschonwieder"
N8N_WEBHOOK = os.environ.get("N8N_WEBHOOK_URL")

REPO_URL = f"https://github.com/{GITHUB_USER}/{REPO_NAME}.git"
WORKDIR = "/tmp/workspace"

def clone_or_pull():
    if not os.path.exists(WORKDIR):
        print(f"Cloning {REPO_NAME}...", flush=True)
        subprocess.run(["git", "clone", REPO_URL, WORKDIR], check=True)
    else:
        print("Syncing with origin/main [FORCE]...", flush=True)
        # Fetch latest and force reset to ground truth
        subprocess.run(["git", "-C", WORKDIR, "fetch", "origin"], check=True)
        subprocess.run(["git", "-C", WORKDIR, "reset", "--hard", "origin/main"], check=True)
    
    # Log current state
    sha = subprocess.check_output(["git", "-C", WORKDIR, "rev-parse", "HEAD"]).decode().strip()
    print(f"Current SHA: {sha}", flush=True)

def read_goal():
    goal_path = os.path.join(WORKDIR, "GODMODE_GOAL.md")
    if os.path.exists(goal_path):
        with open(goal_path, "r") as f:
            return f.read().strip()
    return "No goal set."

def mark_processed(goal):
    goal_path = os.path.join(WORKDIR, "GODMODE_GOAL.md")
    content = f"PROCESSED: {goal}"
    with open(goal_path, "w") as f:
        f.write(content)
    subprocess.run(["git", "-C", WORKDIR, "add", "GODMODE_GOAL.md"], check=True)
    subprocess.run(["git", "-C", WORKDIR, "commit", "-m", "chore: mark goal as processed [autonomous]"], check=True)
    subprocess.run(["git", "-C", WORKDIR, "push"], check=True)

def trigger_agent(goal):
    print(f"Triggering Agent for: {goal[:50]}...", flush=True)
    payload = {"task": goal, "repo": f"https://github.com/{GITHUB_USER}/{REPO_NAME}"}
    try:
        if N8N_WEBHOOK:
            requests.post(N8N_WEBHOOK, json=payload, timeout=10)
        return True
    except Exception as e:
        print(f"Error triggering agent: {e}", flush=True)
        return False

def autonomous_loop():
    print("GODMODE AUTO-LOOP: STARTING", flush=True)
    # Configure Git
    subprocess.run(["git", "config", "--global", "user.email", "pilot@godmode.cloud"])
    subprocess.run(["git", "config", "--global", "user.name", "Godmode Pilot"])
    
    while True:
        try:
            clone_or_pull()
            goal = read_goal()
            
            if not goal.startswith("PROCESSED:") and not goal.startswith("DONE:") and goal != "No goal set.":
                if trigger_agent(goal):
                    mark_processed(goal)
            else:
                print(f"IDLE: Status [{goal[:20]}]", flush=True)
                
        except Exception as e:
            print(f"LOOP ERROR: {e}", flush=True)
            
        time.sleep(60)

@app.get("/")
def health():
    return {"status": "online", "goal": read_goal()[:50]}

if __name__ == "__main__":
    # Start loop in background
    threading.Thread(target=autonomous_loop, daemon=True).start()
    # Start web server
    uvicorn.run(app, host="0.0.0.0", port=7860)
