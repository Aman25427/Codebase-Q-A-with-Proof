import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askQuestion } from "@/lib/api";
import type { CodeChunk } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const AskPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");
  const [chunks, setChunks] = useState<CodeChunk[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const sid = localStorage.getItem("codeqa_session_id");
    const sn = localStorage.getItem("codeqa_source_name");
    setSessionId(sid);
    setSourceName(sn || "");
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }
    if (!sessionId) {
      setError("No codebase loaded. Please upload one first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setAnswer("");
    setChunks([]);

    try {
      const result = await askQuestion(question, sessionId);
      setAnswer(result.answer);
      setChunks(result.chunks || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get answer";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <AppLayout>
        <div className="container max-w-4xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No codebase loaded</h2>
          <p className="text-muted-foreground mb-6">
            Upload a codebase first to start asking questions.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Home
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Session info */}
        <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
          <span className="font-mono bg-secondary px-2 py-1 rounded text-xs">
            {sourceName}
          </span>
          <span>loaded</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-xs"
            onClick={() => {
              localStorage.removeItem("codeqa_session_id");
              localStorage.removeItem("codeqa_source_name");
              navigate("/");
            }}
          >
            Load different codebase
          </Button>
        </div>

        {/* Question input */}
        <div className="space-y-3 mb-8">
          <Textarea
            placeholder='Ask about the codebase... e.g. "Where is authentication handled?"'
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            disabled={isLoading}
            className="font-mono text-sm min-h-[80px] resize-none"
          />
          <div className="flex justify-between items-center">
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {error}
              </p>
            )}
            <div className="ml-auto">
              <Button onClick={handleAsk} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Ask
              </Button>
            </div>
          </div>
        </div>

        {/* Answer */}
        {answer && (
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6 bg-card">
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                Answer
              </h3>
              <div className="prose prose-sm prose-invert max-w-none text-foreground whitespace-pre-wrap">
                {answer}
              </div>
            </div>

            {chunks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                  Referenced Code Snippets ({chunks.length})
                </h3>
                <div className="space-y-3">
                  {chunks.map((chunk, i) => (
                    <CodeSnippet key={i} chunk={chunk} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AskPage;
