import { createServer } from "node:http";
import { once } from "node:events";
import { createServerApp } from "../src/server/app";
import { createSessionManagers } from "../src/modules/sessions/sessionManager";
import type { ApiContext } from "../src/server/context";
import type { ProviderChatSession, ProviderOutput, WebModelProvider } from "../src/integrations/providers/types";

class FakeProvider implements WebModelProvider {
  id = "fake-provider";
  label = "Fake Provider";

  async initialize(): Promise<boolean> {
    return true;
  }

  isEnabled(): boolean {
    return true;
  }

  getLastError(): string | null {
    return null;
  }

  async generateContent(prompt: string, model: string): Promise<ProviderOutput> {
    return { text: `echo:${model}:${prompt}` };
  }

  startChat(model: string): ProviderChatSession {
    return {
      sendMessage: async (prompt: string) => ({ text: `chat:${model}:${prompt}` })
    };
  }
}

function assertOrThrow(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

async function runNonStreamCase(baseUrl: string): Promise<void> {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      stream: false,
      messages: [{ role: "user", content: "hello" }]
    })
  });

  const body = await response.json();
  assertOrThrow(response.status === 200, `non-stream failed: HTTP ${response.status}`);
  assertOrThrow(body?.object === "chat.completion", "non-stream failed: invalid object");
  assertOrThrow(typeof body?.choices?.[0]?.message?.content === "string", "non-stream failed: missing assistant content");
}

async function runStreamCase(baseUrl: string): Promise<void> {
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      stream: true,
      messages: [{ role: "user", content: "stream hello" }]
    })
  });

  const text = await response.text();
  assertOrThrow(response.status === 200, `stream failed: HTTP ${response.status}`);
  assertOrThrow((response.headers.get("content-type") || "").includes("text/event-stream"), "stream failed: invalid content-type");
  assertOrThrow(text.includes("\"object\":\"chat.completion.chunk\""), "stream failed: missing chunk payload");
  assertOrThrow(text.includes("data: [DONE]"), "stream failed: missing done marker");
}

async function main(): Promise<void> {
  const provider = new FakeProvider();
  const getProvider = () => provider;

  const context: ApiContext = {
    defaultModel: "gemini-2.5-pro",
    activeProviderId: provider.id,
    getProvider,
    sessions: createSessionManagers(getProvider)
  };

  const app = createServerApp(context);
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("failed to resolve listening port");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`[api:test] server started: ${baseUrl}`);

  try {
    await runNonStreamCase(baseUrl);
    console.log("[api:test] non-stream case passed");

    await runStreamCase(baseUrl);
    console.log("[api:test] stream case passed");

    console.log("[api:test] all checks passed");
  } finally {
    server.close();
    await once(server, "close");
    console.log("[api:test] server stopped");
  }
}

main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[api:test] failed: ${msg}`);
  process.exit(1);
});
