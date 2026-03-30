import type { AIProvider, AIMessage } from "./provider";

export class OllamaProvider implements AIProvider {
  private endpoint: string;
  private model: string;

  constructor(endpoint: string, model: string) {
    this.endpoint = endpoint.replace(/\/$/, "");
    this.model = model;
  }

  async chat(messages: AIMessage[], systemPrompt: string): Promise<string> {
    const ollamaMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const res = await fetch(`${this.endpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        messages: ollamaMessages,
        stream: false,
      }),
    });

    const data = await res.json();
    return data.message?.content ?? "";
  }

  async analyze(texts: string[], prompt: string): Promise<string> {
    const combined = texts
      .map((t, i) => `--- Entry ${i + 1} ---\n${t}`)
      .join("\n\n");

    return this.chat([{ role: "user", content: combined }], prompt);
  }
}
