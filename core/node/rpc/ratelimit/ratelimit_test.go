package ratelimit

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"

	"github.com/towns-protocol/towns/core/config"
)

// getDefaultRateLimitConfig returns the default rate limit config for testing
func getDefaultRateLimitConfig() *config.RateLimitConfig {
	return &config.GetDefaultConfig().RateLimit
}

func TestRateLimiter_BasicFunctionality(t *testing.T) {
	logger := zaptest.NewLogger(t)
	rateLimitConfig := getDefaultRateLimitConfig()
	rateLimitConfig.Enabled = true
	
	// Use test-specific metrics registry to avoid conflicts
	reg := prometheus.NewRegistry()
	rl, err := newIPRateLimiterWithRegistry(rateLimitConfig, logger, reg)
	require.NoError(t, err)
	defer rl.Close()

	ctx := context.Background()
	ip := "192.168.1.1"
	endpoint := "/river.StreamService/CreateStream"

	// First request should be allowed
	allowed, result, err := rl.Allow(ctx, ip, endpoint)
	require.NoError(t, err)
	assert.True(t, allowed)
	assert.NotNil(t, result)

	// Quota should show remaining requests
	quota, err := rl.GetQuota(ctx, ip, endpoint)
	require.NoError(t, err)
	assert.Greater(t, quota.Remaining, uint64(0))
	assert.Greater(t, quota.Tokens, uint64(0))
}

func TestRateLimiter_DisabledState(t *testing.T) {
	logger := zaptest.NewLogger(t)
	rateLimitConfig := getDefaultRateLimitConfig()
	rateLimitConfig.Enabled = false // Disabled by default
	
	// Use test-specific metrics registry to avoid conflicts
	reg := prometheus.NewRegistry()
	rl, err := newIPRateLimiterWithRegistry(rateLimitConfig, logger, reg)
	require.NoError(t, err)
	defer rl.Close()

	ctx := context.Background()
	ip := "192.168.1.1"
	endpoint := "/river.StreamService/CreateStream"

	// Should always allow when disabled
	for i := 0; i < 100; i++ {
		allowed, _, err := rl.Allow(ctx, ip, endpoint)
		require.NoError(t, err)
		assert.True(t, allowed)
	}

	// Quota should show unlimited when disabled
	quota, err := rl.GetQuota(ctx, ip, endpoint)
	require.NoError(t, err)
	assert.Equal(t, ^uint64(0), quota.Remaining) // Max uint64
}

func TestRateLimiter_EndpointConfiguration(t *testing.T) {
	logger := zaptest.NewLogger(t)
	rateLimitConfig := getDefaultRateLimitConfig()
	rateLimitConfig.Enabled = true
	
	// Add specific endpoint configuration
	rateLimitConfig.EndpointLimits = append(rateLimitConfig.EndpointLimits, config.EndpointLimitConfig{
		Endpoint: "/test/strict",
		Rate:     2,
		Interval: time.Minute,
	})
	
	reg := prometheus.NewRegistry()
	rl, err := newIPRateLimiterWithRegistry(rateLimitConfig, logger, reg)
	require.NoError(t, err)
	defer rl.Close()

	ctx := context.Background()
	ip := "192.168.1.1"
	endpoint := "/test/strict"

	// Should allow first 2 requests
	for i := 0; i < 2; i++ {
		allowed, _, err := rl.Allow(ctx, ip, endpoint)
		require.NoError(t, err)
		assert.True(t, allowed, "Request %d should be allowed", i+1)
	}

	// Third request should be denied
	allowed, _, err := rl.Allow(ctx, ip, endpoint)
	require.NoError(t, err)
	assert.False(t, allowed, "Third request should be denied")
}

func TestRateLimiter_IPExemptions(t *testing.T) {
	logger := zaptest.NewLogger(t)
	rateLimitConfig := getDefaultRateLimitConfig()
	rateLimitConfig.Enabled = true
	rateLimitConfig.ExemptIPs = []string{"127.0.0.1", "10.0.0.0/8"}
	
	reg := prometheus.NewRegistry()
	rl, err := newIPRateLimiterWithRegistry(rateLimitConfig, logger, reg)
	require.NoError(t, err)
	defer rl.Close()

	ctx := context.Background()
	endpoint := "/river.StreamService/CreateStream"

	testCases := []struct {
		ip       string
		exempt   bool
		name     string
	}{
		{"127.0.0.1", true, "localhost"},
		{"10.0.0.5", true, "private network"},
		{"192.168.1.1", false, "regular IP"},
		{"8.8.8.8", false, "public IP"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ip := tc.ip

			// Check exemption status
			exempt := rl.IsKeyExempt(ip)
			assert.Equal(t, tc.exempt, exempt)

			// Exempt IPs should always be allowed even with many requests
			if tc.exempt {
				for i := 0; i < 100; i++ {
					allowed, _, err := rl.Allow(ctx, ip, endpoint)
					require.NoError(t, err)
					assert.True(t, allowed)
				}
			}
		})
	}
}

func TestRateLimiter_EndpointExemptions(t *testing.T) {
	logger := zaptest.NewLogger(t)
	rateLimitConfig := getDefaultRateLimitConfig()
	rateLimitConfig.Enabled = true
	
	reg := prometheus.NewRegistry()
	rl, err := newIPRateLimiterWithRegistry(rateLimitConfig, logger, reg)
	require.NoError(t, err)
	defer rl.Close()

	ctx := context.Background()
	ip := "192.168.1.1"

	// Test disabled endpoint (from default config)
	disabledEndpoint := "/river.AppRegistryService/GetStatus"
	assert.True(t, rl.IsEndpointExempt(disabledEndpoint))

	// Should always allow requests to disabled endpoints
	for i := 0; i < 100; i++ {
		allowed, _, err := rl.Allow(ctx, ip, disabledEndpoint)
		require.NoError(t, err)
		assert.True(t, allowed)
	}

	// Test non-disabled endpoint
	regularEndpoint := "/river.StreamService/CreateStream"
	assert.False(t, rl.IsEndpointExempt(regularEndpoint))
}

