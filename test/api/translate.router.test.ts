import { describe, expect, it } from "vitest";
import { createApiTestHarness } from "../support/app.harness";

describe("translate route", () => {
  it("POST /translate reuses session for same model and recreates for model change", async () => {
    const { http, provider } = createApiTestHarness();

    const r1 = await http.post("/translate").send({
      model: "gemini-2.5-pro",
      message: "first"
    });
    const r2 = await http.post("/translate").send({
      model: "gemini-2.5-pro",
      message: "second"
    });
    const r3 = await http.post("/translate").send({
      model: "gemini-2.5-flash",
      message: "third"
    });

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r3.status).toBe(200);
    expect(provider.chatStartCalls.map((item) => item.model)).toEqual(["gemini-2.5-pro", "gemini-2.5-flash"]);
    expect(provider.chatMessages).toHaveLength(3);
  });
});
