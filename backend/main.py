from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="C:/Users/Shrinath/Desktop/ai chatbot/contextiq/backend/.env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", "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"))
class ChatRequest(BaseModel):
    message: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat")
def chat(req: ChatRequest):
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": req.message}]
    )
    return {"reply": response.content[0].text}