import type { LanguageModelV3 } from "@ai-sdk/provider";
import { env } from "../../config/env";
import type { ApiContext } from "../../server/context";
import { createOneTestLanguageModel } from "./oneTestLanguageModel";
import { createWebGeminiLanguageModel } from "./webGeminiLanguageModel";

const WEB_GEMINI_MODELS = ["gemini-3.0-pro", "gemini-2.5-pro", "gemini-2.5-flash"] as const;

export type SupportedModelId = (typeof WEB_GEMINI_MODELS)[number] | "onetest-model";

export function listSupportedModelIds(): SupportedModelId[] {
  const dynamic = new Set<SupportedModelId>([...WEB_GEMINI_MODELS, "onetest-model"]);
  if (WEB_GEMINI_MODELS.includes(env.GEMINI_DEFAULT_MODEL as (typeof WEB_GEMINI_MODELS)[number])) {
    dynamic.add(env.GEMINI_DEFAULT_MODEL as SupportedModelId);
  }
  return [...dynamic];
}

export function resolveLanguageModel(context: ApiContext, modelId?: string): LanguageModelV3 {
  const id = (modelId || context.defaultModel) as SupportedModelId;
  if (id === "onetest-model") {
    return createOneTestLanguageModel();
  }
  if (!WEB_GEMINI_MODELS.includes(id as (typeof WEB_GEMINI_MODELS)[number])) {
    return createWebGeminiLanguageModel(context, context.defaultModel);
  }
  return createWebGeminiLanguageModel(context, id);
}
