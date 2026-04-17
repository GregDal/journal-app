"use client";

import { ENTRY_TYPE_CONFIG, ENTRY_TYPE_COLORS, MOOD_EMOJIS } from "@/lib/types";
import type { Entry, MoodLog, AIConversation } from "@/lib/types";
import AIConversationComponent from "@/components/entry/AIConversation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EntryViewProps {
  entry: Entry;
  moodLog: MoodLog | null;
  tags: { id: string; name: string; color: string }[];
  conversation: AIConversation | null;
  entryContent: string;
}

export default function EntryView({
  entry,
  moodLog,
  tags,
  conversation,
  entryContent,
}: EntryViewProps) {
  const config = ENTRY_TYPE_CONFIG[entry.entry_type];
  const prompts = (entry.prompts || {}) as Record<string, unknown>;

  const physicalState = (prompts.physical_state as string[]) || [];
  const emotionalState = (prompts.emotional_state as string[]) || [];

  // Get prompt answers (exclude state arrays and intensity values)
  const promptAnswers = Object.entries(prompts).filter(
    ([k, v]) =>
      !k.endsWith("_state") &&
      !k.endsWith("_text") &&
      k !== "intensity_before" &&
      k !== "intensity_after" &&
      k !== "ai_conversation" &&
      typeof v === "string" &&
      v.trim()
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ENTRY_TYPE_COLORS[entry.entry_type]}`}>
            {config.label}
          </span>
          <p className="text-sm text-muted-foreground">
            {new Date(entry.created_at).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        {moodLog && (
          <span className="text-3xl">
            {MOOD_EMOJIS[moodLog.mood_score - 1]}
          </span>
        )}
      </div>

      {/* State tags */}
      {(physicalState.length > 0 || emotionalState.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {physicalState.map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
          {emotionalState.map((s) => (
            <Badge key={s} variant="outline">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              style={{ backgroundColor: tag.color, color: "#fff" }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}

      {/* CBT intensity */}
      {entry.entry_type === "cbt" &&
        prompts.intensity_before !== undefined && (
          <div className="flex gap-4 text-sm">
            <span>
              Intensity before:{" "}
              <strong>{String(prompts.intensity_before)}%</strong>
            </span>
            <span>
              Intensity after:{" "}
              <strong>{String(prompts.intensity_after)}%</strong>
            </span>
          </div>
        )}

      {/* Prompt answers */}
      {promptAnswers.length > 0 && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {promptAnswers.map(([key, value]) => (
              <div key={key}>
                <p className="text-sm font-medium text-muted-foreground capitalize">
                  {key.replace(/_/g, " ")}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{String(value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* AI Conversation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Reflection</CardTitle>
        </CardHeader>
        <CardContent>
          <AIConversationComponent
            entryId={entry.id}
            entryType={entry.entry_type}
            entryContent={entryContent}
            existingMessages={conversation?.messages || []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
