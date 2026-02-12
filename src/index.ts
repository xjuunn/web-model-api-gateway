/**
 * @file index.ts
 * @description 应用程序入口点：初始化配置并启动运行时 CLI。
 */
import { env } from "./config/env";
import { setLogLevel, logger } from "./core/logger";
import { RuntimeController } from "./server/runtime";
import { runCli } from "./cli/runCli";

setLogLevel(env.LOG_LEVEL);

async function main() {
  const controller = new RuntimeController();

  const cleanup = async () => {
    await controller.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  await runCli(controller);
}

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
