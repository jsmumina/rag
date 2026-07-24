---
title: Adaptive Agentic RAG API
emoji: 🧠
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# Adaptive Agentic RAG — backend

FastAPI + LangGraph agent: retrieve → grade documents → (web fallback) →
generate → self-check. Endpoints:

- `GET  /health` — liveness check
- `POST /ingest` — multipart file upload (`.pdf`, `.txt`, `.md`)
- `POST /chat`   — `{"question": "..."}` → answer, steps, sources

Set these as Space secrets: `GOOGLE_API_KEY` (or `OPENAI_API_KEY`),
optionally `TAVILY_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`.
