import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text.slice(0, 8000),
      model: "text-embedding-3-small",
      dimensions: 768,
    }),
  });

  if (!response.ok) {
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
    const { question, sessionId } = await req.json();

    if (!question?.trim()) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "Session ID is required. Please upload a codebase first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Embed the question
    console.log("Embedding question:", question);
    const questionEmbedding = await generateEmbedding(question, lovableApiKey);

    // Step 2: Retrieve top 5 most relevant chunks
    const { data: chunks, error: matchError } = await supabase.rpc("match_code_chunks", {
      query_embedding: JSON.stringify(questionEmbedding),
      match_session_id: sessionId,
      match_count: 5,
    });

    if (matchError) {
      console.error("Match error:", matchError);
      throw new Error("Failed to search code chunks");
    }

    if (!chunks || chunks.length === 0) {
      const noResultAnswer = "No relevant code snippets were found for your question. Try rephrasing or asking about a different aspect of the codebase.";
      
      await supabase.from("qa_history").insert({
        session_id: sessionId,
        question,
        answer: noResultAnswer,
        referenced_chunks: [],
      });

      return new Response(
        JSON.stringify({ answer: noResultAnswer, chunks: [], noResults: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Build context from retrieved chunks
    const contextSnippets = chunks.map((c: any, i: number) => 
      `[Snippet ${i + 1}] File: ${c.file_path} (Lines ${c.start_line}–${c.end_line})\n\`\`\`\n${c.content}\n\`\`\``
    ).join("\n\n");

    // Step 4: Call LLM with retrieved context
    const systemPrompt = `You are a code analysis assistant. Answer questions about a codebase using ONLY the provided code snippets. 

Rules:
- ONLY use information from the provided snippets
- Always cite file paths and line ranges (e.g., "In \`src/auth.ts\` (lines 15–30)...")
- If the snippets don't contain enough info to answer, say so explicitly
- Be concise and precise
- Format code references with backticks
- Do NOT hallucinate or guess about code not shown in the snippets`;

    const userPrompt = `Here are the relevant code snippets from the codebase:

${contextSnippets}

Question: ${question}

Answer the question using ONLY the snippets above. Cite specific files and line ranges.`;

    const llmResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!llmResponse.ok) {
      if (llmResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (llmResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`LLM request failed: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    const answer = llmData.choices?.[0]?.message?.content || "Unable to generate an answer.";

    // Step 5: Save to history
    const referencedChunks = chunks.map((c: any) => ({
      filePath: c.file_path,
      startLine: c.start_line,
      endLine: c.end_line,
      content: c.content,
      similarity: c.similarity,
    }));

    await supabase.from("qa_history").insert({
      session_id: sessionId,
      question,
      answer,
      referenced_chunks: referencedChunks,
    });

    return new Response(
      JSON.stringify({ answer, chunks: referencedChunks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Ask error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
