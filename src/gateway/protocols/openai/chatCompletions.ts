import { generateText, streamText } from "ai";
import { parseOrThrow } from "../../../core/http";
import { OpenAIChatRequestSchema } from "../../../domain/schemas";
import type { ApiContext } from "../../../server/context";
import { resolveLanguageModel } from "../../models/registry";
import { createSseResponse, jsonError } from "../shared";
import { normalizePrompt, requireJsonBody } from "./shared";
import type { Hono } from "hono";

export function registerChatCompletionsRoute(app: Hono, context: ApiContext): void {
  app.post("/v1/chat/completions", async (c) => {
    const bodyJson = await requireJsonBody(c);
    if (bodyJson instanceof Response) return bodyJson;

    let body;
    try {
      body = parseOrThrow(OpenAIChatRequestSchema, bodyJson);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Invalid request";
      return jsonError(c, 400, detail);
    }

    const modelId = body.model ?? context.defaultModel;
    const prompt = normalizePrompt(body.messages as Array<{ role: string; content: string | Array<{ type?: string; text?: string }> }>);
    const model = resolveLanguageModel(context, modelId);

    if (!(body.stream ?? false)) {
      const result = await generateText({ model, prompt });
      const now = Math.floor(Date.now() / 1000);
      return c.json({
        id: `chatcmpl-${now}`,
        object: "chat.completion",
        created: now,
        model: modelId,
        choices: [{ index: 0, message: { role: "assistant", content: result.text }, finish_reason: "stop" }],
        usage: {
          prompt_tokens: result.usage.inputTokens ?? 0,
          completion_tokens: result.usage.outputTokens ?? 0,
          total_tokens: result.usage.totalTokens ?? 0
        }
      });
    }

    const stream = streamText({ model, prompt });
    const now = Math.floor(Date.now() / 1000);
    const id = `chatcmpl-${now}`;

    return createSseResponse(async (enqueue, close) => {
      for await (const delta of stream.textStream) {
        enqueue(
          `data: ${JSON.stringify({
            id,
            object: "chat.completion.chunk",
            created: now,
            model: modelId,
            choices: [{ index: 0, delta: { content: delta }, finish_reason: null }]
          })}\n\n`
        );
      }

      enqueue(
        `data: ${JSON.stringify({
          id,
          object: "chat.completion.chunk",
          created: now,
          model: modelId,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
        })}\n\n`
      );
      enqueue("data: [DONE]\n\n");
      close();
    });
  });
}
