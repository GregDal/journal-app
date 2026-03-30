import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIMessage } from "./provider";

export class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(messages: AIMessage[], systemPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }

  async analyze(texts: string[], prompt: string): Promise<string> {
    const combined = texts
      .map((t, i) => `--- Entry ${i + 1} ---\n${t}`)
      .join("\n\n");

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: prompt,
      messages: [{ role: "user", content: combined }],
    });

    const block = response.content[0];
    return block.type === "text" ? block.text : "";
  }
}
