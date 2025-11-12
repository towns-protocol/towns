# Rate Limiting Design

## Overview

The River network requires rate limiting to ensure fair resource allocation, prevent abuse, and maintain service quality for all users. Without proper rate limiting, the network is vulnerable to:

- **Denial of Service attacks**: Malicious actors overwhelming nodes with requests
- **Resource exhaustion**: Single users consuming disproportionate CPU, memory, and bandwidth

### Alternative Approach: Economy-Based Rate Limiting (Not Recommended)

An economy-based approach where users stake TOWNS tokens to purchase API credits was considered but ultimately rejected:

**How it would work:**
- Users stake TOWNS tokens to receive API credits
- Each API call costs credits based on computational complexity
- Nodes can slash staked tokens when detecting abuse
- Overflow attacks become economically expensive

**Why we're not pursuing this approach:**
1. **Barriers to adoption**: Requiring payment for basic operations severely limits growth potential
2. **Competitive disadvantage**: Many free alternatives exist in the messaging/social space
3. **User experience**: Adding economic friction to every interaction degrades UX
4. **Complexity**: Payment channels and slashing mechanisms add significant technical overhead
5. **Growth priority**: At this stage, user acquisition and network effects are more important than monetization

While economy-based limiting provides strong abuse prevention (attackers must pay to overflow nodes), the cost to legitimate user growth is too high. The multi-layer approach below achieves adequate protection without introducing economic barriers.

### Proposed Solution: Multi-Layer Rate Limiting

A comprehensive rate limiting strategy that combines **local node-level detection** with **network-wide contract-based enforcement**:

1. **Node-Level Detection Layer**
   - Each node monitors request patterns using token bucket algorithm
   - Tracks per-user resource consumption locally
   - Identifies potential abusers based on sustained violations
   - Efficient real-time detection without blockchain overhead

2. **Contract-Based Enforcement Layer**
   - On-chain blocklist registry shared across all nodes
   - Consensus-based reporting prevents false positives
   - Network-wide visibility and coordination
   - Governance-controlled exemptions and appeals

### Why Node-Level Rate Limiting Alone Fails

While node-level rate limiting provides efficient local detection, it has critical limitations when used in isolation:

1. **Bad actors simply switch nodes**: Attackers can easily bypass limits by moving to another node
2. **Legitimate users might get punished**: Normal app loading behavior (burst of requests) could trigger rate limits
3. **No network-wide visibility**: Nodes operate in isolation, unable to share information about abusers

### How Multi-Layer Rate Limiting Works

**Detection Phase** (node level):
- Nodes track request patterns locally using token bucket algorithm
- Identify potential abusers based on sustained violations

**Reporting Phase**:
- When abuse detected, node submits violation report to contract
- Report includes: violator address, violation type, timestamp

**Consensus Phase**:
- Contract requires N nodes to report same address within time window
- Prevents single malicious node from blocking legitimate users

**Enforcement Phase**:
- All nodes query contract for blocked addresses (cached locally)
- Blocked addresses rejected at RPC layer before any processing
- No computational resources wasted on known abusers

**Recovery Phase**:
- Blocks expire after set duration (e.g., 1 hour for minor, 24 hours for major)

This multi-layer approach provides:
- **Immediate protection**: Local detection blocks abuse in real-time
- **Network-wide coordination**: Contract ensures consistent enforcement
- **Resilience**: Prevents both node-hopping and false positives
- **Accountability**: Governance oversight for disputes and exemptions

### Goals

- **Prevent abuse**: Stop spam and DoS attempts network-wide
- **Protect network**: Prevent bad actors from node-hopping
- **Maintain performance**: Minimal overhead on legitimate traffic
- **Improve UX**: Legitimate users not affected by normal burst usage

### Recommendation: Service Identity and Governance

**Current Issue**: Internal services (notification, app registry, archive) currently operate without proper identity, making them indistinguishable from regular traffic at the RPC layer.

**Proposed Solution**:
1. **Assign Wallet Identities**: Give each internal service a dedicated wallet/address
2. **On-Chain Exemption Registry**: Maintain exempted service addresses in a smart contract
3. **Governance Control**: Use DAO voting to add/remove addresses from exemption list
4. **Granular Exemptions**: Services exempted only for specific operations (e.g., subscriptions) not all operations 

### Scope

Rate limiting is applied to three categories of operations:

1. **Write operations**
   - Creating streams and adding content
   - Higher risk of abuse/spam

2. **Read operations**
   - Retrieving streams and data
   - Lower risk but can cause resource exhaustion

3. **Stream Subscriptions**
   - Real-time stream synchronization via SyncStreams
   - Highest resource consumption (memory, CPU, network)
   - Requires strict limits to prevent resource exhaustion

