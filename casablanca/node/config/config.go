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
	SkipDelegateCheck   bool
	PerformanceTracking PerformanceTrackingConfig
	WalletPrivateKey string
}

type ChainConfig struct {
	NetworkUrl string
	ChainId    int
}

type PerformanceTrackingConfig struct {
	ProfilingEnabled bool
}
