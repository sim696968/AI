# GF-AI — ChatGPT-style assistant

This repo is a starter project for a ChatGPT-like assistant using a local LLM (Ollama) or OpenAI API,
a FastAPI backend, and a minimal React frontend.

Run (quick):
1. Install Ollama or set OPENAI_API_KEY in .env
2. python -m venv .venv && source .venv/bin/activate
3. pip install -r backend/requirements.txt
4. cd frontend && npm install && npm run dev
5. python backend/server.py

See system_prompt.txt for the assistant personality.
