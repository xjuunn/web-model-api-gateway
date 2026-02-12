import { z } from "zod";
import { AppError } from "./errors";

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown, message = "Invalid request"): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(`${message}: ${parsed.error.issues.map((i) => i.message).join("; ")}`, 400);
  }
  return parsed.data;
}
