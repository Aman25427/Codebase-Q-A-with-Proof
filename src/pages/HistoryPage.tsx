import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, AlertCircle, ArrowLeft, MessageSquare } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CodeSnippet } from "@/components/CodeSnippet";
import { Button } from "@/components/ui/button";
import { getHistory } from "@/lib/api";
import type { QAEntry } from "@/lib/api";

const HistoryPage = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<QAEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sessionId = localStorage.getItem("codeqa_session_id");

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    getHistory(sessionId)
      .then(setHistory)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  if (!sessionId) {
    return (
      <AppLayout>
        <div className="container max-w-4xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No session active</h2>
          <p className="text-muted-foreground mb-6">Upload a codebase to start building history.</p>
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
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold font-mono">Q&A History</h1>
          <span className="text-sm text-muted-foreground ml-2">Last 10 questions</span>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No questions asked yet.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/ask")}>
              Ask a question
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="border border-border rounded-lg bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  className="w-full text-left p-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="font-medium text-sm">{entry.question}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
                {expandedId === entry.id && (
                  <div className="border-t border-border p-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Answer
                      </h4>
                      <p className="text-sm whitespace-pre-wrap">{entry.answer}</p>
                    </div>
                    {entry.referenced_chunks && entry.referenced_chunks.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Referenced Snippets
                        </h4>
                        <div className="space-y-2">
                          {entry.referenced_chunks.map((chunk, i) => (
                            <CodeSnippet key={i} chunk={chunk} index={i} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default HistoryPage;
