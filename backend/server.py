import os, json, sqlite3, subprocess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

USE_OLLAMA = os.getenv("USE_OLLAMA", "0") == "1"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:13b")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DB_PATH = os.getenv("DB_PATH", "./chat_history.db")

app = FastAPI()

# CORS (for local dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, messages TEXT)''')
    conn.commit()
    conn.close()
init_db()

class ChatRequest(BaseModel):
    conv_id: str = None
    message: str
    system_prompt: str = None

@app.post("/chat")
async def chat(req: ChatRequest):
    system_prompt = req.system_prompt or "You are ZM-AI, a helpful assistant."
    conv_id = req.conv_id or "default"
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT messages FROM conversations WHERE id = ?", (conv_id,))
    row = cur.fetchone()
    history = json.loads(row[0]) if row else []
    history.append({"role": "user", "content": req.message})

    if USE_OLLAMA:
        combined = system_prompt + "\n\n" + "\n".join([f"{m['role']}: {m['content']}" for m in history])
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
    else:
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        import requests
        messages = [{"role": "system", "content": system_prompt}] + history
        res = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={"model": "gpt-4o-mini", "messages": messages, "max_tokens": 500}
        )
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail=res.text)
        reply = res.json()["choices"][0]["message"]["content"]

    history.append({"role": "assistant", "content": reply})
    cur.execute("REPLACE INTO conversations (id, messages) VALUES (?, ?)", (conv_id, json.dumps(history)))
    conn.commit()
    conn.close()
    return {"reply": reply, "conv_id": conv_id}

# ---- Serve frontend (React build) ----
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    index_path = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Not Found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
