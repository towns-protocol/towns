package stream_sync_monitor

import (
	"context"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/stream_sync_monitor/sync"
)

type Service struct {
	monitor *sync.StreamSyncMonitor
}

func NewService(
	ctx context.Context,
	cfg *config.Config,
	onChainConfig crypto.OnChainConfiguration,
	riverRegistry *registries.RiverRegistryContract,
	nodeRegistries []nodes.NodeRegistry,
	metricsFactory infra.MetricsFactory,
) (*Service, error) {
	monitor, err := sync.NewStreamSyncMonitor(
		ctx,
		cfg,
		riverRegistry,
		onChainConfig,
		nodeRegistries,
		metricsFactory,
		nil, // otelTracer - can be added later
	)
	if err != nil {
		return nil, err
	}

	return &Service{
		monitor: monitor,
	}, nil
}

func (s *Service) Run(ctx context.Context) error {
	log := logging.FromCtx(ctx)
	log.Infow("Starting stream sync monitor service",
		"monitoredNodes", s.monitor.Config().MonitoredNodeAddresses,
		"lagThreshold", s.monitor.Config().LagThreshold,
		"stackTraceOutputDir", s.monitor.Config().StackTraceOutputDir,
	)

	return s.monitor.Run(ctx)
}