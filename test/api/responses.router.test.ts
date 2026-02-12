import { describe, expect, it } from "vitest";
import { createApiTestHarness } from "../support/app.harness";

describe("responses router", () => {
  it("POST /v1/responses prefers messages over input", async () => {
    const { http, provider } = createApiTestHarness();
    provider.nextGenerateText = "responses answer";

    const response = await http.post("/v1/responses").send({
      model: "gemini-2.5-flash",
      input: "ignored when messages exists",
      messages: [{ role: "user", content: "message text wins" }]
    });

    expect(response.status).toBe(200);
    expect(response.body.object).toBe("response");
    expect(response.body.status).toBe("completed");
    expect(response.body.output_text).toBe("responses answer");
    expect(provider.generateCalls[0]?.prompt).toBe("User: message text wins");
  });

  it("POST /v1/responses stream=true returns SSE lifecycle events", async () => {
    const { http, provider } = createApiTestHarness();
    provider.nextGenerateText = "streamed response payload";

    const response = await http.post("/v1/responses").send({
      model: "gemini-2.5-flash",
      stream: true,
      input: "hello"
    });

    expect(response.status).toBe(200);
    expect(response.header["content-type"]).toMatch(/text\/event-stream/);
    expect(response.text).toMatch(/event: response.created/);
    expect(response.text).toMatch(/"type":"response.created"/);
    expect(response.text).toMatch(/event: response.output_text.delta/);
    expect(response.text).toMatch(/event: response.completed/);
    expect(response.text).toMatch(/"type":"response.completed"/);
    expect(response.text).toMatch(/data: \[DONE\]/);
  });

  it("POST /v1/responses returns 400 when input and messages are missing", async () => {
    const { http } = createApiTestHarness();

    const response = await http.post("/v1/responses").send({
      model: "gemini-2.5-flash"
    });

    expect(response.status).toBe(400);
    expect(response.body.detail).toMatch(/No valid prompt found/);
  });
});
