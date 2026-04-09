import { NextRequest, NextResponse } from "next/server";
import { ClaudeProvider } from "@/lib/ai/claude";
import { createClient } from "@/lib/supabase/server";
import { getMemoryContext } from "@/lib/ai/memory";

const GUIDED_PROMPT = `You are a warm, empathetic journaling guide. Your role is to ask thoughtful, open-ended questions to help the user explore their thoughts and feelings.

Guidelines:
- Ask ONE question at a time
- Be curious and non-judgmental
- Build on what the user has shared
- Help them dig deeper into their emotions and experiences
- Keep responses to 1-2 sentences + one question
- Never give advice or diagnose
- If this is the start of a conversation, ask a warm, open-ended opening question like "What's been on your mind lately?" or "How are you feeling right now?"`;

const SYNTHESIS_PROMPT = `You are a journaling assistant. Based on the conversation below, write a cohesive, first-person journal entry that captures the user's thoughts and feelings.

Guidelines:
- Write in first person as if the user wrote it
- Organize thoughts into clear paragraphs
- Capture the emotional journey of the conversation
- Include specific details the user mentioned
- Use natural, reflective language
- Do NOT include the AI's questions — only the user's reflections
- Aim for 200-400 words
- Use ## headings to organize sections if appropriate

Return ONLY the journal entry text, nothing else.`;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI not configured" },
        { status: 500 }
      );
    }

    const { action, messages } = await req.json();
    const provider = new ClaudeProvider(apiKey);

    if (action === "synthesize") {
      const reply = await provider.chat(messages || [], SYNTHESIS_PROMPT);
      return NextResponse.json({ entry: reply });
    }

    // start or continue conversation
    let systemPrompt = GUIDED_PROMPT;

    // Add memory context if available
    const memory = await getMemoryContext(supabase, user.id);
    if (memory.summary) {
      systemPrompt += `\n\nContext from the user's journaling history:\n${memory.summary}`;
      if (memory.themes.length > 0) {
        systemPrompt += `\nRecurring themes: ${memory.themes.join(", ")}`;
      }
    }

    const chatMessages = messages || [
      { role: "user", content: "I'd like to journal today." },
    ];

    const reply = await provider.chat(chatMessages, systemPrompt);
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI guided error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
