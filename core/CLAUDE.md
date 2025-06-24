# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Go server implementation in the core directory.

## Project Overview

This module implements the backend River node server for Towns Protocol, a distributed chat application with blockchain-based entitlements. Nodes form a decentralized network that manages streams (spaces, channels, DMs) with data stored in PostgreSQL and replicated across multiple nodes through miniblocks.

## Essential Commands

### Development Environment Management

- `RUN_ENV=multi just config-and-start` - Start full development environment WITH entitlement checks
- `RUN_ENV=multi_ne just config-and-start` - Start development environment WITHOUT entitlement checks (faster)
- `RUN_ENV=multi just stop` - Stop all nodes in multi environment
- `RUN_ENV=multi just restart` - Stop, rebuild, and restart nodes
- `RUN_ENV=multi just tail-logs` - View live logs with pretty formatting
- `RUN_ENV=multi just build` - Build node binary only

### Testing Commands

- Use standard Go test commands

### Infrastructure Commands

- `just storage-start` - Start PostgreSQL container (port 5433)
- `just storage-stop` - Stop PostgreSQL container
- `just anvils` - Start local Anvil chains (Base on 8545, River on 8546)
- `just anvils-stop` - Stop local Anvil chains

### Blockchain Interaction

- `just cast-base <command>` - Execute cast command against Base chain
- `just cast-river <command>` - Execute cast command against River chain
- `just get_all_node_addresses` - Get all registered node addresses from River chain

## Architecture Overview

### Core Node Architecture

**Stream-Based Communication**: All messages flow through streams identified by StreamId. Each stream is a sequence of events batched into miniblocks for efficient replication.

**Event Processing Pipeline**:

1. Events received via gRPC API (`node/rpc/`)
2. Authorization checked via rule engine (`node/rules/`)
3. Events stored in PostgreSQL (`node/storage/`)
4. Miniblocks created and replicated (`node/events/`)
5. Stream views updated for efficient querying

**Multi-Chain Integration**:

- **Base Chain**: Smart contracts for entitlements and permissions
- **River Chain**: Stream registry and node coordination
- Cross-chain entitlement checking via `xchain/` package

### Key Directory Structure

- `cmd/` - CLI commands and main application entry points
- `node/rpc/` - gRPC/HTTP API server implementation
- `node/events/` - Stream event processing, miniblock generation, caching
- `node/storage/` - PostgreSQL storage layer with migrations
- `node/auth/` - Blockchain-based authentication and entitlement checking
- `node/crypto/` - Ethereum client wrappers and blockchain utilities
- `node/sync/` - Cross-node stream synchronization
- `contracts/` - Go bindings for smart contracts (generated via abigen)
- `xchain/` - Cross-chain entitlement verification service

### Stream Types and Processing

**Stream Types** (identified by first byte prefix in 32-byte StreamId):

- **Space streams** (`0x10`): Community metadata, membership, and space-level settings
- **Channel streams** (`0x20`): Public discussions within spaces, contains space and channel data
- **DM streams** (`0x88`): Private 1:1 conversations between two users
- **Group DM streams** (`0x77`): Private multi-party conversations (GDM channels)
- **Media streams** (`0xff`): File attachments and media content
- **Metadata streams** (`0xdd`): System metadata streams with shard information
- **User streams**: Personal data streams for individual users
  - **User Settings** (`0xa5`): User preferences and configuration
  - **User Metadata** (`0xad`): User profile information
  - **User Inbox** (`0xa1`): User notification and message inbox
  - **User streams (general)** (`0xa8`): General user data streams

**StreamId Structure** (32 bytes total):

- **Channels** (`0x20`): Full 32 bytes used for space and channel identification
- **Spaces** (`0x10`): 1 byte prefix + 20 bytes space data + 11 bytes padding
- **DM Channels** (`0x88`): Full 32 bytes used for user addressing
- **User Streams**: 1 byte prefix + 20 bytes user address + 11 bytes padding
- **Metadata Streams** (`0xdd`): 1 byte prefix + 8 bytes shard number + padding

