# SDK Testing Documentation

This document describes the testing strategy and organization for the Towns Protocol SDK package.

## Test Directory Structure

```
packages/sdk/src/tests/
├── unit/                 # Unit tests - Fast, isolated component tests
├── multi/                # Integration tests WITH entitlements
├── multi_ne/             # Integration tests WITHOUT entitlements
└── multi_v2/             # V2 feature tests
```

## Test Types and When to Use Them

### Unit Tests (`/src/tests/unit/`)

**Purpose**: Test individual components in isolation without external dependencies
**Location**: `packages/sdk/src/tests/unit/`
**Run Command**: `yarn test:unit`
**Use For**:

- Testing pure functions and utilities
- Crypto operations
- Store implementations
- Observable patterns
- Decorators and error handling

### Integration Tests - With Entitlements (`/src/tests/multi/`)

**Purpose**: Test full functionality with blockchain-based permission checks
**Location**: `packages/sdk/src/tests/multi/`
**Run Command**: `yarn test:ci:multi:ent`
**Requires**: `RUN_ENV=multi just config-and-start` (from `/core/`)
**Use For**:

- Testing access control and permissions
- Entitlement-gated features
- Cross-chain functionality
- Security-critical flows

### Integration Tests - Without Entitlements (`/src/tests/multi_ne/`)

**Purpose**: Test core functionality without permission overhead (faster)
**Location**: `packages/sdk/src/tests/multi_ne/`
**Run Command**: `yarn test:ci:multi:ne`
**Requires**: `RUN_ENV=multi_ne just config-and-start` (from `/core/`)
**Use For**:

- General messaging functionality
- Channel and space operations
- Sync and replication testing
- Most day-to-day feature testing

## Test Configuration Files

- `vitest.config.ts` - Default configuration (runs multi tests with entitlements)
- `vitest.config.unit.ts` - Unit test configuration
- `vitest.config.multi_ne.ts` - Integration tests without entitlements
- `vitest.config.multi_legacy.ts` - Legacy space functionality tests
- `vitest.setup.ts` - Global test setup (mocks IndexedDB, fetch for WASM)

## Key Test Utilities

### Test Client Creation

Located in `@/tests/testUtils` - provides `makeTestClient()` for creating configured test client instances with context, wallet, and device keys.

### Test Setup Utilities

Located in `@/tests/testUtils` - provides `setupWalletsAndContexts()` for initializing test wallets and contexts for multiple test users (alice, bob, etc.).

### Test Driver Pattern

Located in `@/tests/testDriver_testUtils` - provides `TestDriver` class for simulating user interactions and managing test scenarios.

## Test Grouping and Organization

Tests use JSDoc `@group` annotations for organization:

- `@group main` - Primary test suite
- `@group with-entitlements` - Tests requiring entitlement checks
- `@group core` - Core functionality tests

## Common Test Patterns

### 1. Multi-User Conversation Testing

The `converse` utility (found in test utils) enables simulating multi-party conversations in a controlled manner.

### 2. Space and Channel Creation

Test utilities provide helpers for creating unique space and channel IDs, and methods for space/channel creation.

### 3. Event Waiting Patterns

Tests commonly use `waitFor` patterns to handle asynchronous operations and event propagation.

## Running Tests

### Local Development

```bash
# Run all unit tests
yarn test:unit

# Run integration tests (requires appropriate backend)
yarn test:ci:multi:ne    # Without entitlements (faster)
yarn test:ci:multi:ent   # With entitlements (slower)

# Watch mode for development
yarn test:watch
```

### CI Pipeline

```bash
# Default CI test suite (multi_ne)
yarn test:ci
```

### Prerequisites for Integration Tests

1. Start the appropriate backend environment from `/core/`:
   - For `multi` tests: `RUN_ENV=multi just config-and-start`
   - For `multi_ne` tests: `RUN_ENV=multi_ne just config-and-start`
2. Ensure PostgreSQL is running: `just storage-start`
3. Ensure Anvil chains are running: `just anvils`

## Test Timeouts

- Unit tests: Default Vitest timeout
- Integration tests: Extended timeouts due to blockchain operations
- Can be overridden per test with timeout option

## Mocking Strategy

- **IndexedDB**: Uses `fake-indexeddb` for browser storage
- **Fetch**: Uses `vitest-fetch-mock` for HTTP requests
- **WASM**: Special handling in `vitest.setup.ts` for WASM file loading
- **Blockchain**: Uses local Anvil chains for deterministic testing

## Adding New Tests

1. **Unit Test**: Place in `/src/tests/unit/` if testing isolated logic
2. **Integration Test**:
   - Use `/src/tests/multi_ne/` for general features
   - Use `/src/tests/multi/` only if testing entitlement-specific behavior
3. **Follow Naming**: Use `*.test.ts` suffix
4. **Add Group**: Include appropriate `@group` annotation
5. **Use Utilities**: Leverage existing test utilities rather than reimplementing

## Debugging Tests

- Use `yarn test:watch` for interactive development
- Add `console.log` or use Vitest's `--reporter=verbose`
- For integration tests, check node logs: `RUN_ENV=multi_ne just tail-logs`
- Use `test.only()` to focus on specific tests during debugging
