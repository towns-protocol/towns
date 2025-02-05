package entitlement

import (
	"context"

	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/trace"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/infra"
)

type Evaluator struct {
	clients        BlockchainClientPool
	evalHistrogram *prometheus.HistogramVec
	ethChainIds    []uint64
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
	return &Evaluator{
		clients: clients,
		evalHistrogram: metrics.NewHistogramVecEx(
			"entitlement_op_duration_seconds",
			"Duration of entitlement evaluation",
			infra.DefaultRpcDurationBucketsSeconds,
			"operation",
		),
		ethChainIds: config.GetEtherBasedBlockchains(
			ctx,
			onChainCfg.Get().XChain.Blockchains,
			blockChainInfo,
		),
	}, nil
}

func (e *Evaluator) GetClient(chainId uint64) (crypto.BlockchainClient, error) {
	return e.clients.Get(chainId)
}
