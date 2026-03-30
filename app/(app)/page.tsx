import { createClient } from "@/lib/supabase/server";
import Dashboard from "./Dashboard";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: moodLogs } = await supabase
    .from("mood_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <Dashboard entries={entries || []} moodLogs={moodLogs || []} />
  );
}
