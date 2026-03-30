import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EntryView from "./EntryView";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("entries")
    .select("*")
    .eq("id", id)
    .single();

  if (!entry) notFound();

  const { data: moodLog } = await supabase
    .from("mood_logs")
    .select("*")
    .eq("entry_id", id)
    .single();

  const { data: entryTags } = await supabase
    .from("entry_tags")
    .select("tag_id")
    .eq("entry_id", id);

  let tags: { id: string; name: string; color: string }[] = [];
  if (entryTags && entryTags.length > 0) {
    const tagIds = entryTags.map((et) => et.tag_id);
    const { data: tagData } = await supabase
      .from("tags")
      .select("id, name, color")
      .in("id", tagIds);
    tags = tagData || [];
  }

  const { data: conversation } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("entry_id", id)
    .single();

  // Build entry content string for AI context
  const promptsText = entry.prompts
    ? Object.entries(entry.prompts)
        .filter(([k]) => !k.endsWith("_state"))
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : "";
  const contentText = entry.content
    ? JSON.stringify(entry.content)
    : "";
  const entryContent = `${promptsText}\n${contentText}`.trim();

  return (
    <EntryView
      entry={entry}
      moodLog={moodLog}
      tags={tags}
      conversation={conversation}
      entryContent={entryContent}
    />
  );
}
