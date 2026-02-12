/**
 * @file integrations/gemini/parsing.ts
 * @description Gemini 响应解析工具：用于提取嵌套载荷。
 */
export function extractJsonFromResponse(text: string): unknown[] {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // 忽略
    }
  }
  throw new Error("Could not parse Gemini response payload");
}

export function getNestedValue(data: unknown, path: number[], fallback: unknown = null): unknown {
  let cursor: unknown = data;
  for (const index of path) {
    if (!Array.isArray(cursor) || index < 0 || index >= cursor.length) {
      return fallback;
    }
    cursor = cursor[index];
  }
  return cursor ?? fallback;
}
