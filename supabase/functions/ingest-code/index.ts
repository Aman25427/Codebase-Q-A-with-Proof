import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Code file extensions to process
const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rs", ".rb",
  ".php", ".c", ".cpp", ".h", ".hpp", ".cs", ".swift", ".kt",
  ".scala", ".r", ".sql", ".sh", ".bash", ".zsh", ".yml", ".yaml",
  ".json", ".xml", ".html", ".css", ".scss", ".less", ".md",
  ".dockerfile", ".toml", ".ini", ".cfg", ".env", ".gitignore",
  ".vue", ".svelte", ".astro",
]);

// Directories to skip
const SKIP_DIRS = new Set([
  "node_modules", ".git", "__pycache__", ".next", "dist", "build",
  ".cache", "vendor", ".venv", "venv", "target", "bin", "obj",
  ".idea", ".vscode", "coverage", ".nyc_output",
]);

// Max file size to process (100KB)
const MAX_FILE_SIZE = 100_000;

/**
 * Chunking strategy: Split code files by lines.
 * Each chunk is ~500-800 tokens (~30-50 lines of code).
 * We preserve file path, start line, and end line for each chunk.
 * Chunks overlap by 5 lines for context continuity.
 */
function chunkCode(content: string, filePath: string): Array<{ filePath: string; startLine: number; endLine: number; content: string }> {
  const lines = content.split("\n");
  const chunks: Array<{ filePath: string; startLine: number; endLine: number; content: string }> = [];
  
  const CHUNK_SIZE = 40; // ~40 lines per chunk
  const OVERLAP = 5;
  
  for (let i = 0; i < lines.length; i += CHUNK_SIZE - OVERLAP) {
    const end = Math.min(i + CHUNK_SIZE, lines.length);
    const chunkLines = lines.slice(i, end);
    const chunkContent = chunkLines.join("\n").trim();
    
    if (chunkContent.length < 10) continue; // Skip nearly empty chunks
    
    chunks.push({
      filePath,
      startLine: i + 1, // 1-indexed
      endLine: end,
      content: chunkContent,
    });
    
    if (end >= lines.length) break;
  }
  
  return chunks;
}

function shouldProcessFile(path: string): boolean {
  const parts = path.split("/");
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) return false;
  }
  
  const ext = "." + path.split(".").pop()?.toLowerCase();
  const fileName = parts[parts.length - 1]?.toLowerCase() || "";
  
  // Process known config files without extensions
  if (["makefile", "dockerfile", "rakefile", "gemfile", "procfile"].includes(fileName)) {
    return true;
  }
  
  return CODE_EXTENSIONS.has(ext);
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text.slice(0, 8000), // Truncate to avoid token limits
      model: "text-embedding-3-small",
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Embedding error:", response.status, errText);
    throw new Error(`Embedding failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { files, sessionKey, sourceName, sourceType } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: "No files provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create ingestion session
    const { data: session, error: sessionError } = await supabase
      .from("ingestion_sessions")
      .insert({
        session_key: sessionKey,
        source_type: sourceType || "zip",
        source_name: sourceName || "uploaded-code",
        status: "processing",
      })
      .select()
      .single();

    if (sessionError) {
      // If session_key already exists, get it
      if (sessionError.code === "23505") {
        // Delete old data and recreate
        const { data: existing } = await supabase
          .from("ingestion_sessions")
          .select("id")
          .eq("session_key", sessionKey)
          .single();
        
        if (existing) {
          await supabase.from("code_chunks").delete().eq("session_id", existing.id);
          await supabase.from("qa_history").delete().eq("session_id", existing.id);
          await supabase.from("ingestion_sessions").delete().eq("id", existing.id);
        }
        
        // Retry insert
        const { data: newSession, error: retryErr } = await supabase
          .from("ingestion_sessions")
          .insert({
            session_key: sessionKey,
            source_type: sourceType || "zip",
            source_name: sourceName || "uploaded-code",
            status: "processing",
          })
          .select()
          .single();
        
        if (retryErr) throw retryErr;
        return await processFiles(newSession, files, supabase, lovableApiKey);
      }
      throw sessionError;
    }

    return await processFiles(session, files, supabase, lovableApiKey);
  } catch (e) {
    console.error("Ingest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processFiles(session: any, files: any[], supabase: any, apiKey: string) {
  // Filter and chunk files
  const processableFiles = files.filter((f: any) => 
    shouldProcessFile(f.path) && f.content && f.content.length < MAX_FILE_SIZE
  );

  let allChunks: any[] = [];
  for (const file of processableFiles) {
    const chunks = chunkCode(file.content, file.path);
    allChunks.push(...chunks);
  }

  console.log(`Processing ${processableFiles.length} files, ${allChunks.length} chunks`);

  // Generate embeddings and store chunks in batches
  const BATCH_SIZE = 5;
  let stored = 0;
  
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    
    const embeddedChunks = await Promise.all(
      batch.map(async (chunk) => {
        try {
          const embedding = await generateEmbedding(
            `File: ${chunk.filePath}\nLines ${chunk.startLine}-${chunk.endLine}:\n${chunk.content}`,
            apiKey
          );
          return { ...chunk, embedding };
        } catch (e) {
          console.error(`Embedding failed for ${chunk.filePath}:`, e);
          return { ...chunk, embedding: null };
        }
      })
    );

    const rows = embeddedChunks
      .filter((c) => c.embedding)
      .map((c) => ({
        session_id: session.id,
        file_path: c.filePath,
        start_line: c.startLine,
        end_line: c.endLine,
        content: c.content,
        embedding: JSON.stringify(c.embedding),
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("code_chunks").insert(rows);
      if (error) console.error("Insert error:", error);
      else stored += rows.length;
    }
  }

  // Update session status
  await supabase
    .from("ingestion_sessions")
    .update({
      status: "completed",
      file_count: processableFiles.length,
      chunk_count: stored,
    })
    .eq("id", session.id);

  return new Response(
    JSON.stringify({
      sessionId: session.id,
      filesProcessed: processableFiles.length,
      chunksStored: stored,
      status: "completed",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
