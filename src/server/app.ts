/**
 * @file server/app.ts
 * @description 服务端应用组装模块：连接中间件与路由模块。
 */
import express from "express";
import cors from "cors";
import { errorMiddleware } from "../core/http";
import { createGeminiRouter } from "../modules/gemini/router";
import { createChatRouter } from "../modules/chat/router";
import { createGoogleRouter } from "../modules/google/router";
import { createResponsesRouter } from "../modules/responses/router";
import { createOpenAIRouter } from "../modules/openai/router";
import { ApiContext } from "./context";

export function createServerApp(context: ApiContext) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      service: "web-model-api-gateway",
      active_provider: context.activeProviderId
    });
  });

  app.get("/docs", (_req, res) => {
    res.json({
      api: "Web Model API Gateway TS",
      active_provider: context.activeProviderId,
      endpoints: [
        "POST /gemini",
        "POST /gemini-chat",
        "POST /translate",
        "POST /v1/chat/completions",
        "POST /v1/responses",
        "GET /v1/models",
        "GET /v1/models/:model",
        "POST /v1beta/models/:model"
      ]
    });
  });

  app.use(createOpenAIRouter(context));
  app.use(createGeminiRouter(context));
  app.use(createChatRouter(context));
  app.use(createGoogleRouter(context));
  app.use(createResponsesRouter(context));

  app.use(errorMiddleware);
  return app;
}

