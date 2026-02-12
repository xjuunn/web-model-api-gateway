# Testing Standards

## Goals
- Tests are isolated and deterministic.
- Adding a new API endpoint only requires adding a new test file under `test/api/`.
- Existing tests should not be modified unless behavior contracts change.

## Structure
- `test/support/`: shared test doubles and harnesses.
- `test/api/`: endpoint-level contract tests.
- `test/*.test.ts`: unit tests for pure modules and session behavior.

## Conventions
- Use `createApiTestHarness()` for all API tests.
- Use `FakeProvider` from `test/support/provider.double.ts` instead of redefining provider stubs.
- One route module per test file, matching `<module>.router.test.ts`.
- Verify contract shape, status code, and key provider interaction in each case.

## Recommended Workflow for New Features
1. Add/extend route implementation.
2. Add a new `test/api/<feature>.router.test.ts`.
3. Reuse `createApiTestHarness()` and assert endpoint contract.
4. Add or extend unit tests only for pure logic extracted from routes.
