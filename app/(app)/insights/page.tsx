import { createClient } from "@/lib/supabase/server";
import InsightsView from "./InsightsView";

export default async function InsightsPage() {
  const supabase = await createClient();

  const { data: insights } = await supabase
    .from("ai_insights")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: moodLogs } = await supabase
    .from("mood_logs")
    .select("*, entries(created_at, entry_type)")
    .order("created_at", { ascending: true })
    .limit(90);

  const { data: entries } = await supabase
    .from("entries")
    .select("id, entry_type, prompts, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <InsightsView
      insights={insights || []}
      moodLogs={moodLogs || []}
      entries={entries || []}
    />
  );
}
