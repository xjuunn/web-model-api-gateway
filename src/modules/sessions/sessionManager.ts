/**
 * @file modules/sessions/sessionManager.ts
 * @description 会话管理模块：在请求间保持 Provider 聊天状态。
 */
import { getPrimaryProviderOrThrow } from "../../integrations/providers/registry";
import { ProviderChatSession } from "../../integrations/providers/types";

class SessionManager {
  private model = "";
  private providerId = "";
  private session: ProviderChatSession | null = null;

  async getResponse(model: string, message: string, files: string[]): Promise<string> {
    const provider = getPrimaryProviderOrThrow();
    if (!this.session || this.model !== model || this.providerId !== provider.id) {
      this.session = provider.startChat(model);
      this.model = model;
      this.providerId = provider.id;
    }

    const output = await this.session.sendMessage(message, files);
    return output.text;
  }
}

let translateSession: SessionManager | null = null;
let geminiChatSession: SessionManager | null = null;

export function initSessionManagers(): void {
  getPrimaryProviderOrThrow();
  translateSession = new SessionManager();
  geminiChatSession = new SessionManager();
}

export function getTranslateSessionManager(): SessionManager {
  if (!translateSession) {
    throw new Error("Translate session manager not initialized.");
  }
  return translateSession;
}

export function getGeminiChatSessionManager(): SessionManager {
  if (!geminiChatSession) {
    throw new Error("Gemini chat session manager not initialized.");
  }
  return geminiChatSession;
}
