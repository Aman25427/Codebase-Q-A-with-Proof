import { useState, useCallback } from "react";
import { Upload, Github, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseZipFile, isValidGithubUrl, generateSessionKey } from "@/lib/file-utils";
import { ingestCode } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface UploadSectionProps {
  onIngested: (sessionId: string, sourceName: string) => void;
}

export function UploadSection({ onIngested }: UploadSectionProps) {
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const handleZipUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".zip")) {
      setError("Please upload a valid ZIP file.");
      return;
    }

    setIsLoading(true);
    setError("");
    setStatus("Extracting ZIP...");

    try {
      const files = await parseZipFile(file);

      if (files.length === 0) {
        setError("No code files found in the ZIP. Make sure it contains source code files.");
        setIsLoading(false);
        return;
      }

      setStatus(`Found ${files.length} files. Generating embeddings...`);

      const sessionKey = generateSessionKey();
      const result = await ingestCode(files, sessionKey, file.name, "zip");

      setStatus("");
      toast({
        title: "Codebase ingested!",
        description: `${result.filesProcessed} files processed, ${result.chunksStored} chunks stored.`,
      });
      onIngested(result.sessionId, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process ZIP");
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  }, [onIngested, toast]);

  const handleGithubSubmit = useCallback(async () => {
    if (!githubUrl.trim()) {
      setError("Please enter a GitHub URL.");
      return;
    }

    if (!isValidGithubUrl(githubUrl)) {
      setError("Invalid GitHub URL. Use format: https://github.com/owner/repo");
      return;
    }

    setIsLoading(true);
    setError("");
    setStatus("GitHub cloning is not yet supported in-browser. Please download the repo as ZIP and upload it.");
    setIsLoading(false);
  }, [githubUrl]);

  return (
    <div className="space-y-6">
      {/* ZIP Upload */}
      <div className="border border-border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Upload ZIP</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a ZIP file containing your codebase. Binary files and node_modules will be skipped.
        </p>
        <label className="block">
          <input
            type="file"
            accept=".zip"
            onChange={handleZipUpload}
            disabled={isLoading}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
              file:text-sm file:font-medium file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90 file:cursor-pointer file:transition-colors
              disabled:opacity-50"
          />
        </label>
      </div>

      {/* GitHub URL */}
      <div className="border border-border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Github className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">GitHub Repository</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Enter a public GitHub repository URL.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="https://github.com/owner/repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            disabled={isLoading}
            className="font-mono text-sm"
          />
          <Button onClick={handleGithubSubmit} disabled={isLoading}>
            Analyze
          </Button>
        </div>
      </div>

      {/* Status/Error */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {status}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
