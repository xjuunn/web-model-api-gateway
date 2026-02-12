/**
 * @file server/runtime.ts
 * @description 运行时控制器：负责 Provider 引导、模式启动、切换、配置重载与关闭。
 */
import { createServer, Server } from "node:http";
import { CONFIG_FILE_PATH, env, reloadEnvFromDisk } from "../config/env";
import { logger } from "../core/logger";
import { createServerApp } from "./app";
import { getProviderStatus, initializeProviders, ProviderStatus } from "../integrations/providers/registry";
import { ApiContext, createApiContext } from "./context";
import { createSessionManagers } from "../modules/sessions/sessionManager";

export type RuntimeMode = "webai" | "native-api";

export interface RuntimeState {
  webaiAvailable: boolean;
  nativeApiAvailable: boolean;
  currentMode: RuntimeMode | null;
  host: string;
  port: number;
  activeProviderId: string;
  activeProviderAvailable: boolean;
}

export interface RuntimeConfig {
  host: string;
  port: number;
  defaultMode: RuntimeMode | "auto";
  activeProviderId: string;
}

export interface RuntimeDependencies {
  config: RuntimeConfig;
  context: ApiContext;
  initializeProviders: () => Promise<ProviderStatus[]>;
  getProviderStatus: (id: string) => ProviderStatus | null;
  createApp: (context: ApiContext) => ReturnType<typeof createServerApp>;
}

export function createDefaultRuntimeDependencies(): RuntimeDependencies {
  return {
    config: {
      host: env.APP_HOST,
      port: env.APP_PORT,
      defaultMode: env.APP_DEFAULT_MODE,
      activeProviderId: env.APP_ACTIVE_PROVIDER
    },
    context: createApiContext(),
    initializeProviders,
    getProviderStatus,
    createApp: createServerApp
  };
}

export class RuntimeController {
  private webServer: Server | null = null;
  private readonly deps: RuntimeDependencies;
  private webaiAvailable = false;
  private nativeApiAvailable = true;
  private currentMode: RuntimeMode | null = null;
  private activeProviderAvailable = false;

  constructor(deps: RuntimeDependencies = createDefaultRuntimeDependencies()) {
    this.deps = deps;
  }

  getState(): RuntimeState {
    return {
      webaiAvailable: this.webaiAvailable,
      nativeApiAvailable: this.nativeApiAvailable,
      currentMode: this.currentMode,
      host: this.deps.config.host,
      port: this.deps.config.port,
      activeProviderId: this.deps.config.activeProviderId,
      activeProviderAvailable: this.activeProviderAvailable
    };
  }

  async bootstrap(): Promise<void> {
    logger.info("Checking runtime availability...");
    await this.deps.initializeProviders();

    const providerStatus = this.deps.getProviderStatus(this.deps.config.activeProviderId);
    this.activeProviderAvailable = providerStatus?.available === true;
    this.webaiAvailable = this.activeProviderAvailable;

    if (providerStatus) {
      logger.info(
        `Active provider: ${providerStatus.label} (${providerStatus.id}) -> ${providerStatus.available ? "available" : "unavailable"}`
      );
      if (!providerStatus.available && providerStatus.error) {
        logger.warn(`Provider reason: ${providerStatus.error}`);
      }
    }

    logger.info(`WebAI mode: ${this.webaiAvailable ? "available" : "unavailable"}`);
    logger.info(`Native API mode: ${this.nativeApiAvailable ? "available" : "unavailable"}`);
  }

  private async startServer(): Promise<void> {
    if (this.webServer) return;

    const app = this.deps.createApp(this.deps.context);
    this.webServer = createServer(app);
    await new Promise<void>((resolve, reject) => {
      const server = this.webServer!;

      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        if (error.code === "EADDRINUSE") {
          reject(
            new Error(
              `Port ${this.deps.config.port} is already in use on ${this.deps.config.host}. Stop the existing process or change APP_PORT in ${CONFIG_FILE_PATH}.`
            )
          );
          return;
        }
        reject(error);
      };

      const onListening = () => {
        server.off("error", onError);
        resolve();
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(this.deps.config.port, this.deps.config.host);
    });

    logger.info(`Server running on http://${this.deps.config.host}:${this.deps.config.port}`);
  }

  private async stopServer(): Promise<void> {
    if (!this.webServer) return;
    await new Promise<void>((resolve, reject) => {
      this.webServer!.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
    this.webServer = null;
  }

  async switchMode(mode: RuntimeMode): Promise<void> {
    if (this.currentMode === mode) return;

    if (mode === "webai" && !this.webaiAvailable) {
      throw new Error("WebAI mode is unavailable.");
    }
    if (mode === "native-api" && !this.nativeApiAvailable) {
      throw new Error("Native API mode is unavailable.");
    }

    await this.startServer();
    this.currentMode = mode;
    logger.info(`Switched mode to ${mode}`);
  }

  async startDefaultMode(): Promise<RuntimeMode> {
    const preferred = this.deps.config.defaultMode;

    if (preferred === "webai" && this.webaiAvailable) {
      await this.switchMode("webai");
      return "webai";
    }
    if (preferred === "native-api") {
      await this.switchMode("native-api");
      return "native-api";
    }

    if (this.webaiAvailable) {
      await this.switchMode("webai");
      return "webai";
    }
    if (this.nativeApiAvailable) {
      await this.switchMode("native-api");
      return "native-api";
    }

    throw new Error(`No available mode to start. Check ${CONFIG_FILE_PATH} and provider initialization logs.`);
  }

  /**
   * 运行中重载配置并应用：
   * 1) 重新读取磁盘配置
   * 2) 重建上下文中的可变字段
   * 3) 重新探测 Provider 可用性
   * 4) 若服务正在运行，按原模式恢复；不可用时回退默认模式
   */
  async reloadConfiguration(): Promise<void> {
    const wasRunning = this.webServer !== null;
    const previousMode = this.currentMode;

    if (wasRunning) {
      await this.stopServer();
    }
    this.currentMode = null;

    reloadEnvFromDisk();
    this.deps.config.host = env.APP_HOST;
    this.deps.config.port = env.APP_PORT;
    this.deps.config.defaultMode = env.APP_DEFAULT_MODE;
    this.deps.config.activeProviderId = env.APP_ACTIVE_PROVIDER;

    this.deps.context.defaultModel = env.GEMINI_DEFAULT_MODEL;
    this.deps.context.activeProviderId = env.APP_ACTIVE_PROVIDER;
    this.deps.context.sessions = createSessionManagers(this.deps.context.getProvider);

    await this.bootstrap();

    if (!wasRunning) return;

    if (previousMode) {
      if (previousMode === "webai" && this.webaiAvailable) {
        await this.switchMode("webai");
        return;
      }
      if (previousMode === "native-api" && this.nativeApiAvailable) {
        await this.switchMode("native-api");
        return;
      }
    }

    await this.startDefaultMode();
  }

  async shutdown(): Promise<void> {
    await this.stopServer();
    this.currentMode = null;
  }
}
