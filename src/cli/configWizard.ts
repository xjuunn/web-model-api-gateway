/**
 * @file cli/configWizard.ts
 * @description CLI 配置向导：检查缺失配置并持久化到 JSON 配置文件。
 */
import pc from "picocolors";
import prompts from "prompts";
import { AppEnv, CONFIG_FILE_PATH, env, hasConfigFile, saveEnvToDisk } from "../config/env";

export interface ConfigWizardOptions {
  force?: boolean;
}

function hasGeminiCredential(config: AppEnv): boolean {
  if (!config.ENABLE_GEMINI) return true;
  if (config.GEMINI_ALLOW_BROWSER_COOKIES) return true;
  return Boolean(config.GEMINI_COOKIE_1PSID && config.GEMINI_COOKIE_1PSIDTS);
}

function hasOpenAIWebCredential(config: AppEnv): boolean {
  if (!config.ENABLE_OPENAI_WEB) return true;
  return Boolean(config.OPENAI_WEB_API_KEY);
}

function needsInteractiveSetup(config: AppEnv): boolean {
  if (!hasConfigFile()) return true;
  if (!hasGeminiCredential(config)) return true;
  if (!hasOpenAIWebCredential(config)) return true;
  return false;
}

function normalizePortInput(value: unknown, fallback: number): number {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) return fallback;
  return parsed;
}

function normalizeProxyInput(value: unknown): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  return raw.replace("localost", "localhost");
}

function validateHost(value: string): true | string {
  const v = value.trim();
  if (!v) return "APP_HOST 不能为空";
  if (/\s/.test(v)) return "APP_HOST 不能包含空白字符";
  return true;
}

function validatePortInput(value: string): true | string {
  const v = value.trim();
  if (!v) return true;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 65535 ? true : "APP_PORT 必须在 1~65535 之间";
}

function validateProxyInput(value: string): true | string {
  const v = value.trim();
  if (!v) return true;
  let parsed: URL;
  try {
    parsed = new URL(v.replace("localost", "localhost"));
  } catch {
    return "GEMINI_HTTP_PROXY 必须是合法 URL（例如 http://127.0.0.1:7897）";
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return "GEMINI_HTTP_PROXY 目前仅支持 http/https 协议";
  }
  return true;
}

