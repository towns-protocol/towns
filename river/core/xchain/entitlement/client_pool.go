package entitlement

import (
	"context"

	"go.opentelemetry.io/otel/trace"

	"github.com/river-build/river/core/config"

	"github.com/ethereum/go-ethereum/ethclient"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/logging"
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
func NewBlockchainClientPool(
	ctx context.Context,
	cfg *config.Config,
	onChainCfg crypto.OnChainConfiguration,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
) (BlockchainClientPool, error) {
	log := logging.FromCtx(ctx)
	clients := make(map[uint64]crypto.BlockchainClient)
	// TODO: This is not creating errors if a client cannot be created for the sake of maintaining
	// data availability on the network. As soon as replicated streams reaches maturity on external
	// networks, consider returning an error, and possibly causing the node to fail to start, if a
	// client cannot be created for any XChain-supported chain.
	for _, chainID := range onChainCfg.Get().XChain.Blockchains {
		chainCfg, ok := cfg.ChainConfigs[chainID]
		if !ok {
			log.Warnw("Chain config not found", "chainId", chainID)
			continue
		}

		client, err := ethclient.DialContext(ctx, chainCfg.NetworkUrl)
		if err != nil {
			log.Warnw("Unable to dial endpoint", "chainId", chainID, "err", err)
			continue
		}

		// make sure that the endpoint points to the correct endpoint
		fetchedChainID, err := client.ChainID(ctx)
		if err != nil {
			client.Close()
			log.Warnw("Unable to connect to endpoint", "chainId", chainID, "err", err)
			continue
		}
		if fetchedChainID.Uint64() != chainID {
			log.Warnw("Chain points to different endpoint", "chainId", chainID, "gotChainId", fetchedChainID)
			client.Close()
			continue
		}

		// Add metrics collection to contract calls for this chain
		clients[chainID] = crypto.NewInstrumentedEthClient(client, chainID, metrics, tracer)
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
