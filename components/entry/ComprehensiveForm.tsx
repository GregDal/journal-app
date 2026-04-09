"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PHYSICAL_STATE_TAGS, EMOTIONAL_STATE_TAGS } from "@/lib/types";
import MoodPicker from "@/components/mood/MoodPicker";
import StateTagPicker from "@/components/mood/StateTagPicker";
import TiptapEditor from "@/components/editor/TiptapEditor";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

const PROMPTS = [
  "How am I feeling physically right now?",
  "How am I feeling emotionally right now?",
  "What good things have happened recently?",
  "What difficult or challenging things have happened recently?",
  "What am I looking forward to?",
  "What am I struggling with?",
  "Overall, how would I describe where I'm at right now?",
];

export default function ComprehensiveForm() {
  const [mood, setMood] = useState<number | null>(null);
  const [physicalState, setPhysicalState] = useState<string[]>([]);
  const [physicalText, setPhysicalText] = useState("");
  const [emotionalState, setEmotionalState] = useState<string[]>([]);
  const [emotionalText, setEmotionalText] = useState("");
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [guidanceOpen, setGuidanceOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  function insertPrompt(prompt: string) {
    // We'll insert as heading text via updating content
    // For simplicity, append prompt as a heading to existing content
    const currentContent = content as { type?: string; content?: unknown[] } | null;
    const newNode = {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: prompt }],
    };
    const emptyParagraph = { type: "paragraph" };

    if (currentContent?.type === "doc" && Array.isArray(currentContent.content)) {
      setContent({
        ...currentContent,
        content: [...currentContent.content, newNode, emptyParagraph],
      });
    } else {
      setContent({
        type: "doc",
        content: [newNode, emptyParagraph],
      });
    }
    setEditorKey((k) => k + 1);
  }

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: entry, error } = await supabase
      .from("entries")
      .insert({
        user_id: user.id,
        entry_type: "comprehensive",
        content,
        prompts: {
          physical_state: physicalState,
          physical_text: physicalText,
          emotional_state: emotionalState,
          emotional_text: emotionalText,
        },
      })
      .select()
      .single();

    if (error) {
      setSaving(false);
      return;
    }

    if (mood && entry) {
      await supabase.from("mood_logs").insert({
        entry_id: entry.id,
        user_id: user.id,
        mood_score: mood,
      });
    }

    router.push(`/entries/${entry.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Comprehensive Reflection</h2>
        <p className="text-sm text-muted-foreground">
          A deep inventory of where you&apos;re at — write freely, use the prompts as guidance
        </p>
      </div>

      <MoodPicker value={mood} onChange={setMood} />

      <StateTagPicker
        label="Physical state"
        tags={PHYSICAL_STATE_TAGS}
        selected={physicalState}
        onChange={setPhysicalState}
        freeText={physicalText}
        onFreeTextChange={setPhysicalText}
      />

      <StateTagPicker
        label="Emotional state"
        tags={EMOTIONAL_STATE_TAGS}
        selected={emotionalState}
        onChange={setEmotionalState}
        freeText={emotionalText}
        onFreeTextChange={setEmotionalText}
      />

      {/* Collapsible guidance panel */}
      <div className="rounded-lg border border-border">
        <button
          onClick={() => setGuidanceOpen(!guidanceOpen)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {guidanceOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Reflection prompts (click to insert)
        </button>
        {guidanceOpen && (
          <div className="border-t border-border px-4 py-3 space-y-1">
            {PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => insertPrompt(prompt)}
                className="block w-full text-left rounded px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main writing area */}
      <TiptapEditor
        key={editorKey}
        content={content || undefined}
        onChange={setContent}
        placeholder="Begin your reflection..."
        className="min-h-[400px]"
      />

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? "Saving..." : "Save entry"}
      </Button>
    </div>
  );
}
