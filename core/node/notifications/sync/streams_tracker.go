package sync

import (
	"context"

	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

// NotificationsStreamsTracker implements the StreamsTracker interface for the notifications service. It encapsulates
// StreamsTracker functionality with notifications-specific data structures.
type NotificationsStreamsTracker struct {
	track_streams.StreamsTrackerImpl
	storage            UserPreferencesStore
	onChainConfig      crypto.OnChainConfiguration
	notificationConfig config.NotificationsConfig
}

var _ track_streams.StreamFilter = (*NotificationsStreamsTracker)(nil)

// NewNotificationsStreamsTracker creates a stream tracker instance.
func NewNotificationsStreamsTracker(
	ctx context.Context,
	onChainConfig crypto.OnChainConfiguration,
	riverRegistry *registries.RiverRegistryContract,
	nodeRegistries []nodes.NodeRegistry,
	listener track_streams.StreamEventListener,
	storage UserPreferencesStore,
	metricsFactory infra.MetricsFactory,
	trackingConfig config.StreamTrackingConfig,
	notificationConfig config.NotificationsConfig,
	otelTracer trace.Tracer,
) (track_streams.StreamsTracker, error) {
	tracker := &NotificationsStreamsTracker{
		onChainConfig:      onChainConfig,
		storage:            storage,
		notificationConfig: notificationConfig,
	}
	if err := tracker.StreamsTrackerImpl.Init(
		ctx,
		onChainConfig,
		riverRegistry,
		nodeRegistries,
		listener,
		tracker,
		metricsFactory,
		trackingConfig,
		otelTracer,
	); err != nil {
		return nil, err
	}

	return tracker, nil
}

func (tracker *NotificationsStreamsTracker) NewTrackedStream(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *protocol.StreamAndCookie,
) (events.TrackedStreamView, error) {
	return NewTrackedStreamForNotifications(
		ctx,
		streamID,
		cfg,
		stream,
		tracker.StreamsTrackerImpl.Listener(),
		tracker.storage,
	)
}

func (tracker *NotificationsStreamsTracker) coldStreamsEnabled() bool {
	return tracker.notificationConfig.ColdStreamsEnabled
}

// TrackStream returns true if the given streamID must be tracked for notifications.
func (tracker *NotificationsStreamsTracker) TrackStream(streamID shared.StreamId, isInit bool) bool {
	streamType := streamID.Type()

	// When cold streams are enabled, only track user settings stream on init
	if isInit && tracker.coldStreamsEnabled() {
		return streamType == shared.STREAM_USER_SETTINGS_BIN
	}

	return streamType == shared.STREAM_DM_CHANNEL_BIN ||
		streamType == shared.STREAM_GDM_CHANNEL_BIN ||
		streamType == shared.STREAM_CHANNEL_BIN ||
		streamType == shared.STREAM_USER_SETTINGS_BIN // users add addresses of blocked users into their settings stream
}
