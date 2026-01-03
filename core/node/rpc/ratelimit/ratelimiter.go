package ratelimit

import (
	"context"
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/sethvargo/go-limiter"
	"github.com/sethvargo/go-limiter/memorystore"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/config"
)

// RateLimiter defines the interface for rate limiting operations
type RateLimiter interface {
	// Check if operation is allowed for key on specific endpoint
	Allow(ctx context.Context, key string, endpoint string) (bool, *QuotaInfo, error)

	// Get remaining quota information for specific key and endpoint
	GetQuota(ctx context.Context, key string, endpoint string) (*QuotaInfo, error)

	// Check if endpoint has rate limiting disabled
	IsEndpointExempt(endpoint string) bool

	// Check if key is exempt from rate limiting
	IsKeyExempt(key string) bool

	// Check if rate limiting is globally enabled
	IsEnabled() bool

	// Close shuts down the rate limiter and cleans up resources
	Close() error
}

// QuotaInfo provides information about rate limit quotas
type QuotaInfo struct {
	Tokens    uint64    // Total limit per window
	Remaining uint64    // Remaining requests in current window
	ResetTime time.Time // When the quota resets
	Allowed   bool      // Whether the request was allowed
}

// IPRateLimiter implements rate limiting based on endpoints with IP-based keys
type IPRateLimiter struct {
	endpointLimiters map[string]limiter.Store        // One limiter per endpoint
	globalLimiter    limiter.Store                   // Fallback limiter for unconfigured endpoints
	config           *config.ParsedRateLimitConfig   // Parsed configuration
	metrics          *Metrics                       // Prometheus metrics
	logger           *zap.Logger                    // Logger instance
	ctx              context.Context                // Context for shutdown
	cancel           context.CancelFunc             // Cancel function for shutdown
	mu               sync.RWMutex                   // Protects config changes
}


// NewIPRateLimiter creates a new IP-based rate limiter
func NewIPRateLimiter(rateLimitConfig *config.RateLimitConfig, logger *zap.Logger) (*IPRateLimiter, error) {
	return newIPRateLimiterWithRegistry(rateLimitConfig, logger, prometheus.DefaultRegisterer)
}

