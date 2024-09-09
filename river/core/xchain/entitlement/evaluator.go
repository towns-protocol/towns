package entitlement

import (
	"context"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/infra"
)

type Evaluator struct {
	clients        BlockchainClientPool
	evalHistrogram *prometheus.HistogramVec
	ethChainIds    []uint64
}

func NewEvaluatorFromConfig(ctx context.Context, cfg *config.Config, metrics infra.MetricsFactory) (*Evaluator, error) {
	return NewEvaluatorFromConfigWithBlockchainInfo(
		ctx,
		cfg,
		config.GetDefaultBlockchainInfo(),
		metrics,
	)
}

func NewEvaluatorFromConfigWithBlockchainInfo(
	ctx context.Context,
	cfg *config.Config,
	blockChainInfo map[uint64]config.BlockchainInfo,
	metrics infra.MetricsFactory,
) (*Evaluator, error) {
	clients, err := NewBlockchainClientPool(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &Evaluator{
		clients: clients,
		evalHistrogram: metrics.NewHistogramVecEx(
			"entitlement_op_duration_seconds",
			"Duration of entitlement evaluation",
			infra.DefaultDurationBucketsSeconds,
			"operation",
		),
		ethChainIds: config.GetEtherBasedBlockchains(
			ctx,
			cfg.XChainBlockchains,
			blockChainInfo,
		),
	}, nil
}
