/**
 * @file cli/actions.ts
 * @description CLI action dispatcher and runtime operations.
 */
import prompts from "prompts";
import pc from "picocolors";
import { listSupportedModelIds } from "../gateway/models/registry";
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

  if (action === "switch-model") {
    await handleSwitchModel(controller);
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
    console.log(pc.red("Cannot switch: WebAI mode is unavailable."));
    return true;
  }
  if (targetMode === "native-api" && !state.nativeApiAvailable) {
    console.log(pc.red("Cannot switch: Native API mode is unavailable."));
    return true;
  }
  if (state.currentMode === targetMode) {
    console.log(pc.gray(targetMode === "webai" ? "Already in WebAI mode." : "Already in Native API mode."));
    return true;
  }

  console.log(pc.gray(targetMode === "webai" ? "Switching to WebAI mode..." : "Switching to Native API mode..."));
  await controller.switchMode(targetMode);

  const updated = controller.getState();
  renderGuide(targetMode, updated);
  return true;
}

async function handleSwitchModel(controller: RuntimeController): Promise<void> {
  const modelIds = listSupportedModelIds();
  if (modelIds.length === 0) {
    console.log(pc.red("No registered models found."));
    return;
  }

  const current = controller.getState().defaultModel;
  const response = await prompts({
    type: "select",
    name: "model",
    message: "Select default model",
    hint: "Use arrow keys, press Enter to confirm",
    choices: modelIds.map((id) => ({
      title: id === current ? `${id} (current)` : id,
      value: id
    }))
  });

  const selected = response.model as string | undefined;
  if (!selected) {
    console.log(pc.gray("Model switch canceled."));
    return;
  }

  if (selected === current) {
    console.log(pc.gray(`Model unchanged: ${selected}`));
    return;
  }

  try {
    controller.setDefaultModel(selected);
    console.log(pc.green(`Default model switched to: ${selected}`));
  } catch (error) {
    console.log(pc.red(`Model switch failed: ${String(error)}`));
  }
}

async function handleEditConfig(controller: RuntimeController): Promise<void> {
  try {
    const saved = await ensureConfigWithCli({ force: true });
    if (!saved) {
      console.log(pc.gray("Config unchanged. Keep current runtime configuration."));
      return;
    }

    console.log(pc.gray("Applying new config and reloading runtime..."));
    await controller.reloadConfiguration();
    console.log(pc.green("Config applied. Runtime reload complete."));

    const state = controller.getState();
    if (state.currentMode) {
      renderGuide(state.currentMode, state);
    } else {
      renderStatus(state);
    }
  } catch (error) {
    console.log(pc.red(`Config apply failed: ${String(error)}`));
  }
}
