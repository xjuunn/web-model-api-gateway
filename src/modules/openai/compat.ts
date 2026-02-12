/**
 * @file modules/openai/compat.ts
 * @description OpenAI 兼容共享工具：用于 prompt 映射与 SSE 工具函数。
 */
import { Response } from "express";

export type ChatContentPart = { type?: string; text?: string };

/**
 * 将字符串或分段内容统一转换为纯文本。
 */
export function contentToText(content: string | ChatContentPart[] | undefined): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content
    .map((item) => item?.text ?? "")
    .filter(Boolean)
    .join("\n");
}

/**
 * 按固定长度切分文本，用于模拟增量流输出。
 */
export function chunkText(text: string, size = 80): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

/**
 * 将角色与内容拼接为统一 prompt 行。
 */
export function toPromptLine(role: string, text: string): string {
  if (role === "system") return `System: ${text}`;
  if (role === "developer") return `Developer: ${text}`;
  if (role === "assistant") return `Assistant: ${text}`;
  if (role === "tool") return `Tool: ${text}`;
  return `User: ${text}`;
}

/**
 * 初始化 SSE 响应头。
 */
export function initSse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
}

/**
 * 写入一条 SSE 事件。
 */
export function writeSseEvent(res: Response, data: unknown, event?: string): void {
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * 结束 SSE 数据流。
 */
export function finishSse(res: Response): void {
  res.write("data: [DONE]\n\n");
  res.end();
}
