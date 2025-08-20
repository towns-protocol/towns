package rpc

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/stream_sync_monitor"
)

func RunStreamSyncMonitor(ctx context.Context, cfg *config.Config) error {
	// Initialize blockchain connection
	blockchain, err := crypto.NewBlockchain(
		ctx,
		&cfg.RiverChain,
		nil,
		infra.NewMetricsFactory(nil, "river", "sync_monitor"),
		nil,
	)
	if err != nil {
		return err
	}

	// Initialize river registry first to get the registry contract address
	riverRegistry, err := registries.NewRiverRegistryContract(
		ctx,
		blockchain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	if err != nil {
		return err
	}

	// Initialize on-chain config with proper parameters
	onChainConfig, err := crypto.NewOnChainConfig(
		ctx,
		blockchain.Client,
		riverRegistry.Address,
		blockchain.InitialBlockNum,
		blockchain.ChainMonitor,
	)
	if err != nil {
		return err
	}

	// Create HTTP client
	httpClient, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return err
	}

	// Initialize node registry
	nodeRegistry, err := nodes.LoadNodeRegistry(
		ctx,
		riverRegistry,
		common.Address{}, // local address (not applicable for monitor)
		blockchain.InitialBlockNum,
		blockchain.ChainMonitor,
		onChainConfig,
		httpClient,
		httpClient, // no cert client needed
		nil,        // no otel interceptor
	)
	if err != nil {
		return err
	}

	nodeRegistries := []nodes.NodeRegistry{nodeRegistry}

	metricsFactory := infra.NewMetricsFactory(nil, "river", "sync_monitor")

	// Create and run the service
	service, err := stream_sync_monitor.NewService(
		ctx,
		cfg,
		onChainConfig,
		riverRegistry,
		nodeRegistries,
		metricsFactory,
	)
	if err != nil {
		return err
	}

	return service.Run(ctx)
}
