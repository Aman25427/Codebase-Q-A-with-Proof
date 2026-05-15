# AI Notes

## AI Tools Used

- **Lovable AI Gateway**: Powers both the embedding generation (text-embedding-3-small) and LLM answer generation (Google Gemini 3 Flash Preview)
- **Lovable Editor**: Used as the primary development environment with AI-assisted code generation

## What Parts Were Manually Reviewed

- RAG chunking strategy (line-based chunking with overlap)
- RLS policy design (public access for tool-type app)
- Vector similarity search function
- Error handling flows
- Prompt engineering for the code Q&A system prompt

## LLM Provider Used and Why

- **Google Gemini 3 Flash Preview** via Lovable AI Gateway
- Chosen for: fast inference, good code understanding, cost-efficient
- Embeddings: **text-embedding-3-small** at 768 dimensions — good balance of quality and storage

## Limitations

- GitHub cloning requires server-side git access; ZIP upload is the primary method
- Maximum file size per code file: 100KB (to prevent memory issues)
- Embedding dimension: 768 (trade-off between quality and storage cost)
- Chunk size: ~40 lines with 5-line overlap — may split some logical blocks
- Rate limits apply to the AI gateway
- No authentication — sessions are ephemeral and public
