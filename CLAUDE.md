# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Towns Protocol is a permissionless, decentralized end-to-end encrypted chat network built on Base with an EVM-compatible L2 chain. The system enables creation of programmable communication spaces with on-chain memberships and cross-chain entitlements.

## Essential Commands

### Root-level commands (from project root):

- `yarn install && yarn prepare` - Install dependencies and setup hooks
- `yarn build` - Build all packages using turbo
- `yarn test` - Run all tests
- `yarn test:unit` - Run unit tests only
- `yarn lint` - Run linting across all packages
- `yarn prettier:check` - Check code formatting
- `yarn prettier:fix` - Fix code formatting

### Go backend commands (from /core directory):

- Testing:
  - `just test-all` - Run all Go tests from module root
  - `just t` - Run all Go tests from current directory
  - `just t-debug` - Run tests with info logging and test printing
- Development environments:
  - `RUN_ENV=multi just config-and-start` - Start development environment WITH entitlement checks
  - `RUN_ENV=multi_ne just config-and-start` - Start development environment WITHOUT entitlement checks (faster for SDK testing)
  - `RUN_ENV=multi just stop` - Stop multi environment nodes
  - `RUN_ENV=multi_ne just stop` - Stop multi_ne environment nodes
  - `RUN_ENV=multi just tail-logs` - View logs from multi environment instances
  - `RUN_ENV=multi_ne just tail-logs` - View logs from multi_ne environment instances
  - `RUN_ENV=multi just build` - Build node binary
- Infrastructure:
  - `just storage-start` - Start PostgreSQL via Docker
  - `just storage-stop` - Stop PostgreSQL
  - `just anvils` - Start local Anvil chains (Base + River)
  - `just anvils-stop` - Stop local Anvil chains

### Contract commands (from root):

- `yarn workspace @towns-protocol/contracts exec anvil` - Start Anvil
- `yarn workspace @towns-protocol/contracts exec cast` - Use Cast CLI

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
2. Run `yarn install && yarn prepare`
3. Create Certificate Authority: `./core/scripts/register-ca.sh`
4. Choose development environment (from `/core/`):
   - `RUN_ENV=multi just config-and-start` - Full environment with entitlement checks (required for some SDK tests)
   - `RUN_ENV=multi_ne just config-and-start` - Faster environment without entitlement checks (required for other SDK tests)

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

- **All TypeScript files must pass Prettier formatting**
  - Run `yarn prettier:fix` to automatically format all TypeScript files
  - This command will check and fix any formatting issues in one step
- **All PRs must pass global linting**
  - Run `yarn lint` from the root directory before committing
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
- **Yarn 2**: Package management

## Configuration Notes

- Environment-specific configs in `/core/env/`
- Two development environments available:
  - `RUN_ENV=multi` - Multi-node setup WITH entitlement checks (required for some SDK tests)
  - `RUN_ENV=multi_ne` - Multi-node setup WITHOUT entitlement checks (faster, required for other SDK tests)
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
- Do NOT mention Claude, AI assistance, or automated generation in commit messages
- Focus on describing what changed and why, not how it was created
