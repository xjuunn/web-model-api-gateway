/**
 * @file cli/runCli.ts
 * @description CLI 工作流编排器：串联展示、输入与动作执行。
 */
import prompts from "prompts";
import { RuntimeController } from "../server/runtime";
import { executeAction } from "./actions";
import { buildChoices, getSelectPrompt, renderActionExplanation, renderBanner, renderGuide, renderStopped } from "./display";
import { CliAction } from "./types";

/**
 * 运行 CLI 主循环并驱动运行时操作。
 */
export async function runCli(controller: RuntimeController): Promise<void> {
  renderBanner();

  await controller.bootstrap();
  const initialMode = await controller.startDefaultMode();
  renderGuide(initialMode, controller.getState());

  let shouldContinue = true;
  while (shouldContinue) {
    const state = controller.getState();
    const response = await prompts({
      type: "select",
      name: "action",
      message: getSelectPrompt(),
      choices: buildChoices(state)
    });

    const action = response.action as CliAction | undefined;
    if (action && action !== "exit") {
      renderActionExplanation(action);
    }

    shouldContinue = await executeAction(action, state, controller);
  }

  await controller.shutdown();
  renderStopped();
}
