package config

import (
	"time"

	"github.com/ethereum/go-ethereum/common"
	infra "github.com/river-build/river/core/node/infra/config"
)

type TLSConfig struct {
	Cert   string // Path to certificate file or BASE64 encoded certificate
	Key    string `dlog:"omit" json:"-"` // Path to key file or BASE64 encoded key. Sensitive data, omitted from logging.
	TestCA string // Path to CA certificate file or BASE64 encoded CA certificate
}

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	// Network
	// 0 can be used in tests to elect a free available port.
	Port int
	// DNS name of the node. Used to select interface to listen on. Can be empty.
	Address string

	UseHttps  bool // If TRUE TLSConfig must be set.
	TLSConfig TLSConfig

	// Storage
	Database    DatabaseConfig
	StorageType string

	// Blockchain configuration
	BaseChain  ChainConfig
	RiverChain ChainConfig

	// Base chain contract configuration
	ArchitectContract  ContractConfig
	WalletLinkContract ContractConfig

	// Contract configuration
	RegistryContract ContractConfig

	// Logging
	Log infra.LogConfig

	// Metrics
	Metrics             infra.MetricsConfig
	PerformanceTracking PerformanceTrackingConfig

	// Stream configuration
	Stream StreamConfig

	// Network configuration
	Network NetworkConfig

	// Feature flags
	// Used to disable functionality for some testing setups.

	// Disable base chain contract usage.
	DisableBaseChain bool
}

type NetworkConfig struct {
	NumRetries int
}

type DatabaseConfig struct {
	Url      string `dlog:"omit" json:"-"` // Sensitive data, omitted from logging.
	Host     string
	Port     int
	User     string
	Password string `dlog:"omit" json:"-"` // Sensitive data, omitted from logging.
	Database string
	Extra    string
}

type ChainConfig struct {
	NetworkUrl  string
	ChainId     uint64
	BlockTimeMs uint64

	// TODO: these need to be removed from here
	LinkedWalletsLimit                 int
	ContractCallsTimeoutMs             int
	PositiveEntitlementCacheSize       int
	PositiveEntitlementCacheTTLSeconds int
	NegativeEntitlementCacheSize       int
	NegativeEntitlementCacheTTLSeconds int
}

type PerformanceTrackingConfig struct {
	ProfilingEnabled bool
	TracingEnabled   bool
}

type StreamConfig struct {
	Media                       MediaStreamConfig
	RecencyConstraints          RecencyConstraintsConfig
	ReplicationFactor           int
	DefaultMinEventsPerSnapshot int
	MinEventsPerSnapshot        map[string]int
	// CacheExpiration is the interval (secs) after streams with no activity in the cache are expired and evicted
	CacheExpiration time.Duration
	// CacheExpirationPollIntervalSec is the interval to check for inactive streams in the cache
	// (default=CacheExpiration/10)
	CacheExpirationPollInterval time.Duration
}

type MediaStreamConfig struct {
	MaxChunkCount int
	MaxChunkSize  int
}

type RecencyConstraintsConfig struct {
	AgeSeconds  int
	Generations int
}

type ContractConfig struct {
	// Address of the contract
	Address common.Address
	// Version of the contract to use.
	Version string
}

func (cfg *Config) UsesHTTPS() bool {
	return cfg.UseHttps
}
