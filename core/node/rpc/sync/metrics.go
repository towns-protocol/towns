package sync

import (
	"fmt"

	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/infra"
)

const (
	metricsActionAdd      = "add"
	metricsActionRemove   = "remove"
	metricsActionBackfill = "backfill"
)

// syncMetrics contains the Prometheus metrics for the sync handler.
type syncMetrics struct {
	actionsCounter                  *prometheus.CounterVec
	completedSyncOpsCounter         *prometheus.CounterVec
	syncingStreamsPerOpHistogram    *prometheus.HistogramVec
	messageBufferSizePerOpHistogram *prometheus.HistogramVec
	sentMessagesHistogram           *prometheus.HistogramVec
}

// setupSyncMetrics initializes the Prometheus metrics for the sync handler.
// TODO: Consider adding more metrics as needed for better observability.
func (h *handlerImpl) setupSyncMetrics(metrics infra.MetricsFactory) {
	h.metrics = &syncMetrics{
		actionsCounter: metrics.NewCounterVecEx(
			"stream_sync_actions_counter",
			"Total number of sync operations (add/remove/backfill) marked per type",
			"use_shared_sync", "type",
		),
		completedSyncOpsCounter: metrics.NewCounterVecEx(
			"stream_sync_completed_ops_counter",
			"Total number of completed stream sync operations",
			"use_shared_sync", "river_error",
		),
		syncingStreamsPerOpHistogram: metrics.NewHistogramVecEx(
			"stream_sync_syncing_streams",
			"Number of streams being synced per sync operation",
			[]float64{5, 10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, 750, 1000},
			"use_shared_sync",
		),
		messageBufferSizePerOpHistogram: metrics.NewHistogramVecEx(
			"stream_sync_messages_buffer",
			"Size of the message buffer per sync operation",
			[]float64{5, 10, 15, 25, 50, 75, 100, 150, 200, 250, 500, 750, 1000, 1500, 2000, 2500},
			"use_shared_sync",
		),
		sentMessagesHistogram: metrics.NewHistogramVecEx(
			"stream_sync_sent_messages",
			"Total number of messages sent to the client per sync operation",
			[]float64{5, 10, 25, 50, 75, 100, 150, 200, 250, 500, 750, 1000, 1500, 2000, 2500, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 75000, 100000},
			"use_shared_sync",
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

func (sm *syncMetrics) actions(cmd *subCommand, useSharedSync bool) {
	if sm == nil || cmd == nil || cmd.ModifySyncReq == nil {
		return
	}

	var op string
	var count int
	if len(cmd.ModifySyncReq.ToAdd) > 0 {
		op = metricsActionAdd
		count = len(cmd.ModifySyncReq.ToAdd)
	}
	if len(cmd.ModifySyncReq.ToRemove) > 0 {
		op = metricsActionRemove
		count = len(cmd.ModifySyncReq.ToRemove)
	}
	if len(cmd.ModifySyncReq.ToBackfill) > 0 {
		op = metricsActionBackfill
		count = len(cmd.ModifySyncReq.ToBackfill)
	}

	sm.actionsCounter.WithLabelValues(fmt.Sprintf("%t", useSharedSync), op).Add(float64(count))
}
