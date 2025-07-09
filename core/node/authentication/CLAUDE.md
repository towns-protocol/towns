# Authentication System Guide

This guide documents the authentication patterns used across Towns Protocol services.

## Overview

Towns uses a JWT-based authentication system with Ethereum wallet signatures. Authentication is only used in specific service modes:
- **App Registry mode**: For bot/app authentication and management
- **Notifications mode**: For user notification preferences and delivery
- **Regular node mode**: No authentication (uses blockchain-based authorization)

## Architecture

### AuthServiceMixin

The `AuthServiceMixin` is embedded in services that need authentication:

```go
type AuthServiceMixin struct {
    challengeStoreCleanupInterval time.Duration
    challengeStore                *expirableKV[string, []byte]
    challengeTimeout              time.Duration
    challengePrefix               string
    serviceShortName              string
    jwtLifetime                   time.Duration
    jwtSecretKey                  []byte
    jwtAlgorithm                  string
}
```

Services embed this mixin to gain authentication capabilities:
```go
type Service struct {
    authentication.AuthServiceMixin  // Embedded mixin
    // ... other fields
}
```

### Authentication Middleware

Authentication is implemented as gRPC/Connect interceptors that:
1. Extract JWT tokens from the `Authorization` header
2. Validate tokens using the configured algorithm and secret
3. Extract user ID from token claims
4. Add user ID to request context
5. Make user ID available via `UserFromAuthenticatedContext(ctx)`

## Authentication Flow

### 1. Challenge Generation
```go
// Client requests a challenge
resp, err := authClient.StartAuthentication(ctx, &connect.Request[StartAuthenticationRequest]{
    Msg: &StartAuthenticationRequest{
        UserId: walletAddress[:],
    },
})
challenge := resp.Msg.Challenge
```

### 2. Challenge Signing
```go
// Client signs the challenge with their wallet
signature, err := wallet.SignHash(challenge)
```

### 3. Token Exchange
```go
// Client exchanges signature for JWT token
resp, err := authClient.FinishAuthentication(ctx, &connect.Request[FinishAuthenticationRequest]{
    Msg: &FinishAuthenticationRequest{
        UserId:    walletAddress[:],
        Challenge: challenge,
        Signature: signature,
        DelegateSignature: nil,  // Optional delegation
    },
})
token := resp.Msg.SessionToken
```

### 4. Using the Token
```go
// Add token to subsequent requests
request.Header().Set("Authorization", "Bearer " + token)
```

## Service-Specific Configuration

### App Registry Service
```go
// Challenge prefix for app registry
appServiceChallengePrefix = "AS_AUTH:"

// Initialization
err := s.InitAuthentication(appServiceChallengePrefix, &cfg.Authentication)
```

### Notification Service
```go
// Challenge prefix for notifications
notificationServiceChallengePrefix = "NS_AUTH:"

// Public endpoints (no auth required)
authInterceptor, err := authentication.NewAuthenticationInterceptor(
    s.ShortServiceName(),
    algorithm,
    key,
    // No additional public routes for notification service
)
```

## Interceptor Configuration

The authentication interceptor is configured during service initialization:

```go
func (s *Service) initNotificationHandlers() error {
    // Create authentication interceptor
    authInterceptor, err := authentication.NewAuthenticationInterceptor(
        s.NotificationService.ShortServiceName(),
        s.config.Notifications.Authentication.SessionToken.Key.Algorithm,
        s.config.Notifications.Authentication.SessionToken.Key.Key,
        // List public routes here (none for notifications)
    )
    
    // Add to interceptor chain
    interceptors := connect.WithInterceptors(
        s.otelConnectInterceptor,
        s.NewMetricsInterceptor(),
        NewTimeoutInterceptor(s.config.Network.RequestTimeout),
        authInterceptor,  // Authentication middleware
    )
    
    // Register handlers with interceptors
    pattern, handler := protocolconnect.NewNotificationServiceHandler(
        s.NotificationService,
        interceptors,
    )
}
```

## Using Authentication in Service Methods

### Protected Endpoints
```go
func (s *Service) ProtectedMethod(
    ctx context.Context,
    req *connect.Request[SomeRequest],
) (*connect.Response[SomeResponse], error) {
    // Get authenticated user from context (added by middleware)
    userId := authentication.UserFromAuthenticatedContext(ctx)
    
    // Verify user has access
    if !s.userHasAccess(userId, req.Msg.ResourceId) {
        return nil, base.RiverError(Err_PERMISSION_DENIED, "...")
    }
    
    // Continue with business logic
}
```

### Public Endpoints
Public endpoints must be explicitly configured in the interceptor:
```go
authInterceptor, err := authentication.NewAuthenticationInterceptor(
    serviceName,
    algorithm,
    key,
    // List all public endpoints:
    "/river.AppRegistryService/GetStatus",
    "/river.AppRegistryService/GetAppMetadata",
    "/river.AppRegistryService/ValidateBotName",
)
```

## JWT Token Details

### Token Structure
```go
claims := jwt.RegisteredClaims{
    Audience:  jwt.ClaimStrings{serviceShortName},  // e.g., "as", "ns"
    Issuer:    serviceShortName,
    Subject:   userAddress,  // Hex-encoded wallet address
    ExpiresAt: jwt.NewNumericDate(expiration),
    IssuedAt:  jwt.NewNumericDate(time.Now()),
}
```

### Configuration
```yaml
authentication:
  challengeTimeout: 30s  # How long challenges are valid
  sessionToken:
    lifetime: 30m      # JWT token lifetime
    key:
      algorithm: HS256
      key: <hex-encoded-256-bit-key>
```

## Testing Authentication

### Helper Functions
```go
// Add authentication to any request
authenticateBS(ctx, require, authClient, wallet, request)

// Create authenticated client in tests
client := tester.newTestClient(0, testClientOpts{
    authenticated: true,
    wallet: testWallet,
})
```

### Testing Authorization
```go
// Test permission denied
wrongUserWallet := safeNewWallet(ctx, require)
authenticateBS(ctx, require, authClient, wrongUserWallet, request)

_, err := client.ProtectedMethod(ctx, request)
require.Error(err)
require.True(base.IsRiverErrorCode(err, Err_PERMISSION_DENIED))
```

## Security Considerations

1. **Challenge Management**:
   - Single-use challenges
   - Time-limited validity (30s default)
   - Cryptographically random generation

2. **Token Security**:
   - HMAC-SHA256 signatures
   - Short lifetime (30m default)
   - Service-specific audiences

3. **Wallet Integration**:
   - Direct wallet signatures (no passwords)
   - Supports delegate signatures
   - Address recovery from signatures

## Common Patterns

### Service Initialization
```go
// 1. Embed AuthServiceMixin in your service
type YourService struct {
    authentication.AuthServiceMixin
    // ... other fields
}

// 2. Initialize authentication
err := s.InitAuthentication(challengePrefix, &config.Authentication)

// 3. Configure interceptor with public routes
authInterceptor, err := authentication.NewAuthenticationInterceptor(
    s.ShortServiceName(),
    algorithm,
    key,
    // ... public routes
)
```

### Error Handling
- `Err_UNAUTHENTICATED` (16): Missing/invalid token or signature
- `Err_PERMISSION_DENIED`: Valid auth but insufficient permissions
- `Err_INVALID_ARGUMENT`: Malformed authentication data

## Important Notes

- Authentication is NOT used in regular node mode (uses blockchain-based rules)
- Each service mode has its own challenge prefix and JWT audience
- The authentication context is created by middleware, not manually
- Always check `UserFromAuthenticatedContext` returns non-zero address