"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseJournalText } from "@/lib/import/parser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Check } from "lucide-react";

interface ParsedEntry {
  date: Date;
  text: string;
}

export default function ImportPage() {
  const [parsed, setParsed] = useState<ParsedEntry[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const entries = parseJournalText(text);
      setParsed(entries);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parsed) return;
    setImporting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Batch insert entries
    const rows = parsed.map((entry) => ({
      user_id: user.id,
      entry_type: "comprehensive" as const,
      prompts: { text: entry.text },
      created_at: entry.date.toISOString(),
      updated_at: entry.date.toISOString(),
      imported: true,
    }));

    const { error } = await supabase.from("entries").insert(rows);

    if (!error) {
      setDone(true);
    }
    setImporting(false);
  }

  async function handleAnalyze() {
    if (!parsed) return;
    setAnalyzing(true);

    const texts = parsed.map((e) => e.text);

    // Run mood analysis
    await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mood", entryTexts: texts }),
    });

    // Run theme analysis
    await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "themes", entryTexts: texts }),
    });

    setAnalyzing(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">Import Journal</h2>
      <p className="text-sm text-muted-foreground">
        Upload a plain text file from Apple Notes (or any text file with dated
        entries). The parser will split entries by date headers.
      </p>

      {!parsed && (
        <Card
          className="cursor-pointer border-dashed transition-colors hover:bg-accent/30"
          onClick={() => fileRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to select a .txt file
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={handleFileUpload}
            />
          </CardContent>
        </Card>
      )}

      {parsed && !done && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Found <strong>{parsed.length}</strong> entries spanning{" "}
              <strong>
                {parsed[0]?.date.toLocaleDateString()} &ndash;{" "}
                {parsed[parsed.length - 1]?.date.toLocaleDateString()}
              </strong>
            </p>
            <div className="max-h-60 space-y-2 overflow-y-auto rounded border border-border p-3">
              {parsed.slice(0, 10).map((entry, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">
                    {entry.date.toLocaleDateString()}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    &mdash; {entry.text.slice(0, 80)}...
                  </span>
                </div>
              ))}
              {parsed.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  ...and {parsed.length - 10} more
                </p>
              )}
            </div>
            <Button
              onClick={handleImport}
              disabled={importing}
              className="w-full"
            >
              {importing
                ? "Importing..."
                : `Import ${parsed.length} entries`}
            </Button>
          </CardContent>
        </Card>
      )}

      {done && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Check className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">
              Successfully imported {parsed?.length} entries
            </p>
            <Button
              variant="outline"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing
                ? "Analyzing with AI..."
                : "Run AI analysis on imported entries"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
