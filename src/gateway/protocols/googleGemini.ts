import { Hono } from "hono";
import { generateText } from "ai";
import { parseOrThrow } from "../../core/http";
import { GeminiRequestSchema, GoogleGenerativeRequestSchema } from "../../domain/schemas";
import type { ApiContext } from "../../server/context";
import { resolveLanguageModel } from "../models/registry";

export function createGoogleGeminiProtocolRouter(context: ApiContext): Hono {
  const app = new Hono();

  app.post("/v1beta/models/:model", async (c) => {
    const bodyJson = await c.req.json().catch(() => null);
    if (!bodyJson) return c.json({ detail: "Invalid JSON body" }, 400);

    const body = parseOrThrow(GoogleGenerativeRequestSchema, bodyJson);
    const modelId = String(c.req.param("model") || "").split(":")[0] || context.defaultModel;
    const prompt = (body.contents ?? [])
      .flatMap((item) => item.parts ?? [])
      .map((part) => part?.text ?? "")
      .join("");

    const result = await generateText({ model: resolveLanguageModel(context, modelId), prompt });

    return c.json({
      candidates: [
        {
          content: {
            parts: [{ text: result.text }],
            role: "model"
          },
          finishReason: "STOP",
          index: 0,
          safetyRatings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", probability: "NEGLIGIBLE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", probability: "NEGLIGIBLE" },
            { category: "HARM_CATEGORY_HARASSMENT", probability: "NEGLIGIBLE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", probability: "NEGLIGIBLE" }
          ]
        }
      ],
      promptFeedback: {
        safetyRatings: [
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", probability: "NEGLIGIBLE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", probability: "NEGLIGIBLE" },
          { category: "HARM_CATEGORY_HARASSMENT", probability: "NEGLIGIBLE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", probability: "NEGLIGIBLE" }
        ]
      }
    });
  });

  app.post("/gemini", async (c) => {
    const bodyJson = await c.req.json().catch(() => null);
    if (!bodyJson) return c.json({ detail: "Invalid JSON body" }, 400);

    const body = parseOrThrow(GeminiRequestSchema, bodyJson);
    const modelId = body.model ?? context.defaultModel;
    const result = await generateText({
      model: resolveLanguageModel(context, modelId),
      prompt: body.message
    });

    return c.json({ response: result.text });
  });

  app.post("/translate", async (c) => {
    const bodyJson = await c.req.json().catch(() => null);
    if (!bodyJson) return c.json({ detail: "Invalid JSON body" }, 400);

    const body = parseOrThrow(GeminiRequestSchema, bodyJson);
    const modelId = body.model ?? context.defaultModel;
    const text = await context.sessions.translate.getResponse(modelId, body.message, body.files ?? []);

    return c.json({ response: text });
  });

  app.post("/gemini-chat", async (c) => {
    const bodyJson = await c.req.json().catch(() => null);
    if (!bodyJson) return c.json({ detail: "Invalid JSON body" }, 400);

    const body = parseOrThrow(GeminiRequestSchema, bodyJson);
    const modelId = body.model ?? context.defaultModel;
    const text = await context.sessions.geminiChat.getResponse(modelId, body.message, body.files ?? []);

    return c.json({ response: text });
  });

  return app;
}
