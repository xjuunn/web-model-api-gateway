/**
 * @file integrations/gemini/constants.ts
 * @description Gemini 集成常量，包括端点与请求头模板。
 */
export const GEMINI_ENDPOINTS = {
  INIT: "https://gemini.google.com/app",
  GENERATE:
    "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate",
  UPLOAD: "https://content-push.googleapis.com/upload"
} as const;

export const GEMINI_DEFAULT_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
  Host: "gemini.google.com",
  Origin: "https://gemini.google.com",
  Referer: "https://gemini.google.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "X-Same-Domain": "1"
};

export const GEMINI_MODEL_HEADERS: Record<string, Record<string, string>> = {
  "gemini-3.0-pro": {
    "x-goog-ext-525001261-jspb": "[1,null,null,null,\"9d8ca3786ebdfbea\",null,null,0,[4]]"
  },
  "gemini-2.5-pro": {
    "x-goog-ext-525001261-jspb": "[1,null,null,null,\"4af6c7f5da75d65d\",null,null,0,[4]]"
  },
  "gemini-2.5-flash": {
    "x-goog-ext-525001261-jspb": "[1,null,null,null,\"9ec249fc9ad08861\",null,null,0,[4]]"
  }
};
