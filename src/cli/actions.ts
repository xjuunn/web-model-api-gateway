/**
 * @file cli/actions.ts
 * @description CLI 动作执行层：将菜单动作映射到运行时操作。
 */
import pc from "picocolors";
import { RuntimeController, RuntimeMode, RuntimeState } from "../server/runtime";
import { CliAction } from "./types";
import { bi, renderGuide, renderStatus } from "./display";

/**
 * 执行单个 CLI 动作并返回是否继续循环。
 */
export async function executeAction(
  action: CliAction | undefined,
  state: RuntimeState,
  controller: RuntimeController
): Promise<boolean> {
  if (!action || action === "exit") return false;

  if (action === "guide") {
    if (state.currentMode) renderGuide(state.currentMode, state);
    return true;
  }

  if (action === "status") {
    renderStatus(state);
    return true;
  }

  if (action === "switch-webai") {
    return await handleSwitch("webai", state, controller);
  }

  return await handleSwitch("native-api", state, controller);
}

/**
 * 执行模式切换并输出切换结果。
 */
async function handleSwitch(
  targetMode: RuntimeMode,
  state: RuntimeState,
  controller: RuntimeController
): Promise<boolean> {
  if (targetMode === "webai" && !state.webaiAvailable) {
    console.log(pc.red(bi("WebAI mode is unavailable.", "WebAI 模式不可用。")));
    return true;
  }
  if (targetMode === "native-api" && !state.nativeApiAvailable) {
    console.log(pc.red(bi("Native API mode is unavailable.", "原生 API 模式不可用。")));
    return true;
  }
  if (state.currentMode === targetMode) {
    const text =
      targetMode === "webai"
        ? bi("Already in WebAI mode.", "当前已是 WebAI 模式。")
        : bi("Already in Native API mode.", "当前已是原生 API 模式。");
    console.log(pc.gray(text));
    return true;
  }

  const switching =
    targetMode === "webai"
      ? bi("Switching to WebAI...", "正在切换到 WebAI...")
      : bi("Switching to Native API...", "正在切换到原生 API...");
  console.log(pc.gray(switching));

  await controller.switchMode(targetMode);
  const updated = controller.getState();
  renderGuide(targetMode, updated);
  return true;
}
