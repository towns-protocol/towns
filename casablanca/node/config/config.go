package config

import (
	infra "casablanca/node/infra/config"
)

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	Port        int
	Address     string
	DbUrl       string
	StorageType string
	Metrics     infra.MetricsConfig
	Chain       ChainConfig
	TopChain    ChainConfig
	UseContract bool
	Log         infra.LogConfig
	// TODO HNT-2048 remove once RDK registration/revoke is implemented in the client
	SkipDelegateCheck           bool
	PerformanceTracking         PerformanceTrackingConfig
	PushNotification            PushNotificationConfig
	Stream                      StreamConfig
	NodeRegistry                string
	WalletPrivateKey            string
	LogInstance                 bool
	SyncVersion                 int
	UseBlockChainStreamRegistry bool
}

type ChainConfig struct {
	NetworkUrl string
	ChainId    int
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
	Media MediaStreamConfig
	RecencyConstraints RecencyConstraintsConfig
	ReplicationFactor int
}

type MediaStreamConfig struct {
	MaxChunkCount int
	MaxChunkSize  int
}

type RecencyConstraintsConfig struct {
	AgeSeconds  int
	Generations int
}
