# CQHelper – AI Helpdesk System

AI-powered Helpdesk System built using FastAPI, React.js, MySQL, SQLAlchemy, Pydantic, Qdrant Vector Database, and RAG.

## Features

- Customer ticket management
- AI-assisted ticket replies
- Knowledge Base document upload
- Vector search using Qdrant
- Email integration (IMAP & SMTP)
- Analytics Dashboard
- Role-based authentication

## Tech Stack

- Backend: FastAPI, SQLAlchemy, MySQL, Pydantic
- Frontend: React.js, JavaScript, Tailwind CSS
- AI: RAG, Groq LLM, Qdrant Vector Database
- Tools: Git, GitHub, Postman

## Getting Started

### Backend

```bash
cd helpdesk_api
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd helpdesk_ui
npm install
npm run dev
```
