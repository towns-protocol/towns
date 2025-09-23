package handler

import (
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/infra"
)

func (s *syncStreamHandlerRegistryImpl) runMetricsCollector(metrics infra.MetricsFactory) {
	metrics.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stream_syncv3_sync_ops_count",
			Help: "Total number of active sync v3 operations",
		},
		func() float64 {
			s.handlersLock.Lock()
			count := len(s.handlers)
			s.handlersLock.Unlock()
			return float64(count)
		},
	)
}
