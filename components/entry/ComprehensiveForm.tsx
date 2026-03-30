"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PHYSICAL_STATE_TAGS, EMOTIONAL_STATE_TAGS } from "@/lib/types";
import MoodPicker from "@/components/mood/MoodPicker";
import StateTagPicker from "@/components/mood/StateTagPicker";
import TiptapEditor from "@/components/editor/TiptapEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PROMPTS = [
  { key: "physical", label: "How am I feeling physically right now?" },
  { key: "emotional", label: "How am I feeling emotionally right now?" },
  { key: "good_things", label: "What good things have happened recently?" },
  {
    key: "difficult_things",
    label: "What difficult or challenging things have happened recently?",
  },
  { key: "looking_forward", label: "What am I looking forward to?" },
  { key: "struggling", label: "What am I struggling with?" },
  {
    key: "overall",
    label: "Overall, how would I describe where I'm at right now?",
  },
];

export default function ComprehensiveForm() {
  const [mood, setMood] = useState<number | null>(null);
  const [physicalState, setPhysicalState] = useState<string[]>([]);
  const [physicalText, setPhysicalText] = useState("");
  const [emotionalState, setEmotionalState] = useState<string[]>([]);
  const [emotionalText, setEmotionalText] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
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
          ...answers,
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Comprehensive Reflection</h2>
        <p className="text-sm text-muted-foreground">
          A deep inventory of where you&apos;re at (~1 hour)
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

      {PROMPTS.map((prompt) => (
        <div key={prompt.key} className="space-y-2">
          <Label>{prompt.label}</Label>
          <Textarea
            placeholder="Take your time and reflect..."
            value={answers[prompt.key] || ""}
            onChange={(e) => updateAnswer(prompt.key, e.target.value)}
            rows={4}
          />
        </div>
      ))}

      <div className="space-y-2">
        <Label>Additional thoughts (rich text)</Label>
        <TiptapEditor
          content={content || undefined}
          onChange={setContent}
          placeholder="Expand on anything above, or write freely..."
        />
      </div>

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