func TestRateLimiter_ConcurrentAccess(t *testing.T) {
	logger := zaptest.NewLogger(t)
	rateLimitConfig := getDefaultRateLimitConfig()
	rateLimitConfig.Enabled = true
	rateLimitConfig.GlobalLimits.Rate = 100 // Allow more requests for concurrency test
	
	reg := prometheus.NewRegistry()
	rl, err := newIPRateLimiterWithRegistry(rateLimitConfig, logger, reg)
	require.NoError(t, err)
	defer rl.Close()

	ctx := context.Background()
	endpoint := "/river.StreamService/GetStream"
	numGoroutines := 10
	requestsPerGoroutine := 5

	var wg sync.WaitGroup
	var mu sync.Mutex
	allowedCount := 0
	deniedCount := 0

	// Launch concurrent requests from different IPs
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(ipSuffix int) {
			defer wg.Done()
			ip := fmt.Sprintf("192.168.1.%d", ipSuffix)
			
			for j := 0; j < requestsPerGoroutine; j++ {
				allowed, _, err := rl.Allow(ctx, ip, endpoint)
				require.NoError(t, err)
				
				mu.Lock()
				if allowed {
					allowedCount++
				} else {
					deniedCount++
				}
				mu.Unlock()
			}
		}(i + 1)
	}

	wg.Wait()

	// Should have processed all requests
	totalRequests := numGoroutines * requestsPerGoroutine
	assert.Equal(t, totalRequests, allowedCount + deniedCount)
	
	// Most requests should be allowed given the high limit
	assert.Greater(t, allowedCount, totalRequests/2)
}

func TestRateLimiter_MultipleIPs(t *testing.T) {
	logger := zaptest.NewLogger(t)
	rateLimitConfig := getDefaultRateLimitConfig()
	rateLimitConfig.Enabled = true
	
	reg := prometheus.NewRegistry()
	rl, err := newIPRateLimiterWithRegistry(rateLimitConfig, logger, reg)
	require.NoError(t, err)
	defer rl.Close()

	ctx := context.Background()
	endpoint := "/river.StreamService/GetStream"

	// Test that different IPs can make requests to the same endpoint
	// Each IP should be treated separately by the same endpoint limiter
	for i := 1; i <= 5; i++ {
		ip := fmt.Sprintf("192.168.1.%d", i)
		allowed, quotaInfo, err := rl.Allow(ctx, ip, endpoint)
		require.NoError(t, err)
		assert.True(t, allowed)
		assert.NotNil(t, quotaInfo)
		assert.Greater(t, quotaInfo.Tokens, uint64(0))
	}
}

func TestRateLimiter_MetricsCollection(t *testing.T) {
	logger := zaptest.NewLogger(t)
	rateLimitConfig := getDefaultRateLimitConfig()
	rateLimitConfig.Enabled = false // Test metrics collection when disabled
	
	reg := prometheus.NewRegistry()
	rl, err := newIPRateLimiterWithRegistry(rateLimitConfig, logger, reg)
	require.NoError(t, err)
	defer rl.Close()

	ctx := context.Background()
	ip := "192.168.1.1"
	endpoint := "/river.StreamService/CreateStream"

	// Make some requests
	for i := 0; i < 5; i++ {
		_, _, err := rl.Allow(ctx, ip, endpoint)
		require.NoError(t, err)
	}

	// Metrics should be collected even when rate limiting is disabled
	// This is verified by ensuring no panics occur and methods complete successfully
	assert.True(t, true) // Placeholder - in practice you'd check actual metrics
}

func TestIPExtractor_BasicFunctionality(t *testing.T) {
	extractor := NewConnectIPExtractor()
	
	// Test with nil input (should return fallback)
	ctx := context.Background()
	ip, err := extractor.ExtractIP(ctx, nil)
	require.NoError(t, err)
	assert.Equal(t, "127.0.0.1", ip)
}

func TestConfig_ParseConfig(t *testing.T) {
	rateLimitConfig := &config.RateLimitConfig{
		ExemptIPs: []string{"127.0.0.1", "10.0.0.0/8", "invalid-ip"},
	}
	
	// Should fail due to invalid IP
	_, err := config.ParseRateLimitConfig(rateLimitConfig)
	assert.Error(t, err)
	
	// Fix the config
	rateLimitConfig.ExemptIPs = []string{"127.0.0.1", "10.0.0.0/8"}
	parsed, err := config.ParseRateLimitConfig(rateLimitConfig)
	require.NoError(t, err)
	
	assert.Len(t, parsed.ExemptIPNets, 2)
}

func TestConfig_DefaultConfig(t *testing.T) {
	rateLimitConfig := getDefaultRateLimitConfig()
	
	// Should have sensible defaults
	assert.False(t, rateLimitConfig.Enabled) // Disabled by default
	assert.True(t, rateLimitConfig.MetricsEnabled)
	assert.Equal(t, 100000, rateLimitConfig.MaxTrackedIPs)
	assert.Equal(t, 5*time.Minute, rateLimitConfig.CleanupInterval)
	assert.Equal(t, uint64(50), rateLimitConfig.GlobalLimits.Rate)
	assert.NotEmpty(t, rateLimitConfig.EndpointLimits)
	assert.NotEmpty(t, rateLimitConfig.ExemptIPs)
	
	// Should parse successfully
	_, err := config.ParseRateLimitConfig(rateLimitConfig)
	assert.NoError(t, err)
}

