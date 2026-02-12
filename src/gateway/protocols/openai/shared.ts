import type { Context } from "hono";
import { contentToText, jsonError, toPromptLine } from "../shared";

export function normalizePrompt(
  messages: Array<{ role: string; content: string | Array<{ type?: string; text?: string }> }>
): string {
  return messages
    .map((msg) => {
      const text = contentToText(msg.content);
      return toPromptLine(msg.role, text);
    })
    .join("\n\n");
}

export function collectInputText(input: unknown): string {
  if (typeof input === "string") return input.trim();
  if (!Array.isArray(input)) return "";

  const text: string[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      text.push(item);
      continue;
    }
    if (!item || typeof item !== "object") continue;

    const content = (item as { content?: string | Array<{ type?: string; text?: string }> }).content;
    const normalized = contentToText(content);
    if (normalized) text.push(normalized);
  }

  return text.join("\n\n").trim();
}

export async function requireJsonBody(c: Context): Promise<unknown | Response> {
  const body = await c.req.json().catch(() => null);
  if (!body) return jsonError(c, 400, "Invalid JSON body");
  return body;
}
