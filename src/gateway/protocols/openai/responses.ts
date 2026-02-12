import { generateText, streamText } from "ai";
import { parseOrThrow } from "../../../core/http";
import { ResponsesRequestSchema } from "../../../domain/schemas";
import type { ApiContext } from "../../../server/context";
import { resolveLanguageModel } from "../../models/registry";
import { createSseResponse, jsonError } from "../shared";
import { collectInputText, normalizePrompt, requireJsonBody } from "./shared";
import type { Hono } from "hono";

export function registerResponsesRoute(app: Hono, context: ApiContext): void {
  app.post("/v1/responses", async (c) => {
    const bodyJson = await requireJsonBody(c);
    if (bodyJson instanceof Response) return bodyJson;

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
}
