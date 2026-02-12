/**
 * @file core/http.ts
 * @description 核心 HTTP 工具：用于校验、异步处理器与错误中间件。
 */
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError, isAppError } from "./errors";
import { logger } from "./logger";

export const asyncHandler =
  <TReq extends Request = Request>(fn: (req: TReq, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req as TReq, res).catch(next);
  };

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, message = "Invalid request"): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(`${message}: ${parsed.error.issues.map((i) => i.message).join("; ")}`, 400);
  }
  return parsed.data;
}

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (isAppError(error)) {
    res.status(error.statusCode).json({ detail: error.message });
    return;
  }

  logger.error("Unhandled server error", error);
  res.status(500).json({ detail: "Internal server error" });
};
