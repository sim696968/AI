# FastAPI server (with CORS + OpenAI / Ollama support)
import os
import json
import sqlite3
import subprocess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
USE_OLLAMA = os.getenv("USE_OLLAMA", "1") == "1"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:13b")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DB_PATH = os.getenv("DB_PATH", "./chat_history.db")

# Initialize FastAPI
app = FastAPI()

# --- ✅ Enable CORS so frontend (http://localhost:5173) can access backend ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can change this to ["http://localhost:5173"] for stricter security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Initialize SQLite database ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        messages TEXT
    )''')
    conn.commit()
    conn.close()

init_db()

# --- Request schema ---
class ChatRequest(BaseModel):
    conv_id: str | None = None
    message: str
    system_prompt: str | None = None

# --- Chat endpoint ---
@app.post("/chat")
async def chat(req: ChatRequest):
    # Load system prompt
    try:
        system_prompt = req.system_prompt or open("system_prompt.txt", "r", encoding="utf-8").read()
    except FileNotFoundError:
        system_prompt = "You are GF-AI, a helpful assistant."

    conv_id = req.conv_id or "default"

    # Retrieve conversation history
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT messages FROM conversations WHERE id = ?", (conv_id,))
    row = cur.fetchone()
    history = json.loads(row[0]) if row else []
    history.append({"role": "user", "content": req.message})

    # --- Ollama (offline mode) ---
    if USE_OLLAMA:
        combined = system_prompt + "\n\n"
        for m in history:
            combined += f"{m['role'].upper()}: {m['content']}\n"
        try:
            proc = subprocess.run(
                ["ollama", "run", OLLAMA_MODEL, combined],
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=120
            )
            reply = proc.stdout.strip()
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"Ollama error: {e.stderr}")

    # --- OpenAI (online mode) ---
    else:
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")

        import requests
        messages = [{"role": "system", "content": system_prompt}] + history
        res = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": "gpt-4o-mini",
                "messages": messages,
                "max_tokens": 800,
                "temperature": 0.2,
            },
        )

        if res.status_code != 200:
            raise HTTPException(status_code=500, detail=res.text)

        data = res.json()
        reply = data["choices"][0]["message"]["content"]

    # --- Save conversation ---
    history.append({"role": "assistant", "content": reply})
    cur.execute("REPLACE INTO conversations (id, messages) VALUES (?, ?)", (conv_id, json.dumps(history)))
    conn.commit()
    conn.close()

    return {"reply": reply, "conv_id": conv_id}


# --- Start server ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
