/**
 * @file cli/display.ts
 * @description CLI 展示层：用于双语文案、菜单选项与状态渲染。
 */
import pc from "picocolors";
import { RuntimeMode, RuntimeState } from "../server/runtime";
import { CliAction, CliChoice } from "./types";

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
  console.log(pc.bgCyan(pc.black(` ${bi("Web Model API Gateway CLI", "命令行")} `)));
  console.log(pc.gray(bi("Bootstrapping runtime...", "正在初始化运行时...")));
}

/**
 * 渲染模式指南和端点列表。
 */
export function renderGuide(mode: RuntimeMode, state: RuntimeState): void {
  const base = `http://${state.host}:${state.port}`;
  console.log("");
  console.log(pc.bold(pc.cyan(`${bi("Base API", "基础地址")}: ${base}`)));
  console.log(pc.bold(`${bi("Current mode", "当前模式")}: ${mode}`));
  console.log(pc.bold(`${bi("Active provider", "当前 Provider")}: ${state.activeProviderId}`));

  if (mode === "webai") {
    console.log(pc.green(`${bi("WebAI endpoints", "WebAI 端点")}:`));
    console.log(`- ${base}/docs`);
    console.log(`- ${base}/gemini`);
    console.log(`- ${base}/gemini-chat`);
    console.log(`- ${base}/translate`);
    console.log(`- ${base}/v1/chat/completions`);
    console.log(`- ${base}/v1/responses`);
  } else {
    console.log(pc.green(`${bi("Native API endpoints", "原生 API 端点")}:`));
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
  let explanation: string;
  switch (action) {
    case "guide":
      explanation = bi("Show API endpoints and current base URL.", "显示 API 端点和当前地址");
      break;
    case "switch-webai":
      explanation = bi("Switch runtime to WebAI mode.", "切换到 WebAI 模式");
      break;
    case "switch-native-api":
      explanation = bi("Switch runtime to Native API mode.", "切换到原生 API 模式");
      break;
    case "status":
      explanation = bi("Display runtime and provider status.", "显示运行时和 Provider 状态");
      break;
  }
  console.log(pc.gray(`${bi("Explanation", "说明")}: ${explanation}`));
}

/**
 * 渲染状态行。
 */
export function renderStatus(state: RuntimeState): void {
  console.log(
    pc.yellow(
      `${bi("Mode", "模式")}=${state.currentMode ?? "none"}, webai=${state.webaiAvailable}, nativeApi=${state.nativeApiAvailable}, ${bi("Active provider", "当前 Provider")}=${state.activeProviderId} (${state.activeProviderAvailable ? bi("available", "可用") : bi("unavailable", "不可用")})`
    )
  );
}

/**
 * 根据当前状态构建菜单项。
 */
export function buildChoices(state: RuntimeState): CliChoice[] {
  const unavailable = pc.gray(bi("unavailable", "不可用"));
  return [
    {
      title: bi("Show API guide", "显示 API 指南"),
      description: bi("List endpoints and active base URL.", "查看端点和当前地址"),
      value: "guide"
    },
    {
      title: state.webaiAvailable
        ? bi("Switch to WebAI", "切换到 WebAI")
        : `${bi("Switch to WebAI", "切换到 WebAI")} ${unavailable}`,
      description: bi("Use web-model gateway endpoints.", "使用网页模型代理端点"),
      value: "switch-webai"
    },
    {
      title: state.nativeApiAvailable
        ? bi("Switch to Native API", "切换到原生 API")
        : `${bi("Switch to Native API", "切换到原生 API")} ${unavailable}`,
      description: bi("Use OpenAI-compatible native API endpoints.", "使用 OpenAI 兼容原生接口"),
      value: "switch-native-api"
    },
    {
      title: bi("Show runtime status", "显示运行状态"),
      description: bi("Check mode, provider and availability.", "查看模式和可用性"),
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
  console.log(pc.green(bi("Runtime stopped.", "运行时已停止。")));
}

/**
 * 返回选择动作的提示语。
 */
export function getSelectPrompt(): string {
  return bi("Select an action", "请选择操作");
}
