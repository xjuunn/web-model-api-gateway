/**
 * @file modules/gemini/router.ts
 * @description Gemini 模块路由：无状态与有状态生成端点。
 */
import { Router } from "express";
import { asyncHandler, parseOrThrow } from "../../core/http";
import { env } from "../../config/env";
import { GeminiRequestSchema } from "../../domain/schemas";
import { getPrimaryProviderOrThrow } from "../../integrations/providers/registry";
import { getGeminiChatSessionManager } from "../sessions/sessionManager";

export const geminiRouter = Router();

geminiRouter.post(
  "/gemini",
  asyncHandler(async (req, res) => {
    const body = parseOrThrow(GeminiRequestSchema, req.body);
    const model = body.model ?? env.GEMINI_DEFAULT_MODEL;
    const files = body.files ?? [];

    const output = await getPrimaryProviderOrThrow().generateContent(body.message, model, files);
    res.json({ response: output.text });
  })
);

geminiRouter.post(
  "/gemini-chat",
  asyncHandler(async (req, res) => {
    const body = parseOrThrow(GeminiRequestSchema, req.body);
    const model = body.model ?? env.GEMINI_DEFAULT_MODEL;
    const files = body.files ?? [];

    const text = await getGeminiChatSessionManager().getResponse(model, body.message, files);
    res.json({ response: text });
  })
);

