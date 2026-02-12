/**
 * @file domain/models.ts
 * @description 共享枚举与基础类型的领域模型定义。
 */
import { z } from "zod";

export const BrowserSchema = z.enum(["chrome", "firefox", "brave", "edge", "safari"]);

export const GeminiModelSchema = z.enum([
  "gemini-3.0-pro",
  "gemini-2.5-pro",
  "gemini-2.5-flash"
]);

export type GeminiModel = z.infer<typeof GeminiModelSchema>;

export const MessageRoleSchema = z.enum(["system", "developer", "user", "assistant", "tool"]);

export type MessageRole = z.infer<typeof MessageRoleSchema>;
