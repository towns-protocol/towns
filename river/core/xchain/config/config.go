package config

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/ethereum/go-ethereum/common"
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
	EntitlementCheckerContract    ContractConfig      `mapstructure:"entitlement_checker_contract"`
	WalletLinkContract            ContractConfig      `mapstructure:"wallet_link_contract"`
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

func (c *Config) GetContractVersion() ContractVersion {
	if c.contractVersion == VersionV3 {
		return VersionV3
	} else {
		return VersionDev
	}
}

func (c *Config) GetCheckerContractAddress() common.Address {
	return common.HexToAddress(c.EntitlementCheckerContract.Address)
}

func (c *Config) GetWalletLinkContractAddress() common.Address {
	return common.HexToAddress(c.WalletLinkContract.Address)
}

func (c *Config) GetMockEntitlementContractAddress() common.Address {
	return common.HexToAddress(c.TestingContract.Address)
}

func (c *Config) GetTestCustomEntitlementContractAddress() common.Address {
	return common.HexToAddress(c.TestCustomEntitlementContract.Address)
}

func (c *Config) Init() {
	c.parseChains()
}

func (c *Config) parseChains() {
	chainUrls := make(map[uint64]string)
	chainPairs := strings.Split(c.ChainsString, ",")
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
	c.Chains = chainUrls
}
