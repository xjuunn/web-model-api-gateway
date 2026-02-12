/**
 * @file modules/chat/router.ts
 * @description 聊天模块路由：包含 translate 与 OpenAI chat/completions 兼容接口。
 */
import { Request, Response, Router } from "express";
import { asyncHandler, parseOrThrow } from "../../core/http";
import { OpenAIChatRequestSchema, GeminiRequestSchema } from "../../domain/schemas";
import { chunkText, contentToText, finishSse, initSse, toPromptLine, writeSseEvent } from "../openai/compat";
import { ApiContext } from "../../server/context";

export function createChatRouter(context: ApiContext): Router {
  const chatRouter = Router();

/**
 * 生成 OpenAI chat/completions 的非流式响应体。
 */
function toOpenAIResponse(text: string, model: string, stream = false) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `chatcmpl-${now}`,
    object: stream ? "chat.completion.chunk" : "chat.completion",
    created: now,
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop"
      }
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  };
}

/**
 * 写出 chat/completions 的 SSE 流式结果。
 */
function writeChatStream(text: string, model: string, res: Response): void {
  const now = Math.floor(Date.now() / 1000);
  const id = `chatcmpl-${now}`;

  initSse(res);
  for (const part of chunkText(text)) {
    writeSseEvent(res, {
      id,
      object: "chat.completion.chunk",
      created: now,
      model,
      choices: [{ index: 0, delta: { content: part }, finish_reason: null }]
    });
  }

  writeSseEvent(res, {
    id,
    object: "chat.completion.chunk",
    created: now,
    model,
    choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
  });
  finishSse(res);
}

/**
 * 处理 translate 会话请求。
 */
async function handleTranslate(req: Request, res: Response): Promise<void> {
  const body = parseOrThrow(GeminiRequestSchema, req.body);
  const model = body.model ?? context.defaultModel;
  const files = body.files ?? [];

  const text = await context.sessions.translate.getResponse(model, body.message, files);
  res.json({ response: text });
}

/**
 * 处理 OpenAI chat/completions 请求。
 */
async function handleChatCompletions(req: Request, res: Response): Promise<void> {
  const body = parseOrThrow(OpenAIChatRequestSchema, req.body);
  const model = body.model ?? context.defaultModel;

  const prompt = body.messages
    .map((msg) => {
      const text = contentToText(msg.content as string | Array<{ type?: string; text?: string }>);
      return toPromptLine(msg.role, text);
    })
    .join("\n\n");

  const output = await context.getProvider().generateContent(prompt, model, []);
  if (!(body.stream ?? false)) {
    res.json(toOpenAIResponse(output.text, model, false));
    return;
  }

  writeChatStream(output.text, model, res);
}

chatRouter.post("/translate", asyncHandler(handleTranslate));
chatRouter.post("/v1/chat/completions", asyncHandler(handleChatCompletions));

  return chatRouter;
}
