# ContextIQ — AI Document Intelligence Platform

> Upload any PDF. Chat with it. Get answers with exact page citations.

🔗 **Live Demo:** [https://contextiq-nine.vercel.app/]

---

## What it does

- 📄 Upload any PDF document
- 🤖 AI reads and understands the entire document
- 💬 Chat with it naturally — ask anything
- 📍 Every answer cites exact page numbers
- 🧠 Remembers conversation context
- ⚡ Auto-generates document summary on upload
- 💡 Suggests relevant questions to ask

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite |
| Backend | FastAPI, Python |
| AI | Anthropic Claude API |
| RAG Pipeline | LangChain, ChromaDB |
| Embeddings | Sentence Transformers |
| Deployment | Railway (API) + Vercel (UI) |

## Architecture
## How RAG works here

1. PDF uploaded → text extracted page by page
2. Text split into 500-char chunks
3. Each chunk embedded into vectors
4. User asks question → question embedded
5. Top 5 similar chunks retrieved
6. Claude answers using ONLY those chunks
7. Page numbers returned as citations

## Local Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
# Add ANTHROPIC_API_KEY to .env
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Author

Built by Shrinath — AI App Developer