function maskSecret(value: string | undefined): string {
  if (!value) return "未设置";
  if (value.length <= 8) return "已设置";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function confirmAndSave(next: AppEnv): Promise<boolean> {
  console.log("");
  console.log(pc.bold("配置摘要："));
  console.log(`- APP_HOST: ${next.APP_HOST}`);
  console.log(`- APP_PORT: ${next.APP_PORT}`);
  console.log(`- APP_DEFAULT_MODE: ${next.APP_DEFAULT_MODE}`);
  console.log(`- ENABLE_GEMINI: ${next.ENABLE_GEMINI}`);
  console.log(`- GEMINI_ALLOW_BROWSER_COOKIES: ${next.GEMINI_ALLOW_BROWSER_COOKIES}`);
  console.log(`- GEMINI_BROWSER: ${next.GEMINI_BROWSER}`);
  console.log(`- GEMINI_DEFAULT_MODEL: ${next.GEMINI_DEFAULT_MODEL}`);
  console.log(`- GEMINI_HTTP_PROXY: ${next.GEMINI_HTTP_PROXY ?? "未设置"}`);
  console.log(`- GEMINI_COOKIE_1PSID: ${maskSecret(next.GEMINI_COOKIE_1PSID)}`);
  console.log(`- GEMINI_COOKIE_1PSIDTS: ${maskSecret(next.GEMINI_COOKIE_1PSIDTS)}`);
  console.log("");

  const result = await prompts({
    type: "confirm",
    name: "confirm",
    message: "确认保存以上配置？",
    initial: true
  });

  if (!result.confirm) {
    console.log(pc.yellow("已取消保存配置。"));
    return false;
  }

  saveEnvToDisk(next);
  console.log(pc.green(`配置已保存: ${CONFIG_FILE_PATH}`));
  return true;
}

export async function ensureConfigWithCli(options: ConfigWizardOptions = {}): Promise<boolean> {
  const force = options.force === true;
  if (!force && !needsInteractiveSetup(env)) return false;

  if (!process.stdin.isTTY) {
    throw new Error(`配置不完整且当前为非交互终端，请手动更新：${CONFIG_FILE_PATH}`);
  }

  console.log(pc.cyan(`配置向导: ${CONFIG_FILE_PATH}`));

  const allowSkip = hasConfigFile();
  if (!force) {
    const shouldSetup = await prompts({
      type: "confirm",
      name: "setup",
      message: allowSkip ? "检测到配置不完整，是否现在补全配置？" : "未检测到配置文件，是否现在创建配置？",
      initial: true
    });

    if (!shouldSetup.setup) {
      if (allowSkip) {
        console.log(pc.yellow("已跳过配置向导，继续使用当前配置。"));
        return false;
      }
      throw new Error("未完成配置，无法继续启动。");
    }
  }

  const initialAuthMode: "browser" | "manual" = env.GEMINI_ALLOW_BROWSER_COOKIES ? "browser" : "manual";

  const answers = await prompts(
    [
      {
        type: "text",
        name: "APP_HOST",
        message: `APP_HOST ${pc.gray("(API 服务监听主机)")}`,
        initial: env.APP_HOST,
        validate: (v: string) => validateHost(v)
      },
      {
        type: "text",
        name: "APP_PORT",
        message: `APP_PORT ${pc.gray("(API 服务监听端口，留空使用当前值)")}`,
        initial: String(env.APP_PORT),
        validate: (v: string) => validatePortInput(v)
      },
      {
        type: "select",
        name: "APP_DEFAULT_MODE",
        message: `APP_DEFAULT_MODE ${pc.gray("(默认启动模式)")}`,
        initial: ["auto", "webai", "native-api"].indexOf(env.APP_DEFAULT_MODE),
        choices: [
          { title: "auto", description: "自动选择可用模式", value: "auto" },
          { title: "webai", description: "优先启动 WebAI 模式", value: "webai" },
          { title: "native-api", description: "优先启动原生 API 模式", value: "native-api" }
        ]
      },
      {
        type: "toggle",
        name: "ENABLE_GEMINI",
        message: `ENABLE_GEMINI ${pc.gray("(是否启用 Gemini Provider)")}`,
        initial: env.ENABLE_GEMINI,
        active: "true",
        inactive: "false"
      },
      {
        type: (_prev: boolean, values: Record<string, unknown>) => (values.ENABLE_GEMINI ? "select" : null),
        name: "AUTH_MODE",
        message: `Gemini 鉴权模式 ${pc.gray("(选择凭据来源)")}`,
        initial: initialAuthMode === "browser" ? 0 : 1,
        choices: [
          { title: "浏览器 Cookie", description: "自动从浏览器读取 Gemini 登录态", value: "browser" },
          { title: "手动 Cookie", description: "手动填写 1PSID 与 1PSIDTS", value: "manual" }
        ]
      },
      {
        type: (_prev: string, values: Record<string, unknown>) => (values.ENABLE_GEMINI ? "select" : null),
        name: "GEMINI_BROWSER",
        message: `GEMINI_BROWSER ${pc.gray("(浏览器 Cookie 来源)")}`,
        initial: ["chrome", "firefox", "brave", "edge", "safari"].indexOf(env.GEMINI_BROWSER),
        choices: [
          { title: "chrome", value: "chrome" },
          { title: "firefox", value: "firefox" },
          { title: "brave", value: "brave" },
          { title: "edge", value: "edge" },
          { title: "safari", value: "safari" }
        ]
      },
      {
        type: (_prev: string, values: Record<string, unknown>) => (values.ENABLE_GEMINI ? "select" : null),
        name: "GEMINI_DEFAULT_MODEL",
        message: `GEMINI_DEFAULT_MODEL ${pc.gray("(默认生成模型)")}`,
        initial: ["gemini-3.0-pro", "gemini-2.5-pro", "gemini-2.5-flash"].indexOf(env.GEMINI_DEFAULT_MODEL),
        choices: [
          { title: "gemini-3.0-pro", value: "gemini-3.0-pro" },
          { title: "gemini-2.5-pro", value: "gemini-2.5-pro" },
          { title: "gemini-2.5-flash", value: "gemini-2.5-flash" }
        ]
      },
      {
        type: (_prev: string, values: Record<string, unknown>) =>
          values.ENABLE_GEMINI && values.AUTH_MODE === "manual" ? "password" : null,
        name: "GEMINI_COOKIE_1PSID",
        message: `GEMINI_COOKIE_1PSID ${pc.gray("(Gemini 登录 Cookie)")}`,
        initial: env.GEMINI_COOKIE_1PSID ?? "",
        validate: (v: string) => (v.trim() ? true : "GEMINI_COOKIE_1PSID 不能为空")
      },
      {
        type: (_prev: string, values: Record<string, unknown>) =>
          values.ENABLE_GEMINI && values.AUTH_MODE === "manual" ? "password" : null,
        name: "GEMINI_COOKIE_1PSIDTS",
        message: `GEMINI_COOKIE_1PSIDTS ${pc.gray("(Gemini 登录时间戳 Cookie)")}`,
        initial: env.GEMINI_COOKIE_1PSIDTS ?? "",
        validate: (v: string) => (v.trim() ? true : "GEMINI_COOKIE_1PSIDTS 不能为空")
      },
      {
        type: (_prev: string, values: Record<string, unknown>) => (values.ENABLE_GEMINI ? "text" : null),
        name: "GEMINI_HTTP_PROXY",
        message: `GEMINI_HTTP_PROXY ${pc.gray("(可选 HTTP 代理，可留空)")}`,
        initial: env.GEMINI_HTTP_PROXY ?? "",
        validate: (v: string) => validateProxyInput(v)
      },
      {
        type: (_prev: string, values: Record<string, unknown>) => (values.ENABLE_GEMINI ? "toggle" : null),
        name: "GEMINI_RETRY_WITHOUT_PROXY",
        message: `GEMINI_RETRY_WITHOUT_PROXY ${pc.gray("(代理路径失败时直连重试)")}`,
        initial: env.GEMINI_RETRY_WITHOUT_PROXY,
        active: "true",
        inactive: "false"
      },
      {
        type: (_prev: string, values: Record<string, unknown>) => (values.ENABLE_GEMINI ? "toggle" : null),
        name: "GEMINI_DEBUG_SAVE_INIT_HTML",
        message: `GEMINI_DEBUG_SAVE_INIT_HTML ${pc.gray("(保存初始化 HTML 便于排查)")}`,
        initial: env.GEMINI_DEBUG_SAVE_INIT_HTML,
        active: "true",
        inactive: "false"
      }
    ],
    {
      onCancel: () => {
        if (allowSkip) {
          console.log(pc.yellow("已取消配置向导，继续使用当前配置。"));
          return true;
        }
        throw new Error("配置向导已取消，且当前没有可用配置。");
      }
    }
  );

  if (Object.keys(answers).length === 0) {
    if (allowSkip) return false;
    throw new Error("配置向导未返回有效结果，无法继续启动。");
  }

  const enableGemini = Boolean(answers.ENABLE_GEMINI);
  const authMode = (answers.AUTH_MODE as "browser" | "manual" | undefined) ?? initialAuthMode;

  const next: AppEnv = {
    ...env,
    APP_HOST: String(answers.APP_HOST ?? env.APP_HOST).trim() || env.APP_HOST,
    APP_PORT: normalizePortInput(answers.APP_PORT, env.APP_PORT),
    APP_DEFAULT_MODE: (answers.APP_DEFAULT_MODE ?? env.APP_DEFAULT_MODE) as AppEnv["APP_DEFAULT_MODE"],
    ENABLE_GEMINI: enableGemini,
    GEMINI_BROWSER: (answers.GEMINI_BROWSER ?? env.GEMINI_BROWSER) as AppEnv["GEMINI_BROWSER"],
    GEMINI_DEFAULT_MODEL: (answers.GEMINI_DEFAULT_MODEL ?? env.GEMINI_DEFAULT_MODEL) as AppEnv["GEMINI_DEFAULT_MODEL"],
    GEMINI_ALLOW_BROWSER_COOKIES: enableGemini ? authMode === "browser" : false,
    GEMINI_COOKIE_1PSID:
      enableGemini && authMode === "manual"
        ? String(answers.GEMINI_COOKIE_1PSID ?? env.GEMINI_COOKIE_1PSID ?? "").trim()
        : env.GEMINI_COOKIE_1PSID,
    GEMINI_COOKIE_1PSIDTS:
      enableGemini && authMode === "manual"
        ? String(answers.GEMINI_COOKIE_1PSIDTS ?? env.GEMINI_COOKIE_1PSIDTS ?? "").trim()
        : env.GEMINI_COOKIE_1PSIDTS,
    GEMINI_HTTP_PROXY: normalizeProxyInput(answers.GEMINI_HTTP_PROXY ?? env.GEMINI_HTTP_PROXY),
    GEMINI_RETRY_WITHOUT_PROXY: Boolean(answers.GEMINI_RETRY_WITHOUT_PROXY ?? env.GEMINI_RETRY_WITHOUT_PROXY),
    GEMINI_DEBUG_SAVE_INIT_HTML: Boolean(answers.GEMINI_DEBUG_SAVE_INIT_HTML ?? env.GEMINI_DEBUG_SAVE_INIT_HTML),
    APP_ACTIVE_PROVIDER: env.APP_ACTIVE_PROVIDER,
    LOG_LEVEL: env.LOG_LEVEL
  };

  if (next.ENABLE_GEMINI && !hasGeminiCredential(next)) {
    throw new Error("Gemini 凭据不完整：请使用浏览器 Cookie 或手动填写完整 Cookie。");
  }

  return await confirmAndSave(next);
}
