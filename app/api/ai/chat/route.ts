import { NextRequest, NextResponse } from "next/server";
import { ClaudeProvider } from "@/lib/ai/claude";
import { getEntrySystemPrompt } from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId, entryType, entryContent, messages } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI not configured — ANTHROPIC_API_KEY is missing" },
        { status: 500 }
      );
    }

    const provider = new ClaudeProvider(apiKey);
    const systemPrompt = `${getEntrySystemPrompt(entryType)}\n\nHere is the user's journal entry for context:\n---\n${entryContent}\n---\n\nRespond to the user's message with a reflective question or observation.`;

    const reply = await provider.chat(messages, systemPrompt);

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
