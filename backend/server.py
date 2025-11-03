import os
import json
import uuid
import requests
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# === CONFIG ===
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

USE_OLLAMA = os.getenv("USE_OLLAMA", "false").lower() == "true"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DUCK_API = "https://api.duckduckgo.com"

# === INIT FASTAPI ===
app = FastAPI(title="ZM-AI Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Helper paths ===
def convo_path(cid): return os.path.join(DATA_DIR, f"{cid}.json")
def meta_path(cid): return os.path.join(DATA_DIR, f"{cid}_meta.json")


# === Basic storage ===
def load_history(cid):
    path = convo_path(cid)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_history(cid, data):
    with open(convo_path(cid), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_meta(cid):
    mpath = meta_path(cid)
    if os.path.exists(mpath):
        with open(mpath, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def set_meta(cid, **kwargs):
    meta = get_meta(cid)
    meta.update(kwargs)
    with open(meta_path(cid), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

# === Create new conversation ===
@app.post("/conversations")
async def create_conversation(req: Request):
    data = await req.json()
    cid = str(uuid.uuid4())
    title = data.get("title", "New Chat")
    color = data.get("color", "#4A90E2")
    save_history(cid, [])
    set_meta(cid, title=title, color=color)
    return {"id": cid, "title": title, "color": color}

# === List conversations ===
@app.get("/conversations")
async def list_conversations():
    convos = []
    for f in os.listdir(DATA_DIR):
        if f.endswith("_meta.json"):
            cid = f.replace("_meta.json", "")
            meta = get_meta(cid)
            convos.append({
                "id": cid,
                "title": meta.get("title", "New Chat"),
                "color": meta.get("color", "#4A90E2")
            })
    return {"conversations": convos}

# === Load a single conversation ===
@app.get("/conversation/{cid}")
async def get_conversation(cid: str):
    return {"messages": load_history(cid), "meta": get_meta(cid)}

# === Rename conversation ===
@app.post("/conversation/{cid}/rename")
async def rename_conversation(cid: str, req: Request):
    data = await req.json()
    title = data.get("title", "")
    set_meta(cid, title=title)
    return {"id": cid, "title": title}

# === Delete conversation ===
@app.delete("/conversation/{cid}")
async def delete_conversation(cid: str):
    try:
        os.remove(convo_path(cid))
        os.remove(meta_path(cid))
    except FileNotFoundError:
        pass
    return {"deleted": cid}


# === Generate AI title for conversation ===
@app.post("/conversation/{cid}/generate_title")
async def generate_conversation_title(cid: str):
    history = load_history(cid)
    first_user = next((m["content"] for m in history if m.get("role") == "user"), None)
    if not first_user:
        default_title = get_meta(cid).get("title", "New Chat")
        return {"id": cid, "title": default_title, "generated": False}

    # Fallback heuristic
    def simple_title(msg):
        words = [w for w in msg.split() if len(w.strip()) > 0]
        return "Topic: " + " ".join(words[:5])

    if not OPENAI_API_KEY:
        title = simple_title(first_user)
        set_meta(cid, title=title)
        return {"id": cid, "title": title, "generated": True, "method": "fallback"}

    try:
        prompt = (
            "Generate a short (1-5 word) topic title for the following user message:\n"
            f"\"{first_user}\"\nTitle:"
        )
        res = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You create short chat titles."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 12,
                "temperature": 0.2
            },
            timeout=15
        )
        if res.status_code != 200:
            raise Exception(f"OpenAI error: {res.text}")
        title = res.json()["choices"][0]["message"]["content"].strip()
        if len(title) > 64: title = title[:64]
        set_meta(cid, title=title)
        return {"id": cid, "title": title, "generated": True, "method": "openai"}
    except Exception as e:
        title = simple_title(first_user)
        set_meta(cid, title=title)
        return {"id": cid, "title": title, "generated": True, "method": "error", "error": str(e)}


# === Chat logic ===
@app.post("/chat")
async def chat(req: Request):
    data = await req.json()
    cid = data.get("conv_id")
    msg = data.get("message", "").strip()

    if not cid or not msg:
        return {"error": "Missing conv_id or message"}

    # Load and append user message
    history = load_history(cid)
    history.append({"role": "user", "content": msg})

    # ==== 1️⃣ Handle search trigger ====
    if msg.lower().startswith("search "):
        query = msg[7:].strip()
        results = requests.get(DUCK_API, params={"q": query, "format": "json"}).json()
        if "RelatedTopics" in results:
            snippets = [t.get("Text", "") for t in results["RelatedTopics"][:3]]
            reply = "\n\n".join(snippets) or "No results found."
        else:
            reply = "No results found."
    else:
        # ==== 2️⃣ AI response ====
        if USE_OLLAMA:
            r = requests.post("http://localhost:11434/api/generate",
                              json={"model": OLLAMA_MODEL, "prompt": msg})
            reply = ""
            for line in r.iter_lines():
                if line:
                    j = json.loads(line)
                    reply += j.get("response", "")
        elif OPENAI_API_KEY:
            r = requests.post("https://api.openai.com/v1/chat/completions",
                              headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                              json={
                                  "model": "gpt-4o-mini",
                                  "messages": [{"role": "system", "content": "You are ZM-AI, a helpful assistant."}] + history,
                                  "max_tokens": 500
                              })
            try:
                reply = r.json()["choices"][0]["message"]["content"].strip()
            except Exception:
                reply = "⚠️ AI response error."
        else:
            reply = "🔍 Free mode: you can use 'search <topic>' to get info from the web."

    # Save assistant reply
    history.append({"role": "assistant", "content": reply})
    save_history(cid, history)
    return {"reply": reply}


# === Root test ===
@app.get("/")
def root():
    return {"ZM-AI": "Server running successfully ✅"}

# === Start if local ===
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
