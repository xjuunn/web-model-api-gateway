/**
 * @file modules/google/router.ts
 * @description Google 风格兼容路由：用于 v1beta 模型端点。
 */
import { Router } from "express";
import { asyncHandler, parseOrThrow } from "../../core/http";
import { GoogleGenerativeRequestSchema } from "../../domain/schemas";
import { getPrimaryProviderOrThrow } from "../../integrations/providers/registry";

export const googleRouter = Router();

googleRouter.post(
  "/v1beta/models/:model",
  asyncHandler(async (req, res) => {
    const body = parseOrThrow(GoogleGenerativeRequestSchema, req.body);
    const model = String(req.params.model || "").split(":")[0];

    const contents = body.contents ?? [];
    const prompt = contents
      .flatMap((item) => item.parts ?? [])
      .map((p) => p?.text ?? "")
      .join("");

    const output = await getPrimaryProviderOrThrow().generateContent(prompt, model, []);

    res.json({
      candidates: [
        {
          content: {
            parts: [{ text: output.text }],
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
  })
);

