import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { ApiContext } from "../../server/context";
import { createOneTestLanguageModel } from "./oneTestLanguageModel";
import {
  ONETEST_MODEL_ID,
  OPENAI_WEB_MODEL_IDS,
  type OpenAIWebModelId,
  type SupportedModelId,
  type WebGeminiModelId,
  WEB_GEMINI_MODEL_IDS
} from "./constants";
import { createWebGeminiLanguageModel } from "./webGeminiLanguageModel";

export type ModelFactory = (context: ApiContext) => LanguageModelV3;

const webGeminiFactories = Object.fromEntries(
  WEB_GEMINI_MODEL_IDS.map((id) => [id, (context: ApiContext) => createWebGeminiLanguageModel(context, id)])
) as Record<WebGeminiModelId, ModelFactory>;

const openaiWebFactories = Object.fromEntries(
  OPENAI_WEB_MODEL_IDS.map((id) => [id, (context: ApiContext) => createWebGeminiLanguageModel(context, id)])
) as Record<OpenAIWebModelId, ModelFactory>;

export const MODEL_FACTORIES: Record<SupportedModelId, ModelFactory> = {
  [ONETEST_MODEL_ID]: () => createOneTestLanguageModel(),
  ...webGeminiFactories,
  ...openaiWebFactories
};

export const REGISTERED_MODEL_IDS = Object.keys(MODEL_FACTORIES) as SupportedModelId[];

export function isSupportedModelId(modelId: string): modelId is SupportedModelId {
  return modelId in MODEL_FACTORIES;
}
