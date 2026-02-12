/**
 * @file core/logger.ts
 * @description 支持分级输出的核心日志工具。
 */
/* eslint-disable no-console */
export type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

let current: LogLevel = "info";

export const setLogLevel = (level: LogLevel): void => {
  current = level;
};

const canLog = (level: LogLevel): boolean => levels[level] >= levels[current];

const fmt = (level: LogLevel, msg: string): string => {
  return `${new Date().toISOString()} [${level.toUpperCase()}] ${msg}`;
};

export const logger = {
  debug: (msg: string) => {
    if (canLog("debug")) console.debug(fmt("debug", msg));
  },
  info: (msg: string) => {
    if (canLog("info")) console.log(fmt("info", msg));
  },
  warn: (msg: string) => {
    if (canLog("warn")) console.warn(fmt("warn", msg));
  },
  error: (msg: string, err?: unknown) => {
    if (canLog("error")) console.error(fmt("error", msg));
    if (err) console.error(err);
  }
};
