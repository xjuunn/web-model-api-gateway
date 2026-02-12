import { describe, expect, it } from "vitest";
import { createApiTestHarness } from "../support/app.harness";

describe("chat router", () => {
  it("POST /v1/chat/completions maps messages to prompt and returns OpenAI response", async () => {
    const { http, provider } = createApiTestHarness();
    provider.nextGenerateText = "assistant answer";

    const response = await http.post("/v1/chat/completions").send({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "be concise" },
        {
          role: "user",
          content: [
            { type: "text", text: "hello" },
            { type: "text", text: "world" }
          ]
        }
      ]
    });

    expect(response.status).toBe(200);
    expect(response.body.object).toBe("chat.completion");
    expect(response.body.model).toBe("gemini-2.5-flash");
    expect(response.body.choices[0].message.role).toBe("assistant");
    expect(response.body.choices[0].message.content).toBe("assistant answer");
    expect(provider.generateCalls[0]?.prompt).toBe("System: be concise\n\nUser: hello\nworld");
  });

  it("POST /v1/chat/completions stream=true returns SSE payload with done marker", async () => {
    const { http, provider } = createApiTestHarness();
    provider.nextGenerateText = "stream-output";

    const response = await http.post("/v1/chat/completions").send({
      model: "gemini-2.5-flash",
      stream: true,
      messages: [{ role: "user", content: "hi" }]
    });

    expect(response.status).toBe(200);
    expect(response.header["content-type"]).toMatch(/text\/event-stream/);
    expect(response.text).toMatch(/"object":"chat.completion.chunk"/);
    expect(response.text).toMatch(/"finish_reason":"stop"/);
    expect(response.text).toMatch(/data: \[DONE\]/);
  });

  it("POST /v1/chat/completions returns 400 for invalid body", async () => {
    const { http } = createApiTestHarness();

    const response = await http.post("/v1/chat/completions").send({
      model: "gemini-2.5-flash",
      messages: []
    });

    expect(response.status).toBe(400);
    expect(response.body.detail).toMatch(/Invalid request/);
  });

  it("POST /v1/chat/completions returns 500 when provider throws", async () => {
    const { http, provider } = createApiTestHarness();
    provider.failGenerate = new Error("boom");

    const response = await http.post("/v1/chat/completions").send({
      messages: [{ role: "user", content: "hi" }]
    });

    expect(response.status).toBe(500);
    expect(response.body.detail).toBe("Internal server error");
  });
});
