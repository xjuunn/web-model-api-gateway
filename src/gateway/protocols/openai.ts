import { Hono } from "hono";
import { generateText, streamText } from "ai";
import { parseOrThrow } from "../../core/http";
import { OpenAIChatRequestSchema, ResponsesRequestSchema } from "../../domain/schemas";
import type { ApiContext } from "../../server/context";
import { listSupportedModelIds, resolveLanguageModel } from "../models/registry";
import { contentToText, createSseResponse, jsonError, toPromptLine } from "./shared";

function normalizePrompt(messages: Array<{ role: string; content: string | Array<{ type?: string; text?: string }> }>): string {
  return messages
    .map((msg) => {
      const text = contentToText(msg.content);
      return toPromptLine(msg.role, text);
    })
    .join("\n\n");
}

function collectInputText(input: unknown): string {
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

export function createOpenAIProtocolRouter(context: ApiContext): Hono {
  const app = new Hono();

  app.get("/v1/models", (c) => {
    const now = Math.floor(Date.now() / 1000);
    return c.json({
      object: "list",
      data: listSupportedModelIds().map((id) => ({
        id,
        object: "model",
        created: now,
        owned_by: "web-model-api-gateway"
      }))
    });
  });

  app.get("/v1/models/:model", (c) => {
    const model = c.req.param("model");
    const supported = listSupportedModelIds();
    if (!supported.includes(model as (typeof supported)[number])) {
      return c.json(
        {
          error: {
            message: `Model '${model}' not found.`,
            type: "invalid_request_error",
            param: "model",
            code: "model_not_found"
          }
        },
        404
      );
    }

    const now = Math.floor(Date.now() / 1000);
    return c.json({
      id: model,
      object: "model",
      created: now,
      owned_by: "web-model-api-gateway",
      root: context.defaultModel
    });
  });

  app.post("/v1/chat/completions", async (c) => {
    const bodyJson = await c.req.json().catch(() => null);
    if (!bodyJson) return jsonError(c, 400, "Invalid JSON body");

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

  app.post("/v1/responses", async (c) => {
    const bodyJson = await c.req.json().catch(() => null);
    if (!bodyJson) return jsonError(c, 400, "Invalid JSON body");

    let body;
    try {
      body = parseOrThrow(ResponsesRequestSchema, bodyJson);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Invalid request";
      return jsonError(c, 400, detail);
    }

    const modelId = body.model ?? context.defaultModel;
    const prompt = (body.messages?.length
      ? normalizePrompt(
          body.messages.map((m) => ({
            role: m.role ?? "user",
            content: (m.content ?? "") as string | Array<{ type?: string; text?: string }>
          }))
        )
      : collectInputText(body.input)) || "";

    if (!prompt) return jsonError(c, 400, "No valid prompt found. Provide input or messages.");

    const model = resolveLanguageModel(context, modelId);
    const now = Math.floor(Date.now() / 1000);
    const responseId = `resp-${now}`;
    const messageId = `msg-${now}`;

    if (!(body.stream ?? false)) {
      const result = await generateText({ model, prompt });
      return c.json({
        id: responseId,
        object: "response",
        created_at: now,
        status: "completed",
        model: modelId,
        output: [
          {
            id: messageId,
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: result.text }]
          }
        ],
        output_text: result.text
      });
    }

    const stream = streamText({ model, prompt });

    return createSseResponse(async (enqueue, close) => {
      enqueue(
        `event: response.created\ndata: ${JSON.stringify({
          type: "response.created",
          response: {
            id: responseId,
            object: "response",
            created_at: now,
            status: "in_progress",
            model: modelId
          }
        })}\n\n`
      );

      let fullText = "";
      for await (const delta of stream.textStream) {
        fullText += delta;
        enqueue(
          `event: response.output_text.delta\ndata: ${JSON.stringify({
            type: "response.output_text.delta",
            response_id: responseId,
            output_index: 0,
            content_index: 0,
            delta
          })}\n\n`
        );
      }

      enqueue(
        `event: response.completed\ndata: ${JSON.stringify({
          type: "response.completed",
          response: {
            id: responseId,
            object: "response",
            created_at: now,
            status: "completed",
            model: modelId,
            output: [
              {
                id: messageId,
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: fullText }]
              }
            ],
            output_text: fullText
          }
        })}\n\n`
      );

      enqueue("data: [DONE]\n\n");
      close();
    });
  });

  return app;
}
