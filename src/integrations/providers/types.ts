/**
 * @file integrations/providers/types.ts
 * @description Provider 抽象接口：用于可扩展的 Web 模型集成。
 */
export interface ProviderOutput {
  text: string;
  metadata?: string[];
  rcid?: string;
}

export interface ProviderChatSession {
  sendMessage(prompt: string, files?: string[]): Promise<ProviderOutput>;
}

export interface WebModelProvider {
  id: string;
  label: string;
  initialize(): Promise<boolean>;
  isEnabled(): boolean;
  getLastError(): string | null;
  generateContent(
    prompt: string,
    model: string,
    files?: string[],
    metadata?: (string | null)[]
  ): Promise<ProviderOutput>;
  startChat(model: string): ProviderChatSession;
}
