
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Ingestion sessions track each uploaded codebase
CREATE TABLE public.ingestion_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('zip', 'github')),
  source_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  file_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Code chunks with embeddings for RAG retrieval
CREATE TABLE public.code_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ingestion_sessions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for vector similarity search
CREATE INDEX idx_code_chunks_embedding ON public.code_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Index for session lookups
CREATE INDEX idx_code_chunks_session ON public.code_chunks(session_id);

-- Q&A history
CREATE TABLE public.qa_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ingestion_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  referenced_chunks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_history_session ON public.qa_history(session_id);

-- RLS: These are public tables (no auth required for this app)
ALTER TABLE public.ingestion_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations (this is a tool app, no user auth)
CREATE POLICY "Allow all on ingestion_sessions" ON public.ingestion_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on code_chunks" ON public.code_chunks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on qa_history" ON public.qa_history FOR ALL USING (true) WITH CHECK (true);

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION public.match_code_chunks(
  query_embedding vector(768),
  match_session_id UUID,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  file_path TEXT,
  start_line INTEGER,
  end_line INTEGER,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.file_path,
    cc.start_line,
    cc.end_line,
    cc.content,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM public.code_chunks cc
  WHERE cc.session_id = match_session_id
    AND cc.embedding IS NOT NULL
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
