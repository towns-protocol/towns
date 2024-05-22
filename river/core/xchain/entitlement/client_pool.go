package entitlement

import (
	"context"

	"github.com/river-build/river/core/node/config"

	"github.com/ethereum/go-ethereum/ethclient"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
)

type (
	// BlockchainClientPool is a pool of reusable blockchain clients
	BlockchainClientPool interface {
		Get(chainID uint64) (crypto.BlockchainClient, error)
	}

	// blockchainClientPoolImpl is a basic implementation of BlockchainClientPool and uses ethclient.Client as
	// blockchain clients.
	blockchainClientPoolImpl struct {
		clients map[uint64]crypto.BlockchainClient
	}
)

// NewBlockchainClientPool creates a new blockchain client pool for the chains in the given cfg.
// It uses ethclient.Client instances that are safe to use concurrently. Therefor the pool keeps a reference to each
// client and there is no need for callers to return the obtained client back to the pool after use.
func NewBlockchainClientPool(ctx context.Context, cfg *config.Config) (BlockchainClientPool, error) {
	log := dlog.FromCtx(ctx)
	clients := make(map[uint64]crypto.BlockchainClient)
	for chainID, endpoint := range cfg.Chains {
		if _, got := clients[chainID]; got {
			return nil, RiverError(Err_BAD_CONFIG, "Duplicate chain in configuration").Tag("chainId", chainID)
		}

		client, err := ethclient.DialContext(ctx, endpoint)
		if err != nil {
			log.Warn("Unable to dial endpoint", "chainId", chainID, "endpoint", endpoint, "err", err)
			continue
		}

		// make sure that the endpoint points to the correct endpoint
		fetchedChainID, err := client.ChainID(ctx)
		if err != nil {
			client.Close()
			log.Warn("Unable to connect to endpoint", "chainId", chainID, "endpoint", endpoint, "err", err)
			continue
		}
		if fetchedChainID.Uint64() != chainID {
			log.Warn("Chain points to different endpoint", "chainId", chainID, "gotChainId", fetchedChainID, "url", endpoint)
			client.Close()
			continue
		}

		clients[chainID] = client
	}

	return &blockchainClientPoolImpl{clients: clients}, nil
}

// Get a blockchain client that connects to the chain identified by the given chainID.
// Callers don't have to return the client back to the pool after use.
func (pool *blockchainClientPoolImpl) Get(chainID uint64) (crypto.BlockchainClient, error) {
	if client, ok := pool.clients[chainID]; ok {
		return client, nil
	}
	return nil, RiverError(Err_NOT_FOUND, "Unsupported chain").Tag("chainID", chainID)
}
