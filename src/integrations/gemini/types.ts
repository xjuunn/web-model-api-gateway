/**
 * @file integrations/gemini/types.ts
 * @description Gemini 集成类型声明：会话与模型输出。
 */
export interface Candidate {
  rcid: string;
  text: string;
  thoughts?: string;
}

export interface ModelOutput {
  metadata: string[];
  candidates: Candidate[];
  chosen: number;
  text: string;
  rcid: string;
}

export interface ChatLikeSession {
  sendMessage: (prompt: string, files?: string[]) => Promise<ModelOutput>;
}
