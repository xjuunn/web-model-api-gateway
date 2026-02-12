/**
 * @file cli/display.ts
 * @description CLI 展示层：提供统一的视觉排版与状态展示。
 */
import pc from "picocolors";
import { RuntimeMode, RuntimeState } from "../server/runtime";
import { CliChoice } from "./types";

const LINE = "------------------------------------------------------------";

function statusBadge(ok: boolean): string {
  return ok ? pc.green("可用") : pc.red("不可用");
}

function modeBadge(mode: RuntimeMode | null): string {
  if (!mode) return pc.gray("未启动");
  return mode === "webai" ? pc.cyan("WebAI") : pc.yellow("Native API");
}

function printSection(title: string): void {
  console.log(pc.gray(LINE));
  console.log(pc.bold(title));
}

export function renderBanner(): void {
  console.log("");
  console.log(pc.bgCyan(pc.black(" Web Model API Gateway CLI ")));
  console.log(pc.gray("精简、清晰、可控"));
  console.log(pc.gray(LINE));
}

export function renderGuide(mode: RuntimeMode, state: RuntimeState): void {
  const base = `http://${state.host}:${state.port}`;

  printSection("服务信息");
  console.log(`基础地址  : ${pc.cyan(base)}`);
  console.log(`当前模式  : ${modeBadge(mode)}`);
  console.log(`当前Provider: ${pc.bold(state.activeProviderId)} (${statusBadge(state.activeProviderAvailable)})`);

  printSection(mode === "webai" ? "WebAI 端点" : "原生 API 端点");
  if (mode === "webai") {
    console.log(`- ${base}/docs`);
    console.log(`- ${base}/gemini`);
    console.log(`- ${base}/gemini-chat`);
    console.log(`- ${base}/translate`);
    console.log(`- ${base}/v1/chat/completions`);
    console.log(`- ${base}/v1/responses`);
  } else {
    console.log(`- ${base}/docs`);
    console.log(`- ${base}/v1/models`);
    console.log(`- ${base}/v1/models/{model}`);
    console.log(`- ${base}/v1/chat/completions`);
    console.log(`- ${base}/v1/responses`);
  }
  console.log(pc.gray(LINE));
}

export function renderMenuHeader(state: RuntimeState): void {
  printSection("当前状态");
  console.log(
    `模式=${modeBadge(state.currentMode)} | WebAI=${statusBadge(state.webaiAvailable)} | Native API=${statusBadge(state.nativeApiAvailable)} | Provider=${state.activeProviderId}`
  );
}

export function renderStatus(state: RuntimeState): void {
  printSection("运行状态");
  console.log(`模式        : ${modeBadge(state.currentMode)}`);
  console.log(`WebAI       : ${statusBadge(state.webaiAvailable)}`);
  console.log(`Native API  : ${statusBadge(state.nativeApiAvailable)}`);
  console.log(`Provider    : ${state.activeProviderId}`);
  console.log(`Provider状态: ${statusBadge(state.activeProviderAvailable)}`);
  console.log(`监听地址    : http://${state.host}:${state.port}`);
  console.log(pc.gray(LINE));
}

export function buildChoices(state: RuntimeState): CliChoice[] {
  const unavailable = pc.gray("(不可用)");
  return [
    {
      title: "查看 API 指南",
      description: "显示当前地址与可用端点",
      value: "guide"
    },
    {
      title: state.webaiAvailable ? "切换到 WebAI 模式" : `切换到 WebAI 模式 ${unavailable}`,
      description: "启用 WebAI 路由集",
      value: "switch-webai"
    },
    {
      title: state.nativeApiAvailable ? "切换到原生 API 模式" : `切换到原生 API 模式 ${unavailable}`,
      description: "启用 OpenAI 兼容路由集",
      value: "switch-native-api"
    },
    {
      title: "查看运行状态",
      description: "检查模式、Provider 与可用性",
      value: "status"
    },
    {
      title: "修改配置并立即应用",
      description: "打开配置向导并在运行中重载",
      value: "edit-config"
    },
    {
      title: "停止并退出",
      description: "安全关闭服务并退出 CLI",
      value: "exit"
    }
  ];
}

export function renderStopped(): void {
  console.log(pc.green("服务已停止，已退出。"));
}

export function getSelectPrompt(): string {
  return "请选择操作";
}
