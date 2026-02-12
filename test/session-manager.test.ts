import { describe, expect, it } from "vitest";
import { SessionManager } from "../src/gateway/sessions/sessionManager";
import { FakeProvider } from "./support/provider.double";

describe("SessionManager", () => {
  it("reuses existing chat session for same provider and model", async () => {
    const provider = new FakeProvider("provider-a");
    const manager = new SessionManager(() => provider);

    await manager.getResponse("gemini-2.5-pro", "first", []);
    await manager.getResponse("gemini-2.5-pro", "second", ["f.txt"]);

    expect(provider.chatStartCalls.map((item) => item.model)).toEqual(["gemini-2.5-pro"]);
    expect(provider.chatMessages).toHaveLength(2);
    expect(provider.chatMessages[1]?.files).toEqual(["f.txt"]);
  });

  it("creates new session when model changes", async () => {
    const provider = new FakeProvider("provider-a");
    const manager = new SessionManager(() => provider);

    await manager.getResponse("gemini-2.5-pro", "first", []);
    await manager.getResponse("gemini-2.5-flash", "second", []);

    expect(provider.chatStartCalls.map((item) => item.model)).toEqual(["gemini-2.5-pro", "gemini-2.5-flash"]);
  });

  it("creates new session when provider changes", async () => {
    const providerA = new FakeProvider("provider-a");
    const providerB = new FakeProvider("provider-b");
    let current = providerA;
    const manager = new SessionManager(() => current);

    await manager.getResponse("gemini-2.5-pro", "first", []);
    current = providerB;
    await manager.getResponse("gemini-2.5-pro", "second", []);

    expect(providerA.chatStartCalls.map((item) => item.model)).toEqual(["gemini-2.5-pro"]);
    expect(providerB.chatStartCalls.map((item) => item.model)).toEqual(["gemini-2.5-pro"]);
  });
});
