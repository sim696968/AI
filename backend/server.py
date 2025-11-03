# backend/server.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid
import json
import os
from duckduckgo_search import DDGS

app = FastAPI()

# Allow frontend access (Render domain, localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_FILE = "chat_data.json"

# ------------------ Models ------------------
class ChatMessage(BaseModel):
    chat_id: str
    role: str
    content: str

class NewChatRequest(BaseModel):
    title: str | None = None

class RenameChatRequest(BaseModel):
    chat_id: str
    new_title: str

class DeleteChatRequest(BaseModel):
    chat_id: str

# ------------------ Utilities ------------------
def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

# ------------------ Routes ------------------
@app.post("/chat")
async def chat(msg: ChatMessage):
    data = load_data()
    chat_id = msg.chat_id or str(uuid.uuid4())

    if chat_id not in data:
        data[chat_id] = {"title": "New Chat", "messages": []}

    # Add user message
    data[chat_id]["messages"].append({"role": "user", "content": msg.content})

    # Simple AI + Web Search combo
    answer = None
    if "search" in msg.content.lower():
        try:
            query = msg.content.replace("search", "").strip()
            results = DDGS().text(query, max_results=3)
            answer = "🔍 Web results:\n" + "\n".join([f"- {r['title']}: {r['href']}" for r in results])
        except Exception as e:
            answer = f"Search failed: {e}"
    else:
        # Local AI stub (you can replace with OpenAI or Gemini API)
        answer = f"🤖 You said: {msg.content}"

    data[chat_id]["messages"].append({"role": "assistant", "content": answer})
    save_data(data)

    return {"chat_id": chat_id, "reply": answer, "messages": data[chat_id]["messages"]}


@app.post("/new_chat")
async def new_chat(req: NewChatRequest):
    data = load_data()
    chat_id = str(uuid.uuid4())
    title = req.title or "New Chat"
    data[chat_id] = {"title": title, "messages": []}
    save_data(data)
    return {"chat_id": chat_id, "title": title}


@app.post("/rename_chat")
async def rename_chat(req: RenameChatRequest):
    data = load_data()
    if req.chat_id in data:
        data[req.chat_id]["title"] = req.new_title
        save_data(data)
        return {"status": "success"}
    return {"status": "error", "message": "Chat not found"}


@app.post("/delete_chat")
async def delete_chat(req: DeleteChatRequest):
    data = load_data()
    if req.chat_id in data:
        del data[req.chat_id]
        save_data(data)
        return {"status": "deleted"}
    return {"status": "error", "message": "Chat not found"}


@app.get("/chats")
async def get_chats():
    data = load_data()
    return data
