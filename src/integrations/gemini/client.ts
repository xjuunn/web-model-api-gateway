/**
 * @file integrations/gemini/client.ts
 * @description Gemini Web 瀹㈡埛绔細璐熻矗鍒濆鍖栥€佽姹傛墽琛屼笌鍝嶅簲瑙ｆ瀽銆? */
import path from "node:path";
import { promises as fs } from "node:fs";
import { lookup as getMimeType } from "mime-types";
import { ProxyAgent } from "undici";

import { CONFIG_FILE_PATH, env } from "../../config/env";
import { AppError } from "../../core/errors";
import { logger } from "../../core/logger";
import { GEMINI_DEFAULT_HEADERS, GEMINI_ENDPOINTS, GEMINI_MODEL_HEADERS } from "./constants";
import { readGeminiCookiesFromBrowser } from "./browserCookies";
import { extractJsonFromResponse, getNestedValue } from "./parsing";
import { ChatLikeSession, Candidate, ModelOutput } from "./types";

function isCandidateList(value: unknown): value is unknown[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.some((item) => {
    if (!Array.isArray(item)) return false;
    const rcid = String(getNestedValue(item, [0], ""));
    const text = String(getNestedValue(item, [1, 0], ""));
    return Boolean(rcid && text);
  });
}

function findBodyWithCandidates(node: unknown, depth = 0): unknown[] | null {
  if (depth > 7) return null;
  if (!Array.isArray(node)) return null;

  const candidates = getNestedValue(node, [4]);
  if (isCandidateList(candidates)) {
    return node as unknown[];
  }

  for (const child of node) {
    const found = findBodyWithCandidates(child, depth + 1);
    if (found) return found;
  }
  return null;
}

class GeminiChatSession implements ChatLikeSession {
  private metadata: (string | null)[] = [null, null, null];

  constructor(private readonly client: GeminiWebClient, private readonly model: string) {}

  async sendMessage(prompt: string, files: string[] = []): Promise<ModelOutput> {
    const output = await this.client.generateContent(prompt, this.model, files, this.metadata);
    this.metadata = [output.metadata[0] || null, output.metadata[1] || null, output.rcid || null];
    return output;
  }
}

export class GeminiWebClient {
  private cookies: Record<string, string> = {};
  private accessToken = "";

  private requestOptions(): { dispatcher?: ProxyAgent } {
    if (!env.GEMINI_HTTP_PROXY) return {};
    return { dispatcher: new ProxyAgent(env.GEMINI_HTTP_PROXY) };
  }

