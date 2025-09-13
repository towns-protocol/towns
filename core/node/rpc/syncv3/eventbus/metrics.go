package eventbus

import (
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/infra"
)

func (e *eventBusImpl) runMetricsCollector(metrics infra.MetricsFactory) {
	metrics.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stream_syncv3_event_bus_queue_size",
			Help: "Sync v3 event bus queue size",
		},
		func() float64 { return float64(e.queue.Len()) },
	)
}
