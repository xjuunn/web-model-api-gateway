/**
 * @file gateway/sessions/sessionManager.ts
 * @description Session management for provider-backed conversational state.
 */
import { ProviderChatSession, WebModelProvider } from "../../integrations/providers/types";

export type ProviderResolver = () => WebModelProvider;

export class SessionManager {
  private model = "";
  private providerId = "";
  private session: ProviderChatSession | null = null;
  private readonly resolveProvider: ProviderResolver;

  constructor(resolveProvider: ProviderResolver) {
    this.resolveProvider = resolveProvider;
  }

  async getResponse(model: string, message: string, files: string[]): Promise<string> {
    const provider = this.resolveProvider();
    if (!this.session || this.model !== model || this.providerId !== provider.id) {
      this.session = provider.startChat(model);
      this.model = model;
      this.providerId = provider.id;
    }

    const output = await this.session.sendMessage(message, files);
    return output.text;
  }
}

export interface SessionManagers {
  translate: SessionManager;
  geminiChat: SessionManager;
}

export function createSessionManagers(resolveProvider: ProviderResolver): SessionManagers {
  return {
    translate: new SessionManager(resolveProvider),
    geminiChat: new SessionManager(resolveProvider)
  };
}
