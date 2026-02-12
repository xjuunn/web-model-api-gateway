/**
 * @file cli/display.ts
 * @description CLI 展示层：用于双语文案、菜单选项与状态渲染。
 */
import pc from "picocolors";
import { RuntimeMode, RuntimeState } from "../server/runtime";
import { CliAction, CliChoice } from "./types";

const text = {
  banner: { en: "Web Model API Gateway CLI", zh: "命令行" },
  bootstrapping: { en: "Bootstrapping runtime...", zh: "正在初始化运行时..." },
  selectAction: { en: "Select an action", zh: "请选择操作" },
  explanation: { en: "Explanation", zh: "说明" },
  baseApi: { en: "Base API", zh: "基础地址" },
  currentMode: { en: "Current mode", zh: "当前模式" },
  provider: { en: "Active provider", zh: "当前 Provider" },
  mode: { en: "Mode", zh: "模式" },
  available: { en: "available", zh: "可用" },
  unavailable: { en: "unavailable", zh: "不可用" },
  webaiEndpoints: { en: "WebAI endpoints", zh: "WebAI 端点" },
  nativeEndpoints: { en: "Native API endpoints", zh: "原生 API 端点" },
  stopped: { en: "Runtime stopped.", zh: "运行时已停止。" }
} as const;

const actionText: Record<
  Exclude<CliAction, "exit">,
  { title: { en: string; zh: string }; description: { en: string; zh: string }; explanation: { en: string; zh: string } }
> = {
  guide: {
    title: { en: "Show API guide", zh: "显示 API 指南" },
    description: { en: "List endpoints and active base URL.", zh: "查看端点和当前地址" },
    explanation: { en: "Show API endpoints and current base URL.", zh: "显示 API 端点和当前地址" }
  },
  "switch-webai": {
    title: { en: "Switch to WebAI", zh: "切换到 WebAI" },
    description: { en: "Use web-model gateway endpoints.", zh: "使用网页模型代理端点" },
    explanation: { en: "Switch runtime to WebAI mode.", zh: "切换到 WebAI 模式" }
  },
  "switch-native-api": {
    title: { en: "Switch to Native API", zh: "切换到原生 API" },
    description: { en: "Use OpenAI-compatible native API endpoints.", zh: "使用 OpenAI 兼容原生接口" },
    explanation: { en: "Switch runtime to Native API mode.", zh: "切换到原生 API 模式" }
  },
  status: {
    title: { en: "Show runtime status", zh: "显示运行状态" },
    description: { en: "Check mode, provider and availability.", zh: "查看模式和可用性" },
    explanation: { en: "Display runtime and provider status.", zh: "显示运行时和 Provider 状态" }
  }
};

/**
 * 生成英文主文案并附加灰色中文括注。
 */
export function bi(en: string, zh: string): string {
  return `${en}${pc.gray(`(${zh})`)}`;
}

/**
 * 渲染 CLI 启动横幅。
 */
export function renderBanner(): void {
  console.log(pc.bgCyan(pc.black(` ${bi(text.banner.en, text.banner.zh)} `)));
  console.log(pc.gray(bi(text.bootstrapping.en, text.bootstrapping.zh)));
}

/**
 * 渲染模式指南和端点列表。
 */
export function renderGuide(mode: RuntimeMode, state: RuntimeState): void {
  const base = `http://${state.host}:${state.port}`;
  console.log("");
  console.log(pc.bold(pc.cyan(`${bi(text.baseApi.en, text.baseApi.zh)}: ${base}`)));
  console.log(pc.bold(`${bi(text.currentMode.en, text.currentMode.zh)}: ${mode}`));
  console.log(pc.bold(`${bi(text.provider.en, text.provider.zh)}: ${state.activeProviderId}`));

  if (mode === "webai") {
    console.log(pc.green(`${bi(text.webaiEndpoints.en, text.webaiEndpoints.zh)}:`));
    console.log(`- ${base}/docs`);
    console.log(`- ${base}/gemini`);
    console.log(`- ${base}/gemini-chat`);
    console.log(`- ${base}/translate`);
    console.log(`- ${base}/v1/chat/completions`);
    console.log(`- ${base}/v1/responses`);
  } else {
    console.log(pc.green(`${bi(text.nativeEndpoints.en, text.nativeEndpoints.zh)}:`));
    console.log(`- ${base}/docs`);
    console.log(`- ${base}/v1/models`);
    console.log(`- ${base}/v1/models/{model}`);
    console.log(`- ${base}/v1/chat/completions`);
    console.log(`- ${base}/v1/responses`);
  }

  console.log("");
}

/**
 * 渲染动作解释文案。
 */
export function renderActionExplanation(action: Exclude<CliAction, "exit">): void {
  const info = actionText[action];
  console.log(pc.gray(`${bi(text.explanation.en, text.explanation.zh)}: ${bi(info.explanation.en, info.explanation.zh)}`));
}

/**
 * 渲染状态行。
 */
export function renderStatus(state: RuntimeState): void {
  console.log(
    pc.yellow(
      `${bi(text.mode.en, text.mode.zh)}=${state.currentMode ?? "none"}, webai=${state.webaiAvailable}, nativeApi=${state.nativeApiAvailable}, ${bi(text.provider.en, text.provider.zh)}=${state.activeProviderId} (${state.activeProviderAvailable ? bi(text.available.en, text.available.zh) : bi(text.unavailable.en, text.unavailable.zh)})`
    )
  );
}

/**
 * 根据当前状态构建菜单项。
 */
export function buildChoices(state: RuntimeState): CliChoice[] {
  const unavailable = pc.gray(bi(text.unavailable.en, text.unavailable.zh));
  return [
    {
      title: bi(actionText.guide.title.en, actionText.guide.title.zh),
      description: bi(actionText.guide.description.en, actionText.guide.description.zh),
      value: "guide"
    },
    {
      title: state.webaiAvailable
        ? bi(actionText["switch-webai"].title.en, actionText["switch-webai"].title.zh)
        : `${bi(actionText["switch-webai"].title.en, actionText["switch-webai"].title.zh)} ${unavailable}`,
      description: bi(actionText["switch-webai"].description.en, actionText["switch-webai"].description.zh),
      value: "switch-webai"
    },
    {
      title: state.nativeApiAvailable
        ? bi(actionText["switch-native-api"].title.en, actionText["switch-native-api"].title.zh)
        : `${bi(actionText["switch-native-api"].title.en, actionText["switch-native-api"].title.zh)} ${unavailable}`,
      description: bi(actionText["switch-native-api"].description.en, actionText["switch-native-api"].description.zh),
      value: "switch-native-api"
    },
    {
      title: bi(actionText.status.title.en, actionText.status.title.zh),
      description: bi(actionText.status.description.en, actionText.status.description.zh),
      value: "status"
    },
    {
      title: bi("Stop and exit", "停止并退出"),
      description: bi("Shutdown runtime and quit CLI.", "关闭服务并退出"),
      value: "exit"
    }
  ];
}

/**
 * 输出运行结束文案。
 */
export function renderStopped(): void {
  console.log(pc.green(bi(text.stopped.en, text.stopped.zh)));
}

/**
 * 返回选择动作的提示语。
 */
export function getSelectPrompt(): string {
  return bi(text.selectAction.en, text.selectAction.zh);
}