## Architecture

### Integration Points

Rate limiting is implemented as a **Connect interceptor** in the RPC layer.

#### Entry Points

**Write operations**:
1. **CreateStream** - `/node/rpc/forwarder.go:82`
   - Creates new spaces, channels, DMs
   - User identified by: `event.Event.CreatorAddress`

2. **CreateMediaStream** - `/node/rpc/forwarder.go:91`
   - Creates media/file streams
   - User identified by: `event.Event.CreatorAddress`

3. **AddEvent** - `/node/rpc/forwarder.go:416`
   - Adds events to existing streams (messages, reactions, etc.)
   - User identified by: `event.Event.CreatorAddress`

4. **AddMediaEvent** - `/node/rpc/forwarder.go:479`
   - Adds media events to streams
   - User identified by: `event.Event.CreatorAddress`

**Read operations**:
1. **GetStream** - `/node/rpc/forwarder.go:100`
   - Basic stream retrieval
   - User identified by: Request context/headers

2. **GetStreamEx** - `/node/rpc/forwarder.go:107`
   - Extended stream retrieval with options
   - User identified by: Request context/headers

3. **GetMiniblocks** - `/node/rpc/forwarder.go:289`
   - Retrieves miniblock data
   - User identified by: Request context/headers

4. **GetLastMiniblockHash** - `/node/rpc/forwarder.go:357`
   - Gets latest miniblock hash
   - User identified by: Request context/headers

**Stream Subscription Actions**:
1. **SyncStreams** - `/node/rpc/sync/handler.go:119`
   - Creates real-time stream subscription
   - Long-lived bidirectional streaming connection
   - User identified by: Request context/headers

2. **AddStreamToSync** - `/node/rpc/sync/handler.go:37`
   - Adds streams to existing subscription
   - User identified by: Request context/headers

3. **RemoveStreamFromSync** - `/node/rpc/sync/handler.go:42`
   - Removes streams from subscription
   - User identified by: Request context/headers

4. **ModifySync** - `/node/rpc/sync/handler.go:47`
   - Bulk modify subscription streams
   - User identified by: Request context/headers

### Component Structure

```
/node/rpc/ratelimit/
 ratelimiter.go          # Core rate limiter interface and implementation
 token_bucket.go         # Token bucket algorithm implementation
 interceptor.go          # Connect interceptor
 config.go               # Configuration structures
 metrics.go              # Prometheus metrics
 ratelimit_test.go       # Tests
```

## Algorithm

### Token Bucket Algorithm

The **token bucket** algorithm is used as the primary rate limiting mechanism. It allows for burst traffic while maintaining long-term rate limits.

#### Implementation

Using `github.com/sethvargo/go-limiter` package with memory store:

```go
type RateLimiter struct {
    store   limiter.Store
    config  *RateLimitConfig
    metrics *Metrics
}

// EndpointLimitConfig represents rate limit configuration for a specific endpoint
type EndpointLimitConfig struct {
    Endpoint    string        // Full gRPC method path (e.g., "/river.StreamService/CreateStream")
    Rate        uint64        // Number of requests allowed
    Interval    time.Duration // Time window (e.g., 1m, 1h, 24h)
    Disabled    bool          // If true, no rate limiting applied to this endpoint
}

// GlobalLimitConfig represents fallback limits for endpoints not explicitly configured
type GlobalLimitConfig struct {
    Rate     uint64        // Default rate for unconfigured endpoints
    Interval time.Duration // Default interval
}

type UserLimiter struct {
    endpointLimiters map[string]limiter.Limiter // Per-endpoint limiters
    globalLimiter    limiter.Limiter            // Fallback limiter for unconfigured endpoints
    lastAccess       time.Time
}

// Subscription tracking for resource-intensive operations
type SubscriptionLimiter struct {
    activeSubscriptions map[common.Address]map[string]*SubscriptionInfo
    limits              SubscriptionLimits
    mu                  sync.RWMutex
}

type SubscriptionInfo struct {
    SyncID       string
    StreamCount  int
    CreatedAt    time.Time
    LastModified time.Time
}
```

#### Endpoint-Specific Configuration

The system supports granular rate limiting per endpoint. Each endpoint can have its own rate limit configuration, or inherit from global defaults.

**Example Configuration:**
- `/river.StreamService/CreateStream`: 10 per minute (strict limit for creation)
- `/river.StreamService/AddEvent`: 100 per minute (higher limit for messages)
- `/river.StreamService/GetStream`: 1000 per minute (generous for reads)
- `/river.AppRegistryService/GetStatus`: No limit (completely disabled)
- Unconfigured endpoints: 50 per minute (global default)

This ensures fine-grained control over different types of operations based on their resource consumption and abuse potential.

