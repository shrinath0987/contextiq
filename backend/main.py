from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key="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")

sessions = {}

SYSTEM_PROMPT = """You are ContextIQ, an intelligent AI assistant.
You are helpful, concise and friendly.
You remember everything said in the conversation."""

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat")
def chat(req: ChatRequest):
    if req.session_id not in sessions:
        sessions[req.session_id] = []

    history = sessions[req.session_id]
    history.append({"role": "user", "content": req.message})

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=history
    )

    reply = response.content[0].text
    history.append({"role": "assistant", "content": reply})
    sessions[req.session_id] = history

    return {"reply": reply, "session_id": req.session_id}