# RPC Service Testing Patterns

This guide documents the patterns and conventions for writing RPC service tests, particularly focusing on the service tester infrastructure.

## Service Tester Architecture

The RPC testing framework uses a sophisticated tester pattern that sets up complete service environments for integration testing.

### Core Components

#### 1. `serviceTester` (Base Tester)
The foundation for all service tests, defined in `tester_test.go`:
```go
type serviceTester struct {
    ctx       context.Context
    ctxCancel context.CancelFunc
    t         *testing.T
    require   *require.Assertions
    dbUrl     string
    btc       *crypto.BlockchainTestContext
    nodes     []*testNodeRecord
    opts      serviceTesterOpts
}
```

Key features:
- Manages test lifecycle (context, cleanup)
- Sets up blockchain test context
- Creates and manages multiple River nodes
- Provides HTTP clients for testing

#### 2. Specialized Service Testers

Each service has its own tester that wraps `serviceTester`. For example:

**`appRegistryServiceTester`**:
```go
type appRegistryServiceTester struct {
    serviceTester      *serviceTester
    t                  *testing.T
    ctx                context.Context
    require            *require.Assertions
    appRegistryService *Service           // The actual service instance
    botCredentials     []testBotCredentials
    appServer          *app_registry.TestAppServer
    authClient         protocolconnect.AuthenticationServiceClient
    appRegistryClient  protocolconnect.AppRegistryServiceClient
}
```

## Common Testing Patterns

### 1. Creating a Service Tester
```go
func TestAppRegistry_Feature(t *testing.T) {
    tester := NewAppRegistryServiceTester(t, &appRegistryTesterOpts{
        numBots:         3,
        enableRiverLogs: false,
    })
    
    // Start bot services if needed
    tester.StartBotServices()
    
    // Your test logic here
}
```

### 2. Service Initialization Pattern

Services run on separate listeners/ports from the main nodes:
```go
func initAppRegistryService(ctx context.Context, tester *serviceTester) *Service {
    listener, _ := makeTestListener(tester.t)
    
    service, err := StartServerInAppRegistryMode(
        ctx,
        config,
        &ServerStartOpts{
            RiverChain:      bc,
            Listener:        listener,
            HttpClientMaker: testcert.GetHttp2LocalhostTLSClient,
        },
    )
    
    return service
}
```

### 3. Client Creation Pattern

Each service tester provides authenticated clients:
```go
// Get the service address
serviceAddr := "https://" + service.listener.Addr().String()

// Create clients
authClient := protocolconnect.NewAuthenticationServiceClient(
    httpClient, serviceAddr,
)
appRegistryClient := protocolconnect.NewAppRegistryServiceClient(
    httpClient, serviceAddr,
)
```

### 4. Authentication Patterns

Most endpoints require authentication:
```go
// Authenticate a request
authenticateBS(ctx, require, authClient, wallet, request)

// Or create an unauthenticated client for testing public endpoints
unauthClient := protocolconnect.NewAppRegistryServiceClient(
    tester.serviceTester.httpClient(),
    "https://" + tester.appRegistryService.listener.Addr().String(),
)
```

## Testing Different Scenarios

### 1. Table-Driven Tests
```go
tests := map[string]struct {
    name              string
    expectAvailable   bool
    expectErrMessage  string
}{
    "Available name": {
        name:            "UniqueBotName",
        expectAvailable: true,
    },
    "Empty name": {
        name:             "",
        expectAvailable:  false,
        expectErrMessage: "name cannot be empty",
    },
}

for testName, tt := range tests {
    t.Run(testName, func(t *testing.T) {
        resp, err := client.ValidateBotName(ctx, &connect.Request[protocol.ValidateBotNameRequest]{
            Msg: &protocol.ValidateBotNameRequest{Name: tt.name},
        })
        // Assertions here
    })
}
```

### 2. Concurrent Testing
```go
t.Run("Concurrent validation", func(t *testing.T) {
    var wg sync.WaitGroup
    numConcurrent := 10
    
    for i := 0; i < numConcurrent; i++ {
        wg.Add(1)
        go func(index int) {
            defer wg.Done()
            // Concurrent test logic
        }(i)
    }
    
    wg.Wait()
})
```

### 3. Testing Authentication Requirements

For public endpoints (no auth required):
```go
// Add to authentication interceptor configuration in server.go:
authInceptor, err := authentication.NewAuthenticationInterceptor(
    service.ShortServiceName(),
    algorithm,
    key,
    "/river.AppRegistryService/GetStatus",
    "/river.AppRegistryService/GetAppMetadata",
    "/river.AppRegistryService/ValidateBotName",  // Public endpoint
)
```

## Important Patterns and Gotchas

### 1. Service vs Node Distinction
- River nodes run the main protocol (streams, channels, etc.)
- Services (like AppRegistry) run on separate ports/listeners
- Each has its own authentication and configuration

### 2. Test Data Generation
```go
// Generate test wallets
botWallet := safeNewWallet(ctx, require)
ownerWallet := safeNewWallet(ctx, require)

// Generate test metadata
metadata := appMetadataForBot(botWallet.Address[:])
```

### 3. Cleanup Patterns
```go
// Automatic cleanup via defer
tester.cleanup(func() {
    service.Close()
})

// Or via t.Cleanup
t.Cleanup(params.closer)
```

### 4. Helper Functions

Common helpers in app registry tests:
- `register()` - Register a new app with authentication
- `authenticateBS()` - Add authentication to requests
- `appMetadataForBot()` - Generate test metadata
- `safeNewWallet()` - Create test wallets

### 5. Service-Specific Configurations

Each service mode has specific configuration needs:
```go
config.AppRegistry.AppRegistryId = base.GenShortNanoid()
config.AppRegistry.SharedSecretDataEncryptionKey = hex.EncodeToString(key[:])
config.AppRegistry.Authentication.SessionToken.Key.Algorithm = "HS256"
config.AppRegistry.AllowInsecureWebhooks = true  // For testing
```

## Testing Best Practices

1. **Parallel Testing**: Use `t.Parallel()` for tests that don't share state
2. **Isolation**: Each test gets its own database schema and service instances
3. **Realistic Data**: Use production-like test data and scenarios
4. **Error Cases**: Always test error conditions and edge cases
5. **Assertions**: Use `require` for critical checks, `assert` for non-critical
6. **Context**: Pass test context through for proper cancellation
7. **Logging**: Enable logs with `enableRiverLogs: true` when debugging