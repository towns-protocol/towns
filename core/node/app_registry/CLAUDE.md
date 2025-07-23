# App Registry Service Guide

This guide documents the app registry service implementation patterns and architecture.

## Overview

The App Registry Service manages bot registrations, webhooks, and message forwarding preferences for apps/bots in the Towns network.

## Architecture

### Service Structure
```go
type Service struct {
    authentication.AuthServiceMixin     // Provides auth functionality
    cfg                    config.AppRegistryConfig
    store                  *CachedEncryptedMessageQueue
    streamsTracker         track_streams.StreamsTracker
    sharedSecretDataEncryptionKey [32]byte
    appClient             *app_client.AppClient
    riverRegistry         *registries.RiverRegistryContract
    nodeRegistry          nodes.NodeRegistry
    statusCache           *ttlcache.Cache
    baseChain            *crypto.Blockchain
    appRegistryContract  *auth.AppRegistryContract
}
```

### Key Components

1. **CachedEncryptedMessageQueue**: Wraps the storage layer and manages message queueing
2. **StreamsTracker**: Monitors two types of streams:
   - **App inbox streams**: For encryption keys needed to decrypt messages
   - **Channel streams**: To detect messages that should be forwarded to bot members based on their forwarding preferences
3. **AppClient**: Handles webhook communication with bot services
4. **Authentication**: Integrated auth system using JWT tokens

## Common Patterns

### Adding New RPC Endpoints

1. **Define in Protocol Buffer** (`protocol/apps.proto`):
```proto
rpc YourEndpoint(YourRequest) returns (YourResponse);

message YourRequest {
    // fields
}

message YourResponse {
    // fields
}
```

2. **Implement in Service** (`service.go`):
```go
func (s *Service) YourEndpoint(
    ctx context.Context,
    req *connect.Request[YourRequest],
) (*connect.Response[YourResponse], error) {
    // Implementation
}
```

3. **Configure Authentication** (`rpc/server.go`):
- Add to public routes if no auth required:
```go
authInceptor, err := authentication.NewAuthenticationInterceptor(
    // ...
    "/river.AppRegistryService/YourEndpoint",  // Add here
)
```

### Storage Integration

The service uses a wrapped storage pattern:
- `Service` → `CachedEncryptedMessageQueue` → `AppRegistryStore` (interface) → `PostgresAppRegistryStore`

When adding storage methods:
1. Add to `AppRegistryStore` interface
2. Implement in `PostgresAppRegistryStore`
3. Add delegation in `CachedEncryptedMessageQueue`

### Authentication Patterns

Most endpoints require authentication with exceptions:
- `GetStatus` - Check app registration status
- `GetAppMetadata` - Retrieve public app metadata
- `ValidateBotName` - Check name availability

For authenticated endpoints:
```go
userId := authentication.UserFromAuthenticatedContext(ctx)
// Verify user is app or owner
if app != userId && appInfo.Owner != userId {
    return nil, base.RiverError(Err_PERMISSION_DENIED, "...")
}
```

### Error Handling

Use structured River errors:
```go
return nil, base.RiverError(Err_INVALID_ARGUMENT, "description").
    Tag("field", value).
    Func("EndpointName")
```

Common error codes:
- `Err_INVALID_ARGUMENT` - Bad input
- `Err_NOT_FOUND` - Entity doesn't exist
- `Err_ALREADY_EXISTS` - Duplicate entity
- `Err_PERMISSION_DENIED` - Auth failure
- `Err_INTERNAL` - Server errors

### Validation Patterns

1. **Input Validation** - Check required fields, formats
2. **Authorization** - Verify user permissions
3. **Business Logic** - Apply domain rules
4. **Storage Operations** - Database interactions

Example from ValidateBotName:
```go
// 1. Input validation
if req.Msg.Name == "" {
    return &connect.Response[ValidateBotNameResponse]{
        Msg: &ValidateBotNameResponse{
            IsAvailable:  false,
            ErrorMessage: "name cannot be empty",
        },
    }, nil
}

// 2. Business logic (check availability)
isAvailable, err := s.store.IsDisplayNameAvailable(ctx, req.Msg.Name)
```

## Message Forwarding Flow

1. **Bot Registration**: Bot registers with forwarding preferences
2. **Stream Monitoring**: StreamsTracker monitors:
   - Bot's inbox stream for encryption keys
   - All channels where bot is a member for messages
3. **Message Detection**: When messages appear in channels
4. **Filtering**: Apply forwarding settings:
   - `ALL_MESSAGES`: Forward everything
   - `MENTIONS_REPLIES_REACTIONS`: Only if bot is mentioned/replied to
   - `NO_MESSAGES`: Don't forward
5. **Queueing**: If bot lacks decryption keys, queue message
6. **Delivery**: Send to webhook when keys available

## Testing

See `/core/node/rpc/CLAUDE.md` for RPC testing patterns.

Key test helpers:
- `NewAppRegistryServiceTester()` - Creates test environment
- `RegisterBotService()` - Register test bots
- `authenticateBS()` - Add auth to requests

## Common Tasks

### Register a New App
1. Create app and owner wallets
2. Call `Register` with metadata and settings
3. Store returned shared secret
4. Register webhook URL
5. App starts receiving forwarded messages

### Update App Settings
- `SetAppSettings` - Change forwarding preferences
- `SetAppMetadata` - Update display info
- `RotateSecret` - Generate new shared secret

### Message Forwarding Settings
- `FORWARD_SETTING_ALL_MESSAGES` - Receive all messages
- `FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS` - Only relevant messages (default)
- `FORWARD_SETTING_NO_MESSAGES` - Disable forwarding

## Security Considerations

1. **Shared Secrets**: Encrypted at rest with data encryption key
2. **Webhook Security**: JWT auth for webhook calls
3. **User Verification**: Apps must have valid user streams
4. **Contract Validation**: Optional Base chain validation