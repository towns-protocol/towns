package track_streams

import (
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/infra"
)

type TrackStreamsSyncMetrics struct {
	ActiveStreamSyncSessions prometheus.Gauge
	TotalStreams             *prometheus.GaugeVec
	TrackedStreams           *prometheus.GaugeVec
	UnsyncedQueueLength      prometheus.Gauge
	SyncSessionsInFlight     *prometheus.GaugeVec
	OpenSyncSessions         *prometheus.GaugeVec
	SyncUpdate               *prometheus.CounterVec
	SyncDown                 *prometheus.CounterVec
	SyncPingInFlight         prometheus.Gauge
	SyncPing                 *prometheus.CounterVec
	SyncPong                 prometheus.Counter
	StreamsPerSyncSession    prometheus.Histogram

	// Semaphore metrics for tracking node request concurrency
	SemaphoreAcquireDuration *prometheus.HistogramVec
	SemaphoreHoldDuration    *prometheus.HistogramVec // Time between acquire and release

	// Operation timing metrics
	AddStreamDuration            *prometheus.HistogramVec // Time for runner.AddStream() call
	SyncRunnerCreationDuration   *prometheus.HistogramVec // Time to create and start a sync runner
	StreamPlacementTotalDuration *prometheus.HistogramVec // Total time from start to completion of addToSync
}

func NewTrackStreamsSyncMetrics(metricsFactory infra.MetricsFactory) *TrackStreamsSyncMetrics {
	return &TrackStreamsSyncMetrics{
		ActiveStreamSyncSessions: metricsFactory.NewGaugeEx(
			"sync_sessions_active", "Active stream sync sessions"),
		TotalStreams: metricsFactory.NewGaugeVec(prometheus.GaugeOpts{
			Name: "total_streams",
			Help: "Number of streams to track for notification events",
		}, []string{"type"}), // type= dm, gdm, space_channel, user_settings
		TrackedStreams: metricsFactory.NewGaugeVec(prometheus.GaugeOpts{
			Name: "tracked_streams",
			Help: "Number of streams to track for notification events",
		}, []string{"type"}), // type= dm, gdm, space_channel, user_settings
		UnsyncedQueueLength: metricsFactory.NewGaugeEx(
			"unsynced_queue_length", "Streams waiting to be located into a sync",
		),
		SyncSessionsInFlight: metricsFactory.NewGaugeVec(prometheus.GaugeOpts{
			Name: "syncs_inflight",
			Help: "Number of pending sync session requests in flight",
		}, []string{"target_node"}),
		SyncUpdate: metricsFactory.NewCounterVec(prometheus.CounterOpts{
			Name: "sync_update",
			Help: "Number of received stream sync updates",
		}, []string{"reset"}), // reset = true or false
		SyncDown: metricsFactory.NewCounterVecEx(
			"sync_down",
			"Number of received stream sync downs",
			"target_node",
		),
		StreamsPerSyncSession: metricsFactory.NewHistogramEx(
			"streams_per_sync",
			"Number of streams in each sync session, updated periodically",
			[]float64{10, 20, 50, 90, 100, 110},
		),
		OpenSyncSessions: metricsFactory.NewGaugeVec(prometheus.GaugeOpts{
			Name: "open_sync_sessions",
			Help: "Number of syncs opened by the MultiSyncRunner",
		}, []string{"node"}),

		// Semaphore metrics
		SemaphoreAcquireDuration: metricsFactory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "semaphore_acquire_duration_seconds",
			Help:    "Time spent waiting to acquire semaphore",
			Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0},
		}, []string{"node"}),
		SemaphoreHoldDuration: metricsFactory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "semaphore_hold_duration_seconds",
			Help:    "Time semaphore is held (between acquire and release)",
			Buckets: []float64{0.001, 0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0},
		}, []string{"node", "operation"}),

		// Operation timing metrics
		AddStreamDuration: metricsFactory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "add_stream_duration_seconds",
			Help:    "Time taken for runner.AddStream() RPC call",
			Buckets: []float64{0.001, 0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0},
		}, []string{"node", "success"}),
		SyncRunnerCreationDuration: metricsFactory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "sync_runner_creation_duration_seconds",
			Help:    "Time taken to create and start a new sync runner",
			Buckets: []float64{0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0},
		}, []string{"node"}),
		StreamPlacementTotalDuration: metricsFactory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "stream_placement_total_duration_seconds",
			Help:    "Total time from start to completion of stream placement",
			Buckets: []float64{0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0},
		}, []string{"node", "success"}),
	}
}

func (t *TrackStreamsSyncMetrics) String() {
}
