import { NextRequest, NextResponse } from "next/server";
import { ClaudeProvider } from "@/lib/ai/claude";
import { getEntrySystemPrompt } from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/server";
import { getMemoryContext } from "@/lib/ai/memory";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId, entryType, entryContent, messages, autoAnalyze } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI not configured — ANTHROPIC_API_KEY is missing" },
        { status: 500 }
      );
    }

    const provider = new ClaudeProvider(apiKey);

    // Build system prompt with memory context
    let systemPrompt = `${getEntrySystemPrompt(entryType)}\n\nHere is the user's journal entry for context:\n---\n${entryContent}\n---\n\n`;

    // Add memory context
    const memory = await getMemoryContext(supabase, user.id);
    if (memory.summary) {
      systemPrompt += `Context from the user's journaling history:\n${memory.summary}\n`;
      if (memory.themes.length > 0) {
        systemPrompt += `Recurring themes: ${memory.themes.join(", ")}\n\n`;
      }
    }

    if (autoAnalyze) {
      systemPrompt += "Read this entry carefully. Provide a brief, empathetic observation about what you notice — patterns, emotions, or themes. Then ask one thoughtful follow-up question to help the user reflect deeper. Keep it to 2-3 sentences plus the question.";
    } else {
      systemPrompt += "Respond to the user's message with a reflective question or observation.";
    }

    const chatMessages = autoAnalyze
      ? [{ role: "user" as const, content: "I just wrote this entry and I'd like to reflect on it with you." }]
      : messages;

    const reply = await provider.chat(chatMessages, systemPrompt);

    // Save conversation
    const allMessages = [
      ...messages,
      {
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      },
    ];

    const { data: existing } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("entry_id", entryId)
      .single();

    if (existing) {
      await supabase
        .from("ai_conversations")
        .update({ messages: allMessages })
        .eq("id", existing.id);
    } else {
      await supabase.from("ai_conversations").insert({
        entry_id: entryId,
        user_id: user.id,
        messages: allMessages,
      });
    }

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI chat error:", message);
    return NextResponse.json(
      { error: `AI error: ${message}` },
      { status: 500 }
    );
  }
}
