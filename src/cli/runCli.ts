/**
 * @file cli/runCli.ts
 * @description CLI 主循环：渲染菜单并驱动运行时操作。
 */
import prompts from "prompts";
import { RuntimeController } from "../server/runtime";
import { executeAction } from "./actions";
import { buildChoices, getSelectPrompt, renderBanner, renderGuide, renderMenuHeader, renderStopped } from "./display";
import { CliAction } from "./types";

export async function runCli(controller: RuntimeController): Promise<void> {
  renderBanner();

  await controller.bootstrap();
  const initialMode = await controller.startDefaultMode();
  renderGuide(initialMode, controller.getState());

  let shouldContinue = true;
  while (shouldContinue) {
    const state = controller.getState();
    renderMenuHeader(state);

    const response = await prompts({
      type: "select",
      name: "action",
      message: getSelectPrompt(),
      hint: "使用上下方向键选择，按 Enter 确认",
      choices: buildChoices(state)
    });

    const action = response.action as CliAction | undefined;
    shouldContinue = await executeAction(action, state, controller);
  }

  await controller.shutdown();
  renderStopped();
}
