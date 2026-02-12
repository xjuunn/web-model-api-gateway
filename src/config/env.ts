/**
 * @file config/env.ts
 * @description JSON 配置加载、校验、持久化与运行时重载。
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { BrowserSchema } from "../domain/models";

const AppConfigSchema = z
  .object({
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    APP_HOST: z.string().min(1).default("localhost"),
    APP_PORT: z.coerce.number().int().min(1).max(65535).default(9091),
    APP_DEFAULT_MODE: z.enum(["auto", "webai", "native-api"]).default("auto"),
    APP_ACTIVE_PROVIDER: z.enum(["gemini-web", "openai-web"]).default("gemini-web"),
    APP_DEFAULT_MODEL: z.string().min(1).default("gemini-2.5-flash"),
    ENABLE_GEMINI: z.boolean().default(true),
    GEMINI_BROWSER: BrowserSchema.default("chrome"),
    GEMINI_DEFAULT_MODEL: z
      .enum(["gemini-3.0-pro", "gemini-2.5-pro", "gemini-2.5-flash"])
      .default("gemini-2.5-flash"),
    GEMINI_COOKIE_1PSID: z.string().optional(),
    GEMINI_COOKIE_1PSIDTS: z.string().optional(),
    GEMINI_HTTP_PROXY: z.string().optional(),
    GEMINI_ALLOW_BROWSER_COOKIES: z.boolean().default(false),
    GEMINI_DEBUG_SAVE_INIT_HTML: z.boolean().default(false),
    GEMINI_RETRY_WITHOUT_PROXY: z.boolean().default(false),
    ENABLE_OPENAI_WEB: z.boolean().default(false),
    OPENAI_WEB_BASE_URL: z.string().default("https://api.openai.com"),
    OPENAI_WEB_API_KEY: z.string().optional()
  })
  .strict();

export type AppEnv = z.infer<typeof AppConfigSchema>;

const CONFIG_DIR = path.resolve(process.cwd(), "config");
const CONFIG_BASENAME = "app.config.json";
export const CONFIG_FILE_PATH = path.resolve(CONFIG_DIR, CONFIG_BASENAME);

function formatIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
}

function parseConfig(raw: unknown, source: string): AppEnv {
  const parsed = AppConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid config file '${source}':\n${formatIssues(parsed.error)}`);
  }
  return parsed.data;
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readConfigFromDisk(): AppEnv {
  if (!existsSync(CONFIG_FILE_PATH)) {
    return parseConfig({}, CONFIG_FILE_PATH);
  }

  const text = readFileSync(CONFIG_FILE_PATH, "utf8").trim();
  if (!text) return parseConfig({}, CONFIG_FILE_PATH);

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in config file '${CONFIG_FILE_PATH}': ${String(error)}`);
  }

  return parseConfig(json, CONFIG_FILE_PATH);
}

function writeConfigToDisk(config: AppEnv): void {
  ensureConfigDir();
  const tempPath = `${CONFIG_FILE_PATH}.${process.pid}.tmp`;
  const payload = `${JSON.stringify(config, null, 2)}\n`;
  writeFileSync(tempPath, payload, { encoding: "utf8" });
  renameSync(tempPath, CONFIG_FILE_PATH);
}

export let env: AppEnv = readConfigFromDisk();

export function hasConfigFile(): boolean {
  return existsSync(CONFIG_FILE_PATH);
}

export function reloadEnvFromDisk(): AppEnv {
  env = readConfigFromDisk();
  return env;
}

export function saveEnvToDisk(next: AppEnv): AppEnv {
  const parsed = parseConfig(next, CONFIG_FILE_PATH);
  writeConfigToDisk(parsed);
  env = parsed;
  return env;
}

export function saveEnvPatch(patch: Partial<AppEnv>): AppEnv {
  return saveEnvToDisk({ ...env, ...patch });
}
