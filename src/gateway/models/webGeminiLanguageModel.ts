import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamPart,
  LanguageModelV3StreamResult,
  LanguageModelV3Usage
} from "@ai-sdk/provider";
import type { ApiContext } from "../../server/context";

const usage: LanguageModelV3Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 }
};

const finishReason = { unified: "stop" as const, raw: "stop" };

function promptToText(options: LanguageModelV3CallOptions): string {
  return options.prompt
    .map((message) => {
      const content = message.content;
      const text =
        typeof content === "string"
          ? content.trim()
          : content
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("\n")
              .trim();
      return text;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function createWebGeminiLanguageModel(context: ApiContext, modelId: string): LanguageModelV3 {
  return {
    specificationVersion: "v3",
    provider: "web-gemini",
    modelId,
    supportedUrls: {},
    async doGenerate(options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> {
      const prompt = promptToText(options);
      const output = await context.getProvider().generateContent(prompt, modelId, []);
      return {
        content: [{ type: "text", text: output.text }],
        finishReason,
        usage: {
          inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: output.text.length, text: output.text.length, reasoning: 0 }
        },
        warnings: []
      };
    },
    async doStream(options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult> {
      const prompt = promptToText(options);
      const streamId = `text-${Date.now()}`;

      const stream = new ReadableStream<LanguageModelV3StreamPart>({
        async start(controller) {
          controller.enqueue({ type: "stream-start", warnings: [] });
          controller.enqueue({ type: "text-start", id: streamId });

          let emittedDelta = false;
          let finalText = "";

          const output = await context.getProvider().generateContent(prompt, modelId, [], [null, null, null]);
          if (output.text) {
            finalText = output.text;
            const parts = output.text.match(/.{1,48}/g) ?? [output.text];
            for (const delta of parts) {
              emittedDelta = true;
              controller.enqueue({ type: "text-delta", id: streamId, delta });
            }
          }

          if (!emittedDelta) {
            controller.enqueue({ type: "text-delta", id: streamId, delta: "" });
          }

          controller.enqueue({ type: "text-end", id: streamId });
          controller.enqueue({
            type: "finish",
            finishReason,
            usage: {
              inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
              outputTokens: { total: finalText.length, text: finalText.length, reasoning: 0 }
            }
          });
          controller.close();
        }
      });

      return { stream };
    }
  };
}
