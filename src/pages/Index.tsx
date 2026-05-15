import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { UploadSection } from "@/components/UploadSection";
import { CheckCircle, Upload, MessageSquare, FileSearch } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload your codebase",
    description: "Upload a ZIP file of your project or provide a GitHub URL.",
  },
  {
    icon: FileSearch,
    title: "Automatic indexing",
    description: "Code is chunked, embedded, and stored in a vector database for semantic search.",
  },
  {
    icon: MessageSquare,
    title: "Ask questions",
    description: "Get answers with exact file paths, line ranges, and code snippets as proof.",
  },
];

const Index = () => {
  const navigate = useNavigate();

  const handleIngested = (sessionId: string, sourceName: string) => {
    localStorage.setItem("codeqa_session_id", sessionId);
    localStorage.setItem("codeqa_source_name", sourceName);
    navigate("/ask");
  };

  return (
    <AppLayout>
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 font-mono">
            Codebase Q&A <span className="text-gradient">with Proof</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload a codebase, ask questions, and get answers backed by exact code snippets with file paths and line numbers.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {steps.map((step, i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-5 bg-card hover:border-glow transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        {/* Upload */}
        <UploadSection onIngested={handleIngested} />
      </div>
    </AppLayout>
  );
};

export default Index;