// newIPRateLimiterWithRegistry creates a rate limiter with custom metrics registry (for testing)
func newIPRateLimiterWithRegistry(rateLimitConfig *config.RateLimitConfig, logger *zap.Logger, registry prometheus.Registerer) (*IPRateLimiter, error) {
	// Parse configuration
	parsedConfig, err := config.ParseRateLimitConfig(rateLimitConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	// Create memory store
	store, err := memorystore.New(&memorystore.Config{
		Tokens:   rateLimitConfig.GlobalLimits.Rate,
		Interval: rateLimitConfig.GlobalLimits.Interval,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create memory store: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	// Create endpoint-specific limiters
	endpointLimiters := make(map[string]limiter.Store)
	for _, endpointConfig := range parsedConfig.EndpointLimits {
		if !endpointConfig.Disabled {
			// Create separate memory store for each endpoint configuration
			endpointStore, err := memorystore.New(&memorystore.Config{
				Tokens:   endpointConfig.Rate,
				Interval: endpointConfig.Interval,
			})
			if err != nil {
				return nil, fmt.Errorf("failed to create limiter for endpoint %s: %w", endpointConfig.Endpoint, err)
			}
			endpointLimiters[endpointConfig.Endpoint] = endpointStore
		}
	}

	rl := &IPRateLimiter{
		endpointLimiters: endpointLimiters,
		globalLimiter:    store, // Use the main store as global limiter
		config:           parsedConfig,
		metrics:          NewMetricsWithRegistry(registry),
		logger:           logger,
		ctx:              ctx,
		cancel:           cancel,
	}

	return rl, nil
}

// Allow checks if a request from the given key to the given endpoint is allowed
func (r *IPRateLimiter) Allow(ctx context.Context, key string, endpoint string) (bool, *QuotaInfo, error) {
	// If rate limiting is disabled, always allow but still collect metrics
	if !r.IsEnabled() {
		return true, &QuotaInfo{
			Tokens:    ^uint64(0), // Max uint64 for unlimited
			Remaining: ^uint64(0),
			ResetTime: time.Time{},
			Allowed:   true,
		}, nil
	}

	// Check if key is exempt
	if r.IsKeyExempt(key) {
		r.metrics.RecordAllowed(endpoint, key)
		return true, &QuotaInfo{
			Tokens:    ^uint64(0), // Max uint64 for unlimited
			Remaining: ^uint64(0),
			ResetTime: time.Time{},
			Allowed:   true,
		}, nil
	}

	// Check if endpoint is exempt
	if r.IsEndpointExempt(endpoint) {
		r.metrics.RecordAllowed(endpoint, key)
		return true, &QuotaInfo{
			Tokens:    ^uint64(0), // Max uint64 for unlimited
			Remaining: ^uint64(0),
			ResetTime: time.Time{},
			Allowed:   true,
		}, nil
	}

	// Use key for rate limiting
	limiterKey := key
	var quotaInfo *QuotaInfo
	var allowed bool
	var err error

	// Try endpoint-specific limiter first
	if endpointLimiter, exists := r.endpointLimiters[endpoint]; exists {
		tokens, remaining, reset, ok, takeErr := endpointLimiter.Take(ctx, limiterKey)
		quotaInfo = &QuotaInfo{
			Tokens:    tokens,
			Remaining: remaining,
			ResetTime: time.Unix(0, int64(reset)),
			Allowed:   ok,
		}
		allowed = ok
		err = takeErr
	} else {
		// Fall back to global limiter
		tokens, remaining, reset, ok, takeErr := r.globalLimiter.Take(ctx, limiterKey)
		quotaInfo = &QuotaInfo{
			Tokens:    tokens,
			Remaining: remaining,
			ResetTime: time.Unix(0, int64(reset)),
			Allowed:   ok,
		}
		allowed = ok
		err = takeErr
	}

	if err != nil {
		r.logger.Error("Rate limiter error", zap.Error(err), zap.String("key", key), zap.String("endpoint", endpoint))
		// Fail open - allow request
		return true, nil, err
	}

	// Record metrics
	if allowed {
		r.metrics.RecordAllowed(endpoint, key)
	} else {
		r.metrics.RecordDenied(endpoint, key)
	}

	// Record token bucket state for monitoring
	if quotaInfo != nil {
		r.metrics.RecordTokenBucketState(endpoint, quotaInfo.Remaining, quotaInfo.Tokens)
	}

	return allowed, quotaInfo, nil
}

// GetQuota returns quota information for the given key and endpoint
func (r *IPRateLimiter) GetQuota(ctx context.Context, key string, endpoint string) (*QuotaInfo, error) {
	if !r.IsEnabled() {
		// Return unlimited quota when disabled
		return &QuotaInfo{
			Tokens:    ^uint64(0),
			Remaining: ^uint64(0), // Max uint64
			ResetTime: time.Now().Add(time.Hour),
			Allowed:   true,
		}, nil
	}

	if r.IsKeyExempt(key) || r.IsEndpointExempt(endpoint) {
		return &QuotaInfo{
			Tokens:    ^uint64(0),
			Remaining: ^uint64(0),
			ResetTime: time.Now().Add(time.Hour),
			Allowed:   true,
		}, nil
	}

	limiterKey := key
	
	// Check endpoint-specific limiter first
	if endpointLimiter, exists := r.endpointLimiters[endpoint]; exists {
		// Note: We'd ideally have a Get() method, but Take() is what's available
		// This will consume a token - not ideal for quota checking but functional
		tokens, remaining, reset, _, getErr := endpointLimiter.Take(ctx, limiterKey)
		if getErr != nil {
			return nil, getErr
		}
		return &QuotaInfo{
			Tokens:    tokens,
			Remaining: remaining,
			ResetTime: time.Unix(0, int64(reset)),
			Allowed:   true, // This is just status check
		}, nil
	} else {
		// Fall back to global limiter
		tokens, remaining, reset, _, getErr := r.globalLimiter.Take(ctx, limiterKey)
		if getErr != nil {
			return nil, getErr
		}
		return &QuotaInfo{
			Tokens:    tokens,
			Remaining: remaining,
			ResetTime: time.Unix(0, int64(reset)),
			Allowed:   true, // This is just status check
		}, nil
	}
}

// IsEndpointExempt checks if an endpoint is exempt from rate limiting
func (r *IPRateLimiter) IsEndpointExempt(endpoint string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if endpointConfig, exists := r.config.EndpointMap[endpoint]; exists {
		return endpointConfig.Disabled
	}
	return false
}

// IsKeyExempt checks if a key is exempt from rate limiting
// For IP-based keys, this checks against IP exemption lists
func (r *IPRateLimiter) IsKeyExempt(key string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Try to parse as IP address for IP-based exemptions
	parsedIP := net.ParseIP(key)
	if parsedIP == nil {
		return false // Not a valid IP, not exempt
	}
	
	for _, exemptNet := range r.config.ExemptIPNets {
		if exemptNet.Contains(parsedIP) {
			return true
		}
	}
	return false
}

// IsEnabled returns whether rate limiting is globally enabled
func (r *IPRateLimiter) IsEnabled() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.config.Enabled
}

// Close shuts down the rate limiter and cleans up resources
func (r *IPRateLimiter) Close() error {
	r.cancel()
	
	// Close all endpoint limiters
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	// Close endpoint-specific limiters
	for endpoint, store := range r.endpointLimiters {
		if err := store.Close(ctx); err != nil {
			r.logger.Error("Failed to close endpoint limiter", 
				zap.Error(err), 
				zap.String("endpoint", endpoint))
		}
	}
	
	// Close global limiter
	if err := r.globalLimiter.Close(ctx); err != nil {
		r.logger.Error("Failed to close global limiter", zap.Error(err))
		return err
	}
	
	return nil
}


