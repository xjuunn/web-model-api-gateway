import { env } from "../../config/env";
import { getOpenAIWebClient, getOpenAIWebInitError, initializeOpenAIWebClient } from "../openaiWeb/client";
import { ProviderChatSession, ProviderOutput, WebModelProvider } from "./types";

class OpenAIWebChatSession implements ProviderChatSession {
  private readonly messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  constructor(private readonly model: string) {}

  async sendMessage(prompt: string): Promise<ProviderOutput> {
    this.messages.push({ role: "user", content: prompt });
    const output = await getOpenAIWebClient().generateContent(this.model, this.messages);
    this.messages.push({ role: "assistant", content: output.text });
    return output;
  }
}

export class OpenAIWebProvider implements WebModelProvider {
  public readonly id = "openai-web";
  public readonly label = "OpenAI Web";
  private lastError: string | null = null;

  isEnabled(): boolean {
    return env.ENABLE_OPENAI_WEB;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async initialize(): Promise<boolean> {
    const ok = await initializeOpenAIWebClient();
    this.lastError = ok ? null : getOpenAIWebInitError() || "OpenAI Web initialization failed.";
    return ok;
  }

  async generateContent(prompt: string, model: string): Promise<ProviderOutput> {
    return getOpenAIWebClient().generateContent(model, [{ role: "user", content: prompt }]);
  }

  startChat(model: string): ProviderChatSession {
    return new OpenAIWebChatSession(model);
  }
}