#### How It Works

1. Each user gets a bucket with N tokens
2. Tokens refill at a constant rate (R tokens per interval)
3. Each operation consumes 1 token
4. If no tokens available, request is denied
5. Burst parameter allows temporary exceeding of rate


## Implementation Details

### Rate Limiter Interface

```go
type RateLimiter interface {
    // Check if operation is allowed for user on specific endpoint
    Allow(ctx context.Context, userAddr common.Address, endpoint string) (bool, *limiter.Result, error)
    
    // Get remaining quota information for specific endpoint
    GetQuota(ctx context.Context, userAddr common.Address, endpoint string) (*QuotaInfo, error)
    
    // Check if endpoint has rate limiting disabled
    IsEndpointExempt(endpoint string) bool
}
```

### Interceptor Integration

```go
func (s *Service) setupInterceptors() {
    interceptors := []connect.Interceptor{
        s.NewMetricsInterceptor(),
        NewRateLimitInterceptor(s.rateLimiter, s.config.RateLimits),
        s.authInterceptor,
        NewTimeoutInterceptor(s.config.Network.RequestTimeout),
    }
    // ... register with service handlers
}
```

### Memory Management

#### Storage Strategy

- **In-memory storage** for performance
- **LRU cache** (using `hashicorp/golang-lru/arc/v2`) for automatic eviction
- **Concurrent map** (using `puzpuzpuz/xsync/v4`) for thread-safe access

#### Memory Usage

- Per user: ~400-600 bytes (depends on number of configured tiers)
  - Each rate.Limiter: ~40 bytes
  - With 3 tiers for create + 3 tiers for read = ~240 bytes for limiters
  - Plus metadata and overhead
- 100,000 active users: ~40-60 MB total
- Automatic cleanup of inactive users after 30 minutes

### User Identification

**For Write Actions:**
- Users identified by their Ethereum address from `event.Event.CreatorAddress`
- Validated through event signature verification
- Ensures authentic user attribution

**For Read Actions:**
- Users identified by IP address or session token from request headers
- Falls back to IP-based limiting if no authentication
- Prevents unauthenticated abuse


## Configuration

### YAML Configuration

```yaml
rateLimits:
  enabled: true
  
  # Memory management
  maxTrackedUsers: 100000
  cleanupInterval: 5m
  inactivityTimeout: 30m
  
  # Global default limits for endpoints not explicitly configured
  globalLimits:
    rate: 50               # 50 requests per minute (default)
    interval: 1m
  
  # Endpoint-specific rate limits
  endpointLimits:
    # Stream service endpoints
    - endpoint: "/river.StreamService/CreateStream"
      rate: 10             # Strict limit for stream creation
      interval: 1m
      
    - endpoint: "/river.StreamService/CreateMediaStream"
      rate: 5              # Very strict for media streams
      interval: 1m
      
    - endpoint: "/river.StreamService/AddEvent"
      rate: 100            # Higher limit for messages
      interval: 1m
      
    - endpoint: "/river.StreamService/AddMediaEvent"
      rate: 20             # Moderate limit for media events
      interval: 1m
      
    - endpoint: "/river.StreamService/GetStream"
      rate: 1000           # Generous for basic reads
      interval: 1m
      
    - endpoint: "/river.StreamService/GetStreamEx"
      rate: 500            # Moderate for extended reads
      interval: 1m
      
    - endpoint: "/river.StreamService/GetMiniblocks"
      rate: 200            # Moderate for miniblock fetches
      interval: 1m
      
    - endpoint: "/river.StreamService/GetLastMiniblockHash"
      rate: 2000           # Very generous for hash checks
      interval: 1m
      
    # App Registry service endpoints
    - endpoint: "/river.AppRegistryService/Register"
      rate: 1              # Very strict for app registration
      interval: 1h
      
    - endpoint: "/river.AppRegistryService/SetAppMetadata"
      rate: 10             # Moderate for metadata updates
      interval: 1m
      
    - endpoint: "/river.AppRegistryService/GetAppMetadata"
      disabled: true       # No rate limiting for public metadata reads
      
    - endpoint: "/river.AppRegistryService/GetStatus"
      disabled: true       # No rate limiting for status checks
      
    - endpoint: "/river.AppRegistryService/ValidateBotName"
      disabled: true       # No rate limiting for name validation
      
    # Sync service endpoints
    - endpoint: "/river.StreamService/SyncStreams"
      rate: 5              # Strict limit for new subscriptions
      interval: 1m
      
    - endpoint: "/river.StreamService/AddStreamToSync"
      rate: 50             # Moderate for subscription modifications
      interval: 1m
      
    - endpoint: "/river.StreamService/RemoveStreamFromSync"
      rate: 100            # More generous for removals
      interval: 1m
      
    - endpoint: "/river.StreamService/ModifySync"
      rate: 30             # Strict for bulk modifications
      interval: 1m
    
  # Progressive penalties
  violations:
    threshold: 5          # After 5 violations
    penaltyMultiplier: 0.5  # Reduce rate by 50%
    penaltyDuration: 5m   # For 5 minutes
    
  # Stream subscription limits
  subscriptionLimits:
    maxSubscriptionsPerUser: 10       # Max concurrent SyncStreams operations
    maxStreamsPerSubscription: 100    # Max streams in single subscription  
    maxTotalSubscribedStreams: 500    # Max total streams across all subscriptions
    subscriptionCreationRate: 5       # New subscriptions per minute
    subscriptionCreationInterval: 1m
    subscriptionModificationRate: 30   # Modifications per minute
    subscriptionModificationInterval: 1m
    
  # Exemptions (temporary - should be replaced with on-chain governance)
  exemptAddresses:
    - "0x0000000000000000000000000000000000000000"  # System address
```

