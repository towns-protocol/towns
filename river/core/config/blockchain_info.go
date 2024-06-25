package config

import "time"

type BlockchainInfo struct {
	ChainId   uint64
	Name      string
	Blocktime time.Duration
}

func GetDefaultBlockchainInfo() map[uint64]BlockchainInfo {
	return map[uint64]BlockchainInfo{
		1: {
			ChainId:   1,
			Name:      "Ethereum Mainnet",
			Blocktime: 12 * time.Second,
		},
		11155111: {
			ChainId:   11155111,
			Name:      "Ethereum Sepolia",
			Blocktime: 12 * time.Second,
		},
		550: {
			ChainId:   550,
			Name:      "River Mainnet",
			Blocktime: 2 * time.Second,
		},
		6524490: {
			ChainId:   6524490,
			Name:      "River Testnet",
			Blocktime: 2 * time.Second,
		},
		8453: {
			ChainId:   8453,
			Name:      "Base Mainnet",
			Blocktime: 2 * time.Second,
		},
		84532: {
			ChainId:   84532,
			Name:      "Base Sepolia",
			Blocktime: 2 * time.Second,
		},
		137: {
			ChainId:   137,
			Name:      "Polygon Mainnet",
			Blocktime: 2 * time.Second,
		},
		42161: {
			ChainId:   42161,
			Name:      "Arbitrum One",
			Blocktime: 250 * time.Millisecond,
		},
		10: {
			ChainId:   10,
			Name:      "Optimism Mainnet",
			Blocktime: 2 * time.Second,
		},
		31337: {
			ChainId:   31337,
			Name:      "Anvil Base",
			Blocktime: 2 * time.Second,
		},
		31338: {
			ChainId:   31338,
			Name:      "Anvil River",
			Blocktime: 2 * time.Second,
		},
	}
}
