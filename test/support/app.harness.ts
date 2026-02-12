import request from "supertest";
import { createAdaptorServer } from "@hono/node-server";
import { createSessionManagers } from "../../src/modules/sessions/sessionManager";
import { createServerApp } from "../../src/server/app";
import type { ApiContext } from "../../src/server/context";
import type { WebModelProvider } from "../../src/integrations/providers/types";
import { FakeProvider } from "./provider.double";

export interface ApiTestHarness {
  app: ReturnType<typeof createServerApp>;
  server: ReturnType<typeof createAdaptorServer>;
  http: ReturnType<typeof request>;
  provider: FakeProvider;
  context: ApiContext;
}

export function createApiTestHarness(options?: {
  provider?: FakeProvider;
  defaultModel?: string;
}): ApiTestHarness {
  const provider = options?.provider ?? new FakeProvider();
  const getProvider = (): WebModelProvider => provider;

  const context: ApiContext = {
    defaultModel: options?.defaultModel ?? "gemini-2.5-pro",
    activeProviderId: provider.id,
    getProvider,
    sessions: createSessionManagers(getProvider)
  };

  const app = createServerApp(context);
  const server = createAdaptorServer({ fetch: app.fetch });
  return {
    app,
    server,
    http: request(server),
    provider,
    context
  };
}
