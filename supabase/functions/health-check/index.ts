import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check database
    let dbStatus = "connected";
    try {
      const { error } = await supabase.from("ingestion_sessions").select("id").limit(1);
      if (error) dbStatus = "error: " + error.message;
    } catch {
      dbStatus = "disconnected";
    }

    // Check LLM
    let llmStatus = "connected";
    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      if (!resp.ok) llmStatus = `error: status ${resp.status}`;
    } catch (e) {
      llmStatus = "disconnected";
    }

    // Check embeddings (uses same gateway as LLM)
    const embeddingStatus = llmStatus === "connected" ? "connected" : llmStatus;

    return new Response(
      JSON.stringify({
        status: "ok",
        backend: "running",
        database: dbStatus,
        llm: llmStatus,
        embeddings: embeddingStatus,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        status: "error",
        backend: "running",
        database: "unknown",
        llm: "unknown",
        embeddings: "unknown",
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
