import { useState } from "react";
import { ChevronDown, ChevronRight, FileCode } from "lucide-react";
import type { CodeChunk } from "@/lib/api";

export function CodeSnippet({ chunk, index }: { chunk: CodeChunk; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <FileCode className="h-4 w-4 text-primary shrink-0" />
        <span className="font-mono text-sm text-foreground truncate">
          {chunk.filePath}
        </span>
        <span className="text-xs text-muted-foreground font-mono ml-auto shrink-0">
          L{chunk.startLine}–{chunk.endLine}
        </span>
        {chunk.similarity !== undefined && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono shrink-0">
            {(chunk.similarity * 100).toFixed(0)}%
          </span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-border">
          <div className="overflow-x-auto">
            <pre className="p-4 text-sm font-mono leading-relaxed">
              {chunk.content.split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="text-muted-foreground select-none w-12 text-right pr-4 shrink-0">
                    {chunk.startLine + i}
                  </span>
                  <span className="text-foreground">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
