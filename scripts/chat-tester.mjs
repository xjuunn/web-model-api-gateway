#!/usr/bin/env node

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const require = createRequire(import.meta.url);
const CONFIG_FILE_PATH = path.resolve(process.cwd(), "config", "app.config.json");

function hasGeminiCredential(config) {
  if (!config.ENABLE_GEMINI) return true;
  if (config.GEMINI_ALLOW_BROWSER_COOKIES) return true;
  return Boolean(config.GEMINI_COOKIE_1PSID && config.GEMINI_COOKIE_1PSIDTS);
}

function readAppConfigOrExit() {
  if (!existsSync(CONFIG_FILE_PATH)) {
    console.error(`[fatal] 未检测到配置文件: ${CONFIG_FILE_PATH}`);
    console.error("[hint] 请先运行一次 `npm start` 完成配置向导，再执行测试。");
    process.exit(1);
  }

  let raw;
  try {
    raw = readFileSync(CONFIG_FILE_PATH, "utf8");
  } catch (error) {
    console.error(`[fatal] 无法读取配置文件: ${String(error)}`);
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (error) {
    console.error(`[fatal] 配置文件 JSON 非法: ${String(error)}`);
    console.error("[hint] 请先运行一次 `npm start` 修正配置，再执行测试。");
    process.exit(1);
  }

  if (!hasGeminiCredential(config)) {
    console.error("[fatal] 检测到 Gemini 配置不完整（缺少 Cookie 或未启用浏览器 Cookie）。");
    console.error("[hint] 请先运行一次 `npm start` 完成配置向导，再执行测试。");
    process.exit(1);
  }

  return config;
}

function normalizeServiceHost(host) {
  if (!host) return "127.0.0.1";
  if (host === "0.0.0.0" || host === "::") return "127.0.0.1";
  return host;
}

function buildBaseUrlFromAppConfig(appConfig) {
  const host = normalizeServiceHost(String(appConfig.APP_HOST || "127.0.0.1"));
  const port = Number(appConfig.APP_PORT || 9091);
  return `http://${host}:${port}`;
}

function parseArgs(argv) {
  const hasBaseUrlFromEnv = Boolean(process.env.AI_BASE_URL);
  const config = {
    baseUrl: process.env.AI_BASE_URL || "",
    endpoint: process.env.AI_ENDPOINT || "/v1/chat/completions",
    model: process.env.AI_MODEL || "gemini-2.5-pro",
    stream: process.env.AI_STREAM === "1" || process.env.AI_STREAM === "true",
    system: process.env.AI_SYSTEM || "",
    autoStart: true,
    baseUrlExplicit: hasBaseUrlFromEnv
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === "--base-url" || arg === "-u") && argv[i + 1]) {
      config.baseUrl = argv[++i];
      config.baseUrlExplicit = true;
      continue;
    }
    if ((arg === "--endpoint" || arg === "-e") && argv[i + 1]) {
      config.endpoint = argv[++i];
      continue;
    }
    if ((arg === "--model" || arg === "-m") && argv[i + 1]) {
      config.model = argv[++i];
      continue;
    }
    if (arg === "--stream") {
      config.stream = true;
      continue;
    }
    if (arg === "--no-stream") {
      config.stream = false;
      continue;
    }
    if ((arg === "--system" || arg === "-s") && argv[i + 1]) {
      config.system = argv[++i];
      continue;
    }
    if (arg === "--no-auto-start") {
      config.autoStart = false;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  config.endpoint = config.endpoint.startsWith("/") ? config.endpoint : `/${config.endpoint}`;
  return config;
}

function printHelp() {
  console.log(`AI Chat Tester

Usage:
  node scripts/chat-tester.mjs [options]

Options:
  -u, --base-url <url>    API base URL (default: read from config/app.config.json)
  -e, --endpoint <path>   Chat endpoint (default: /v1/chat/completions)
  -m, --model <name>      Model name (default: gemini-2.5-pro)
  -s, --system <text>     System prompt
      --stream            Enable stream mode
      --no-stream         Disable stream mode
      --no-auto-start     Do not auto-start local service
  -h, --help              Show help

Environment:
  AI_BASE_URL, AI_ENDPOINT, AI_MODEL, AI_STREAM, AI_SYSTEM

Commands in chat:
  /exit                   Exit
  /clear                  Clear history
  /model <name>           Change model
  /stream on|off          Toggle stream output
`);
}

async function isServiceReachable(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

async function startLocalService() {
  const { createRuntimeController } = require("../dist/server/composition");
  const { setLogLevel } = require("../dist/core/logger");
  const { env } = require("../dist/config/env");

  setLogLevel(env.LOG_LEVEL);
  const controller = createRuntimeController();
  await controller.bootstrap();
  await controller.startDefaultMode();
  return controller;
}

async function readStreamText(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let outputText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx = buf.indexOf("\n\n");
    while (idx !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const line = block
        .split("\n")
        .map((s) => s.trim())
        .find((s) => s.startsWith("data: "));

      if (line) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            process.stdout.write(delta);
            outputText += delta;
          }
        } catch {
          // Ignore non-JSON stream fragments.
        }
      }
      idx = buf.indexOf("\n\n");
    }
  }

  process.stdout.write("\n");
  return outputText;
}

