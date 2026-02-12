import type { ProviderChatSession, ProviderOutput, WebModelProvider } from "../../src/integrations/providers/types";

export interface GenerateCall {
  prompt: string;
  model: string;
  files: string[];
  metadata: (string | null)[];
}

export interface ChatStartCall {
  model: string;
}

export interface ChatMessageCall {
  model: string;
  message: string;
  files: string[];
}

export class FakeProvider implements WebModelProvider {
  id: string;
  label = "Fake Provider";
  generateCalls: GenerateCall[] = [];
  chatStartCalls: ChatStartCall[] = [];
  chatMessages: ChatMessageCall[] = [];
  nextGenerateText = "ok";
  failGenerate: Error | null = null;

  constructor(id = "fake-provider") {
    this.id = id;
  }

  async initialize(): Promise<boolean> {
    return true;
  }

  isEnabled(): boolean {
    return true;
  }

  getLastError(): string | null {
    return null;
  }

  async generateContent(
    prompt: string,
    model: string,
    files: string[] = [],
    metadata: (string | null)[] = []
  ): Promise<ProviderOutput> {
    this.generateCalls.push({ prompt, model, files, metadata });
    if (this.failGenerate) {
      throw this.failGenerate;
    }
    return { text: this.nextGenerateText };
  }

  startChat(model: string): ProviderChatSession {
    this.chatStartCalls.push({ model });
    return {
      sendMessage: async (message: string, files: string[] = []) => {
        this.chatMessages.push({ model, message, files });
        return { text: `chat:${model}:${message}` };
      }
    };
  }
}
