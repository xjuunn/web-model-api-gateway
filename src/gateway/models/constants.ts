export const WEB_GEMINI_MODEL_IDS = ["gemini-3.0-pro", "gemini-2.5-pro", "gemini-2.5-flash"] as const;
export const OPENAI_WEB_MODEL_IDS = ["gpt-4o", "gpt-4.1", "gpt-4.1-mini"] as const;

export const ONETEST_MODEL_ID = "onetest-model" as const;
export const ONETEST_OUTPUT_TEXT = "onetest" as const;

export type WebGeminiModelId = (typeof WEB_GEMINI_MODEL_IDS)[number];
export type OpenAIWebModelId = (typeof OPENAI_WEB_MODEL_IDS)[number];
export type CustomModelId = typeof ONETEST_MODEL_ID;
export type SupportedModelId = WebGeminiModelId | OpenAIWebModelId | CustomModelId;
