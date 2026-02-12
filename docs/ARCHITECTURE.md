# Architecture

## Core Idea

The gateway is built as a protocol translation layer:

- Any model source -> `LanguageModelV3`
- `LanguageModelV3` -> protocol adapters (OpenAI / Responses / Gemini-style)
- Protocol adapters -> Hono HTTP endpoints

## Runtime Flow

1. `src/index.ts`
- Process entry.
- Loads config/CLI and starts runtime controller.

2. `src/server/runtime.ts`
- Lifecycle orchestration (bootstrap, mode switch, start/stop server).
- Starts Hono Node server via `@hono/node-server`.

3. `src/server/context.ts`
- Shared dependency container (`ApiContext`).
- Resolves active provider and session managers.

4. `src/gateway/app.ts`
- Hono app assembly.
- Mounts protocol routers and global error handler.

## Gateway Layers

- `src/gateway/models/*`
  - `LanguageModelV3` adapters and model registry.
  - Example: web Gemini adapter, custom onetest adapter.

- `src/gateway/protocols/*`
  - HTTP protocol adapters.
  - OpenAI chat/responses/models mapping.
  - Gemini/Google-style payload mapping.

- `src/gateway/sessions/*`
  - Stateful session logic for provider chat reuse.

## Integrations Layer

- `src/integrations/*`
  - External system integrations (Gemini web client, provider registry/contracts).
  - No HTTP concerns in this layer.

## Dependency Direction

- `server -> gateway -> integrations`
- `protocols -> models -> provider`
- `sessions -> provider`

No reverse dependency from integrations to gateway/server.
