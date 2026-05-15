import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface CodeChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  similarity: number;
}

export interface QAEntry {
  id: string;
  question: string;
  answer: string;
  referenced_chunks: CodeChunk[];
  created_at: string;
}

export interface IngestResult {
  sessionId: string;
  filesProcessed: number;
  chunksStored: number;
  status: string;
}

export interface HealthStatus {
  status: string;
  backend: string;
  database: string;
  llm: string;
  embeddings: string;
  timestamp: string;
}

export async function ingestCode(
  files: Array<{ path: string; content: string }>,
  sessionKey: string,
  sourceName: string,
  sourceType: "zip" | "github"
): Promise<IngestResult> {
  const resp = await fetch(`${FUNCTIONS_URL}/ingest-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ files, sessionKey, sourceName, sourceType }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Ingestion failed: ${resp.status}`);
  }

  return resp.json();
}

export async function askQuestion(
  question: string,
  sessionId: string
): Promise<{ answer: string; chunks: CodeChunk[]; noResults?: boolean }> {
  const resp = await fetch(`${FUNCTIONS_URL}/ask-question`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ question, sessionId }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `Question failed: ${resp.status}`);
  }

  return resp.json();
}

export async function getHistory(sessionId: string): Promise<QAEntry[]> {
  const { data, error } = await supabase
    .from("qa_history")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data || []) as unknown as QAEntry[];
}

export async function checkHealth(): Promise<HealthStatus> {
  const resp = await fetch(`${FUNCTIONS_URL}/health-check`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({}),
  });

  if (!resp.ok) throw new Error("Health check failed");
  return resp.json();
}
