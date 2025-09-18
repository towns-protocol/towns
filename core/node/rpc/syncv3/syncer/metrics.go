package syncer

import (
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/infra"
)

func (r *registryImpl) runMetricsCollector(metrics infra.MetricsFactory) {
	metrics.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stream_syncv3_syncers_registry_queue_size",
			Help: "Sync v3 syncers registry queue size",
		},
		func() float64 { return float64(r.queue.Len()) },
	)
	metrics.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stream_syncv3_syncing_streams_count",
			Help: "Total number of streams being synced across all sync v3 operations",
		},
		func() float64 {
			r.syncersLock.Lock()
			count := len(r.syncers)
			r.syncersLock.Unlock()
			return float64(count)
		},
	)
}
