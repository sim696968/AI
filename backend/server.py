"""
backend/server.py
ZM-AI backend with DuckDuckGo websearch integration and OpenAI support.
"""

import os
import json
import sqlite3
import subprocess
import traceback
from urllib.parse import urlencode
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
import requests

# Load env
load_dotenv()

USE_OLLAMA = os.getenv("USE_OLLAMA", "0") == "1"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3:13b")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DB_PATH = os.getenv("DB_PATH", "./chat_history.db")

app = FastAPI(title="ZM-AI Chat API")

# CORS: allow all for now; restrict to your domain for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB init
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            messages TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS conversations_meta (
            id TEXT PRIMARY KEY,
            title TEXT,
            color TEXT,
            user_id TEXT,
            web_search INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

init_db()

# --- Models
class ChatRequest(BaseModel):
    conv_id: str | None = None
    message: str
    system_prompt: str | None = None
    web_search: bool | None = None  # if true, perform web search for this query

class NewConvRequest(BaseModel):
    title: str | None = None
    color: str | None = None
    user_id: str | None = None

# --- Helper DB functions
def load_history(conv_id: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT messages FROM conversations WHERE id = ?", (conv_id,))
    row = cur.fetchone()
    conn.close()
    return json.loads(row[0]) if row and row[0] else []

def save_history(conv_id: str, history):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("REPLACE INTO conversations (id, messages) VALUES (?, ?)", (conv_id, json.dumps(history)))
    conn.commit()
    conn.close()

def get_meta(conv_id: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT title, color, user_id, web_search FROM conversations_meta WHERE id = ?", (conv_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        return {"title": row[0], "color": row[1], "user_id": row[2], "web_search": bool(row[3])}
    return None

def set_meta(conv_id: str, title=None, color=None, user_id=None, web_search=None):
    meta = get_meta(conv_id) or {}
    title = title if title is not None else meta.get("title", "New Chat")
    color = color if color is not None else meta.get("color", "#4A90E2")
    user_id = user_id if user_id is not None else meta.get("user_id", "")
    ws = 1 if (web_search if web_search is not None else meta.get("web_search", False)) else 0
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        REPLACE INTO conversations_meta (id, title, color, user_id, web_search)
        VALUES (?, ?, ?, ?, ?)
    """, (conv_id, title, color, user_id, ws))
    conn.commit()
    conn.close()

# --- DuckDuckGo search helper (free, no key)
def duckduckgo_search(query: str, max_results: int = 4):
    try:
        # Use DuckDuckGo instant answer JSON API
        params = {"q": query, "format": "json", "no_redirect": 1, "skip_disambig": 1}
        url = "https://api.duckduckgo.com/?" + urlencode(params)
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            return []
        data = r.json()
        results = []

        # Abstract/Answer field (if any)
        if data.get("AbstractText"):
            results.append({"title": "Abstract", "snippet": data.get("AbstractText"), "url": data.get("AbstractURL")})

        # RelatedTopics often contains list of topics or subresults
        rt = data.get("RelatedTopics", [])
        for item in rt:
            if isinstance(item, dict):
                # If it contains Text and FirstURL
                txt = item.get("Text")
                url = item.get("FirstURL")
                if txt and url:
                    results.append({"title": txt.split(" - ")[0][:80], "snippet": txt, "url": url})
            if len(results) >= max_results:
                break

        # If no RelatedTopics/Abstract, fallback to returning the Query and an empty result to let model reason
        return results[:max_results]
    except Exception:
        return []

# --- API: conversation meta endpoints
@app.post("/conversations")
async def create_conversation(req: NewConvRequest):
    new_id = f"conv_{int(os.times()[4] * 1000)}"
    title = req.title or "New Chat"
    color = req.color or "#4A90E2"
    user_id = req.user_id or ""
    save_history(new_id, [])
    set_meta(new_id, title=title, color=color, user_id=user_id, web_search=False)
    return {"id": new_id, "title": title, "color": color, "user_id": user_id}

@app.get("/conversations")
async def list_conversations(user_id: str | None = None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    if user_id:
        cur.execute("SELECT id, title, color, user_id FROM conversations_meta WHERE user_id = ?", (user_id,))
    else:
        cur.execute("SELECT id, title, color, user_id FROM conversations_meta")
    rows = cur.fetchall()
    conn.close()
    return {"conversations": [{"id": r[0], "title": r[1], "color": r[2], "user_id": r[3]} for r in rows]}

@app.get("/conversation/{conv_id}")
async def get_conversation(conv_id: str):
    history = load_history(conv_id)
    meta = get_meta(conv_id) or {"title": "New Chat", "color": "#4A90E2", "user_id": "", "web_search": False}
    return {"id": conv_id, "messages": history, "meta": meta}

@app.post("/conversation/{conv_id}/rename")
async def rename_conversation(conv_id: str, body: dict):
    title = body.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Missing title")
    meta = get_meta(conv_id) or {}
    set_meta(conv_id, title=title, color=meta.get("color"), user_id=meta.get("user_id"), web_search=meta.get("web_search", False))
    return {"id": conv_id, "title": title}

@app.post("/conversation/{conv_id}/color")
async def set_conversation_color(conv_id: str, body: dict):
    color = body.get("color")
    if not color:
        raise HTTPException(status_code=400, detail="Missing color")
    meta = get_meta(conv_id) or {}
    set_meta(conv_id, title=meta.get("title", "New Chat"), color=color, user_id=meta.get("user_id",""), web_search=meta.get("web_search", False))
    return {"id": conv_id, "color": color}

@app.post("/conversation/{conv_id}/toggle_search")
async def toggle_search(conv_id: str, body: dict):
    enable = bool(body.get("enable", False))
    meta = get_meta(conv_id) or {}
    set_meta(conv_id, title=meta.get("title","New Chat"), color=meta.get("color","#4A90E2"), user_id=meta.get("user_id",""), web_search=enable)
    return {"id": conv_id, "web_search": enable}

@app.delete("/conversation/{conv_id}")
async def delete_conversation(conv_id: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    cur.execute("DELETE FROM conversations_meta WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()
    return {"deleted": True, "id": conv_id}

# --- websearch endpoint (exposed if you want to call from frontend directly)
@app.get("/websearch")
async def websearch(q: str):
    results = duckduckgo_search(q, max_results=6)
    return {"query": q, "results": results}

# --- chat endpoint (combines web search optionally) ---
@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        # load system prompt file in backend folder if present
        base_dir = os.path.dirname(__file__)
        prompt_path = os.path.join(base_dir, "system_prompt.txt")
        if os.path.exists(prompt_path):
            with open(prompt_path, "r", encoding="utf-8") as f:
                default_system_prompt = f.read()
        else:
            default_system_prompt = "You are ZM-AI, a helpful and professional assistant."

        system_prompt = req.system_prompt or default_system_prompt
        conv_id = req.conv_id or "default"

        # load history
        history = load_history(conv_id)
        history.append({"role": "user", "content": req.message})

        # check meta for web_search default
        meta = get_meta(conv_id) or {}
        meta_web_search = meta.get("web_search", False)
        do_search = bool(req.web_search) or bool(meta_web_search)

        search_snippets = []
        if do_search:
            # perform web search for the user query
            results = duckduckgo_search(req.message, max_results=5)
            # Format snippets for model
            if results:
                search_snippets.append("Web search results (top):")
                for r in results:
                    title = r.get("title") or ""
                    snippet = r.get("snippet") or ""
                    url = r.get("url") or ""
                    search_snippets.append(f"- {title}: {snippet} ({url})")
            else:
                search_snippets.append("Web search returned no useful results.")

        # Create messages payload for model
        messages_for_model = [{"role": "system", "content": system_prompt}]
        # If we have search snippets, add them as a system note to the model
        if search_snippets:
            messages_for_model.append({"role": "system", "content": "\n".join(search_snippets)})

        # add conversation history
        messages_for_model += history

        # Generate reply using Ollama or OpenAI
        if USE_OLLAMA:
            # For ollama, combine into text prompt
            combined = system_prompt + "\n\n"
            for m in history:
                combined += f"{m['role'].upper()}: {m['content']}\n"
            if search_snippets:
                combined += "\n".join(search_snippets) + "\n"
            proc = subprocess.run(
                ["ollama", "run", OLLAMA_MODEL, combined],
                check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=120
            )
            reply = proc.stdout.strip()
        else:
            if not OPENAI_API_KEY:
                raise HTTPException(status_code=500, detail="OpenAI API key not configured")
            res = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages_for_model,
                    "max_tokens": 800,
                    "temperature": 0.2,
                },
                timeout=60
            )
            if res.status_code != 200:
                raise HTTPException(status_code=500, detail=res.text)
            reply = res.json()["choices"][0]["message"]["content"]

        history.append({"role": "assistant", "content": reply})
        save_history(conv_id, history)
        if not get_meta(conv_id):
            set_meta(conv_id, title="New Chat", color="#4A90E2", user_id="", web_search=False)

        return {"reply": reply, "conv_id": conv_id}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- serve frontend build if present ---
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
