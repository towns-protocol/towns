package sync

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
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

type EncryptedMessageQueue interface {
	PublishSessionKeys(
		ctx context.Context,
		streamId shared.StreamId,
		deviceKey string,
		sessionIds []string,
		ciphertexts string,
	) (err error)

	HasRegisteredWebhook(
		ctx context.Context,
		appId common.Address,
	) bool

	DispatchOrEnqueueMessages(
		ctx context.Context,
		appIds []common.Address,
		sessionId string,
		streamId shared.StreamId,
		streamEventBytes []byte,
	) (err error)
}

type AppRegistryStreamsTracker struct {
	// TODO: eventually this struct will contain references to whatever types of cache / storage access
	// the TrackedStreamView for the app registry service needs.
	track_streams.StreamsTrackerImpl
	queue EncryptedMessageQueue
}

func NewAppRegistryStreamsTracker(
	ctx context.Context,
	config config.AppRegistryConfig,
	onChainConfig crypto.OnChainConfiguration,
	riverRegistry *registries.RiverRegistryContract,
	nodes []nodes.NodeRegistry,
	metricsFactory infra.MetricsFactory,
	listener track_streams.StreamEventListener,
	store EncryptedMessageQueue,
) (track_streams.StreamsTracker, error) {
	tracker := &AppRegistryStreamsTracker{
		queue: store,
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
		streamType == shared.STREAM_CHANNEL_BIN
}

func (tracker *AppRegistryStreamsTracker) NewTrackedStream(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *protocol.StreamAndCookie,
) (events.TrackedStreamView, error) {
	return NewTrackedStreamForAppRegistryService(
		ctx,
		streamID,
		cfg,
		stream,
		tracker.StreamsTrackerImpl.Listener(),
		tracker.queue,
	)
}
