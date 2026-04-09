"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PHYSICAL_STATE_TAGS, EMOTIONAL_STATE_TAGS } from "@/lib/types";
import MoodPicker from "@/components/mood/MoodPicker";
import StateTagPicker from "@/components/mood/StateTagPicker";
import TiptapEditor from "@/components/editor/TiptapEditor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, FileText } from "lucide-react";
import type { AIMessage } from "@/lib/types";

type Phase = "conversation" | "review";

export default function AIGuidedForm() {
  const [phase, setPhase] = useState<Phase>("conversation");
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [synthesized, setSynthesized] = useState<Record<string, unknown> | null>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [physicalState, setPhysicalState] = useState<string[]>([]);
  const [physicalText, setPhysicalText] = useState("");
  const [emotionalState, setEmotionalState] = useState<string[]>([]);
  const [emotionalText, setEmotionalText] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Start with an AI opening question
  useEffect(() => {
    if (messages.length === 0) {
      startConversation();
    }
  }, []);

  async function startConversation() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/guided", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([
          {
            role: "assistant",
            content: data.reply,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages([
        {
          role: "assistant",
          content: "What's on your mind today? I'd like to help you explore your thoughts.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg: AIMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/guided", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "continue",
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "I'd like to hear more. Could you tell me what else is on your mind?",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function synthesizeEntry() {
    setSynthesizing(true);
    try {
      const res = await fetch("/api/ai/guided", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "synthesize",
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();

      const doc = {
        type: "doc",
        content: data.entry
          .split("\n\n")
          .filter((p: string) => p.trim())
          .map((p: string) => {
            if (p.startsWith("# ")) {
              return {
                type: "heading",
                attrs: { level: 1 },
                content: [{ type: "text", text: p.slice(2) }],
              };
            }
            if (p.startsWith("## ")) {
              return {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: p.slice(3) }],
              };
            }
            return {
              type: "paragraph",
              content: [{ type: "text", text: p }],
            };
          }),
      };

      setSynthesized(doc);
      setPhase("review");
    } catch {
      alert("Failed to synthesize entry. Please try again.");
    } finally {
      setSynthesizing(false);
    }
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
        entry_type: "ai_guided",
        content: synthesized,
        prompts: {
          physical_state: physicalState,
          physical_text: physicalText,
          emotional_state: emotionalState,
          emotional_text: emotionalText,
          ai_conversation: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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

  // Conversation phase
  if (phase === "conversation") {
    const userMessageCount = messages.filter((m) => m.role === "user").length;

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Guided Journal Entry
          </h2>
          <p className="text-sm text-muted-foreground">
            Have a conversation, then generate a journal entry from it
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <ScrollArea className="h-96 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 border-t border-border p-3">
            <Textarea
              placeholder="Share what's on your mind..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={1}
              className="min-h-[40px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {userMessageCount >= 2 && (
          <Button
            onClick={synthesizeEntry}
            disabled={synthesizing}
            className="w-full gap-2"
          >
            <FileText className="h-4 w-4" />
            {synthesizing ? "Generating entry..." : "Generate Journal Entry"}
          </Button>
        )}

        {userMessageCount < 2 && (
          <p className="text-xs text-center text-muted-foreground">
            Continue the conversation — you can generate your entry after a few exchanges
          </p>
        )}
      </div>
    );
  }

  // Review phase
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Review Your Entry</h2>
        <p className="text-sm text-muted-foreground">
          Edit the generated entry below, then save when you&apos;re ready
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

      <TiptapEditor
        content={synthesized || undefined}
        onChange={setSynthesized}
        placeholder="Your synthesized entry..."
        className="min-h-[300px]"
      />

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setPhase("conversation")}
          className="flex-1"
        >
          Back to conversation
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1"
        >
          {saving ? "Saving..." : "Save entry"}
        </Button>
      </div>
    </div>
  );
}
