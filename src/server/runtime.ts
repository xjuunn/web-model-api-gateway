/**
 * @file server/runtime.ts
 * @description 运行时控制器：负责 Provider 引导、模式启动、切换与关闭。
 */
import { createServer, Server } from "node:http";
import { env } from "../config/env";
import { logger } from "../core/logger";
import { createServerApp } from "./app";
import { getProviderStatus, initializeProviders } from "../integrations/providers/registry";
import { initSessionManagers } from "../modules/sessions/sessionManager";

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

export class RuntimeController {
  private webServer: Server | null = null;
  private readonly host = env.APP_HOST;
  private readonly port = env.APP_PORT;
  private webaiAvailable = false;
  private nativeApiAvailable = true;
  private currentMode: RuntimeMode | null = null;
  private activeProviderAvailable = false;

  /**
   * 返回当前运行时状态快照。
   */
  getState(): RuntimeState {
    return {
      webaiAvailable: this.webaiAvailable,
      nativeApiAvailable: this.nativeApiAvailable,
      currentMode: this.currentMode,
      host: this.host,
      port: this.port,
      activeProviderId: env.APP_ACTIVE_PROVIDER,
      activeProviderAvailable: this.activeProviderAvailable
    };
  }

  /**
   * 初始化 Provider 可用性并记录状态。
   */
  async bootstrap(): Promise<void> {
    logger.info("Checking runtime availability...");
    await initializeProviders();

    const providerStatus = getProviderStatus(env.APP_ACTIVE_PROVIDER);
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

    if (this.webaiAvailable) {
      initSessionManagers();
    }

    logger.info(`WebAI mode: ${this.webaiAvailable ? "available" : "unavailable"}`);
    logger.info(`Native API mode: ${this.nativeApiAvailable ? "available" : "unavailable"}`);
  }

  /**
   * 启动本地 HTTP 服务。
   */
  private async startServer(): Promise<void> {
    if (this.webServer) return;

    const app = createServerApp();
    this.webServer = createServer(app);
    await new Promise<void>((resolve, reject) => {
      const server = this.webServer!;

      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        if (error.code === "EADDRINUSE") {
          reject(
            new Error(
              `Port ${this.port} is already in use on ${this.host}. Stop the existing process or change APP_PORT in .env.`
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
      server.listen(this.port, this.host);
    });

    logger.info(`Server running on http://${this.host}:${this.port}`);
  }

  /**
   * 关闭本地 HTTP 服务。
   */
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

  /**
   * 切换运行模式。
   */
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

  /**
   * 根据默认配置启动模式。
   */
  async startDefaultMode(): Promise<RuntimeMode> {
    const preferred = env.APP_DEFAULT_MODE;

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

    throw new Error("No available mode to start. Check .env and provider initialization logs.");
  }

  /**
   * 关闭运行时资源。
   */
  async shutdown(): Promise<void> {
    await this.stopServer();
    this.currentMode = null;
  }
}
