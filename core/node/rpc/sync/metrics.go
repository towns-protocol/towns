package sync

import (
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/infra"
)

// syncMetrics contains the Prometheus metrics for the sync handler.
type syncMetrics struct {
	completedSyncOpsCounter         *prometheus.CounterVec
	syncingStreamsPerOpHistogram    prometheus.Histogram
	messageBufferSizePerOpHistogram prometheus.Histogram
	sentMessagesHistogram           prometheus.Histogram
}

// setupSyncMetrics initializes the Prometheus metrics for the sync handler.
// TODO: Consider adding more metrics as needed for better observability.
func (h *handlerImpl) setupSyncMetrics(metrics infra.MetricsFactory) {
	h.metrics = &syncMetrics{
		completedSyncOpsCounter: metrics.NewCounterVecEx(
			"stream_sync_completed_ops_counter",
			"Total number of completed stream sync operations",
			"river_error",
		),
		syncingStreamsPerOpHistogram: metrics.NewHistogramEx(
			"stream_sync_syncing_streams",
			"Number of streams being synced per sync operation",
			[]float64{5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, 750, 1000},
		),
		messageBufferSizePerOpHistogram: metrics.NewHistogramEx(
			"stream_sync_messages_buffer",
			"Size of the message buffer per sync operation",
			[]float64{5, 10, 15, 25, 50, 75, 100, 150, 200, 250, 500, 750, 1000, 1500, 2000, 2500},
		),
		sentMessagesHistogram: metrics.NewHistogramEx(
			"stream_sync_sent_messages",
			"Total number of messages sent to the client per sync operation",
			[]float64{
				5,
				10,
				25,
				50,
				75,
				100,
				150,
				200,
				250,
				500,
				750,
				1000,
				1500,
				2000,
				2500,
				5000,
				7500,
				10000,
				15000,
				20000,
				25000,
				50000,
				75000,
				100000,
			},
		),
	}

	metrics.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stream_sync_active_ops_counter",
			Help: "Total number of active stream sync operations",
		},
		func() float64 { return float64(h.activeSyncOperations.Size()) },
	)
}
