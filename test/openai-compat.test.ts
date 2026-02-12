import { describe, expect, it, vi } from "vitest";
import { chunkText, contentToText, finishSse, initSse, toPromptLine, writeSseEvent } from "../src/modules/openai/compat";

describe("openai compat helpers", () => {
  it("contentToText handles string, array and empty content", () => {
    expect(contentToText("plain text")).toBe("plain text");
    expect(
      contentToText([
        { type: "text", text: "line1" },
        { type: "text", text: "line2" },
        {}
      ])
    ).toBe("line1\nline2");
    expect(contentToText(undefined)).toBe("");
  });

  it("chunkText splits by size", () => {
    expect(chunkText("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
    expect(chunkText("", 4)).toEqual([]);
  });

  it("toPromptLine maps roles", () => {
    expect(toPromptLine("system", "s")).toBe("System: s");
    expect(toPromptLine("developer", "d")).toBe("Developer: d");
    expect(toPromptLine("assistant", "a")).toBe("Assistant: a");
    expect(toPromptLine("tool", "t")).toBe("Tool: t");
    expect(toPromptLine("user", "u")).toBe("User: u");
    expect(toPromptLine("unknown", "x")).toBe("User: x");
  });

  it("SSE helpers write expected payload", () => {
    const setHeader = vi.fn();
    const write = vi.fn();
    const end = vi.fn();
    const res = { setHeader, write, end } as unknown as Parameters<typeof initSse>[0];

    initSse(res);
    writeSseEvent(res, { hello: "world" }, "demo");
    finishSse(res);

    expect(setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream; charset=utf-8");
    expect(write).toHaveBeenCalledWith(expect.stringContaining("event: demo"));
    expect(write).toHaveBeenCalledWith(expect.stringContaining("data: {\"hello\":\"world\"}"));
    expect(write).toHaveBeenCalledWith("data: [DONE]\n\n");
    expect(end).toHaveBeenCalled();
  });
});
