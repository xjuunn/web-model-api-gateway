/**
 * @file cli/actions.ts
 * @description CLI 动作执行层：将菜单动作映射到运行时操作。
 */
import pc from "picocolors";
import { RuntimeController, RuntimeMode, RuntimeState } from "../server/runtime";
import { CliAction } from "./types";
import { renderGuide, renderStatus } from "./display";
import { ensureConfigWithCli } from "./configWizard";

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

  if (action === "edit-config") {
    await handleEditConfig(controller);
    return true;
  }

  if (action === "switch-webai") {
    return await handleSwitch("webai", state, controller);
  }

  return await handleSwitch("native-api", state, controller);
}

async function handleSwitch(
  targetMode: RuntimeMode,
  state: RuntimeState,
  controller: RuntimeController
): Promise<boolean> {
  if (targetMode === "webai" && !state.webaiAvailable) {
    console.log(pc.red("无法切换：WebAI 模式当前不可用。"));
    return true;
  }
  if (targetMode === "native-api" && !state.nativeApiAvailable) {
    console.log(pc.red("无法切换：原生 API 模式当前不可用。"));
    return true;
  }
  if (state.currentMode === targetMode) {
    console.log(pc.gray(targetMode === "webai" ? "当前已经是 WebAI 模式。" : "当前已经是原生 API 模式。"));
    return true;
  }

  console.log(pc.gray(targetMode === "webai" ? "正在切换到 WebAI 模式..." : "正在切换到原生 API 模式..."));
  await controller.switchMode(targetMode);

  const updated = controller.getState();
  renderGuide(targetMode, updated);
  return true;
}

async function handleEditConfig(controller: RuntimeController): Promise<void> {
  try {
    const saved = await ensureConfigWithCli({ force: true });
    if (!saved) {
      console.log(pc.gray("配置未变更，继续使用当前运行配置。"));
      return;
    }

    console.log(pc.gray("正在应用新配置并重载运行时..."));
    await controller.reloadConfiguration();
    console.log(pc.green("配置已应用，运行时重载完成。"));

    const state = controller.getState();
    if (state.currentMode) {
      renderGuide(state.currentMode, state);
    } else {
      renderStatus(state);
    }
  } catch (error) {
    console.log(pc.red(`配置应用失败：${String(error)}`));
  }
}
