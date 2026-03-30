"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PHYSICAL_STATE_TAGS, EMOTIONAL_STATE_TAGS } from "@/lib/types";
import MoodPicker from "@/components/mood/MoodPicker";
import StateTagPicker from "@/components/mood/StateTagPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function QuickCaptureForm() {
  const [mood, setMood] = useState<number | null>(null);
  const [physicalState, setPhysicalState] = useState<string[]>([]);
  const [physicalText, setPhysicalText] = useState("");
  const [emotionalState, setEmotionalState] = useState<string[]>([]);
  const [emotionalText, setEmotionalText] = useState("");
  const [text, setText] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [intention, setIntention] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
        entry_type: "quick",
        prompts: {
          physical_state: physicalState,
          physical_text: physicalText,
          emotional_state: emotionalState,
          emotional_text: emotionalText,
          text,
          gratitude,
          intention,
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
        <h2 className="text-xl font-semibold">Quick Capture</h2>
        <p className="text-sm text-muted-foreground">
          Jot down how you&apos;re feeling right now
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

      <div className="space-y-2">
        <Label>What&apos;s on your mind?</Label>
        <Textarea
          placeholder="Write freely..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>One thing I&apos;m grateful for (optional)</Label>
        <Input
          placeholder="e.g., A good conversation with a friend"
          value={gratitude}
          onChange={(e) => setGratitude(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Intention or affirmation (optional)</Label>
        <Input
          placeholder="e.g., I will stay present today"
          value={intention}
          onChange={(e) => setIntention(e.target.value)}
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || (!text && !mood)}
        className="w-full"
      >
        {saving ? "Saving..." : "Save entry"}
      </Button>
    </div>
  );
}