  private serializeCookies(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  private mergeSetCookieHeaders(setCookies: string[]): void {
    for (const row of setCookies) {
      const first = row.split(";")[0]?.trim();
      if (!first) continue;
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      const key = first.slice(0, eq).trim();
      const val = first.slice(eq + 1).trim();
      if (key && val) {
        this.cookies[key] = val;
      }
    }
  }

  private extractAccessToken(html: string): string | null {
    const patterns = [
      /"SNlM0e":"(.*?)"/,
      /SNlM0e":"(.*?)"/,
      /SNlM0e\\":\\"(.*?)\\"/,
      /"EOzIkf":"(.*?)"/,
      /EOzIkf":"(.*?)"/,
      /EOzIkf\\":\\"(.*?)\\"/
    ];
    for (const pattern of patterns) {
      const m = pattern.exec(html);
      if (m?.[1]) return m[1];
    }
    return null;
  }

  private async fetchInitPage(useProxy: boolean): Promise<Response> {
    const requestOptions = useProxy ? this.requestOptions() : {};
    return await fetch(GEMINI_ENDPOINTS.INIT, {
      method: "GET",
      headers: {
        ...GEMINI_DEFAULT_HEADERS,
        Cookie: this.serializeCookies()
      },
      redirect: "follow",
      ...requestOptions
    });
  }

  async init(): Promise<void> {
    let p1 = env.GEMINI_COOKIE_1PSID;
    let p2 = env.GEMINI_COOKIE_1PSIDTS;

    if ((!p1 || !p2) && env.GEMINI_ALLOW_BROWSER_COOKIES) {
      const fromBrowser = await readGeminiCookiesFromBrowser();
      if (fromBrowser) {
        [p1, p2] = fromBrowser;
      }
    }

    if (!p1 || !p2) {
      throw new AppError(
        `Missing Gemini cookies. Set GEMINI_COOKIE_1PSID and GEMINI_COOKIE_1PSIDTS in ${CONFIG_FILE_PATH} (or enable GEMINI_ALLOW_BROWSER_COOKIES=true).`,
        503
      );
    }

    this.cookies = {
      "__Secure-1PSID": p1,
      "__Secure-1PSIDTS": p2
    };

    // Align with gemini_webapi strategy: warm up cookies from google.com first.
    try {
      const warmup = await fetch("https://www.google.com", {
        method: "GET",
        headers: {
          Cookie: this.serializeCookies()
        },
        redirect: "follow",
        ...this.requestOptions()
      });
      const warmupSetCookies = warmup.headers.getSetCookie?.() ?? [];
      if (warmupSetCookies.length > 0) {
        this.mergeSetCookieHeaders(warmupSetCookies);
      }
    } catch (error) {
      logger.warn(`Google warmup failed; continuing without warmup: ${String(error)}`);
    }

    let response = await this.fetchInitPage(true);
    let text = await response.text();
    let token = this.extractAccessToken(text);

    // Proxy can return challenge/login HTML; retry once without proxy before failing.
    if (!token && env.GEMINI_HTTP_PROXY && env.GEMINI_RETRY_WITHOUT_PROXY) {
      logger.warn("Token not found via proxy path, retrying Gemini init without proxy.");
      try {
        response = await this.fetchInitPage(false);
        text = await response.text();
        token = this.extractAccessToken(text);
      } catch (error) {
        logger.warn(`Direct retry failed; keeping proxy response for diagnostics: ${String(error)}`);
      }
    }

    if (!token) {
      if (env.GEMINI_DEBUG_SAVE_INIT_HTML) {
        const debugPath = path.resolve(process.cwd(), "debug-gemini-init.html");
        await fs.writeFile(debugPath, text, "utf8");
        logger.warn(`Saved Gemini init HTML to: ${debugPath}`);
      }
      throw new AppError(
        `Failed to initialize Gemini token from web response (status=${response.status}). Check cookies or proxy behavior.`,
        503
      );
    }

    this.accessToken = token;
    logger.info("Gemini web client initialized.");
  }

  startChat(model: string): GeminiChatSession {
    return new GeminiChatSession(this, model);
  }

  private async uploadFile(filePath: string): Promise<string> {
    const fileName = path.basename(filePath);
    const bytes = await fs.readFile(filePath);
    const mime = getMimeType(fileName) || "application/octet-stream";

    const body = new FormData();
    body.append("file", new Blob([bytes], { type: String(mime) }), fileName);

    const response = await fetch(GEMINI_ENDPOINTS.UPLOAD, {
      method: "POST",
      headers: { "Push-ID": "feeds/mcudyrk2a4khkz" },
      body,
      ...this.requestOptions()
    });

    if (!response.ok) {
      throw new AppError(`File upload failed with status ${response.status}`, 502);
    }

    return response.text();
  }

  async generateContent(
    prompt: string,
    model: string,
    files: string[] = [],
    metadata: (string | null)[] = [null, null, null]
  ): Promise<ModelOutput> {
    if (!this.accessToken) {
      throw new AppError("Gemini client is not initialized.", 503);
    }

    const modelHeaders = GEMINI_MODEL_HEADERS[model];
    if (!modelHeaders) {
      throw new AppError(`Unsupported model: ${model}`, 400);
    }

    const fileRefs: unknown[] = [];
    for (const filePath of files) {
      const fileRef = await this.uploadFile(filePath);
      fileRefs.push([[fileRef], path.basename(filePath)]);
    }

    const promptPayload = [fileRefs.length > 0 ? [prompt, 0, null, fileRefs] : [prompt], null, metadata];

    const form = new URLSearchParams();
    form.set("at", this.accessToken);
    form.set("f.req", JSON.stringify([null, JSON.stringify(promptPayload)]));

    const requestGenerate = async (): Promise<unknown[]> => {
      const requestForm = new URLSearchParams(form);
      const response = await fetch(GEMINI_ENDPOINTS.GENERATE, {
        method: "POST",
        headers: {
          ...GEMINI_DEFAULT_HEADERS,
          ...modelHeaders,
          Cookie: this.serializeCookies()
        },
        body: requestForm,
        ...this.requestOptions()
      });

      if (!response.ok) {
        throw new AppError(`Gemini generation failed with status ${response.status}`, 502);
      }

      const text = await response.text();
      return extractJsonFromResponse(text);
    };

    let responseJson: unknown[] | null = null;
    try {
      responseJson = await requestGenerate();
    } catch (error) {
      if (error instanceof Error && /Could not parse Gemini response payload/.test(error.message)) {
        logger.warn("Gemini payload parse failed once, retrying request.");
        responseJson = await requestGenerate();
      } else {
        throw error;
      }
    }

    let body: unknown[] | null = null;
    for (const part of responseJson) {
      if (!Array.isArray(part)) continue;
      const rawBody = getNestedValue(part, [2]);
      if (typeof rawBody !== "string") continue;
      try {
        const parsed = JSON.parse(rawBody);
        const maybeCandidates = getNestedValue(parsed, [4]);
        if (isCandidateList(maybeCandidates)) {
          body = parsed;
          break;
        }
      } catch {
        // 缁х画
      }
    }

    if (!body) {
      body = findBodyWithCandidates(responseJson);
    }

    if (!body) {
      throw new AppError("Failed to parse Gemini response body.", 502);
    }

    const rawCandidates = (getNestedValue(body, [4], []) as unknown[]) ?? [];
    const candidates: Candidate[] = rawCandidates
      .map((item) => {
        if (!Array.isArray(item)) return null;
        const rcid = String(getNestedValue(item, [0], ""));
        if (!rcid) return null;
        let candidateText = String(getNestedValue(item, [1, 0], ""));
        if (/^http:\/\/googleusercontent\.com\/card_content\/\d+/.test(candidateText)) {
          candidateText = String(getNestedValue(item, [22, 0], candidateText));
        }
        const thoughts = String(getNestedValue(item, [37, 0, 0], ""));
        return {
          rcid,
          text: candidateText,
          thoughts: thoughts || undefined
        } as Candidate;
      })
      .filter((x): x is Candidate => Boolean(x));

    if (candidates.length === 0) {
      throw new AppError("Gemini returned no candidates.", 502);
    }

    const metadataOut = (getNestedValue(body, [1], []) as string[]) ?? [];
    const chosen = 0;

    return {
      metadata: metadataOut,
      candidates,
      chosen,
      text: candidates[chosen].text,
      rcid: candidates[chosen].rcid
    };
  }
}

let geminiClient: GeminiWebClient | null = null;
let initError: string | null = null;

export async function initializeGeminiClient(): Promise<boolean> {
  if (!env.ENABLE_GEMINI) {
    initError = "Gemini is disabled via ENABLE_GEMINI=false";
    return false;
  }

  try {
    geminiClient = new GeminiWebClient();
    await geminiClient.init();
    initError = null;
    return true;
  } catch (error) {
    initError = error instanceof Error ? error.message : String(error);
    geminiClient = null;
    logger.error("Gemini client initialization failed", error);
    return false;
  }
}

export function getGeminiClient(): GeminiWebClient {
  if (!geminiClient) {
    throw new AppError(initError || "Gemini client unavailable", 503);
  }
  return geminiClient;
}

export function getGeminiInitError(): string | null {
  return initError;
}

