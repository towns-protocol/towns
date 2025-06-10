package sync

import (
	"github.com/prometheus/client_golang/prometheus"
)

// setupSyncMetrics initializes the Prometheus metrics for the sync handler.
// TODO: Consider adding more metrics as needed for better observability.
func (h *handlerImpl) setupSyncMetrics() {
	h.failedSyncOpsCounter = h.metrics.NewCounterVecEx(
		"stream_sync_failed_ops_counter",
		"Total number of failed stream sync operations",
		"use_shared_sync", "river_error",
	)
	h.syncingStreamsPerOpCounter = h.metrics.NewCounterVecEx(
		"stream_sync_syncing_streams_per_op_counter",
		"Number of streams being synced per sync operation",
		"use_shared_sync", "sync_id",
	)
	h.messageBufferSizePerOpHistogram = h.metrics.NewHistogramVecEx(
		"stream_sync_messages_buffer",
		"Size of the message buffer per sync operation",
		[]float64{250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2500},
		"use_shared_sync",
	)
	h.sentMessagesCounter = h.metrics.NewCounterVecEx(
		"stream_sync_sent_messages_counter",
		"Total number of messages sent to the client per sync operation",
		"use_shared_sync", "sync_id",
	)

	// Metrics for numeric values
	numericMetrics := []struct {
		name     string
		help     string
		getValue func() float64
	}{
		{
			"stream_sync_active_ops_counter",
			"Total number of active stream sync operations",
			func() float64 { return float64(h.activeSyncOperations.Size()) },
		},
		{
			"stream_sync_shared_messages_buffer_size",
			"Buffer size of the shared syncer messages",
			func() float64 { return float64(h.subscriptionManager.GetStats().BufferSize) },
		},
		{
			"stream_sync_shared_syncing_streams_counter",
			"Total number of streams currently being synced by the shared syncer",
			func() float64 { return float64(h.subscriptionManager.GetStats().SyncingStreamsCount) },
		},
		// TODO: Total number of syncing streams of all active sync operations - legacy sync
	}
	for _, metric := range numericMetrics {
		h.metrics.NewGaugeFunc(
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
