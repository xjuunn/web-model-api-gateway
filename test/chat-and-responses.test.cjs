const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

const { createServerApp } = require('../dist/server/app');
const { createSessionManagers } = require('../dist/modules/sessions/sessionManager');

class FakeProvider {
  constructor(id = 'fake-provider') {
    this.id = id;
    this.label = 'Fake Provider';
    this.generateCalls = [];
    this.chatStartCalls = [];
    this.chatMessages = [];
    this.nextGenerateText = 'ok';
    this.failGenerate = null;
  }

  async initialize() {
    return true;
  }

  isEnabled() {
    return true;
  }

  getLastError() {
    return null;
  }

  async generateContent(prompt, model, files = [], metadata = []) {
    this.generateCalls.push({ prompt, model, files, metadata });
    if (this.failGenerate) {
      throw this.failGenerate;
    }
    return { text: this.nextGenerateText };
  }

  startChat(model) {
    this.chatStartCalls.push({ model });
    return {
      sendMessage: async (message, files = []) => {
        this.chatMessages.push({ model, message, files });
        return { text: `chat:${model}:${message}` };
      }
    };
  }
}

async function startServer(context) {
  const app = createServerApp(context);
  const server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () => {
      server.close();
      await once(server, 'close');
    }
  };
}

async function postJson(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  return response;
}

test('POST /v1/chat/completions should map messages to prompt and return OpenAI-compatible response', async () => {
  const provider = new FakeProvider();
  provider.nextGenerateText = 'assistant answer';

  const context = {
    defaultModel: 'gemini-2.5-pro',
    activeProviderId: provider.id,
    getProvider: () => provider,
    sessions: createSessionManagers(() => provider)
  };

  const server = await startServer(context);
  try {
    const response = await postJson(server.baseUrl, '/v1/chat/completions', {
      model: 'gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'be concise' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'hello' },
            { type: 'text', text: 'world' }
          ]
        }
      ]
    });

    assert.equal(response.status, 200);
    const body = await response.json();

    assert.equal(body.object, 'chat.completion');
    assert.equal(body.model, 'gemini-2.5-flash');
    assert.equal(body.choices[0].message.role, 'assistant');
    assert.equal(body.choices[0].message.content, 'assistant answer');

    assert.equal(provider.generateCalls.length, 1);
    assert.equal(
      provider.generateCalls[0].prompt,
      'System: be concise\n\nUser: hello\nworld'
    );
  } finally {
    await server.close();
  }
});

