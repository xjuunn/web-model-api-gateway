/**
 * @file modules/gemini/router.ts
 * @description Gemini 模块路由：无状态与有状态生成端点。
 */
import { Router } from "express";
import { asyncHandler, parseOrThrow } from "../../core/http";
import { GeminiRequestSchema } from "../../domain/schemas";
import { ApiContext } from "../../server/context";

export function createGeminiRouter(context: ApiContext): Router {
  const geminiRouter = Router();

  geminiRouter.post(
    "/gemini",
    asyncHandler(async (req, res) => {
      const body = parseOrThrow(GeminiRequestSchema, req.body);
      const model = body.model ?? context.defaultModel;
      const files = body.files ?? [];

      const output = await context.getProvider().generateContent(body.message, model, files);
      res.json({ response: output.text });
    })
  );

  geminiRouter.post(
    "/gemini-chat",
    asyncHandler(async (req, res) => {
      const body = parseOrThrow(GeminiRequestSchema, req.body);
      const model = body.model ?? context.defaultModel;
      const files = body.files ?? [];

      const text = await context.sessions.geminiChat.getResponse(model, body.message, files);
      res.json({ response: text });
    })
  );

  return geminiRouter;
}

