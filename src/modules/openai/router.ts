/**
 * @file modules/openai/router.ts
 * @description OpenAI 元数据路由：模型列表与模型详情响应。
 */
import { Router } from "express";
import { env } from "../../config/env";

export const openaiRouter = Router();

const SUPPORTED_MODELS = [
  "gemini-3.0-pro",
  "gemini-2.5-pro",
  "gemini-2.5-flash"
] as const;

/**
 * 返回兼容 OpenAI 的模型列表。
 */
openaiRouter.get("/v1/models", (_req, res) => {
  const now = Math.floor(Date.now() / 1000);
  res.json({
    object: "list",
    data: SUPPORTED_MODELS.map((id) => ({
      id,
      object: "model",
      created: now,
      owned_by: "web-model-api-gateway"
    }))
  });
});

/**
 * 返回单个模型信息。
 */
openaiRouter.get("/v1/models/:model", (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const model = req.params.model;
  if (!SUPPORTED_MODELS.includes(model as (typeof SUPPORTED_MODELS)[number])) {
    res.status(404).json({
      error: {
        message: `Model '${model}' not found.`,
        type: "invalid_request_error",
        param: "model",
        code: "model_not_found"
      }
    });
    return;
  }

  res.json({
    id: model,
    object: "model",
    created: now,
    owned_by: "web-model-api-gateway",
    root: env.GEMINI_DEFAULT_MODEL
  });
});
