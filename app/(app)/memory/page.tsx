import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MemoryView from "./MemoryView";

export default async function MemoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memory } = await supabase
    .from("ai_memory")
    .select("id, summary, entry_count, last_entry_date, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return <MemoryView initialMemory={memory ?? null} />;
}
