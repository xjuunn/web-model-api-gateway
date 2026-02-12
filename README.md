# Web Model API Gateway (TypeScript)

AI protocol translation gateway built with Vercel AI SDK + Hono.

Chinese documentation: [docs/README.zh-CN.md](docs/README.zh-CN.md)
API documentation (Chinese): [docs/API.zh-CN.md](docs/API.zh-CN.md)
Architecture guide: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## What This Project Provides

- OpenAI-compatible endpoints:
  - `POST /v1/chat/completions`
  - `POST /v1/responses`
  - `GET /v1/models`
  - `GET /v1/models/:model`
- Gemini/Web endpoints:
  - `POST /gemini`
  - `POST /gemini-chat`
  - `POST /translate`
- Google-style endpoint:
  - `POST /v1beta/models/:model`
- Unified model abstraction via Vercel AI SDK `LanguageModelV3`
- Hono HTTP server runtime

## Tech Stack

- Node.js `>=20`
- TypeScript (`strict`)
- Hono + `@hono/node-server`
- Vercel AI SDK (`ai`)
- `zod` for schema validation
- `undici` for network integration

## Project Structure

- `src/index.ts`: process entry + CLI
- `src/server`: runtime lifecycle and context composition
- `src/gateway/app.ts`: Hono app assembly
- `src/gateway/protocols`: protocol adapters (OpenAI/Responses/Gemini)
- `src/gateway/models`: model registry + `LanguageModelV3` adapters
- `src/gateway/sessions`: provider-backed session state
- `src/integrations`: provider and Gemini web integration
- `src/config/env.ts`: config loading + validation (`config/app.config.json`)
- `src/cli`: interactive runtime CLI

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create local config file:
```bash
copy .\\config\\app.config.example.json .\\config\\app.config.json
```

3. Fill required Gemini cookies in `config/app.config.json`:
- `GEMINI_COOKIE_1PSID`
- `GEMINI_COOKIE_1PSIDTS`

4. Build and start:
```bash
npm run build
npm start
```

## Scripts

- `npm run dev`: watch mode with `tsx`
- `npm run typecheck`: TypeScript checks only
- `npm run build`: compile to `dist/`
- `npm run test`: run test suite
- `npm run onetest`: run custom `LanguageModelV3` demo

## API Base URL

Default: `http://localhost:9091`

## Configuration

See `config/app.config.example.json` for the full list.

Key variables:
- `APP_HOST`
- `APP_PORT`
- `APP_DEFAULT_MODE`
- `APP_ACTIVE_PROVIDER`
- `ENABLE_GEMINI`
- `GEMINI_DEFAULT_MODEL`
- `GEMINI_HTTP_PROXY`
- `GEMINI_ALLOW_BROWSER_COOKIES`

## Notes

- Primary config source is `config/app.config.json`.
- Browser cookie extraction can be enabled with `GEMINI_ALLOW_BROWSER_COOKIES=true`.
- For init diagnostics, set `GEMINI_DEBUG_SAVE_INIT_HTML=true` and inspect `debug-gemini-init.html`.
