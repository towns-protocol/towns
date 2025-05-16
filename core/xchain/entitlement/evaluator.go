package entitlement

import (
	"context"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
)

type Evaluator struct {
	clients        BlockchainClientPool
	evalHistrogram *prometheus.HistogramVec
	// etherNativeChainIds includes any chain that uses ethereum as a native currency.
	etherNativeChainIds []uint64
	// ethereumNetworkIds refers to the list of actual ethereum mainnet and testnets
	// this network is configured to support. Note that the set of ethereum network ids
	// will necessarily be a subset of etherNativeChainIds.
	ethereumNetworkIds []uint64
	decoder            *crypto.EvmErrorDecoder
}

func NewEvaluatorFromConfig(
	ctx context.Context,
	cfg *config.Config,
	onChainCfg crypto.OnChainConfiguration,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
) (*Evaluator, error) {
	return NewEvaluatorFromConfigWithBlockchainInfo(
		ctx,
		cfg,
		onChainCfg,
		config.GetDefaultBlockchainInfo(),
		metrics,
		tracer,
	)
}

func NewEvaluatorFromConfigWithBlockchainInfo(
	ctx context.Context,
	cfg *config.Config,
	onChainCfg crypto.OnChainConfiguration,
	blockChainInfo map[uint64]config.BlockchainInfo,
	metrics infra.MetricsFactory,
	tracer trace.Tracer,
) (*Evaluator, error) {
	clients, err := NewBlockchainClientPool(ctx, cfg, onChainCfg, metrics, tracer)
	if err != nil {
		return nil, err
	}
	decoder, err := crypto.NewEVMErrorDecoder(
		base.WalletLinkMetaData,
		base.DiamondMetaData,
	)
	if err != nil {
		logging.FromCtx(ctx).Errorw("Unable to create EVM decoder for entitlement evaluator", "error", err)
		return nil, err
	}
	evaluator := Evaluator{
		clients: clients,
		evalHistrogram: metrics.NewHistogramVecEx(
			"entitlement_op_duration_seconds",
			"Duration of entitlement evaluation",
			infra.DefaultRpcDurationBucketsSeconds,
			"operation",
		),
		etherNativeChainIds: config.GetEtherNativeBlockchains(
			ctx,
			onChainCfg.Get().XChain.Blockchains,
			blockChainInfo,
		),
		ethereumNetworkIds: config.GetEthereumNetworkBlockchains(
			ctx,
			onChainCfg.Get().XChain.Blockchains,
			blockChainInfo,
		),
		decoder: decoder,
	}
	logging.FromCtx(ctx).
		Infow("Configuring the entitlement evaluator with the following ethereum chains", "chainIds", evaluator.ethereumNetworkIds)
	return &evaluator, nil
}

func (e *Evaluator) GetClient(chainId uint64) (crypto.BlockchainClient, error) {
	return e.clients.Get(chainId)
}
