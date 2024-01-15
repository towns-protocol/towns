package config

import (
	infra "github.com/river-build/river/infra/config"
)

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	Metrics             infra.MetricsConfig `mapstructure:"metrics"`
	Log                 infra.LogConfig     `mapstructure:"log"`
	Chain               []ChainConfig       `mapstructure:"chain"`
	EntitlementContract ContractConfig      `mapstructure:"entitlement_contract"`
	TestingContract     ContractConfig      `mapstructure:"test_contract"`
}
type ChainConfig struct {
	NetworkUrl string
	ChainId    int
}

type ContractConfig struct {
	Url     string
	Address string
	ChainId int
}

var cmdConfig *Config

func GetConfig() *Config {
	return cmdConfig
}

func SetConfig(config *Config) {
	cmdConfig = config
}
