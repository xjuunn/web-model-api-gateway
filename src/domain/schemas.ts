/**
 * @file domain/schemas.ts
 * @description 用于 API 请求校验的领域 Schema 定义。
 */
import { z } from "zod";
import { GeminiModelSchema, MessageRoleSchema } from "./models";

export const GeminiRequestSchema = z.object({
  message: z.string().min(1),
  model: GeminiModelSchema.optional(),
  files: z.array(z.string()).optional()
});

export const OpenAIChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.union([
    z.string().min(1),
    z.array(
      z.object({
        type: z.string().optional(),
        text: z.string().optional()
      })
    )
  ])
});

export const OpenAIChatRequestSchema = z.object({
  model: z.string().optional(),
  stream: z.boolean().optional(),
  messages: z.array(OpenAIChatMessageSchema).min(1)
});

export const GoogleGenerativeRequestSchema = z.object({
  contents: z
    .array(
      z.object({
        parts: z.array(z.object({ text: z.string().default("") })).default([])
      })
    )
    .default([])
});

const ResponsesInputBlockSchema = z.object({
  type: z.string().optional(),
  text: z.string().optional()
});

const ResponsesMessageSchema = z.object({
  role: z.string().optional(),
  content: z.union([z.string(), z.array(ResponsesInputBlockSchema)]).optional()
});

export const ResponsesRequestSchema = z.object({
  model: z.string().optional(),
  stream: z.boolean().optional(),
  input: z.union([z.string(), z.array(z.any())]).optional(),
  messages: z.array(ResponsesMessageSchema).optional()
});
