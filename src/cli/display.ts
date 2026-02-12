/**
 * @file cli/display.ts
 * @description CLI display helpers: menu rendering, status and quick guides.
 */
import pc from "picocolors";
import { RuntimeMode, RuntimeState } from "../server/runtime";
import { CliChoice } from "./types";

const LINE = "------------------------------------------------------------";

function statusBadge(ok: boolean): string {
  return ok ? pc.green("available") : pc.red("unavailable");
}

function modeBadge(mode: RuntimeMode | null): string {
  if (!mode) return pc.gray("not-started");
  return mode === "webai" ? pc.cyan("WebAI") : pc.yellow("Native API");
}

function printSection(title: string): void {
  console.log(pc.gray(LINE));
  console.log(pc.bold(title));
}

export function renderBanner(): void {
  console.log("");
  console.log(pc.bgCyan(pc.black(" Web Model API Gateway CLI ")));
  console.log(pc.gray("Simple, clear, controllable"));
  console.log(pc.gray(LINE));
}

export function renderGuide(mode: RuntimeMode, state: RuntimeState): void {
  const base = `http://${state.host}:${state.port}`;

  printSection("Service Info");
  console.log(`Base URL        : ${pc.cyan(base)}`);
  console.log(`Current Mode    : ${modeBadge(mode)}`);
  console.log(`Current Model   : ${pc.bold(state.defaultModel)}`);
  console.log(`Current Provider: ${pc.bold(state.activeProviderId)} (${statusBadge(state.activeProviderAvailable)})`);

  printSection(mode === "webai" ? "WebAI Endpoints" : "Native API Endpoints");
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
  printSection("Current Status");
  console.log(
    `mode=${modeBadge(state.currentMode)} | model=${state.defaultModel} | webai=${statusBadge(state.webaiAvailable)} | native=${statusBadge(state.nativeApiAvailable)} | provider=${state.activeProviderId}`
  );
}

export function renderStatus(state: RuntimeState): void {
  printSection("Runtime Status");
  console.log(`Mode         : ${modeBadge(state.currentMode)}`);
  console.log(`WebAI        : ${statusBadge(state.webaiAvailable)}`);
  console.log(`Native API   : ${statusBadge(state.nativeApiAvailable)}`);
  console.log(`Model        : ${state.defaultModel}`);
  console.log(`Provider     : ${state.activeProviderId}`);
  console.log(`Provider Ok  : ${statusBadge(state.activeProviderAvailable)}`);
  console.log(`Listen       : http://${state.host}:${state.port}`);
  console.log(pc.gray(LINE));
}

export function buildChoices(state: RuntimeState): CliChoice[] {
  const unavailable = pc.gray("(unavailable)");
  return [
    {
      title: "Show API guide",
      description: "Display current base URL and endpoints",
      value: "guide"
    },
    {
      title: state.webaiAvailable ? "Switch to WebAI" : `Switch to WebAI ${unavailable}`,
      description: "Use WebAI routing",
      value: "switch-webai"
    },
    {
      title: state.nativeApiAvailable ? "Switch to Native API" : `Switch to Native API ${unavailable}`,
      description: "Use OpenAI-compatible routing",
      value: "switch-native-api"
    },
    {
      title: "Switch model (hot)",
      description: "Change default model without restart",
      value: "switch-model"
    },
    {
      title: "Show runtime status",
      description: "Inspect mode/provider/model availability",
      value: "status"
    },
    {
      title: "Edit config and apply now",
      description: "Open config wizard and hot-reload runtime",
      value: "edit-config"
    },
    {
      title: "Stop and exit",
      description: "Safely close server and exit CLI",
      value: "exit"
    }
  ];
}

export function renderStopped(): void {
  console.log(pc.green("Server stopped, CLI exited."));
}

export function getSelectPrompt(): string {
  return "Choose an action";
}
