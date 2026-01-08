# Overview

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

Towns Protocol is a permissionless, decentralized end-to-end encrypted chat network built on Base with an EVM-compatible L2 chain. The system enables creation of programmable communication spaces with on-chain memberships and cross-chain entitlements.

## Essential Commands

### Root-level commands (from project root):

- `bun install` - Install dependencies and setup hooks
- `bun run build` - Build all packages using turbo
- `bun run test` - Run all tests
- `bun run test:unit` - Run unit tests only
- `bun run lint` - Run linting across all packages
- `bun run prettier:check` - Check code formatting
- `bun run prettier:fix` - Fix code formatting

### Go backend commands (from /core directory):

Read instructions in `core/AGENTS.md` for more details.

### Contract commands (from root):

- `anvil` - Start Anvil
- `cast` - Use Cast CLI

### CI testing commands (from root):

- `./scripts/run-local-ci.sh` - Test GitHub CI workflows locally using act (requires Docker)
  - `-j JOB_NAME` - Specify which job to run (default: Common_CI)
  - Examples:
    - `./scripts/run-local-ci.sh -j Common_CI` - Test Common_CI job
    - `./scripts/run-local-ci.sh -j Multinode` - Test Multinode job

## Changesets for NPM Packages

When modifying published npm packages (in `/packages`), create a changeset:

```bash
bun changeset
```

- **Select affected packages** from the list
- **Use `patch` for most changes** (bugfixes, small features, docs)
- **Keep descriptions short and clear** - they become changelog entries
- **Skip changesets for**:
  - Changes to `/core` (Go backend)
  - Private packages (examples, docs)
  - CI/build tooling only

Example changeset:
```markdown
---
'@towns-protocol/sdk': patch
---

Fixed connection timeout in WebSocket client
```

## Architecture Overview

### Core Components

**River Nodes** (`/core/node/`): Distributed messaging infrastructure forming the backbone of the network. Nodes use a stream-based architecture where all communication happens through streams (spaces, channels, DMs, user streams).

**Dual-Chain Architecture**:

- **River Chain**: Custom L2 for stream metadata and node coordination
- **Base Chain**: For entitlements, permissions, and smart contracts

**Storage Layer** (`/core/node/storage/`): PostgreSQL-based persistent storage with miniblock structure for efficient replication.

**Authentication & Authorization** (`/core/node/auth/`): Blockchain-based auth using Ethereum addresses, entitlement system with rule-based permissions, linked wallets support.

### Key Directories

- `/core/` - Go backend implementation (River nodes)
  - `node/rpc/` - gRPC/HTTP API service layer
  - `node/events/` - Stream management and event processing
  - `node/storage/` - PostgreSQL storage implementation
  - `node/auth/` - Authentication and entitlement system
  - `node/crypto/` - Blockchain interaction layer
  - `node/sync/` - Cross-node stream synchronization
- `/packages/` - TypeScript packages (SDK, clients, contracts)
- `/protocol/` - Protocol Buffer definitions
- `/contracts/` - Smart contract source code
- `/scripts/` - Build and deployment scripts

### Stream-Based Messaging

All communication flows through **streams**:

- **Spaces**: Top-level communities with channels and members
- **Channels**: Public discussion channels within spaces
- **Direct Messages**: Private 1:1 conversations
- **Group DMs**: Private multi-party conversations
- **User streams**: Personal metadata and settings

Events are batched into **miniblocks** and replicated across multiple nodes for fault tolerance.

## Development Workflow

### Local Development Setup

1. Install prerequisites: Go, Node v20.x, Docker, Anvil, Just, jq
2. Run `bun install`
3. Create Certificate Authority: `./core/scripts/register-ca.sh`
4. Choose development environment (from `/core/`):
   - `just config-and-start` - Full environment with entitlement checks (required for some SDK tests)

### Testing Strategy

