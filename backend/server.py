from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from duckduckgo_search import DDGS
import os

app = FastAPI()

# Allow frontend to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # you can limit this to your frontend URL if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------
# 🔹 Chat memory storage
# -------------------------------
chat_sessions = {}  # key = session_id, value = list of messages


# -------------------------------
# 🔹 Helper: DuckDuckGo Web Search
# -------------------------------
def web_search(query, max_results=3):
    try:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=max_results)
        if not results:
            return "No relevant web results found."
        output = "\n".join(
            [f"- {r['title']} ({r['href']})" for r in results if 'title' in r]
        )
        return output
    except Exception as e:
        return f"Web search failed: {e}"


# -------------------------------
# 🔹 Chat Endpoint
# -------------------------------
@app.post("/chat")
async def chat(request: Request):
    data = await request.json()
    message = data.get("message", "")
    session_id = data.get("session_id", "default")

    # Create new session if needed
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []

    # Save user message
    chat_sessions[session_id].append({"role": "user", "content": message})

    # Simple AI logic
    if message.lower().startswith("search "):
        query = message[7:].strip()
        reply = f"🔍 Web search results for **{query}**:\n" + web_search(query)
    else:
        reply = f"🤖 You said: {message}"

    # Save assistant reply
    chat_sessions[session_id].append({"role": "assistant", "content": reply})

    # Generate chat title automatically (based on first message)
    title = None
    if len(chat_sessions[session_id]) == 2:  # first response
        title = f"Topic: {message[:30]}"

    return JSONResponse({"reply": reply, "title": title})


# -------------------------------
# 🔹 Static Frontend Serving
# -------------------------------
frontend_dir = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")

# -------------------------------
# 🔹 Root (Optional)
# -------------------------------
@app.get("/")
def root():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Frontend not found. Please build it with npm run build."}


# -------------------------------
# 🔹 Start Command (for Render)
# -------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run("server:app", host="0.0.0.0", port=port)
