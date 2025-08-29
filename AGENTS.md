# Repository Guidelines

## Project Structure & Module Organization
- packages/*: TypeScript workspaces (e.g., `sdk`, `react-sdk`, `proto`, `contracts`, `examples/*`). Source under `src/`; dist artifacts under `dist/`.
- core/: Go node implementation (`river_node`), environment configs in `core/env`, orchestration in `core/justfile`.
- protocol/: Protobuf source (`*.proto`) referenced by `packages/proto`.
- scripts/, assets/, .github/: Helper scripts, assets, and CI.

## Build, Test, and Development Commands
- `yarn build`: Turbo builds all workspaces.
- `yarn test`: Runs Vitest across packages; CI produces lcov.
- `yarn lint`: Runs ESLint via Turbo; use `yarn prettier:check` or `:fix` for formatting.
- Proto (TS): `yarn workspace @towns-protocol/proto build` (buf generate + tsc). Lint with `yarn workspace @towns-protocol/proto buf:lint`.
- Contracts (Solidity): `yarn workspace @towns-protocol/contracts build` and `test` (Foundry).
- Go (core): `cd core && just help`; common flows: `RUN_ENV=multi just build`, `just test-all`, `RUN_ENV=multi just config-and-start`.

## Coding Style & Naming Conventions
- TypeScript: 2‑space indent (`.editorconfig`), Prettier enforced (`.prettierrc.js`), ESLint for rules; prefer kebab-case filenames and `camelCase` symbols.
- Solidity: `solhint` and `prettier-plugin-solidity` via the contracts workspace.
- Go: Follow standard `gofmt`; repo uses `golangci-lint` in `core`.

## Testing Guidelines
- TS tests: Vitest; name files `*.test.ts`. Run `yarn test` or `yarn workspace <pkg> test:unit` / `test:watch`.
- Coverage: Keep meaningful coverage; CI reports lcov. Excludes `dist/` and `*.test.ts` from coverage metrics.
- Go tests: `cd core && just test-all` (or `t`, `t-debug` helpers). Prefer table-driven tests and package-local `_test.go` files.

## Commit & Pull Request Guidelines
- Commits: Imperative subject, scoped prefix when useful (e.g., `sdk: ...`, `node: ...`, `fix:`). Keep changes focused.
- PRs: Clear description, linked issues, test plan, and any config notes. Update docs/protos as needed. Ensure `yarn lint && yarn test` pass; run `yarn syncpack:check` if deps change.

## Security & Configuration Tips
- TLS & env: Tests set `NODE_EXTRA_CA_CERTS` and `NODE_TLS_REJECT_UNAUTHORIZED=0`; local CA is at `river-ca-cert.pem`.
- Local chains: Use `core` anvil helpers (`just anvils`) and set `RUN_ENV` (e.g., `multi`, `multi_ne`). Never commit secrets; keep env files under `core/env/` or contracts’ local `.env` files.

## Agent-Specific Instructions
- Read and load all CLAUDE.md guidelines before contributing. These files contain package- and component‑specific conventions and expectations.
- Current locations:
  - `CLAUDE.md`
  - `core/CLAUDE.md`
  - `core/node/app_registry/CLAUDE.md`
  - `core/node/authentication/CLAUDE.md`
  - `core/node/rpc/CLAUDE.md`
  - `core/node/storage/CLAUDE.md`
  - `packages/contracts/CLAUDE.md`
  - `packages/stress/CLAUDE.md`
  - `protocol/CLAUDE.md`
