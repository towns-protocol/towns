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
	}
}

func (t *TrackStreamsSyncMetrics) String() {
}
