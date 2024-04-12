package config

import (
	"fmt"
	"strconv"
	"strings"

	node_config "github.com/river-build/river/core/node/config"
	infra "github.com/river-build/river/core/node/infra/config"
)

type ContractVersion string

const (
	VersionDev ContractVersion = "dev"
	VersionV3  ContractVersion = "v3"
)

// Viper uses mapstructure module to marshal settings into config struct.
type Config struct {
	Metrics                       infra.MetricsConfig `mapstructure:"metrics"`
	Log                           infra.LogConfig     `mapstructure:"log"`
	ChainsString                  string              `mapstructure:"chains"`
	Chains                        map[uint64]string   `mapstructure:"-"` // This is a derived field
	EntitlementContract           ContractConfig      `mapstructure:"entitlement_contract"`
	TestingContract               ContractConfig      `mapstructure:"test_contract"`
	contractVersion               ContractVersion     `mapstructure:"contract_version"`
	TestCustomEntitlementContract ContractConfig      `mapstructure:"test_custom_entitlement_contract"`

	// Blockchain configuration
	BaseChain  node_config.ChainConfig
	RiverChain node_config.ChainConfig
}

type ContractConfig struct {
	Address string
}

var cmdConfig *Config

func parseChain(chainStr string) map[uint64]string {
	chainUrls := make(map[uint64]string)
	chainPairs := strings.Split(chainStr, ",")
	for _, pair := range chainPairs {
		parts := strings.SplitN(pair, ":", 2) // Use SplitN to split into exactly two parts
		if len(parts) == 2 {
			chainID, err := strconv.Atoi(parts[0])
			if err != nil {
				fmt.Printf("Error converting chainID to int: %v\n", err)
				continue
			}
			chainUrls[uint64(chainID)] = parts[1]
		}
	}
	return chainUrls
}

func GetConfig() *Config {
	return cmdConfig
}

func SetConfig(config *Config) {
	chains := parseChain(config.ChainsString)
	config.Chains = chains
	cmdConfig = config
}

func (c *Config) GetContractVersion() ContractVersion {
	if c.contractVersion == VersionV3 {
		return VersionV3
	} else {
		return VersionDev
	}
}