### Environment Variables

```bash
RIVER_RATELIMITS_ENABLED=true
RIVER_RATELIMITS_STREAMCREATION_RATE=10
RIVER_RATELIMITS_MESSAGESENDING_RATE=100
```

## Monitoring

### Metrics (Prometheus)

```prometheus
# Rate limit decisions
rate_limit_allowed_total{operation="stream_create",user="0x..."}
rate_limit_denied_total{operation="message_send",user="0x..."}

# Token bucket state
rate_limit_tokens_available{operation="stream_create"}
rate_limit_bucket_size{operation="message_send"}

# Abuse detection
rate_limit_violations_total{user="0x..."}
rate_limit_penalty_applied_total{user="0x..."}

# System health
rate_limit_users_tracked
rate_limit_memory_bytes

# Subscription metrics
rate_limit_active_subscriptions{user="0x..."}
rate_limit_subscribed_streams_total{user="0x..."}
rate_limit_subscription_denied_total{reason="max_subscriptions|max_streams"}
```

### Logging

```go
// Rate limit violation
log.Warnw("Rate limit exceeded",
    "user", userAddr,
    "operation", operation,
    "remaining", quota.Remaining,
    "resetAt", quota.ResetAt)

// Abuse detection
log.Errorw("Abuse pattern detected",
    "user", userAddr,
    "violations", violations,
    "pattern", "rapid_fire")
```

## Error Handling

### Client Response

When rate limited, clients receive:
```go
RiverError(Err_RATE_LIMITED, "Rate limit exceeded",
    "operation", operation,
    "retryAfter", retryAfter,
    "limit", limit)
```

HTTP Status: `429 Too Many Requests`

### Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1609459200
Retry-After: 60
```

## Rollout Plan

### Phase 1: Monitoring Mode (Week 1-2)
- Deploy with `enabled: false`
- Log what would be rate limited
- Gather baseline metrics

### Phase 2: Soft Launch (Week 3-4)
- Enable for 10% of users
- Monitor for false positives
- Tune limits based on data

### Phase 3: Full Rollout (Week 5)
- Enable for all users
- Continue monitoring
- Adjust limits as needed

### Phase 4: Optimization (Ongoing)
- Implement progressive penalties
- Add per-stream type limits
- Consider distributed rate limiting

## Future Enhancements

1. **Per-stream type limits** - Different limits for spaces vs DMs
2. **Role-based limits** - Higher limits for space owners/moderators
3. **Dynamic adjustment** - Auto-tune based on node capacity
4. **Sliding Window for Abuse Detection** - Add secondary layer to catch rapid-fire attacks that token bucket might miss. For example: user sends 60 requests in 2 seconds (allowed by burst), but sliding window would detect this as abnormal pattern and flag for review
5. **Grace periods** - Temporary limit increases for special events
6. **Token based?** - Token-based rate limit purchasing

## Dependencies

### Required Packages
- `github.com/sethvargo/go-limiter` - Advanced rate limiting with multiple algorithms and stores
- `github.com/hashicorp/golang-lru/arc/v2` - LRU cache (already in project)
- `github.com/patrickmn/go-cache` - Expiring cache (already in project)
- `github.com/puzpuzpuz/xsync/v4` - Concurrent map (already in project)

### Minimal New Dependencies

The only new external dependency is `github.com/sethvargo/go-limiter`, which provides:
- Multiple rate limiting algorithms (token bucket, sliding window, fixed window)
- Pluggable storage backends (memory, Redis, etc.)
- Built-in cleanup and garbage collection
- Production-ready with extensive testing

All other packages are already in the project's dependencies, ensuring minimal dependency footprint.
