/**
 * @file integrations/gemini/browserCookies.ts
 * @description Gemini 浏览器 Cookie 读取器，用于本地凭据提取。
 */
import { CONFIG_FILE_PATH, env } from "../../config/env";
import { logger } from "../../core/logger";

type CookieObject = Record<string, string>;

type ChromeCookiesSecureModule = {
  getCookies: (
    url: string,
    format: "object",
    callback: (err: Error | null, cookies: CookieObject) => void,
    profile?: string
  ) => void;
};

function hasBrowserCookieRuntimeSupport(): boolean {
  if (process.platform !== "win32") return true;
  if (typeof require !== "function") {
    logger.warn("当前运行环境不支持 require.resolve，浏览器 Cookie 模式不可用。");
    return false;
  }
  try {
    require.resolve("win-dpapi");
    return true;
  } catch {
    logger.warn(
      "Browser-cookie mode is unavailable because 'win-dpapi' is missing. Use manual cookies in config/app.config.json."
    );
    return false;
  }
}

async function getCookies(url: string, browser: string): Promise<CookieObject> {
  let chromeCookiesSecure: ChromeCookiesSecureModule;
  if (!hasBrowserCookieRuntimeSupport()) return {};

  try {
    chromeCookiesSecure = (await import("chrome-cookies-secure")).default as ChromeCookiesSecureModule;
  } catch (error) {
    logger.warn(
      `chrome-cookies-secure is unavailable. Set GEMINI_COOKIE_1PSID and GEMINI_COOKIE_1PSIDTS in ${CONFIG_FILE_PATH}.`
    );
    logger.debug(`Lazy import error: ${String(error)}`);
    return {};
  }

  return await new Promise<CookieObject>((resolve, reject) => {
    try {
      chromeCookiesSecure.getCookies(
        url,
        "object",
        (err: Error | null, cookies: CookieObject) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(cookies ?? {});
        },
        browser
      );
    } catch (error) {
      reject(error as Error);
    }
  });
}

export async function readGeminiCookiesFromBrowser(): Promise<[string, string] | null> {
  try {
    const cookies = await getCookies("https://gemini.google.com", env.GEMINI_BROWSER);
    const p1 = cookies["__Secure-1PSID"];
    const p2 = cookies["__Secure-1PSIDTS"];
    if (p1 && p2) return [p1, p2];
    return null;
  } catch (error) {
    logger.warn(`Browser cookie read failed: ${String(error)}`);
    return null;
  }
}
