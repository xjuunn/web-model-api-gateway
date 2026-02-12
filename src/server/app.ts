/**
 * @file server/app.ts
 * @description 服务端应用组装模块：连接中间件与路由模块。
 */
import express from "express";
import cors from "cors";
import { env } from "../config/env";
import { errorMiddleware } from "../core/http";
import { geminiRouter } from "../modules/gemini/router";
import { chatRouter } from "../modules/chat/router";
import { googleRouter } from "../modules/google/router";
import { responsesRouter } from "../modules/responses/router";
import { openaiRouter } from "../modules/openai/router";

export function createServerApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get("/", (_req, res) => {
    res.json({
      status: "ok",
      service: "web-model-api-gateway",
      active_provider: env.APP_ACTIVE_PROVIDER
    });
  });

  app.get("/docs", (_req, res) => {
    res.json({
      api: "Web Model API Gateway TS",
      active_provider: env.APP_ACTIVE_PROVIDER,
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

  app.use(openaiRouter);
  app.use(geminiRouter);
  app.use(chatRouter);
  app.use(googleRouter);
  app.use(responsesRouter);

  app.use(errorMiddleware);
  return app;
}

