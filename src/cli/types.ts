/**
 * @file cli/types.ts
 * @description CLI 共享类型：用于动作分发与菜单组装。
 */
import { RuntimeMode, RuntimeState } from "../server/runtime";

export type CliAction =
  | "guide"
  | "switch-webai"
  | "switch-native-api"
  | "status"
  | "edit-config"
  | "exit";

export interface CliChoice {
  title: string;
  description: string;
  value: CliAction;
}

export interface CliContext {
  mode: RuntimeMode;
  state: RuntimeState;
}
