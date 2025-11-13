# backend/server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os

# ----------------------------
# Load environment variables
# ----------------------------
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise RuntimeError("❌ OPENAI_API_KEY not found. Please set it in .env or Render environment.")

# Initialize OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)

# ----------------------------
# FastAPI app setup
# ----------------------------
app = FastAPI(title="ZM AI Chatbot")

# Allow frontend access (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Models
# ----------------------------
class ChatRequest(BaseModel):
    message: str

# ----------------------------
# Health check
# ----------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "api_key_set": bool(OPENAI_API_KEY)}

# ----------------------------
# Chat endpoint
# ----------------------------
@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Handles user chat requests and returns AI responses.
    """
    try:
        # Send message to OpenAI
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful AI chatbot assistant."},
                {"role": "user", "content": req.message},
            ],
        )

        ai_reply = response.choices[0].message.content.strip()
        return {"reply": ai_reply}

    except Exception as e:
        # Return clear backend error message to frontend
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

# ----------------------------
# Root route (optional)
# ----------------------------
@app.get("/")
async def root():
    return {"message": "ZM AI Chatbot API is running."}
