package config

import (
	"context"
	"time"

	"github.com/river-build/river/core/node/logging"
)

type BlockchainInfo struct {
	ChainId uint64
	Name    string
	// IsEtherBased is true for chains that use Ether as the currency for fees.
	IsEtherBased bool
	Blocktime    time.Duration
}

func GetEtherBasedBlockchains(
	ctx context.Context,
	chains []uint64,
	defaultBlockchainInfo map[uint64]BlockchainInfo,
) []uint64 {
	log := logging.FromCtx(ctx)
	etherBasedChains := make([]uint64, 0, len(chains))
	for _, chainId := range chains {
		if info, ok := defaultBlockchainInfo[chainId]; ok && info.IsEtherBased {
			etherBasedChains = append(etherBasedChains, chainId)
		} else if !ok {
			log.Errorw("Missing BlockchainInfo for chain", "chainId", chainId)
		}
	}
	return etherBasedChains
}

func GetDefaultBlockchainInfo() map[uint64]BlockchainInfo {
	return map[uint64]BlockchainInfo{
		1: {
			ChainId:      1,
			Name:         "Ethereum Mainnet",
			Blocktime:    12 * time.Second,
			IsEtherBased: true,
		},
		11155111: {
			ChainId:      11155111,
			Name:         "Ethereum Sepolia",
			Blocktime:    12 * time.Second,
			IsEtherBased: true,
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
			ChainId:      8453,
			Name:         "Base Mainnet",
			Blocktime:    2 * time.Second,
			IsEtherBased: true,
		},
		84532: {
			ChainId:      84532,
			Name:         "Base Sepolia",
			Blocktime:    2 * time.Second,
			IsEtherBased: true,
		},
		137: {
			ChainId:   137,
			Name:      "Polygon Mainnet",
			Blocktime: 2 * time.Second,
		},
		42161: {
			ChainId:      42161,
			Name:         "Arbitrum One",
			Blocktime:    250 * time.Millisecond,
			IsEtherBased: true,
		},
		10: {
			ChainId:      10,
			Name:         "Optimism Mainnet",
			Blocktime:    2 * time.Second,
			IsEtherBased: true,
		},
		31337: {
			ChainId:      31337,
			Name:         "Anvil Base",
			Blocktime:    time.Second,
			IsEtherBased: true,
		},
		31338: {
			ChainId:      31338,
			Name:         "Anvil River",
			Blocktime:    time.Second,
			IsEtherBased: true, // This is set for ease of testing.
		},
		100: {
			ChainId:   100,
			Name:      "Gnosis",
			Blocktime: 5 * time.Second,
		},
		10200: {
			ChainId:   10200,
			Name:      "Gnosis Chiado Testnet",
			Blocktime: 5 * time.Second,
		},
	}
}
