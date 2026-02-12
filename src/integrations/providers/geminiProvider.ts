/**
 * @file integrations/providers/geminiProvider.ts
 * @description Gemini Provider 适配器：实现统一 Provider 契约。
 */
import { env } from "../../config/env";
import { getGeminiClient, getGeminiInitError, initializeGeminiClient } from "../gemini/client";
import { ProviderChatSession, ProviderOutput, WebModelProvider } from "./types";

export class GeminiWebProvider implements WebModelProvider {
  public readonly id = "gemini-web";
  public readonly label = "Gemini Web";
  private lastError: string | null = null;

  isEnabled(): boolean {
    return env.ENABLE_GEMINI;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async initialize(): Promise<boolean> {
    const ok = await initializeGeminiClient();
    this.lastError = ok ? null : getGeminiInitError() || "Gemini initialization failed.";
    return ok;
  }

  async generateContent(
    prompt: string,
    model: string,
    files: string[] = [],
    metadata: (string | null)[] = [null, null, null]
  ): Promise<ProviderOutput> {
    return getGeminiClient().generateContent(prompt, model, files, metadata);
  }

  startChat(model: string): ProviderChatSession {
    return getGeminiClient().startChat(model);
  }
}
