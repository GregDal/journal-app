import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MOOD_EMOJIS } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function IssueThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("issue_threads")
    .select("*")
    .eq("id", id)
    .single();

  if (!thread) notFound();

  const { data: entries } = await supabase
    .from("entries")
    .select("*, mood_logs(*)")
    .eq("issue_thread_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">{thread.title}</h2>
        <Badge variant={thread.status === "active" ? "default" : "secondary"}>
          {thread.status}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Started{" "}
        {new Date(thread.started_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        {" "}— {entries?.length || 0} sessions
      </p>

      <div className="space-y-3">
        {entries?.map((entry, i) => {
          const prompts = entry.prompts as Record<string, unknown>;
          const moodLog = entry.mood_logs?.[0];
          return (
            <Link key={entry.id} href={`/entries/${entry.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Session {i + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {moodLog && (
                        <span>{MOOD_EMOJIS[moodLog.mood_score - 1]}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {prompts?.situation ? (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {String(prompts.situation)}
                    </p>
                  ) : null}
                  {prompts?.intensity_before !== undefined ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      Intensity: {String(prompts.intensity_before)}% →{" "}
                      {String(prompts.intensity_after)}%
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
