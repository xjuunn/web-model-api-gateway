import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { ApiContext } from "../../server/context";
import { type SupportedModelId, WEB_GEMINI_MODEL_IDS } from "./constants";
import { isSupportedModelId, MODEL_FACTORIES, REGISTERED_MODEL_IDS } from "./registrations";

export type { SupportedModelId } from "./constants";

export function listSupportedModelIds(): SupportedModelId[] {
  return [...REGISTERED_MODEL_IDS];
}

export function resolveLanguageModel(context: ApiContext, modelId?: string): LanguageModelV3 {
  const requestedModelId = modelId || context.defaultModel;
  if (isSupportedModelId(requestedModelId)) {
    return MODEL_FACTORIES[requestedModelId](context);
  }

  if (isSupportedModelId(context.defaultModel)) {
    return MODEL_FACTORIES[context.defaultModel](context);
  }

  return MODEL_FACTORIES[WEB_GEMINI_MODEL_IDS[0]](context);
}
