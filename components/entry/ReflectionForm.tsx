"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PHYSICAL_STATE_TAGS, EMOTIONAL_STATE_TAGS } from "@/lib/types";
import MoodPicker from "@/components/mood/MoodPicker";
import StateTagPicker from "@/components/mood/StateTagPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { scrollIntoViewOnFocus } from "@/lib/hooks/useAutoScroll";

const PROMPTS = [
  { key: "physical", label: "How are you feeling physically right now?" },
  { key: "emotional", label: "How are you feeling emotionally right now?" },
  { key: "happened", label: "What happened today / recently?" },
  { key: "grateful", label: "What are you grateful for?" },
  { key: "differently", label: "What's one thing you'd do differently?" },
];

export default function ReflectionForm() {
  const [mood, setMood] = useState<number | null>(null);
  const [physicalState, setPhysicalState] = useState<string[]>([]);
  const [physicalText, setPhysicalText] = useState("");
  const [emotionalState, setEmotionalState] = useState<string[]>([]);
  const [emotionalText, setEmotionalText] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
        entry_type: "reflection",
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
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Reflection Check-in</h2>
        <p className="text-sm text-muted-foreground">
          A guided check-in on your day (~15 min)
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
            placeholder="Take your time..."
            value={answers[prompt.key] || ""}
            onChange={(e) => updateAnswer(prompt.key, e.target.value)}
            onFocus={scrollIntoViewOnFocus}
            rows={3}
          />
        </div>
      ))}

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
