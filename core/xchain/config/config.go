package config

import (
	infra "github.com/river-build/river/core/node/infra/config"
)

type ContractVersion string

const (
	VersionDev ContractVersion = "dev"
	VersionV3  ContractVersion = "v3"
)

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	Metrics             infra.MetricsConfig `mapstructure:"metrics"`
	Log                 infra.LogConfig     `mapstructure:"log"`
	Chain               []ChainConfig       `mapstructure:"chain"`
	EntitlementContract ContractConfig      `mapstructure:"entitlement_contract"`
	TestingContract     ContractConfig      `mapstructure:"test_contract"`
	contractVersion     ContractVersion     `mapstructure:"contract_version"`
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

func (c *Config) GetContractVersion() ContractVersion {
	if c.contractVersion == VersionV3 {
		return VersionV3
	} else {
		return VersionDev
	}
}
