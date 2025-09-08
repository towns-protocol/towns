package ratelimit

import (
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics contains all Prometheus metrics for the rate limiter
type Metrics struct {
	// Core metrics - ALWAYS ACTIVE (even when rate limiting disabled)
	requestsTotal        *prometheus.CounterVec   // All requests by endpoint/ip_hash
	requestDuration      *prometheus.HistogramVec // Request processing time by endpoint
	concurrentIPs        prometheus.Gauge         // Active IPs being tracked

	// Rate limiting specific metrics
	rateLimitAllowed     *prometheus.CounterVec // Labels: endpoint, ip_hash
	rateLimitDenied      *prometheus.CounterVec // Labels: endpoint, ip_hash
	rateLimitViolations  *prometheus.CounterVec // Labels: endpoint, ip_hash

	// Token bucket state metrics (per endpoint)
	tokenBucketTokens   *prometheus.GaugeVec // Labels: endpoint
	tokenBucketCapacity *prometheus.GaugeVec // Labels: endpoint

	// System health metrics
	memoryUsage       prometheus.Gauge           // Memory used by IP limiters
	trackedIPsCount   prometheus.Gauge           // Current number of tracked IPs
	cleanupOperations *prometheus.CounterVec     // Labels: operation (evicted, expired)
	configReloads     prometheus.Counter         // Config reload events

	// Business metrics for tuning limits
	endpointUsage       *prometheus.HistogramVec // Request rate distribution by endpoint
	ipBehaviorPattern   *prometheus.HistogramVec // IP request patterns (burst detection)
	peakConcurrencyPerIP *prometheus.GaugeVec    // Peak usage per IP range
}

// NewMetricsWithRegistry creates metrics with a custom registry (useful for testing)
func NewMetricsWithRegistry(registerer prometheus.Registerer) *Metrics {
	// For testing, we can use a no-op metrics implementation to avoid conflicts
	// TODO: Implement proper custom registry support
	if registerer != prometheus.DefaultRegisterer {
		return &Metrics{
			// Create no-op metrics that don't panic
			requestsTotal:        prometheus.NewCounterVec(prometheus.CounterOpts{Name: "test_requests_total"}, []string{"endpoint", "ip_hash"}),
			requestDuration:      prometheus.NewHistogramVec(prometheus.HistogramOpts{Name: "test_request_duration_seconds"}, []string{"endpoint"}),
			concurrentIPs:        prometheus.NewGauge(prometheus.GaugeOpts{Name: "test_concurrent_ips"}),
			rateLimitAllowed:     prometheus.NewCounterVec(prometheus.CounterOpts{Name: "test_rate_limit_allowed_total"}, []string{"endpoint", "ip_hash"}),
			rateLimitDenied:      prometheus.NewCounterVec(prometheus.CounterOpts{Name: "test_rate_limit_denied_total"}, []string{"endpoint", "ip_hash"}),
			rateLimitViolations:  prometheus.NewCounterVec(prometheus.CounterOpts{Name: "test_rate_limit_violations_total"}, []string{"endpoint", "ip_hash"}),
			tokenBucketTokens:    prometheus.NewGaugeVec(prometheus.GaugeOpts{Name: "test_token_bucket_tokens"}, []string{"endpoint"}),
			tokenBucketCapacity: prometheus.NewGaugeVec(prometheus.GaugeOpts{Name: "test_token_bucket_capacity"}, []string{"endpoint"}),
			memoryUsage:         prometheus.NewGauge(prometheus.GaugeOpts{Name: "test_memory_usage"}),
			trackedIPsCount:     prometheus.NewGauge(prometheus.GaugeOpts{Name: "test_tracked_ips_count"}),
			cleanupOperations:   prometheus.NewCounterVec(prometheus.CounterOpts{Name: "test_cleanup_operations_total"}, []string{"operation"}),
			configReloads:       prometheus.NewCounter(prometheus.CounterOpts{Name: "test_config_reloads"}),
		}
	}
	// Fall through to default implementation
	return NewMetrics()
}

// NewMetrics creates and registers all rate limiter metrics
func NewMetrics() *Metrics {
	return &Metrics{
		// Core metrics
		requestsTotal: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "rate_limit_requests_total",
				Help: "Total number of requests processed by the rate limiter",
			},
			[]string{"endpoint", "ip_hash"},
		),
		requestDuration: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "rate_limit_request_duration_seconds",
				Help:    "Request processing duration in seconds",
				Buckets: prometheus.DefBuckets,
			},
			[]string{"endpoint"},
		),
		concurrentIPs: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "rate_limit_concurrent_ips",
				Help: "Number of IP addresses currently being tracked",
			},
		),

		// Rate limiting metrics
		rateLimitAllowed: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "rate_limit_allowed_total",
				Help: "Total number of requests allowed by rate limiter",
			},
			[]string{"endpoint", "ip_hash"},
		),
		rateLimitDenied: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "rate_limit_denied_total",
				Help: "Total number of requests denied by rate limiter",
			},
			[]string{"endpoint", "ip_hash"},
		),
		rateLimitViolations: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "rate_limit_violations_total",
				Help: "Total number of rate limit violations detected",
			},
			[]string{"endpoint", "ip_hash"},
		),

		// Token bucket metrics
		tokenBucketTokens: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "rate_limit_token_bucket_tokens",
				Help: "Current number of tokens available in bucket",
			},
			[]string{"endpoint"},
		),
		tokenBucketCapacity: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "rate_limit_token_bucket_capacity",
				Help: "Maximum capacity of token bucket",
			},
			[]string{"endpoint"},
		),

		// System health metrics
		memoryUsage: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "rate_limit_memory_bytes",
				Help: "Memory usage of rate limiter in bytes",
			},
		),
		trackedIPsCount: promauto.NewGauge(
			prometheus.GaugeOpts{
				Name: "rate_limit_tracked_ips_count",
				Help: "Current number of tracked IP addresses",
			},
		),
		cleanupOperations: promauto.NewCounterVec(
			prometheus.CounterOpts{
				Name: "rate_limit_cleanup_operations_total",
				Help: "Total number of cleanup operations performed",
			},
			[]string{"operation"},
		),
		configReloads: promauto.NewCounter(
			prometheus.CounterOpts{
				Name: "rate_limit_config_reloads_total",
				Help: "Total number of configuration reloads",
			},
		),

		// Business metrics
		endpointUsage: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "rate_limit_endpoint_usage_seconds",
				Help:    "Request rate distribution by endpoint",
				Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10},
			},
			[]string{"endpoint"},
		),
		ipBehaviorPattern: promauto.NewHistogramVec(
			prometheus.HistogramOpts{
				Name:    "rate_limit_ip_behavior_requests_per_minute",
				Help:    "IP request patterns for burst detection",
				Buckets: []float64{1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000},
			},
			[]string{"ip_hash"},
		),
		peakConcurrencyPerIP: promauto.NewGaugeVec(
			prometheus.GaugeOpts{
				Name: "rate_limit_peak_concurrency_per_ip",
				Help: "Peak concurrent requests per IP address",
			},
			[]string{"ip_hash"},
		),
	}
}

