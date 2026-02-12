import type { LanguageModelV3, LanguageModelV3StreamPart, LanguageModelV3Usage } from "@ai-sdk/provider";

const usage: LanguageModelV3Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 }
};

const finishReason = { unified: "stop" as const, raw: "stop" };

export function createOneTestLanguageModel(): LanguageModelV3 {
  return {
    specificationVersion: "v3",
    provider: "custom",
    modelId: "onetest-model",
    supportedUrls: {},
    async doGenerate() {
      return {
        content: [{ type: "text", text: "onetest" }],
        finishReason,
        usage,
        warnings: []
      };
    },
    async doStream() {
      const id = `text-${Date.now()}`;
      const parts: LanguageModelV3StreamPart[] = [
        { type: "stream-start", warnings: [] },
        { type: "text-start", id },
        { type: "text-delta", id, delta: "onetest" },
        { type: "text-end", id },
        { type: "finish", finishReason, usage }
      ];

      return {
        stream: new ReadableStream<LanguageModelV3StreamPart>({
          start(controller) {
            for (const part of parts) controller.enqueue(part);
            controller.close();
          }
        })
      };
    }
  };
}
