# Architecture

## Goals

- Keep transport (`Express Router`) isolated from business dependencies.
- Keep runtime boot logic isolated from concrete integrations.
- Make onboarding easy through a single composition root.

## Layering

- `src/server/composition.ts`
  - Composition root.
  - Builds runtime dependencies and returns `RuntimeController`.
- `src/server/runtime.ts`
  - Runtime orchestration only (bootstrap, mode switch, HTTP server lifecycle).
  - Depends on `RuntimeDependencies` interface, not hardcoded modules.
- `src/server/context.ts`
  - API dependency container (`ApiContext`).
  - Provides active provider resolver and session managers.
- `src/server/app.ts`
  - HTTP app assembly.
  - Mounts router factories with `ApiContext`.
- `src/modules/*/router.ts`
  - Pure transport adapters.
  - Receive `ApiContext`; do not read global env or singleton registries directly.
- `src/modules/sessions/sessionManager.ts`
  - Stateful chat session logic.
  - Depends on injected `ProviderResolver`.

## Dependency Direction

- outer layers know inner layers:
  - `composition -> runtime/context/app -> routers/session manager`
- routers do not import:
  - `env`
  - provider registry singletons
  - global session singletons

## How To Extend

1. Add a new endpoint:
   - Create `createXxxRouter(context)` in `src/modules/...`.
   - Mount it in `createServerApp(context)`.
2. Add a new provider:
   - Implement `WebModelProvider`.
   - Register in provider registry.
   - No router change required if behavior matches existing context contract.
3. Add runtime behavior:
   - Extend `RuntimeDependencies` and inject via composition root.