async function chatOnce(config, messages) {
  const url = `${config.baseUrl}${config.endpoint}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      stream: config.stream,
      messages
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  if (config.stream) {
    return await readStreamText(response);
  }

  const json = await response.json();
  return json?.choices?.[0]?.message?.content ?? "";
}

function applyCommand(line, state) {
  const trimmed = line.trim();
  if (trimmed === "/exit") return { type: "exit" };

  if (trimmed === "/clear") {
    state.messages = [];
    if (state.config.system) {
      state.messages.push({ role: "system", content: state.config.system });
    }
    console.log("[system] history cleared");
    return { type: "continue" };
  }

  if (trimmed.startsWith("/model ")) {
    const nextModel = trimmed.slice(7).trim();
    if (nextModel) {
      state.config.model = nextModel;
      console.log(`[system] model => ${state.config.model}`);
    }
    return { type: "continue" };
  }

  if (trimmed.startsWith("/stream ")) {
    const next = trimmed.slice(8).trim();
    if (next === "on") {
      state.config.stream = true;
      console.log("[system] stream => on");
    } else if (next === "off") {
      state.config.stream = false;
      console.log("[system] stream => off");
    } else {
      console.log("[system] usage: /stream on|off");
    }
    return { type: "continue" };
  }

  return { type: "message", text: line };
}

async function main() {
  const appConfig = readAppConfigOrExit();
  const config = parseArgs(process.argv.slice(2));

  if (!config.baseUrlExplicit) {
    config.baseUrl = buildBaseUrlFromAppConfig(appConfig);
  }
  config.baseUrl = config.baseUrl.replace(/\/+$/, "");

  let localController = null;
  if (config.autoStart) {
    const reachable = await isServiceReachable(config.baseUrl);
    if (!reachable) {
      localController = await startLocalService();
      console.log(`[system] local service started at ${config.baseUrl}`);
    } else {
      console.log(`[system] detected running service at ${config.baseUrl}`);
    }
  }

  const rl = createInterface({ input, output });
  const messages = [];
  if (config.system) {
    messages.push({ role: "system", content: config.system });
  }

  const state = { config, messages };

  console.log("chat tester started");
  console.log(`target : ${config.baseUrl}${config.endpoint}`);
  console.log(`model  : ${config.model}`);
  console.log(`stream : ${config.stream ? "on" : "off"}`);
  console.log("type /exit to quit");

  try {
    while (true) {
      const line = await rl.question("you> ");
      if (!line.trim()) continue;

      const action = applyCommand(line, state);
      if (action.type === "exit") break;
      if (action.type !== "message") continue;

      state.messages.push({ role: "user", content: action.text });

      try {
        process.stdout.write("ai > ");
        const assistant = await chatOnce(state.config, state.messages);
        if (!state.config.stream) {
          console.log(assistant);
        }
        state.messages.push({ role: "assistant", content: assistant });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`\n[error] ${msg}`);
        console.log("[hint] verify base URL with --base-url (e.g. http://127.0.0.1:9091)");
        state.messages.pop();
      }
    }
  } finally {
    rl.close();
    if (localController) {
      await localController.shutdown();
      console.log("[system] local service stopped");
    }
  }
}

main().catch((error) => {
  console.error(`[fatal] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
