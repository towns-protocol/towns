package sync

import "github.com/prometheus/client_golang/prometheus"

type streamsTrackerWorkerMetrics struct {
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
