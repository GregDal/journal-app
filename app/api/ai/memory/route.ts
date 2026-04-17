import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateMemoryFromChat, updateMemoryFromDirect } from "@/lib/ai/memory";

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
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { type } = body;

    if (type === "chat") {
      const { messages, entryContent } = body;
      const updatedMemory = await updateMemoryFromChat(
        supabase,
        user.id,
        messages,
        entryContent || "",
        apiKey
      );
      return NextResponse.json({ ok: true, memory: updatedMemory });
    }

    if (type === "direct") {
      const { userMessage } = body;
      const updatedMemory = await updateMemoryFromDirect(
        supabase,
        user.id,
        userMessage,
        apiKey
      );
      return NextResponse.json({ ok: true, memory: updatedMemory });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Memory update error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET — return current memory file
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("ai_memory")
      .select("id, summary, entry_count, last_entry_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ memory: data || null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — save directly edited memory text
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { summary } = await req.json();

    const { data: existing } = await supabase
      .from("ai_memory")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from("ai_memory")
        .update({ summary })
        .eq("id", existing.id);
    } else {
      await supabase.from("ai_memory").insert({
        user_id: user.id,
        summary,
        entry_count: 0,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
