package sync

import (
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/infra"
)

// setupSyncMetrics initializes the Prometheus metrics for the sync handler.
// TODO: Consider adding more metrics as needed for better observability.
func (h *handlerImpl) setupSyncMetrics(factory infra.MetricsFactory) {
	// Metrics for numeric values
	numericMetrics := []struct {
		name     string
		help     string
		getValue func() float64
	}{
		{
			"stream_sync_active_op_count",
			"Total number of active stream sync operations",
			func() float64 { return float64(h.activeSyncOperations.Size()) },
		},
	}
	for _, metric := range numericMetrics {
		factory.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name: metric.name,
				Help: metric.help,
			},
			func(getValue func() float64) func() float64 {
				return func() float64 {
					return getValue()
				}
			}(metric.getValue),
		)
	}
}
