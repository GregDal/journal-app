export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIProvider {
  chat(messages: AIMessage[], systemPrompt: string): Promise<string>;
  analyze(texts: string[], prompt: string): Promise<string>;
}

export type AIProviderType = "claude" | "ollama";