- **Unit tests**: Individual component testing, run frequently during development
- **Integration tests**: Cross-component testing within packages
- **E2E tests**: Full system testing (run post-merge, don't gate PRs)

### Go Development Patterns

- Use structured logging with zap
- Implement proper error handling with RiverError types
- Follow the existing patterns for blockchain interaction
- Use testify for test assertions
- Implement proper context cancellation for graceful shutdowns

### JavaScript/TypeScript Development

- Follow existing patterns in `/packages/` for SDK development
- Use proper TypeScript types, especially for blockchain interactions
- Implement proper error handling and validation
- Follow existing patterns for client-server communication

### Code Quality Requirements

#### For Go code changes:
- **Format all Go files**: Run `./fmt.sh` from the `/core` directory
- **Run the linter**: Execute `./lint.sh` from the `/core` directory
- These scripts handle formatting and linting for all Go code

#### For TypeScript, JavaScript, YAML, Solidity, and other non-Go files:
- **All non-Go files must pass Prettier formatting**
  - Run `bun run prettier:fix` to automatically format TypeScript, JavaScript, YAML, Solidity, and other supported files
  - This command will check and fix any formatting issues in one step

#### For all changes:
- **All PRs must pass global linting**
  - Run `bun run lint` from the root directory before committing
  - This ensures code quality and consistency across the entire repository

## Key Technology Stack

### Backend (Go)

- **gRPC/gRPCWeb**: API layer via connectrpc.com
- **PostgreSQL**: Primary database via pgx/v5
- **Ethereum**: Blockchain interaction via go-ethereum
- **Zap**: Structured logging
- **Cobra + Viper**: CLI and configuration
- **OpenTelemetry**: Observability and tracing

### Frontend/SDK (TypeScript)

- **Turbo**: Monorepo build system
- **Viem/Wagmi**: Ethereum interaction
- **Protocol Buffers**: Service definitions
- **Jest/Vitest**: Testing framework

### Infrastructure

- **Docker**: Local PostgreSQL and Redis
- **Anvil**: Local blockchain development
- **Just**: Command runner for Go workflows
- **Bun 1.3**: Package management

## Configuration Notes

- Environment-specific configs in `/core/env/`
- Local chains run on ports 8545 (Base) and 8546 (River)
- PostgreSQL runs on port 5433 for local development
- HTTPS certificates managed via `generate-certs.sh`

## Building End-to-End Features

When implementing features that span multiple layers of the stack, follow this pattern:

### 1. Start with Protocol Definition
- Define or modify protobuf messages in `/protocol/`
- Consider backward compatibility (wire vs source compatibility)
- Run code generation to update bindings

### 2. Implement Backend Changes
- Update Go types and storage layer
- Create database migrations if needed
- Update service layer with validation logic
- Write comprehensive storage tests
- Ensure proper error handling

### 3. Update Frontend/SDK
- Update TypeScript types and API calls
- Modify UI components as needed
- Update any affected SDK methods

### 4. Testing Strategy
- Storage tests: Verify data persistence and constraints
- Service tests: Validate business logic and API behavior
- End-to-end tests: Confirm full feature functionality
- Make tests re-runnable (e.g., use unique identifiers)

### Example: Adding Display Name to Bot Metadata

1. **Protocol**: Modified `apps.proto` to rename `name` to `username` and add `display_name`
2. **Storage**: Updated PostgreSQL schema to store display_name in JSONB, kept username column for uniqueness
3. **Validation**: Ensured username uniqueness, allowed duplicate display names
4. **Migration**: Created migration to rename existing column while preserving data
5. **Tests**: Added explicit tests for duplicate display names, made bot test re-runnable with UUIDs
6. **Frontend**: Updated all TypeScript references to use new field names

Key lessons:
- Consider data migration early when renaming fields
- Test both positive and negative cases explicitly
- Ensure test repeatability in shared environments
- Document the distinction between internal identifiers and display values

## Git Commit Guidelines

When creating git commits:
- Write clear, concise commit messages that describe the changes
- Follow conventional commit format when applicable (feat:, fix:, docs:, etc.)
- Do NOT mention AI assistants or automated generation in commit messages
- Focus on describing what changed and why, not how it was created
