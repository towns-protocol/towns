package entitlement

import (
	"context"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/infra"
)

type Evaluator struct {
	clients         BlockchainClientPool
	contractVersion config.ContractVersion
	evalHistrogram  *prometheus.HistogramVec
}

func NewEvaluatorFromConfig(ctx context.Context, cfg *config.Config, metrics infra.MetricsFactory) (*Evaluator, error) {
	clients, err := NewBlockchainClientPool(ctx, cfg)
	if err != nil {
		return nil, err
	}
	return &Evaluator{
		clients:         clients,
		contractVersion: cfg.GetContractVersion(),
		evalHistrogram: metrics.NewHistogramVecEx(
			"entitlement_op_duration_seconds",
			"Duration of entitlement evaluation",
			infra.DefaultDurationBucketsSeconds,
			"operation",
		),
	}, nil
}
