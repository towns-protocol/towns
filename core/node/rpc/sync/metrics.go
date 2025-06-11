package sync

import (
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/infra"
)

// syncMetrics contains the Prometheus metrics for the sync handler.
type syncMetrics struct {
	failedSyncOpsCounter            *prometheus.CounterVec
	syncingStreamsPerOpCounter      *prometheus.GaugeVec
	messageBufferSizePerOpHistogram *prometheus.HistogramVec
	sentMessagesCounter             *prometheus.CounterVec
}

// setupSyncMetrics initializes the Prometheus metrics for the sync handler.
// TODO: Consider adding more metrics as needed for better observability.
func (h *handlerImpl) setupSyncMetrics(metrics infra.MetricsFactory) {
	h.metrics = &syncMetrics{
		failedSyncOpsCounter: metrics.NewCounterVecEx(
			"stream_sync_failed_ops_counter",
			"Total number of failed stream sync operations",
			"use_shared_sync", "river_error",
		),
		syncingStreamsPerOpCounter: metrics.NewGaugeVecEx(
			"stream_sync_syncing_streams_per_op_counter",
			"Number of streams being synced per sync operation",
			"sync_id",
		),
		messageBufferSizePerOpHistogram: metrics.NewHistogramVecEx(
			"stream_sync_messages_buffer",
			"Size of the message buffer per sync operation",
			[]float64{250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500},
			"use_shared_sync",
		),
		sentMessagesCounter: metrics.NewCounterVecEx(
			"stream_sync_sent_messages_counter",
			"Total number of messages sent to the client per sync operation",
			"use_shared_sync", "sync_id",
		),
	}

	metrics.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stream_sync_active_ops_counter",
			Help: "Total number of active stream sync operations",
		},
		func() float64 { return float64(h.activeSyncOperations.Size()) },
	)
	metrics.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stream_sync_shared_messages_buffer_size",
			Help: "Buffer size of the shared syncer messages",
		},
		func() float64 { return float64(h.subscriptionManager.GetStats().BufferSize) },
	)
	metrics.NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: "stream_sync_shared_syncing_streams_counter",
			Help: "Total number of streams currently being synced by the shared syncer",
		},
		func() float64 { return float64(h.subscriptionManager.GetStats().SyncingStreamsCount) },
	)
}
