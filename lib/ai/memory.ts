import { SupabaseClient } from "@supabase/supabase-js";
import { ClaudeProvider } from "./claude";

const MEMORY_UPDATE_PROMPT = `You are a journaling memory assistant. You will receive:
1. An existing summary of a user's journaling history (may be empty if this is their first entry)
2. A new journal entry

Your job: merge the existing summary with the new entry to produce an updated summary that captures:
- Key emotional themes and patterns
- Important life events or situations mentioned
- Recurring concerns or sources of joy
- How the user's emotional state has evolved

Keep the summary under 500 words. Write in third person ("The user...").
Be concise and focus on what would be most useful context for a future reflective conversation.

Also identify any themes. Return your response in this exact format:

SUMMARY:
[your updated summary]

THEMES:
[comma-separated list of 1-3 word themes, e.g.: "work stress, relationship anxiety, gratitude practice"]`;

export async function getMemoryContext(
  supabase: SupabaseClient,
  userId: string
): Promise<{ summary: string; themes: string[] }> {
  const { data: memory } = await supabase
    .from("ai_memory")
    .select("summary")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: themes } = await supabase
    .from("ai_long_term_themes")
    .select("theme, frequency")
    .eq("user_id", userId)
    .order("frequency", { ascending: false })
    .limit(10);

  return {
    summary: memory?.summary || "",
    themes: themes?.map((t) => t.theme) || [],
  };
}

export async function updateMemory(
  supabase: SupabaseClient,
  userId: string,
  newEntryText: string,
  apiKey: string
): Promise<void> {
  const { summary: existingSummary } = await getMemoryContext(supabase, userId);

  const provider = new ClaudeProvider(apiKey);
  const userMessage = `EXISTING SUMMARY:\n${existingSummary || "(No previous entries)"}\n\nNEW ENTRY:\n${newEntryText}`;

  const result = await provider.chat(
    [{ role: "user", content: userMessage }],
    MEMORY_UPDATE_PROMPT
  );

  // Parse response
  const summaryMatch = result.match(/SUMMARY:\s*([\s\S]*?)(?=THEMES:|$)/);
  const themesMatch = result.match(/THEMES:\s*(.*)/);

  const newSummary = summaryMatch?.[1]?.trim() || result;
  const themesList = themesMatch?.[1]
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) || [];

  // Get current entry count
  const { data: existing } = await supabase
    .from("ai_memory")
    .select("id, entry_count")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    await supabase
      .from("ai_memory")
      .update({
        summary: newSummary,
        entry_count: (existing.entry_count || 0) + 1,
        last_entry_date: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("ai_memory").insert({
      user_id: userId,
      summary: newSummary,
      entry_count: 1,
      last_entry_date: new Date().toISOString(),
    });
  }

  // Update themes
  for (const theme of themesList) {
    const { data: existingTheme } = await supabase
      .from("ai_long_term_themes")
      .select("id, frequency")
      .eq("user_id", userId)
      .eq("theme", theme)
      .single();

    if (existingTheme) {
      await supabase
        .from("ai_long_term_themes")
        .update({
          frequency: existingTheme.frequency + 1,
          last_seen: new Date().toISOString(),
        })
        .eq("id", existingTheme.id);
    } else {
      await supabase.from("ai_long_term_themes").insert({
        user_id: userId,
        theme,
      });
    }
  }
}
