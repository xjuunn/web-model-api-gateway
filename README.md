# Web Model API Gateway (TypeScript)

Type-safe TypeScript gateway for web-based Gemini access with OpenAI-compatible APIs.

Chinese documentation: [docs/README.zh-CN.md](docs/README.zh-CN.md)
Full API documentation (Chinese): [docs/API.zh-CN.md](docs/API.zh-CN.md)
Architecture guide: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## What This Project Provides

- OpenAI-compatible endpoints (`/v1/responses`, `/v1/chat/completions`, `/v1/models`)
- Gemini-oriented endpoints (`/gemini`, `/gemini-chat`, `/translate`)
- Google-style endpoint (`/v1beta/models/:model`)
- Provider-based architecture for future web-model integrations
- Interactive CLI with runtime mode switching:
  - `webai`
  - `native-api`

## Tech Stack

- Node.js `>=20`
- TypeScript (`strict`)
- Express + CORS
- `zod` for environment validation
- `undici` for network integration

## Project Structure

- `src/index.ts`: main entry point
- `src/server`: app assembly and runtime controller
- `src/modules`: API route modules
- `src/integrations`: provider and Gemini integration layer
- `src/cli`: interactive CLI workflow (display/actions/types)
- `src/config/env.ts`: `config/app.config.json` loading and validation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create local config file:
```bash
copy .\config\app.config.example.json .\config\app.config.json
```

3. Fill required Gemini cookies in `config/app.config.json`:
- `GEMINI_COOKIE_1PSID`
- `GEMINI_COOKIE_1PSIDTS`

If the config file is missing or key fields are incomplete, the CLI setup wizard will prompt and persist config automatically.

4. Build and start:
```bash
npm run build
npm start
```

## Scripts

- `npm run dev`: run in watch mode with `tsx`
- `npm run typecheck`: run TypeScript checks only
- `npm run build`: compile to `dist/`

## Runtime Modes

- `webai`: Gemini-focused gateway routes
- `native-api`: OpenAI-compatible native API route set

Default mode is controlled by:
- `APP_DEFAULT_MODE=auto|webai|native-api`

## API Base URL

Default:
- `http://localhost:9091`

## API Endpoints

General:
- `GET /`
- `GET /docs`

OpenAI-compatible:
- `POST /v1/responses`
- `POST /v1/chat/completions`
- `GET /v1/models`
- `GET /v1/models/:model`

Gemini/Web gateway:
- `POST /gemini`
- `POST /gemini-chat`
- `POST /translate`

Google-style:
- `POST /v1beta/models/:model`

## Configuration

See `config/app.config.example.json` for the complete list.

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

- This TypeScript runtime uses `config/app.config.json` as the primary configuration source.
- Browser cookie extraction can be enabled with `GEMINI_ALLOW_BROWSER_COOKIES=true`.
- If initialization fails and diagnostics are needed, set:
  - `GEMINI_DEBUG_SAVE_INIT_HTML=true`
  - then inspect `debug-gemini-init.html`

