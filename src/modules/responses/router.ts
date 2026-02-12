/**
 * @file modules/responses/router.ts
 * @description OpenAI Responses 兼容路由：支持同步与 SSE 流式输出。
 */
import { Request, Response, Router } from "express";
import { asyncHandler, parseOrThrow } from "../../core/http";
import { ResponsesRequestSchema } from "../../domain/schemas";
import { chunkText, contentToText, finishSse, initSse, toPromptLine, writeSseEvent } from "../openai/compat";
import { ApiContext } from "../../server/context";

export function createResponsesRouter(context: ApiContext): Router {
  const responsesRouter = Router();

/**
 * 将 responses.input 归一化为纯文本。
 */
function collectInputText(input: unknown): string {
  if (typeof input === "string") return input.trim();
  if (!Array.isArray(input)) return "";

  const chunks: string[] = [];
  for (const item of input) {
    if (typeof item === "string") {
      chunks.push(item);
      continue;
    }

    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const content = obj.content as string | Array<{ type?: string; text?: string }> | undefined;
    const text = contentToText(content);
    if (text) chunks.push(text);
  }

  return chunks.join("\n\n").trim();
}

/**
 * 将 responses.messages 归一化为统一 prompt。
 */
function collectMessagesText(messages: Array<{ role?: string; content?: unknown }>): string {
  return messages
    .map((msg) => {
      const text = contentToText(msg.content as string | Array<{ type?: string; text?: string }> | undefined);
      if (!text) return "";
      return toPromptLine(msg.role ?? "user", text);
    })
    .filter(Boolean)
    .join("\n\n");
}

/**
 * 输出 responses API 的 SSE 事件流。
 */
function writeResponsesStream(
  text: string,
  model: string,
  responseId: string,
  messageId: string,
  res: Response
): void {
  const now = Math.floor(Date.now() / 1000);
  initSse(res);

  writeSseEvent(
    res,
    {
      type: "response.created",
      response: {
        id: responseId,
        object: "response",
        created_at: now,
        status: "in_progress",
        model
      }
    },
    "response.created"
  );

  for (const part of chunkText(text)) {
    writeSseEvent(
      res,
      {
        type: "response.output_text.delta",
        response_id: responseId,
        output_index: 0,
        content_index: 0,
        delta: part
      },
      "response.output_text.delta"
    );
  }

  writeSseEvent(
    res,
    {
      type: "response.completed",
      response: {
        id: responseId,
        object: "response",
        created_at: now,
        status: "completed",
        model,
        output: [
          {
            id: messageId,
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text }]
          }
        ],
        output_text: text
      }
    },
    "response.completed"
  );

  finishSse(res);
}

/**
 * 处理 OpenAI responses 请求。
 */
async function handleResponses(req: Request, res: Response): Promise<void> {
  const body = parseOrThrow(ResponsesRequestSchema, req.body);
  const model = body.model ?? context.defaultModel;

  const fromMessages = body.messages ? collectMessagesText(body.messages) : "";
  const fromInput = collectInputText(body.input);
  const prompt = fromMessages || fromInput;

  if (!prompt) {
    res.status(400).json({ detail: "No valid prompt found. Provide input or messages." });
    return;
  }

  const output = await context.getProvider().generateContent(prompt, model, []);
  const now = Math.floor(Date.now() / 1000);
  const responseId = `resp-${now}`;
  const messageId = `msg-${now}`;

  if (body.stream ?? false) {
    writeResponsesStream(output.text, model, responseId, messageId, res);
    return;
  }

  res.json({
    id: responseId,
    object: "response",
    created_at: now,
    status: "completed",
    model,
    output: [
      {
        id: messageId,
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text: output.text }]
      }
    ],
    output_text: output.text
  });
}

responsesRouter.post("/v1/responses", asyncHandler(handleResponses));

  return responsesRouter;
}
