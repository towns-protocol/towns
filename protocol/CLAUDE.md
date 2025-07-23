# Protocol Buffer Guidelines

This guide documents patterns and conventions for working with protocol buffers in the Towns Protocol.

## File Organization

- `protocol.proto` - Core protocol definitions (streams, events, envelopes)
- `apps.proto` - App registry service definitions
- `notifications.proto` - Notification service definitions
- `extensions.proto` - Custom protobuf extensions

## Adding New RPC Services

1. **Define Service** in appropriate `.proto` file:
```proto
service YourService {
    // Document authentication requirements
    // Most methods require auth except those explicitly noted
    rpc YourMethod(YourRequest) returns (YourResponse);
}
```

2. **Generate Code**:
```bash
# From core/node directory:
go generate -v -x protocol/gen.go

# From protocol directory:
yarn buf:generate
```

3. **Implement Service** in Go:
- Create service struct implementing the generated interface
- Add to appropriate server initialization

## Common Patterns

### Request/Response Design

```proto
message YourRequest {
    // Use bytes for addresses/IDs
    bytes user_id = 1;
    
    // Use appropriate types
    string name = 2;
    
    // Optional fields (proto3 style)
    optional string description = 3;
    
    // Repeated for arrays
    repeated string tags = 4;
}

message YourResponse {
    // Include success indicators if needed
    bool success = 1;
    
    // Error details in response (not exceptions)
    string error_message = 2;
    
    // Actual response data
    YourData data = 3;
}
```

### Enum Best Practices

```proto
enum YourEnum {
    // Always include UNSPECIFIED as 0
    YOUR_ENUM_UNSPECIFIED = 0;
    
    // Use SCREAMING_SNAKE_CASE
    YOUR_ENUM_VALUE_ONE = 1;
    YOUR_ENUM_VALUE_TWO = 2;
}
```

### Message Evolution

- Never change field numbers
- Never change field types
- Add new fields with new numbers
- Mark deprecated fields with `[deprecated = true]`
- Use `reserved` for removed fields:
```proto
message Evolving {
    string current_field = 1;
    // string old_field = 2; // Removed
    reserved 2;  // Prevent reuse
    reserved "old_field";  // Prevent name reuse
}
```

## Authentication in Comments

Document authentication requirements in service comments:
```proto
// YourService does something important.
//
// All methods require authentication via session token except:
// - GetPublicInfo
// - ValidateSomething
service YourService {
    // GetPublicInfo does not require authentication.
    rpc GetPublicInfo(GetPublicInfoRequest) returns (GetPublicInfoResponse);
}
```

## Type Conventions

### Addresses and IDs
- Use `bytes` for Ethereum addresses (20 bytes)
- Use `bytes` for stream IDs (32 bytes)
- Convert in Go using `base.BytesToAddress()`

### Timestamps
- Use `int64` for Unix timestamps in microseconds
- Use protobuf `Timestamp` for new APIs if possible

### Binary Data
- Use `bytes` for hashes, signatures, encrypted data
- Document expected lengths in comments

## Validation

Validation happens in service implementation, not protobuf:
```proto
message CreateRequest {
    string name = 1;  // Validated in service: non-empty, max 100 chars
}
```

## Working with Generated Go Code

### Optional Fields and Zero Values

The buf code generator creates pointer fields for optional proto fields, allowing you to distinguish between unset and zero values:

```go
// Proto definition
message AppMetadata {
    optional string external_url = 4;
}

// In Go, this becomes a pointer:
metadata := &AppMetadata{
    ExternalUrl: nil,           // Unset
    ExternalUrl: proto.String(""),  // Empty string (different from unset!)
}

// Check if set:
if metadata.ExternalUrl != nil {
    // Field was explicitly set
    url := *metadata.ExternalUrl
}
```

### Common Helper Functions

```go
// For optional strings
proto.String("value")  // Returns *string

// For optional numbers  
proto.Int32(42)       // Returns *int32
proto.Int64(42)       // Returns *int64

// Safe dereferencing
func stringPtr(s string) *string {
    return &s
}
```

## Imports

Standard imports:
```proto
import "google/protobuf/empty.proto";
import "google/protobuf/timestamp.proto";
import "protocol.proto";  // For shared types
```

## Testing Considerations

- Generate mocks for testing if needed
- Test serialization/deserialization
- Test with missing optional fields (nil pointers in Go)
- Test with zero values vs unset fields
- Test with maximum field sizes

## Common Gotchas

1. **Field Numbering**: Numbers 1-15 use one byte, 16+ use two bytes
2. **Reserved Numbers**: 19000-19999 are reserved by protobuf
3. **Size Limits**: Default message size limit is 4MB
4. **Nil Checks**: Always check pointers before dereferencing optional fields
5. **Maps**: Can't be repeated, keys must be scalars