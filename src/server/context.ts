/**
 * @file server/context.ts
 * @description 搴旂敤涓婁笅鏂囷細闆嗕腑澹版槑 API 灞備緷璧栧苟鍦ㄥ惎鍔ㄦ椂瀹屾垚瑁呴厤銆? */
import { env } from "../config/env";
import { getPrimaryProviderOrThrow } from "../integrations/providers/registry";
import { WebModelProvider } from "../integrations/providers/types";
import { createSessionManagers, SessionManagers } from "../gateway/sessions/sessionManager";

export interface ApiContext {
  defaultModel: string;
  activeProviderId: string;
  getProvider: () => WebModelProvider;
  sessions: SessionManagers;
}

export function createApiContext(): ApiContext {
  const getProvider = () => getPrimaryProviderOrThrow();

  return {
    defaultModel: env.APP_DEFAULT_MODEL,
    activeProviderId: env.APP_ACTIVE_PROVIDER,
    getProvider,
    sessions: createSessionManagers(getProvider)
  };
}
