package track_streams

import (
	"github.com/prometheus/client_golang/prometheus"

	"github.com/towns-protocol/towns/core/node/infra"
)

type TrackStreamsSyncMetrics struct {
	ActiveStreamSyncSessions prometheus.Gauge
	TotalStreams             *prometheus.GaugeVec
	TrackedStreams           *prometheus.GaugeVec
	SyncSessionInFlight      prometheus.Gauge
	SyncUpdate               *prometheus.CounterVec
	SyncDown                 prometheus.Counter
	SyncPingInFlight         prometheus.Gauge
	SyncPing                 *prometheus.CounterVec
	SyncPong                 prometheus.Counter
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
		SyncSessionInFlight: metricsFactory.NewGaugeEx(
			"stream_session_inflight",
			"Number of pending stream sync session requests in flight",
		),
		SyncUpdate: metricsFactory.NewCounterVec(prometheus.CounterOpts{
			Name: "sync_update",
			Help: "Number of received stream sync updates",
		}, []string{"reset"}), // reset = true or false
		SyncDown: metricsFactory.NewCounterEx(
			"sync_down",
			"Number of received stream sync downs",
		),
		SyncPingInFlight: metricsFactory.NewGaugeEx(
			"stream_ping_inflight",
			"Number of pings requests in flight",
		),
		SyncPing: metricsFactory.NewCounterVec(prometheus.CounterOpts{
			Name: "sync_ping",
			Help: "Number of send stream sync pings",
		}, []string{"status"}), // status = success or failure
		SyncPong: metricsFactory.NewCounterEx(
			"sync_pong",
			"Number of received stream sync pong replies",
		),
	}
}
