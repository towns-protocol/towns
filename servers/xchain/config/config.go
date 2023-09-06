package config

import (
	infra "casablanca/node/infra/config"
)

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	Metrics infra.MetricsConfig
	Log     infra.LogConfig
	Chain   []ChainConfig
}

type ChainConfig struct {
	NetworkUrl string
	ChainId    int
}
