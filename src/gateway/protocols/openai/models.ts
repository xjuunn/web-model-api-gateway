import type { Hono } from "hono";
import type { ApiContext } from "../../../server/context";
import { listSupportedModelIds } from "../../models/registry";

export function registerModelRoutes(app: Hono, context: ApiContext): void {
  app.get("/v1/models", (c) => {
    const now = Math.floor(Date.now() / 1000);
    return c.json({
      object: "list",
      data: listSupportedModelIds().map((id) => ({
        id,
        object: "model",
        created: now,
        owned_by: "web-model-api-gateway"
      }))
    });
  });

  app.get("/v1/models/:model", (c) => {
    const model = c.req.param("model");
    const supported = listSupportedModelIds();
    if (!supported.includes(model as (typeof supported)[number])) {
      return c.json(
        {
          error: {
            message: `Model '${model}' not found.`,
            type: "invalid_request_error",
            param: "model",
            code: "model_not_found"
          }
        },
        404
      );
    }

    const now = Math.floor(Date.now() / 1000);
    return c.json({
      id: model,
      object: "model",
      created: now,
      owned_by: "web-model-api-gateway",
      root: context.defaultModel
    });
  });
}