test('POST /v1/chat/completions stream=true should return SSE with done marker', async () => {
  const provider = new FakeProvider();
  provider.nextGenerateText = 'stream-output';

  const context = {
    defaultModel: 'gemini-2.5-pro',
    activeProviderId: provider.id,
    getProvider: () => provider,
    sessions: createSessionManagers(() => provider)
  };

  const server = await startServer(context);
  try {
    const response = await postJson(server.baseUrl, '/v1/chat/completions', {
      model: 'gemini-2.5-flash',
      stream: true,
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/event-stream/);

    const text = await response.text();
    assert.match(text, /"object":"chat.completion.chunk"/);
    assert.match(text, /"finish_reason":"stop"/);
    assert.match(text, /data: \[DONE\]/);
  } finally {
    await server.close();
  }
});

test('POST /v1/chat/completions should return 400 for invalid request body', async () => {
  const provider = new FakeProvider();
  const context = {
    defaultModel: 'gemini-2.5-pro',
    activeProviderId: provider.id,
    getProvider: () => provider,
    sessions: createSessionManagers(() => provider)
  };

  const server = await startServer(context);
  try {
    const response = await postJson(server.baseUrl, '/v1/chat/completions', {
      model: 'gemini-2.5-flash',
      messages: []
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.detail, /Invalid request/);
  } finally {
    await server.close();
  }
});

test('POST /v1/chat/completions should return 500 when provider throws unexpected error', async () => {
  const provider = new FakeProvider();
  provider.failGenerate = new Error('boom');

  const context = {
    defaultModel: 'gemini-2.5-pro',
    activeProviderId: provider.id,
    getProvider: () => provider,
    sessions: createSessionManagers(() => provider)
  };

  const server = await startServer(context);
  try {
    const response = await postJson(server.baseUrl, '/v1/chat/completions', {
      messages: [{ role: 'user', content: 'hi' }]
    });

    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.detail, 'Internal server error');
  } finally {
    await server.close();
  }
});

test('POST /translate should reuse chat session for same model and recreate when model changes', async () => {
  const provider = new FakeProvider();
  const context = {
    defaultModel: 'gemini-2.5-pro',
    activeProviderId: provider.id,
    getProvider: () => provider,
    sessions: createSessionManagers(() => provider)
  };

  const server = await startServer(context);
  try {
    const r1 = await postJson(server.baseUrl, '/translate', {
      model: 'gemini-2.5-pro',
      message: 'first'
    });
    assert.equal(r1.status, 200);

    const r2 = await postJson(server.baseUrl, '/translate', {
      model: 'gemini-2.5-pro',
      message: 'second'
    });
    assert.equal(r2.status, 200);

    assert.equal(provider.chatStartCalls.length, 1);
    assert.equal(provider.chatMessages.length, 2);

    const r3 = await postJson(server.baseUrl, '/translate', {
      model: 'gemini-2.5-flash',
      message: 'third'
    });
    assert.equal(r3.status, 200);

    assert.equal(provider.chatStartCalls.length, 2);
    assert.deepEqual(provider.chatStartCalls.map((x) => x.model), [
      'gemini-2.5-pro',
      'gemini-2.5-flash'
    ]);
  } finally {
    await server.close();
  }
});

test('POST /v1/responses should prefer messages over input and return normalized output', async () => {
  const provider = new FakeProvider();
  provider.nextGenerateText = 'responses answer';

  const context = {
    defaultModel: 'gemini-2.5-pro',
    activeProviderId: provider.id,
    getProvider: () => provider,
    sessions: createSessionManagers(() => provider)
  };

  const server = await startServer(context);
  try {
    const response = await postJson(server.baseUrl, '/v1/responses', {
      model: 'gemini-2.5-flash',
      input: 'input text should be ignored when messages exists',
      messages: [{ role: 'user', content: 'message text wins' }]
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.object, 'response');
    assert.equal(body.status, 'completed');
    assert.equal(body.output_text, 'responses answer');
    assert.equal(provider.generateCalls[0].prompt, 'User: message text wins');
  } finally {
    await server.close();
  }
});

test('POST /v1/responses stream=true should return expected SSE lifecycle events', async () => {
  const provider = new FakeProvider();
  provider.nextGenerateText = 'streamed response payload';

  const context = {
    defaultModel: 'gemini-2.5-pro',
    activeProviderId: provider.id,
    getProvider: () => provider,
    sessions: createSessionManagers(() => provider)
  };

  const server = await startServer(context);
  try {
    const response = await postJson(server.baseUrl, '/v1/responses', {
      model: 'gemini-2.5-flash',
      stream: true,
      input: 'hello'
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/event-stream/);

    const text = await response.text();
    assert.match(text, /event: response.created/);
    assert.match(text, /"type":"response.created"/);
    assert.match(text, /event: response.output_text.delta/);
    assert.match(text, /event: response.completed/);
    assert.match(text, /"type":"response.completed"/);
    assert.match(text, /data: \[DONE\]/);
  } finally {
    await server.close();
  }
});

test('POST /v1/responses should return 400 when prompt is missing', async () => {
  const provider = new FakeProvider();
  const context = {
    defaultModel: 'gemini-2.5-pro',
    activeProviderId: provider.id,
    getProvider: () => provider,
    sessions: createSessionManagers(() => provider)
  };

  const server = await startServer(context);
  try {
    const response = await postJson(server.baseUrl, '/v1/responses', {
      model: 'gemini-2.5-flash'
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.detail, /No valid prompt found/);
  } finally {
    await server.close();
  }
});
