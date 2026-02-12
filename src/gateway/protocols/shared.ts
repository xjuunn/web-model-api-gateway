import type { Context } from "hono";

export type ChatPart = { type?: string; text?: string };

export function contentToText(content: string | ChatPart[] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .map((part) => part?.text ?? "")
    .filter(Boolean)
    .join("\n");
}

export function toPromptLine(role: string, text: string): string {
  if (role === "system") return `System: ${text}`;
  if (role === "developer") return `Developer: ${text}`;
  if (role === "assistant") return `Assistant: ${text}`;
  if (role === "tool") return `Tool: ${text}`;
  return `User: ${text}`;
}

export function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  };
}

export function createSseResponse(
  writer: (enqueue: (line: string) => void, close: () => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (line: string) => controller.enqueue(encoder.encode(line));
      const close = () => controller.close();
      await writer(enqueue, close);
    }
  });

  return new Response(stream, { headers: sseHeaders() });
}

export function jsonError(c: Context, status: number, detail: string): Response {
  return c.json({ detail }, status as 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503);
}
