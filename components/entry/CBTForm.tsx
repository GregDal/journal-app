"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MoodPicker from "@/components/mood/MoodPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IssueThread } from "@/lib/types";
import { scrollIntoViewOnFocus } from "@/lib/hooks/useAutoScroll";

const PROMPTS = [
  {
    key: "situation",
    label: "Describe the situation",
    hint: "Who, what, when, where — just the facts",
  },
  {
    key: "automatic_thoughts",
    label: "What thoughts came up automatically?",
    hint: "Write them exactly as they appeared in your mind",
  },
  {
    key: "emotions",
    label: "What emotions did you feel?",
    hint: "Name them and rate intensity below",
  },
  {
    key: "evidence_for",
    label: "What evidence supports these thoughts?",
    hint: "What facts back up the automatic thoughts?",
  },
  {
    key: "evidence_against",
    label: "What evidence contradicts them?",
    hint: "What facts challenge or don't fit the automatic thoughts?",
  },
  {
    key: "friend_advice",
    label: "What would you tell a close friend in this situation?",
    hint: "Often we're kinder to others than ourselves",
  },
  {
    key: "balanced_perspective",
    label: "What's a more balanced perspective?",
    hint: "Considering all the evidence, what's a fairer way to see this?",
  },
];

export default function CBTForm({
  existingThreadId,
}: {
  existingThreadId?: string;
}) {
  const [mood, setMood] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [intensityBefore, setIntensityBefore] = useState(50);
  const [intensityAfter, setIntensityAfter] = useState(50);
  const [threadTitle, setThreadTitle] = useState("");
  const [existingThreads, setExistingThreads] = useState<IssueThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(
    existingThreadId || null
  );
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadThreads() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("issue_threads")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("started_at", { ascending: false });

      if (data) setExistingThreads(data);
    }
    loadThreads();
  }, [supabase]);

  function updateAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let threadId = selectedThread;

    // Create new thread if needed
    if (!threadId && threadTitle) {
      const { data: thread } = await supabase
        .from("issue_threads")
        .insert({
          user_id: user.id,
          title: threadTitle,
        })
        .select()
        .single();

      if (thread) threadId = thread.id;
    }

    const { data: entry, error } = await supabase
      .from("entries")
      .insert({
        user_id: user.id,
        entry_type: "cbt",
        issue_thread_id: threadId,
        prompts: {
          ...answers,
          intensity_before: intensityBefore,
          intensity_after: intensityAfter,
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
        <h2 className="text-xl font-semibold">CBT Issue Work-through</h2>
        <p className="text-sm text-muted-foreground">
          Work through a specific issue with structured reflection
        </p>
      </div>

      {/* Thread selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Issue thread</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {existingThreads.length > 0 && (
            <div className="space-y-2">
              <Label>Continue an existing thread</Label>
              <div className="flex flex-wrap gap-2">
                {existingThreads.map((t) => (
                  <Button
                    key={t.id}
                    variant={selectedThread === t.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedThread(
                        selectedThread === t.id ? null : t.id
                      );
                      if (selectedThread !== t.id) setThreadTitle("");
                    }}
                  >
                    {t.title}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {!selectedThread && (
            <div className="space-y-2">
              <Label>Or start a new thread</Label>
              <Input
                placeholder='e.g., "Work stress" or "Relationship anxiety"'
                value={threadTitle}
                onChange={(e) => setThreadTitle(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <MoodPicker value={mood} onChange={setMood} />

      {/* Emotion intensity before */}
      <div className="space-y-2">
        <Label>Emotional intensity before reflecting (0-100%)</Label>
        <Slider
          value={[intensityBefore]}
          onValueChange={(v) => setIntensityBefore(typeof v === "number" ? v : v[0])}
          max={100}
          step={5}
        />
        <p className="text-sm text-muted-foreground text-right">
          {intensityBefore}%
        </p>
      </div>

      {PROMPTS.map((prompt) => (
        <div key={prompt.key} className="space-y-2">
          <Label>{prompt.label}</Label>
          <p className="text-xs text-muted-foreground">{prompt.hint}</p>
          <Textarea
            placeholder="Take your time..."
            value={answers[prompt.key] || ""}
            onChange={(e) => updateAnswer(prompt.key, e.target.value)}
            onFocus={scrollIntoViewOnFocus}
            rows={3}
          />
        </div>
      ))}

      {/* Emotion intensity after */}
      <div className="space-y-2">
        <Label>Emotional intensity after reflecting (0-100%)</Label>
        <Slider
          value={[intensityAfter]}
          onValueChange={(v) => setIntensityAfter(typeof v === "number" ? v : v[0])}
          max={100}
          step={5}
        />
        <p className="text-sm text-muted-foreground text-right">
          {intensityAfter}%
        </p>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? "Saving..." : "Save session"}
      </Button>
    </div>
  );
}
