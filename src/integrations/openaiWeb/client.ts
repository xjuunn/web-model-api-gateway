import { env } from "../../config/env";
import { AppError } from "../../core/errors";
import type { ProviderOutput } from "../providers/types";

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OpenAIWebClient {
  private normalizeBaseUrl(): string {
    return env.OPENAI_WEB_BASE_URL.replace(/\/+$/, "");
  }

  async healthcheck(): Promise<void> {
    if (!env.OPENAI_WEB_API_KEY) {
      throw new AppError("OPENAI_WEB_API_KEY is required for openai-web provider.", 503);
    }

    const response = await fetch(`${this.normalizeBaseUrl()}/v1/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${env.OPENAI_WEB_API_KEY}`
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AppError(`OpenAI Web initialization failed (${response.status}): ${body}`, 503);
    }
  }

  async generateContent(model: string, messages: OpenAIChatMessage[]): Promise<ProviderOutput> {
    if (!env.OPENAI_WEB_API_KEY) {
      throw new AppError("OPENAI_WEB_API_KEY is required for openai-web provider.", 503);
    }

    const response = await fetch(`${this.normalizeBaseUrl()}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_WEB_API_KEY}`
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AppError(`OpenAI Web request failed (${response.status}): ${body}`, 502);
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new AppError("OpenAI Web response missing assistant content.", 502);
    }

    return { text };
  }
}

let openaiWebClient: OpenAIWebClient | null = null;
let initError: string | null = null;

export async function initializeOpenAIWebClient(): Promise<boolean> {
  if (!env.ENABLE_OPENAI_WEB) {
    initError = "OpenAI Web is disabled via ENABLE_OPENAI_WEB=false";
    openaiWebClient = null;
    return false;
  }

  try {
    const client = new OpenAIWebClient();
    await client.healthcheck();
    openaiWebClient = client;
    initError = null;
    return true;
  } catch (error) {
    initError = error instanceof Error ? error.message : String(error);
    openaiWebClient = null;
    return false;
  }
}

export function getOpenAIWebClient(): OpenAIWebClient {
  if (!openaiWebClient) {
    throw new AppError(initError || "OpenAI Web client unavailable", 503);
  }
  return openaiWebClient;
}

export function getOpenAIWebInitError(): string | null {
  return initError;
}
