import { NextRequest, NextResponse } from "next/server";
import { ClaudeProvider } from "@/lib/ai/claude";
import {
  ANALYSIS_MOOD_PROMPT,
  ANALYSIS_THEMES_PROMPT,
} from "@/lib/ai/prompts";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, entryTexts } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI not configured" },
      { status: 500 }
    );
  }

  const provider = new ClaudeProvider(apiKey);
  const prompt =
    type === "mood" ? ANALYSIS_MOOD_PROMPT : ANALYSIS_THEMES_PROMPT;

  const result = await provider.analyze(entryTexts, prompt);

  // Try to parse JSON from the response
  try {
    const parsed = JSON.parse(result);
    return NextResponse.json({ result: parsed });
  } catch {
    return NextResponse.json({ result, raw: true });
  }
}
