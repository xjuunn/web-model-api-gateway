/**
 * @file config/env.ts
 * @description 环境配置解析与校验器，输出强类型配置。
 */
import "dotenv/config";
import { z } from "zod";
import { BrowserSchema } from "../domain/models";

const EnvSchema = z.object({
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  APP_HOST: z.string().default("localhost"),
  APP_PORT: z.coerce.number().int().min(1).max(65535).default(9091),
  APP_DEFAULT_MODE: z.enum(["auto", "webai", "native-api"]).default("auto"),
  APP_ACTIVE_PROVIDER: z.enum(["gemini-web"]).default("gemini-web"),

  ENABLE_GEMINI: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() !== "false"),
  GEMINI_BROWSER: BrowserSchema.default("chrome"),
  GEMINI_DEFAULT_MODEL: z
    .enum(["gemini-3.0-pro", "gemini-2.5-pro", "gemini-2.5-flash"])
    .default("gemini-2.5-flash"),
  GEMINI_COOKIE_1PSID: z.string().optional(),
  GEMINI_COOKIE_1PSIDTS: z.string().optional(),
  GEMINI_HTTP_PROXY: z.string().optional(),
  GEMINI_ALLOW_BROWSER_COOKIES: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  GEMINI_DEBUG_SAVE_INIT_HTML: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true"),
  GEMINI_RETRY_WITHOUT_PROXY: z
    .string()
    .default("false")
    .transform((v) => v.toLowerCase() === "true")
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid .env configuration:\n${issues}`);
}

export const env = parsed.data;
export type AppEnv = typeof env;
