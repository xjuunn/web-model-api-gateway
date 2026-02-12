/**
 * @file core/errors.ts
 * @description 跨应用层使用的核心错误模型定义。
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly expose: boolean;

  constructor(message: string, statusCode = 500, expose = true) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.expose = expose;
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError;
