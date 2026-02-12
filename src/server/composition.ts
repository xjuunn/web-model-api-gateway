/**
 * @file server/composition.ts
 * @description 组合根：负责在入口处装配运行时依赖并返回控制器实例。
 */
import { RuntimeController, createDefaultRuntimeDependencies } from "./runtime";

export function createRuntimeController(): RuntimeController {
  return new RuntimeController(createDefaultRuntimeDependencies());
}
