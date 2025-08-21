package ratelimit

import (
	"net"
	"time"
)

// Config represents the complete rate limiting configuration
type Config struct {
	// Global enable/disable flag - defaults to FALSE
	Enabled bool `yaml:"enabled" default:"false"`

	// Memory management for IP tracking
	MaxTrackedIPs     int           `yaml:"maxTrackedIPs" default:"100000"`
	CleanupInterval   time.Duration `yaml:"cleanupInterval" default:"5m"`
	InactivityTimeout time.Duration `yaml:"inactivityTimeout" default:"30m"`

	// Global defaults for unconfigured endpoints
	GlobalLimits GlobalLimitConfig `yaml:"globalLimits"`

	// Per-endpoint configurations
	EndpointLimits []EndpointLimitConfig `yaml:"endpointLimits"`

	// Special IP exemptions (allowlist)
	ExemptIPs []string `yaml:"exemptIPs"`

	// Metrics always enabled
	MetricsEnabled bool `yaml:"metricsEnabled" default:"true"`
}


// GlobalLimitConfig represents fallback limits for endpoints not explicitly configured
type GlobalLimitConfig struct {
	Rate     uint64        `yaml:"rate" default:"50"`     // Default rate for unconfigured endpoints
	Interval time.Duration `yaml:"interval" default:"1m"` // Default interval
}

// EndpointLimitConfig represents rate limit configuration for a specific endpoint
type EndpointLimitConfig struct {
	Endpoint string        `yaml:"endpoint"`   // Full gRPC method path (e.g., "/river.StreamService/CreateStream")
	Rate     uint64        `yaml:"rate"`       // Number of requests allowed
	Interval time.Duration `yaml:"interval"`   // Time window (e.g., 1m, 1h, 24h)
	Disabled bool          `yaml:"disabled"`   // If true, no rate limiting applied to this endpoint
}

// ParsedConfig contains the processed configuration with parsed network ranges
type ParsedConfig struct {
	*Config
	ExemptIPNets []*net.IPNet                   // Parsed exempt IP networks
	EndpointMap  map[string]EndpointLimitConfig // Quick lookup map
}

// ParseConfig processes the raw configuration into a more usable form
func ParseConfig(config *Config) (*ParsedConfig, error) {
	parsed := &ParsedConfig{
		Config:      config,
		EndpointMap: make(map[string]EndpointLimitConfig),
	}

	// Parse exempt IP networks
	for _, cidr := range config.ExemptIPs {
		_, ipNet, err := net.ParseCIDR(cidr)
		if err != nil {
			// Try parsing as single IP
			ip := net.ParseIP(cidr)
			if ip == nil {
				return nil, err
			}
			// Convert single IP to /32 or /128 network
			mask := net.CIDRMask(32, 32)
			if ip.To4() == nil {
				mask = net.CIDRMask(128, 128)
			}
			ipNet = &net.IPNet{IP: ip, Mask: mask}
		}
		parsed.ExemptIPNets = append(parsed.ExemptIPNets, ipNet)
	}

	// Build endpoint lookup map
	for _, endpoint := range config.EndpointLimits {
		parsed.EndpointMap[endpoint.Endpoint] = endpoint
	}

	return parsed, nil
}

// DefaultConfig returns a sensible default configuration
func DefaultConfig() *Config {
	return &Config{
		Enabled:           false,
		MaxTrackedIPs:     100000,
		CleanupInterval:   5 * time.Minute,
		InactivityTimeout: 30 * time.Minute,
		GlobalLimits: GlobalLimitConfig{
			Rate:     50,
			Interval: time.Minute,
		},
		EndpointLimits: []EndpointLimitConfig{
			{
				Endpoint: "/river.StreamService/CreateStream",
				Rate:     10,
				Interval: time.Minute,
			},
			{
				Endpoint: "/river.StreamService/AddEvent",
				Rate:     100,
				Interval: time.Minute,
			},
			{
				Endpoint: "/river.StreamService/GetStream",
				Rate:     1000,
				Interval: time.Minute,
			},
			{
				Endpoint: "/river.AppRegistryService/Register",
				Rate:     1,
				Interval: time.Hour,
			},
			{
				Endpoint: "/river.AppRegistryService/GetAppMetadata",
				Disabled: true,
			},
			{
				Endpoint: "/river.AppRegistryService/GetStatus",
				Disabled: true,
			},
		},
		ExemptIPs: []string{
			"127.0.0.1/32", // Localhost only
		},
		MetricsEnabled: true,
	}
}