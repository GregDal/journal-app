"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Check } from "lucide-react";
import type { AIMessage } from "@/lib/types";

interface AIConversationProps {
  entryId: string;
  entryType: string;
  entryContent: string;
  existingMessages?: AIMessage[];
}

type EndChatState = "idle" | "saving" | "saved";

export default function AIConversation({
  entryId,
  entryType,
  entryContent,
  existingMessages = [],
}: AIConversationProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>(existingMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [endChatState, setEndChatState] = useState<EndChatState>("idle");
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          entryType,
          entryContent,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const assistantMsg: AIMessage = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages([...updatedMessages, assistantMsg]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: `Error: ${errMsg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function autoAnalyze() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId,
          entryType,
          entryContent,
          autoAnalyze: true,
        }),
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setMessages([
          {
            role: "assistant",
            content: data.reply,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // Silently fail — user can still chat manually
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    if (existingMessages.length === 0 && messages.length === 0) {
      autoAnalyze();
    }
  }

  async function handleEndChat() {
    // If no real conversation happened, just close
    const hasConversation = messages.some((m) => m.role === "user");
    if (!hasConversation) {
      setOpen(false);
      return;
    }

    setEndChatState("saving");
    try {
      await fetch("/api/ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "chat",
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          entryContent,
        }),
      });
    } catch {
      // Don't block closing even if memory update fails
    }

    setEndChatState("saved");
    setTimeout(() => {
      setOpen(false);
      setEndChatState("idle");
    }, 1200);
  }

  if (!open) {
    return (
      <Button variant="outline" className="gap-2" onClick={handleOpen}>
        <MessageCircle className="h-4 w-4" />
        Talk to AI
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Reflection Guide</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">
            Not a therapist — a guide for reflection
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleEndChat}
            disabled={endChatState === "saving"}
          >
            {endChatState === "saving" ? (
              <>Saving…</>
            ) : endChatState === "saved" ? (
              <>
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-green-600">Saved to memory</span>
              </>
            ) : (
              <>
                <X className="h-3 w-3" />
                End Chat
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-80 p-4" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Start a conversation about this entry. The AI will ask reflective
            questions to help you explore your thoughts and feelings.
          </p>
        )}
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
              <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Thinking…
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2 border-t border-border p-3">
        <Textarea
          placeholder="Share what's on your mind…"
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
  );
}
