import { generateText } from "ai";
import type { LanguageModelV3, LanguageModelV3StreamPart, LanguageModelV3Usage } from "@ai-sdk/provider";

const usage: LanguageModelV3Usage = {
    inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 }
};

const finishReason = { unified: "stop" as const, raw: "stop" };

const oneTestModel: LanguageModelV3 = {
    specificationVersion: "v3",
    provider: "onetest-provider",
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
        const id = "onetest-stream-1";
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

async function main() {
    const result = await generateText({
        model: oneTestModel,
        prompt: "say onetest"
    });
    console.log(result.text);
}

void main();
