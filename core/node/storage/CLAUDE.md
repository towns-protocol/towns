# Storage Testing Patterns

This guide documents the patterns and conventions for writing tests in the storage package.

## Test Setup Pattern

All storage tests follow a consistent setup pattern using helper functions:

```go
func TestYourFeature(t *testing.T) {
    params := setupAppRegistryStorageTest(t)  // or setupStorageTest for general storage
    t.Cleanup(params.closer)
    
    require := require.New(t)
    store := params.pgAppRegistryStore
    
    // Your test logic here
}
```

## Key Test Helpers

### `setupAppRegistryStorageTest(t *testing.T)`
- Creates a test database with prefix "b_" for app registry tests
- Returns `testAppRegistryStoreParams` containing:
  - `ctx`: Test context
  - `pgAppRegistryStore`: The store instance
  - `schema`: Database schema name
  - `config`: Database configuration
  - `closer`: Cleanup function (must be called with `t.Cleanup`)
  - `exitSignal`: Channel for signaling exit

### `safeAddress(t *testing.T)`
- Generates a random Ethereum address for testing
- Ensures no address collisions in tests

### `testAppMetadataWithName(name string)`
- Creates test metadata with a given name and default values for other fields
- Useful for tests that need consistent metadata

## Common Test Patterns

### 1. Testing Create Operations
```go
// Create test data
owner := safeAddress(t)
app := safeAddress(t)
metadata := testAppMetadataWithName("TestApp")

// Create the entity
err := store.CreateApp(params.ctx, owner, app, settings, metadata, secret)
require.NoError(err)

// Verify creation
info, err := store.GetAppInfo(params.ctx, app)
require.NoError(err)
require.Equal(expected, info)
```

### 2. Testing Not Found Errors
```go
nonExistentApp := safeAddress(t)
_, err := store.GetAppInfo(params.ctx, nonExistentApp)
require.Error(err)
require.True(base.IsRiverErrorCode(err, Err_NOT_FOUND))
require.ErrorContains(err, "expected error message")
```

### 3. Testing Duplicate/Conflict Errors
```go
// Try to create duplicate
err = store.CreateApp(params.ctx, owner, app2, settings, duplicateMetadata, secret)
require.Error(err)
require.True(base.IsRiverErrorCode(err, Err_ALREADY_EXISTS))
```

### 4. Testing Update Operations
```go
// Update the entity
updatedMetadata := types.AppMetadata{...}
err = store.SetAppMetadata(params.ctx, app, updatedMetadata)
require.NoError(err)

// Verify update
info, err := store.GetAppInfo(params.ctx, app)
require.NoError(err)
require.Equal(updatedMetadata, info.Metadata)
```

## Testing Edge Cases

Always test:
1. Empty/nil values where applicable
2. Non-existent entities (NOT_FOUND errors)
3. Duplicate entries (ALREADY_EXISTS errors)
4. Concurrent operations (if applicable)
5. Transaction rollbacks (if applicable)

## Database Schema Considerations

- Tests use isolated schemas with prefixes (e.g., "b_" for app registry)
- Each test gets its own database schema to prevent interference
- Cleanup is automatic via `t.Cleanup(params.closer)`

## Common Imports

Standard imports for storage tests:
```go
import (
    "context"
    "testing"
    
    "github.com/ethereum/go-ethereum/common"
    "github.com/stretchr/testify/require"
    
    "github.com/towns-protocol/towns/core/node/app_registry/types"
    "github.com/towns-protocol/towns/core/node/base"
    "github.com/towns-protocol/towns/core/node/base/test"
    "github.com/towns-protocol/towns/core/node/protocol"
    "github.com/towns-protocol/towns/core/node/storage"
    "github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
)
```

## Important Design Principles

### Separation of Concerns
- **Storage layer**: Only handles database operations and data integrity
- **Service layer**: Handles business logic, validation rules, and orchestration
- Example: `IsDisplayNameAvailable` in storage only checks if a name exists in DB, while `ValidateBotName` in service adds business rules like rejecting empty names

### Error Handling Patterns
- Use `base.IsRiverErrorCode(err, code)` to check specific error types
- Use `require.ErrorContains(err, message)` to verify error messages
- Always return appropriate River error codes (e.g., `Err_NOT_FOUND`, `Err_ALREADY_EXISTS`)

### Test Data Generation
- Use helper functions to generate test data consistently
- Generate unique addresses/IDs using `safeAddress(t)` to avoid collisions
- Create realistic test data that matches production patterns

### Table-Driven Tests
When testing multiple scenarios, use table-driven tests:
```go
tests := []struct {
    name        string
    input       string
    expected    bool
    wantErr     bool
}{
    {"valid name", "BotName", true, false},
    {"empty name", "", false, false},
    {"existing name", existingName, false, false},
}

for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        result, err := store.IsDisplayNameAvailable(ctx, tt.input)
        if tt.wantErr {
            require.Error(t, err)
        } else {
            require.NoError(t, err)
            require.Equal(t, tt.expected, result)
        }
    })
}
```