import { SupabaseClient } from "@supabase/supabase-js";
import { ClaudeProvider } from "./claude";

// ─── Prompts ────────────────────────────────────────────────────────────────

const CHAT_MEMORY_PROMPT = `You are a journaling memory assistant. You will receive:
1. The current memory file for this user (may be empty)
2. A journal entry
3. A conversation the user had with an AI reflection guide about that entry

Your job: update the memory file by merging new insights from the conversation.

The memory file is written in second person ("You are...", "You tend to...", "You've been working on...").
It captures the user's ongoing life context, patterns, values, and emotional landscape.

Keep it under 600 words. Focus on:
- Enduring facts, values, or beliefs the user has expressed
- Emotional patterns and recurring themes
- Life situations, relationships, or goals they've mentioned
- How they think, process, and grow

Preserve anything important from the existing memory. Add or refine based on the new conversation.
Write the updated memory as flowing prose — not bullet points.

Also identify 1-3 short themes (1-3 words each) from this session.

Respond in exactly this format:

MEMORY:
[updated memory prose in second person]

THEMES:
[comma-separated theme list]`;

const DIRECT_MEMORY_PROMPT = `You are a journaling memory assistant. You will receive:
1. The current memory file for this user (may be empty)
2. A message from the user about something they want remembered

Your job: integrate the user's message into the memory file naturally.

The memory file is written in second person ("You are...", "You tend to...", "You've been working on...").
It captures the user's ongoing life context, patterns, values, and emotional landscape.

Keep it under 600 words. Integrate the new information gracefully — update existing statements if relevant, or add new ones.
Write the updated memory as flowing prose — not bullet points.

Also identify 0-2 short themes (1-3 words each) from this addition, if any.

Respond in exactly this format:

MEMORY:
[updated memory prose in second person]

THEMES:
[comma-separated theme list, or leave blank if none]`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function persistMemory(
  supabase: SupabaseClient,
  userId: string,
  result: string
): Promise<string> {
  const memoryMatch = result.match(/MEMORY:\s*([\s\S]*?)(?=THEMES:|$)/);
  const themesMatch = result.match(/THEMES:\s*(.*)/);

  const newSummary = memoryMatch?.[1]?.trim() || result.trim();
  const themesList = themesMatch?.[1]
    ?.split(",")
    .map((t) => t.trim())
    .filter(Boolean) || [];

  // Upsert memory row
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

  // Upsert themes
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
        frequency: 1,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      });
    }
  }

  return newSummary;
}

// ─── Public API ───────────────────────────────────────────────────────────────

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

/** Called after "End Chat" — merges the full conversation into memory */
export async function updateMemoryFromChat(
  supabase: SupabaseClient,
  userId: string,
  messages: { role: string; content: string }[],
  entryContent: string,
  apiKey: string
): Promise<string> {
  const { summary: existingSummary } = await getMemoryContext(supabase, userId);

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
    .join("\n");

  const userMessage =
    `CURRENT MEMORY FILE:\n${existingSummary || "(Empty — this is the first session)"}\n\n` +
    `JOURNAL ENTRY:\n${entryContent || "(No entry content)"}\n\n` +
    `CONVERSATION:\n${conversationText}`;

  const provider = new ClaudeProvider(apiKey);
  const result = await provider.chat(
    [{ role: "user", content: userMessage }],
    CHAT_MEMORY_PROMPT
  );

  return persistMemory(supabase, userId, result);
}

/** Called when user types directly in the memory chat ("remember that...") */
export async function updateMemoryFromDirect(
  supabase: SupabaseClient,
  userId: string,
  userMessage: string,
  apiKey: string
): Promise<string> {
  const { summary: existingSummary } = await getMemoryContext(supabase, userId);

  const prompt =
    `CURRENT MEMORY FILE:\n${existingSummary || "(Empty — nothing recorded yet)"}\n\n` +
    `USER MESSAGE:\n${userMessage}`;

  const provider = new ClaudeProvider(apiKey);
  const result = await provider.chat(
    [{ role: "user", content: prompt }],
    DIRECT_MEMORY_PROMPT
  );

  return persistMemory(supabase, userId, result);
}
