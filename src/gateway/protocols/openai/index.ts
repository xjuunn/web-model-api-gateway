import { Hono } from "hono";
import type { ApiContext } from "../../../server/context";
import { registerChatCompletionsRoute } from "./chatCompletions";
import { registerModelRoutes } from "./models";
import { registerResponsesRoute } from "./responses";

export function createOpenAIProtocolRouter(context: ApiContext): Hono {
  const app = new Hono();
  registerModelRoutes(app, context);
  registerChatCompletionsRoute(app, context);
  registerResponsesRoute(app, context);
  return app;
}
