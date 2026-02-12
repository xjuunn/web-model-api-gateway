import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "../core/logger";
import type { ApiContext } from "../server/context";
import { createGoogleGeminiProtocolRouter, createOpenAIProtocolRouter } from "./protocols";

export function createGatewayApp(context: ApiContext): Hono {
  const app = new Hono();
  app.use("*", cors());

  app.get("/", (c) =>
    c.json({
      status: "ok",
      service: "web-model-api-gateway",
      active_provider: context.activeProviderId
    })
  );

  app.get("/docs", (c) =>
    c.json({
      api: "Web Model API Gateway TS",
      architecture: "Vercel AI SDK + Hono + Protocol Adapters",
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
    })
  );

  app.route("/", createOpenAIProtocolRouter(context));
  app.route("/", createGoogleGeminiProtocolRouter(context));

  app.onError((error, c) => {
    logger.error("Unhandled gateway error", error);
    return c.json({ detail: "Internal server error" }, 500);
  });

  return app;
}
