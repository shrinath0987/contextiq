from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import os
import tempfile
import chromadb
import fitz
import json
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

load_dotenv()

sessions = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key="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")
chroma_client = chromadb.Client()
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

SYSTEM_PROMPT = """You are ContextIQ, an intelligent AI assistant.
When context is provided, answer ONLY using that context.
Always mention which page your answer comes from.
If the answer is not in the context, say I could not find that in the document."""

class ChatRequest(BaseModel):
    message: str
    session_id: str = "default"

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/upload")
async def upload(file: UploadFile = File(...), session_id: str = Form(...)):
    try:
        print(f"Uploading: {file.filename}")
        contents = await file.read()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(contents)
            tmp_path = tmp.name

        doc = fitz.open(tmp_path)
        chunks = []
        metadatas = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            for i in range(0, len(text), 500):
                chunk = text[i:i+500].strip()
                if chunk:
                    chunks.append(chunk)
                    metadatas.append({"page": page_num + 1})

        doc.close()
        os.unlink(tmp_path)

        collection_name = f"session_{session_id}"
        try:
            chroma_client.delete_collection(collection_name)
        except:
            pass

        collection = chroma_client.create_collection(collection_name)
        embeddings = embedding_model.encode(chunks).tolist()

        collection.add(
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=[f"chunk_{i}" for i in range(len(chunks))]
        )

        print(f"Done! {len(chunks)} chunks stored")

        summary_response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"""Based on this document excerpt, give me:
1. A 2-sentence summary
2. Four interesting questions a user might ask

Document excerpt:
{' '.join(chunks[:5])}

Reply in this exact JSON format:
{{"summary": "...", "questions": ["...", "...", "...", "..."]}}"""
            }]
        )

        try:
            ai_data = json.loads(summary_response.content[0].text)
        except:
            ai_data = {"summary": "Document uploaded successfully!", "questions": []}

        return {
            "status": "ok",
            "chunks": len(chunks),
            "summary": ai_data.get("summary", ""),
            "questions": ai_data.get("questions", [])
        }

    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
def chat(req: ChatRequest):
    try:
        if req.session_id not in sessions:
            sessions[req.session_id] = []

        history = sessions[req.session_id]
        context = ""
        sources = []

        try:
            collection = chroma_client.get_collection(f"session_{req.session_id}")
            query_embedding = embedding_model.encode([req.message]).tolist()
            results = collection.query(
                query_embeddings=query_embedding,
                n_results=5,
                include=["documents", "metadatas"]
            )
            chunks = results["documents"][0]
            pages = [m["page"] for m in results["metadatas"][0]]
            context = "\n\n".join([f"[Page {p}]: {c}" for p, c in zip(pages, chunks)])
            sources = list(set(pages))
            print(f"Retrieved {len(chunks)} chunks from pages {sources}")
        except Exception as e:
            print(f"Retrieval error: {e}")

        user_message = req.message
        if context:
            user_message = f"Context:\n{context}\n\nQuestion: {req.message}"

        history.append({"role": "user", "content": user_message})

        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=history
        )

        reply = response.content[0].text
        history.append({"role": "assistant", "content": reply})
        sessions[req.session_id] = history

        return {"reply": reply, "session_id": req.session_id, "sources": sources}

    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))