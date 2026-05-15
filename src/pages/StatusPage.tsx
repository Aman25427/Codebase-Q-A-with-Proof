import { useState, useEffect } from "react";
import { Activity, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { checkHealth } from "@/lib/api";
import type { HealthStatus } from "@/lib/api";

function StatusBadge({ status }: { status: string }) {
  const isOk = status === "connected" || status === "running";
  return (
    <div className="flex items-center gap-2">
      {isOk ? (
        <CheckCircle className="h-4 w-4 text-success" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive" />
      )}
      <span className={`text-sm font-mono ${isOk ? "text-success" : "text-destructive"}`}>
        {status}
      </span>
    </div>
  );
}

const StatusPage = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHealth = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await checkHealth();
      setHealth(data);
    } catch {
      setError("Failed to reach backend");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <AppLayout>
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold font-mono">System Status</h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading && !health ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking services...
          </div>
        ) : error ? (
          <div className="border border-destructive/30 rounded-lg p-6 bg-destructive/5">
            <p className="text-destructive font-medium">{error}</p>
          </div>
        ) : health ? (
          <div className="space-y-3">
            {[
              { label: "Backend", status: health.backend },
              { label: "Database", status: health.database },
              { label: "LLM Service", status: health.llm },
              { label: "Embeddings", status: health.embeddings },
            ].map(({ label, status }) => (
              <div
                key={label}
                className="border border-border rounded-lg p-4 bg-card flex items-center justify-between"
              >
                <span className="font-medium text-sm">{label}</span>
                <StatusBadge status={status} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground font-mono mt-4">
              Last checked: {health.timestamp ? new Date(health.timestamp).toLocaleString() : "—"}
            </p>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
};

export default StatusPage;
