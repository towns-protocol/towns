package config

import (
	infra "casablanca/node/infra/config"
)

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	// Network
	// 0 can be used in tests to elect a free available port.
	Port int
	// DNS name of the node. Used to select interface to listen on. Can be empty.
	Address string

	// Storage
	Database    DatabaseConfig
	StorageType string

	// Blockchain configuration
	BaseChain  ChainConfig
	RiverChain ChainConfig

	// Logging
	Log infra.LogConfig

	// Metrics
	Metrics             infra.MetricsConfig
	PerformanceTracking PerformanceTrackingConfig

	// Push notifications
	// Will be removed for push notifications V2 which will sync streams from outside process.
	PushNotification PushNotificationConfig

	// Stream configuration
	Stream StreamConfig

	// Node registry configuration.
	// Path to .json file with node registry (to be moved to blockchain).
	NodeRegistry string

	// Feature flags
	// Used to disable functionality for some testing setups.
	UseContract                 bool
	UseBlockChainStreamRegistry bool
	SyncVersion                 int

	// What is this and why is it here?
	WalletPrivateKey string
}

type DatabaseConfig struct {
	Url      string
	Host     string
	Port     int
	User     string
	Password string
	Database string
	Extra    string
}

type ChainConfig struct {
	NetworkUrl                         string
	ChainId                            int
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

type PushNotificationConfig struct {
	AuthToken string
	Url       string
}

type StreamConfig struct {
	Media              MediaStreamConfig
	RecencyConstraints RecencyConstraintsConfig
	ReplicationFactor  int
}

type MediaStreamConfig struct {
	MaxChunkCount int
	MaxChunkSize  int
}

type RecencyConstraintsConfig struct {
	AgeSeconds  int
	Generations int
}
