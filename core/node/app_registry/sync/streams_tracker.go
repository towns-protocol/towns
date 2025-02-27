package sync

import (
	"context"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

type AppRegistryStreamsTracker struct {
	// TODO: eventually this struct will contain references to whatever types of cache / storage access
	// the TrackedStreamView for the app registry service needs.
	track_streams.StreamsTrackerImpl
	store storage.AppRegistryStore
}

func NewAppRegistryStreamsTracker(
	ctx context.Context,
	config config.AppRegistryConfig,
	onChainConfig crypto.OnChainConfiguration,
	riverRegistry *registries.RiverRegistryContract,
	nodes []nodes.NodeRegistry,
	metricsFactory infra.MetricsFactory,
	listener track_streams.StreamEventListener,
	store storage.AppRegistryStore,
) (track_streams.StreamsTracker, error) {
	tracker := &AppRegistryStreamsTracker{
		store: store,
	}
	if err := tracker.StreamsTrackerImpl.Init(
		ctx,
		onChainConfig,
		riverRegistry,
		nodes,
		listener,
		tracker,
		metricsFactory,
	); err != nil {
		return nil, err
	}

	return tracker, nil
}

func (tracker *AppRegistryStreamsTracker) TrackStream(streamId shared.StreamId) bool {
	streamType := streamId.Type()

	return streamType == shared.STREAM_DM_CHANNEL_BIN ||
		streamType == shared.STREAM_GDM_CHANNEL_BIN ||
		streamType == shared.STREAM_CHANNEL_BIN ||
		streamType == shared.STREAM_USER_INBOX_BIN // for tracking key fulfillments for app key solicitations
}

func (tracker *AppRegistryStreamsTracker) NewTrackedStream(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *protocol.StreamAndCookie,
) (events.TrackedStreamView, error) {
	// TODO: pass in storage to the tracked stream constructor and implement logic for updating storage
	// and caches within the tracked stream.
	return NewTrackedStreamForAppRegistryService(
		ctx,
		streamID,
		cfg,
		stream,
		tracker.StreamsTrackerImpl.Listener(),
		tracker.store,
	)
}
