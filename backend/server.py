# backend/server.py
import os
import json
import sqlite3
import subprocess
import traceback
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

app = FastAPI(title="ZM-AI Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for production, change to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    # messages stored per conversation (JSON array)
    cur.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            messages TEXT
        )
    ''')
    # meta table for title, color, user_id
    cur.execute('''
        CREATE TABLE IF NOT EXISTS conversations_meta (
            id TEXT PRIMARY KEY,
            title TEXT,
            color TEXT,
            user_id TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# ---------- models ----------
class ChatRequest(BaseModel):
    conv_id: str | None = None
    message: str
    system_prompt: str | None = None

class NewConvRequest(BaseModel):
    title: str | None = None
    color: str | None = None
    user_id: str | None = None

# ---------- helpers ----------
def load_history(conv_id):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT messages FROM conversations WHERE id = ?", (conv_id,))
    row = cur.fetchone()
    conn.close()
    return json.loads(row[0]) if row and row[0] else []

def save_history(conv_id, history):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("REPLACE INTO conversations (id, messages) VALUES (?, ?)", (conv_id, json.dumps(history)))
    conn.commit()
    conn.close()

def get_meta(conv_id):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT title, color, user_id FROM conversations_meta WHERE id = ?", (conv_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        return {"title": row[0], "color": row[1], "user_id": row[2]}
    return None

def set_meta(conv_id, title=None, color=None, user_id=None):
    meta = get_meta(conv_id) or {}
    title = title if title is not None else meta.get("title", "New Chat")
    color = color if color is not None else meta.get("color", "#4A90E2")
    user_id = user_id if user_id is not None else meta.get("user_id", "")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("REPLACE INTO conversations_meta (id, title, color, user_id) VALUES (?, ?, ?, ?)",
                (conv_id, title, color, user_id))
    conn.commit()
    conn.close()

# ---------- API: conversation meta endpoints ----------
@app.post("/conversations")
async def create_conversation(req: NewConvRequest):
    new_id = f"conv_{int(os.times()[4] * 1000)}"
    title = req.title or "New Chat"
    color = req.color or "#4A90E2"
    user_id = req.user_id or ""
    # initialize empty history and meta
    save_history(new_id, [])
    set_meta(new_id, title=title, color=color, user_id=user_id)
    return {"id": new_id, "title": title, "color": color, "user_id": user_id}

@app.get("/conversations")
async def list_conversations(user_id: str | None = None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    if user_id:
        cur.execute("SELECT id, title, color FROM conversations_meta WHERE user_id = ?", (user_id,))
    else:
        cur.execute("SELECT id, title, color FROM conversations_meta")
    rows = cur.fetchall()
    conn.close()
    result = [{"id": r[0], "title": r[1], "color": r[2]} for r in rows]
    return {"conversations": result}

@app.get("/conversation/{conv_id}")
async def get_conversation(conv_id: str):
    history = load_history(conv_id)
    meta = get_meta(conv_id) or {"title": "New Chat", "color": "#4A90E2", "user_id": ""}
    return {"id": conv_id, "messages": history, "meta": meta}

@app.post("/conversation/{conv_id}/rename")
async def rename_conversation(conv_id: str, body: dict):
    title = body.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Missing title")
    meta = get_meta(conv_id)
    if not meta:
        set_meta(conv_id, title=title)
    else:
        set_meta(conv_id, title=title, color=meta.get("color"), user_id=meta.get("user_id"))
    return {"id": conv_id, "title": title}

@app.post("/conversation/{conv_id}/color")
async def set_conversation_color(conv_id: str, body: dict):
    color = body.get("color")
    if not color:
        raise HTTPException(status_code=400, detail="Missing color")
    meta = get_meta(conv_id) or {}
    set_meta(conv_id, title=meta.get("title", "New Chat"), color=color, user_id=meta.get("user_id",""))
    return {"id": conv_id, "color": color}

@app.delete("/conversation/{conv_id}")
async def delete_conversation(conv_id: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    cur.execute("DELETE FROM conversations_meta WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()
    return {"deleted": True, "id": conv_id}

# ---------- API: chat endpoint ----------
@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        system_prompt = req.system_prompt or "You are ZM-AI, a helpful assistant."
        conv_id = req.conv_id or "default"

        history = load_history(conv_id)
        history.append({"role": "user", "content": req.message})

        # Use Ollama or OpenAI
        if USE_OLLAMA:
            combined = system_prompt + "\n\n" + "\n".join([f"{m['role']}: {m['content']}" for m in history])
            try:
                proc = subprocess.run(
                    ["ollama", "run", OLLAMA_MODEL, combined],
                    check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120
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
                json={"model": "gpt-4o-mini", "messages": messages, "max_tokens": 800, "temperature": 0.2},
                timeout=60
            )
            if res.status_code != 200:
                # bubble up error for visibility
                raise HTTPException(status_code=500, detail=res.text)
            reply = res.json()["choices"][0]["message"]["content"]

        history.append({"role": "assistant", "content": reply})
        save_history(conv_id, history)
        # ensure meta exists
        if not get_meta(conv_id):
            set_meta(conv_id, title="New Chat", color="#4A90E2", user_id="")
        return {"reply": reply, "conv_id": conv_id}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ---------- serve frontend built files if present ----------
frontend_dist = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Not Found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
