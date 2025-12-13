package ratelimit

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"go.uber.org/zap"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
)

// RateLimitInterceptor implements Connect middleware for rate limiting
type RateLimitInterceptor struct {
	limiter     RateLimiter   // Rate limiter implementation
	metrics     *Metrics      // Metrics collector
	ipExtractor IPExtractor   // IP address extractor
	logger      *zap.Logger   // Logger instance
}

// NewRateLimitInterceptor creates a new rate limiting interceptor
func NewRateLimitInterceptor(limiter RateLimiter, ipExtractor IPExtractor, logger *zap.Logger) *RateLimitInterceptor {
	return &RateLimitInterceptor{
		limiter:     limiter,
		metrics:     NewMetrics(), // Create metrics if not provided by limiter
		ipExtractor: ipExtractor,
		logger:      logger.With(zap.String("component", "rate_limit_interceptor")),
	}
}

// WrapUnary wraps unary RPC calls with rate limiting
func (i *RateLimitInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		start := time.Now()
		endpoint := req.Spec().Procedure // e.g., "/river.StreamService/CreateStream"

		// Extract IP address for all requests
		clientIP, err := i.ipExtractor.ExtractIP(ctx, req)
		if err != nil {
			i.logger.Warn("Failed to extract IP address",
				zap.Error(err),
				zap.String("endpoint", endpoint))
			clientIP = "127.0.0.1" // Fallback to localhost
		}

		// ALWAYS collect metrics regardless of rate limiting state
		defer func() {
			duration := time.Since(start)
			i.metrics.RecordRequest(endpoint, clientIP, duration)
		}()

		// Rate limiting logic (only if enabled)
		if i.limiter.IsEnabled() && !i.limiter.IsEndpointExempt(endpoint) && !i.limiter.IsKeyExempt(clientIP) {
			allowed, quotaInfo, err := i.limiter.Allow(ctx, clientIP, endpoint)
			if err != nil {
				i.logger.Error("Rate limiter error",
					zap.Error(err),
					zap.String("ip", clientIP),
					zap.String("endpoint", endpoint))
				// Fail open - allow request to continue
			} else if !allowed {
				// Request denied - return rate limit error
				return nil, i.buildRateLimitError(quotaInfo, endpoint, clientIP)
			}
		}

		// Call the next handler
		return next(ctx, req)
	}
}

// WrapStreamingClient wraps streaming client calls (currently not implemented)
func (i *RateLimitInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return func(ctx context.Context, spec connect.Spec) connect.StreamingClientConn {
		// For now, just pass through - rate limiting on client side not needed
		return next(ctx, spec)
	}
}

// WrapStreamingHandler wraps streaming handler calls with rate limiting
func (i *RateLimitInterceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return func(ctx context.Context, conn connect.StreamingHandlerConn) error {
		start := time.Now()
		endpoint := conn.Spec().Procedure

		// Extract IP address
		clientIP, err := i.ipExtractor.ExtractIP(ctx, nil)
		if err != nil {
			i.logger.Warn("Failed to extract IP address for streaming",
				zap.Error(err),
				zap.String("endpoint", endpoint))
			clientIP = "127.0.0.1" // Fallback
		}

		// ALWAYS collect metrics
		defer func() {
			duration := time.Since(start)
			i.metrics.RecordRequest(endpoint, clientIP, duration)
		}()

		// Rate limiting for streaming connections
		if i.limiter.IsEnabled() && !i.limiter.IsEndpointExempt(endpoint) && !i.limiter.IsKeyExempt(clientIP) {
			allowed, quotaInfo, err := i.limiter.Allow(ctx, clientIP, endpoint)
			if err != nil {
				i.logger.Error("Rate limiter error for streaming",
					zap.Error(err),
					zap.String("ip", clientIP),
					zap.String("endpoint", endpoint))
				// Fail open
			} else if !allowed {
				// For streaming, we need to send an error through the connection
				return i.buildStreamingRateLimitError(quotaInfo, endpoint, clientIP)
			}
		}

		// Call the next handler
		return next(ctx, conn)
	}
}

// buildRateLimitError creates a rate limit error response
func (i *RateLimitInterceptor) buildRateLimitError(quotaInfo *QuotaInfo, endpoint string, clientKey string) *connect.Error {
	var retryAfter time.Duration
	var resetTime time.Time
	
	if quotaInfo != nil {
		resetTime = quotaInfo.ResetTime
		retryAfter = time.Until(resetTime)
		if retryAfter < 0 {
			retryAfter = 0
		}
	} else {
		// Fallback values
		retryAfter = time.Minute
		resetTime = time.Now().Add(retryAfter)
	}

	// Log the rate limit violation
	i.logger.Warn("Rate limit exceeded",
		zap.String("key", clientKey),
		zap.String("endpoint", endpoint),
		zap.Duration("retry_after", retryAfter),
		zap.Time("reset_time", resetTime))

	// Create Connect error with appropriate code
	err := connect.NewError(connect.CodeResourceExhausted, fmt.Errorf("rate limit exceeded"))
	
	// Add metadata for client
	err.Meta().Set("X-RateLimit-Limit", fmt.Sprintf("%d", getEndpointLimit(endpoint)))
	err.Meta().Set("X-RateLimit-Remaining", "0")
	err.Meta().Set("X-RateLimit-Reset", fmt.Sprintf("%d", resetTime.Unix()))
	err.Meta().Set("Retry-After", fmt.Sprintf("%.0f", retryAfter.Seconds()))

	return err
}

// buildStreamingRateLimitError creates a rate limit error for streaming connections
func (i *RateLimitInterceptor) buildStreamingRateLimitError(quotaInfo *QuotaInfo, endpoint string, clientKey string) error {
	// For streaming, we return a regular error that will be sent to the client
	var retryAfter time.Duration
	if quotaInfo != nil {
		retryAfter = time.Until(quotaInfo.ResetTime)
		if retryAfter < 0 {
			retryAfter = 0
		}
	} else {
		retryAfter = time.Minute
	}

	i.logger.Warn("Rate limit exceeded for streaming connection",
		zap.String("key", clientKey),
		zap.String("endpoint", endpoint),
		zap.Duration("retry_after", retryAfter))

	return base.RiverError(protocol.Err_RESOURCE_EXHAUSTED, "rate limit exceeded").
		Message("Rate limit exceeded for streaming connection").
		Tag("endpoint", endpoint).
		Tag("retryAfter", retryAfter.String())
}

// getEndpointLimit returns the rate limit for an endpoint (helper for error response)
func getEndpointLimit(endpoint string) uint64 {
	// This is a placeholder - in practice, you'd look up the actual limit from config
	// For now, return a default value
	return 50
}


// SetMetrics allows setting custom metrics (useful for testing)
func (i *RateLimitInterceptor) SetMetrics(metrics *Metrics) {
	i.metrics = metrics
}