**Event Flow**: Raw events → Rule validation → Storage → Miniblock batching → Cross-node replication → Stream view updates

## Development Patterns

### Error Handling

- Use `RiverError` type from `node/base/error.go` for structured errors
- Wrap blockchain errors with context using `crypto/` utilities
- Log errors with structured fields using zap logger

### Testing Patterns

- Use `testify/require` and `testify/assert` for test assertions
- Database tests should use `testutils/dbtestutils` for test DB lifecycle
- Mock implementations available in `testutils/mocks/`
- Set `RIVER_TEST_LOG=info` and `RIVER_TEST_PRINT=1` for debug output

### Database Operations

- All storage operations in `node/storage/pg_*.go` files
- Use PostgreSQL transactions for consistency
- Database migrations in `node/storage/migrations/`
- Connection pooling via pgx/v5

### Blockchain Integration

- Use `node/crypto/blockchain.go` for Ethereum client operations
- Contract bindings in `contracts/base/` (Base chain) and `contracts/river/` (River chain)
- Transaction monitoring via `node/crypto/chain_monitor.go`
- Cross-chain entitlement checks via `xchain/entitlement/`

### gRPC API Development

- Protocol definitions in `node/protocol/src/*.proto`
- Generated bindings in `node/protocol/` and `node/protocol/protocolconnect/`
- Service implementations in `node/rpc/`
- Use Connect protocol (connectrpc.com) for HTTP/gRPC compatibility

## Configuration and Environment

### Environment Setup

Two local development environments:

- `multi` - Full environment with entitlement checks (required for some SDK tests)
- `multi_ne` - No entitlements environment (faster, required for other SDK tests)

### Key Configuration Files

- `env/local/multi/config.yaml` - Multi-node development config with entitlements
- `env/local/multi_ne/config.yaml` - Multi-node development config without entitlements
- `node/default_config.yaml` - Default node configuration template
- Database runs on port 5433, node instances start from port 80xx

### Certificate Management

- TLS certificates required for HTTPS communication between nodes
- Generated via `scripts/generate-certs.sh`
- CA setup via `scripts/register-ca.sh`

## Technology Stack Integration

### Core Libraries

- **connectrpc.com/connect**: gRPC/gRPCWeb API layer
- **github.com/jackc/pgx/v5**: PostgreSQL driver with connection pooling
- **github.com/ethereum/go-ethereum**: Ethereum blockchain integration
- **go.uber.org/zap**: Structured logging with custom extensions
- **github.com/spf13/cobra + viper**: CLI and configuration management
- **go.opentelemetry.io**: Distributed tracing
- **prometheus**: OpenMetrics for application metrics

### Protocol Buffer Integration

- Definitions in `../protocol`
- Generate Go bindings: `cd node && go generate -v -x protocol/gen.go`
- Generate TypeScript bindings: `cd ../protocol && yarn buf:generate`

### Database Schema Management

- Migrations in `node/storage/migrations/`
- Separate schemas for main storage, app registry, and notifications
- Run migrations automatically on node startup

## Debugging and Observability

### Logging

- Structured JSON logging via zap with custom extensions in `node/logging/`
- Log levels: debug, info, warn, error
- Pretty formatting in development via `yarn exec pino-pretty`

### Debugging Commands

- `just RUN_ENV=multi tail-logs` - Live log tailing with formatting
- `just RUN_ENV=multi print-logs` - Print recent logs
- `just RUN_ENV=multi check-stderr` - Check for errors in stderr logs

### Development Utilities

- Debug endpoints available at `https://localhost:<port>/debug/`
- Stream inspection via CLI: `./bin/river_node debug stream <stream_id>`
- Database inspection tools in `tools/audit_db/`