// RecordRequest records a request for metrics (always active)
func (m *Metrics) RecordRequest(endpoint string, key string, duration time.Duration) {
	keyHash := hashKey(key)
	m.requestsTotal.WithLabelValues(endpoint, keyHash).Inc()
	m.requestDuration.WithLabelValues(endpoint).Observe(duration.Seconds())
	m.endpointUsage.WithLabelValues(endpoint).Observe(duration.Seconds())
}

// RecordAllowed records an allowed request
func (m *Metrics) RecordAllowed(endpoint string, key string) {
	keyHash := hashKey(key)
	m.rateLimitAllowed.WithLabelValues(endpoint, keyHash).Inc()
}

// RecordDenied records a denied request
func (m *Metrics) RecordDenied(endpoint string, key string) {
	keyHash := hashKey(key)
	m.rateLimitDenied.WithLabelValues(endpoint, keyHash).Inc()
	m.rateLimitViolations.WithLabelValues(endpoint, keyHash).Inc()
}

// RecordTokenBucketState records the current state of a token bucket
func (m *Metrics) RecordTokenBucketState(endpoint string, tokens, capacity uint64) {
	m.tokenBucketTokens.WithLabelValues(endpoint).Set(float64(tokens))
	m.tokenBucketCapacity.WithLabelValues(endpoint).Set(float64(capacity))
}

// SetConcurrentIPs sets the number of concurrent IPs being tracked
func (m *Metrics) SetConcurrentIPs(count int) {
	m.concurrentIPs.Set(float64(count))
}

// SetTrackedIPsCount sets the number of tracked IPs
func (m *Metrics) SetTrackedIPsCount(count int) {
	m.trackedIPsCount.Set(float64(count))
}

// SetMemoryUsage sets the memory usage in bytes
func (m *Metrics) SetMemoryUsage(bytes int64) {
	m.memoryUsage.Set(float64(bytes))
}

// RecordCleanupOperation records a cleanup operation
func (m *Metrics) RecordCleanupOperation(operation string) {
	m.cleanupOperations.WithLabelValues(operation).Inc()
}

// RecordConfigReload records a configuration reload
func (m *Metrics) RecordConfigReload() {
	m.configReloads.Inc()
}

// RecordKeyBehavior records key behavior pattern for burst detection
func (m *Metrics) RecordKeyBehavior(key string, requestsPerMinute float64) {
	keyHash := hashKey(key)
	m.ipBehaviorPattern.WithLabelValues(keyHash).Observe(requestsPerMinute)
}

// SetPeakConcurrencyPerKey sets peak concurrency for a key
func (m *Metrics) SetPeakConcurrencyPerKey(key string, concurrency int) {
	keyHash := hashKey(key)
	m.peakConcurrencyPerIP.WithLabelValues(keyHash).Set(float64(concurrency))
}

// hashKey creates a privacy-protecting hash of the key for metrics
// Uses only first 8 bytes to control cardinality while maintaining some uniqueness
func hashKey(key string) string {
	if key == "" {
		return "unknown"
	}
	hasher := sha256.New()
	hasher.Write([]byte(key))
	return fmt.Sprintf("%x", hasher.Sum(nil)[:8])
}