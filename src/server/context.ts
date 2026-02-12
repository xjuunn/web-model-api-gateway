/**
 * @file server/context.ts
 * @description 应用上下文：集中声明 API 层依赖并在启动时完成装配。
 */
import { env } from "../config/env";
import { getPrimaryProviderOrThrow } from "../integrations/providers/registry";
import { WebModelProvider } from "../integrations/providers/types";
import { createSessionManagers, SessionManagers } from "../modules/sessions/sessionManager";

export interface ApiContext {
  defaultModel: string;
  activeProviderId: string;
  getProvider: () => WebModelProvider;
  sessions: SessionManagers;
}

export function createApiContext(): ApiContext {
  const getProvider = () => getPrimaryProviderOrThrow();

  return {
    defaultModel: env.GEMINI_DEFAULT_MODEL,
    activeProviderId: env.APP_ACTIVE_PROVIDER,
    getProvider,
    sessions: createSessionManagers(getProvider)
  };
}
