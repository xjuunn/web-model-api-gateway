/**
 * @file integrations/providers/registry.ts
 * @description Provider 注册表：用于生命周期管理与当前 Provider 查询。
 */
import { CONFIG_FILE_PATH, env } from "../../config/env";
import { AppError } from "../../core/errors";
import { logger } from "../../core/logger";
import { GeminiWebProvider } from "./geminiProvider";
import { WebModelProvider } from "./types";

export interface ProviderStatus {
  id: string;
  label: string;
  enabled: boolean;
  available: boolean;
  error: string | null;
}

const providers = new Map<string, WebModelProvider>();
const availability = new Map<string, boolean>();

function registerProvider(provider: WebModelProvider): void {
  providers.set(provider.id, provider);
}

registerProvider(new GeminiWebProvider());

export async function initializeProviders(): Promise<ProviderStatus[]> {
  const statuses: ProviderStatus[] = [];

  for (const provider of providers.values()) {
    const enabled = provider.isEnabled();
    if (!enabled) {
      availability.set(provider.id, false);
      statuses.push({
        id: provider.id,
        label: provider.label,
        enabled,
        available: false,
        error: `Disabled via config: ${CONFIG_FILE_PATH}`
      });
      continue;
    }

    const available = await provider.initialize();
    availability.set(provider.id, available);
    statuses.push({
      id: provider.id,
      label: provider.label,
      enabled,
      available,
      error: provider.getLastError()
    });
  }

  return statuses;
}

export function getProviderStatus(id: string): ProviderStatus | null {
  const provider = providers.get(id);
  if (!provider) return null;

  return {
    id: provider.id,
    label: provider.label,
    enabled: provider.isEnabled(),
    available: availability.get(id) === true,
    error: provider.getLastError()
  };
}

export function getPrimaryProviderOrThrow(): WebModelProvider {
  const provider = providers.get(env.APP_ACTIVE_PROVIDER);
  if (!provider) {
    throw new AppError(
      `Active provider '${env.APP_ACTIVE_PROVIDER}' is not registered. Update APP_ACTIVE_PROVIDER in ${CONFIG_FILE_PATH}.`,
      503
    );
  }

  if (availability.get(provider.id) !== true) {
    const reason = provider.getLastError() || "Provider is unavailable.";
    throw new AppError(
      `Active provider '${provider.label}' is unavailable. ${reason}`,
      503
    );
  }

  return provider;
}

export function listRegisteredProviders(): Array<{ id: string; label: string }> {
  return [...providers.values()].map((p) => ({ id: p.id, label: p.label }));
}

export function logProviderMatrix(): void {
  for (const provider of providers.values()) {
    const available = availability.get(provider.id) === true;
    logger.info(
      `Provider ${provider.id} (${provider.label}): ${available ? "available" : "unavailable"}`
    );
  }
}
