"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Edit3,
  Save,
  X,
  Send,
  MessageCircle,
  Loader2,
} from "lucide-react";

interface MemoryRecord {
  id: string;
  summary: string | null;
  entry_count: number | null;
  last_entry_date: string | null;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type Tab = "view" | "edit" | "chat";

export default function MemoryView({
  initialMemory,
}: {
  initialMemory: MemoryRecord | null;
}) {
  const [tab, setTab] = useState<Tab>("view");
  const [memory, setMemory] = useState<MemoryRecord | null>(initialMemory);
  const [editText, setEditText] = useState(initialMemory?.summary ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // ── Edit handlers ──────────────────────────────────────────────────────────

  function handleStartEdit() {
    setEditText(memory?.summary ?? "");
    setTab("edit");
    setSaveMsg("");
  }

  function handleCancelEdit() {
    setTab("view");
    setSaveMsg("");
  }

  async function handleSaveEdit() {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/ai/memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: editText }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setMemory((prev) =>
        prev
          ? { ...prev, summary: editText }
          : {
              id: "",
              summary: editText,
              entry_count: 0,
              last_entry_date: null,
              created_at: new Date().toISOString(),
            }
      );
      setSaveMsg("Saved!");
      setTimeout(() => {
        setTab("view");
        setSaveMsg("");
      }, 1000);
    } catch {
      setSaveMsg("Error saving — try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Chat handlers ──────────────────────────────────────────────────────────

  async function handleSendChat() {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "direct", userMessage: userMsg.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      // Refresh memory display
      if (data.memory) {
        setMemory((prev) =>
          prev
            ? { ...prev, summary: data.memory }
            : {
                id: "",
                summary: data.memory,
                entry_count: 1,
                last_entry_date: new Date().toISOString(),
                created_at: new Date().toISOString(),
              }
        );
      }

      setChatMessages([
        ...updated,
        {
          role: "assistant",
          content: "Got it — I've updated your memory file with that.",
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setChatMessages([
        ...updated,
        { role: "assistant", content: `Error: ${msg}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasMemory = memory?.summary && memory.summary.trim().length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">AI Memory</h1>
          <p className="text-sm text-muted-foreground">
            What the AI knows about you across sessions
          </p>
        </div>
      </div>

      {/* Stats row */}
      {memory && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          {memory.entry_count != null && memory.entry_count > 0 && (
            <span>{memory.entry_count} sessions recorded</span>
          )}
          {memory.last_entry_date && (
            <span>
              Last updated{" "}
              {new Date(memory.last_entry_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(["view", "edit", "chat"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              if (t === "edit") handleStartEdit();
              else setTab(t);
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "view" ? "View" : t === "edit" ? "Edit" : "Add to Memory"}
          </button>
        ))}
      </div>

      {/* View tab */}
      {tab === "view" && (
        <div className="rounded-lg border border-border bg-card p-6">
          {hasMemory ? (
            <>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {memory!.summary}
              </p>
              <div className="mt-6 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleStartEdit}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit memory
                </Button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <Brain className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">
                No memory recorded yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Memory builds as you use "End Chat" in AI conversations, or use
                the "Add to Memory" tab to add something directly.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit tab */}
      {tab === "edit" && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <p className="text-xs text-muted-foreground">
            Edit your memory file directly. Write in second person ("You are…",
            "You tend to…").
          </p>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={16}
            className="resize-none font-mono text-sm"
            placeholder="You are someone who..."
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={saving}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save changes
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            {saveMsg && (
              <span className="text-xs text-muted-foreground">{saveMsg}</span>
            )}
          </div>
        </div>
      )}

      {/* Chat tab */}
      {tab === "chat" && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Add to your memory</span>
            <span className="ml-auto text-xs text-muted-foreground">
              Tell me something to remember
            </span>
          </div>

          <ScrollArea className="h-64 p-4" ref={scrollRef}>
            {chatMessages.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tell me something you'd like remembered — a preference, a goal,
                something important about yourself. I'll weave it into your
                memory file.
              </p>
            )}
            <div className="space-y-3">
              {chatMessages.map((msg, i) => (
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
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    Updating memory…
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 border-t border-border p-3">
            <Textarea
              placeholder="Remember that I prefer…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              rows={1}
              className="min-h-[40px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSendChat}
              disabled={!chatInput.trim() || chatLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
