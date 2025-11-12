from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from openai import OpenAI
import os
import json
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env (for local dev)
load_dotenv()

# Get API key from .env or Render env vars
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("❌ OPENAI_API_KEY not found. Please set it in .env or Render environment.")

# Create FastAPI app
app = FastAPI(title="ZM AI Chatbot")

# Allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model for incoming chat requests
class ChatRequest(BaseModel):
    message: str

# ----------------------------
# Chat endpoint (normal)
# ----------------------------
@app.post("/api/chat")
async def chat(request: ChatRequest):
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if not hasattr(app.state, "chat_history"):
        app.state.chat_history = []

    app.state.chat_history.append({"role": "user", "content": user_message})

    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_API_KEY)
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=app.state.chat_history,
            temperature=0.7,
            max_tokens=600,
        )

        assistant_message = response.choices[0].message.content.strip()
        app.state.chat_history.append({"role": "assistant", "content": assistant_message})

        return {"reply": assistant_message}

    except Exception as e:
        print(f"OpenAI error: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ----------------------------
# Streaming endpoint (optional)
# ----------------------------
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream response word-by-word for typing effect."""
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    async def event_stream():
        try:
            stream = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": user_message}],
                stream=True,
            )
            for chunk in stream:
                content = chunk.choices[0].delta.get("content")
                if content:
                    yield f"data: {json.dumps({'token': content})}\n\n"
                    await asyncio.sleep(0.02)
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ----------------------------
# Serve Frontend (dist/)
# ----------------------------
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")
else:
    print("⚠️  Frontend dist/ folder not found. Run `npm run build` in /frontend first.")

# ----------------------------
# Root route (fallback)
# ----------------------------
@app.get("/")
async def root():
    index_file = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"message": "Frontend not built yet."})


# ----------------------------
# Run directly (for local dev)
# ----------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
