# CodeQA — Codebase Q&A with Proof

A RAG-powered web application that lets you upload a codebase and ask questions about it, receiving answers backed by exact code snippets with file paths and line numbers.

## Features

- **ZIP Upload**: Upload a ZIP of any codebase for analysis
- **RAG Pipeline**: Code is chunked, embedded, and stored in a vector database
- **Semantic Q&A**: Ask natural language questions and get answers with cited file paths and line ranges
- **Code Snippets**: Expandable code blocks with line numbers for every referenced snippet
- **Q&A History**: Last 10 questions per session are saved
- **System Status**: Health check page for backend, database, and LLM connectivity

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Lovable Cloud (Edge Functions)
- **Vector DB**: PostgreSQL with pgvector extension
- **Embeddings**: text-embedding-3-small (768 dimensions)
- **LLM**: Google Gemini 3 Flash Preview

## How to Run

```sh
npm install
npm run dev
```

## Architecture

1. **Ingestion**: ZIP files are parsed client-side, code files extracted and sent to the backend
2. **Chunking**: Files are split into ~40-line chunks with 5-line overlap
3. **Embedding**: Each chunk is embedded and stored with metadata in pgvector
4. **Retrieval**: Questions are embedded and top 5 similar chunks retrieved
5. **Generation**: LLM generates answers using ONLY retrieved snippets

## What Is Implemented

- ✅ ZIP upload and parsing
- ✅ Code chunking with line number preservation
- ✅ Vector embedding and storage (pgvector)
- ✅ Semantic search / retrieval
- ✅ LLM-powered answer generation with citations
- ✅ Q&A history (last 10 per session)
- ✅ System status page
- ✅ Error handling (empty input, invalid ZIP, no results)

## What Is Not Implemented

- ❌ GitHub URL cloning (requires server-side git)
- ❌ Docker deployment
- ❌ Search within history
- ❌ Refactor suggestion button
- ❌ Database reset button
