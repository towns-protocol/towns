package config

import (
	infra "casablanca/node/infra/config"
)

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	Port                int
	Address             string
	DbUrl               string
	StorageType         string
	Metrics             infra.MetricsConfig
	Chain               ChainConfig
	TopChain            ChainConfig
	UseContract         bool
	Log                 infra.LogConfig
	PerformanceTracking PerformanceTrackingConfig
	PushNotification    PushNotificationConfig
	Stream              StreamConfig
	NodeRegistry        string
	WalletPrivateKey    string
	LogInstance         bool
}

type ChainConfig struct {
	NetworkUrl string
	ChainId    int
}

type PerformanceTrackingConfig struct {
	ProfilingEnabled bool
}

type PushNotificationConfig struct {
	AuthToken string
	Url       string
}

type StreamConfig struct {
	Media MediaStreamConfig
}

type MediaStreamConfig struct {
	MaxChunkCount int
	MaxChunkSize  int
}
