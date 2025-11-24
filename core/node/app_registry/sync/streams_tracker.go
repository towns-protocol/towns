package sync

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/app_registry/types"
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
		encryptionEnvelope []byte,
	) (err error)

	IsForwardableApp(
		ctx context.Context,
		appId common.Address,
	) (isForwardable bool, settings types.AppSettings, err error)

	IsApp(
		ctx context.Context,
		userId common.Address,
	) (bool, error)

	DispatchOrEnqueueMessages(
		ctx context.Context,
		appIds []common.Address,
		sessionId string,
		streamId shared.StreamId,
		streamEventBytes []byte,
	) (err error)

	PersistSyncCookie(
		ctx context.Context,
		streamID shared.StreamId,
		minipoolGen int64,
		prevMiniblockHash []byte,
	) error

	GetStreamSyncCookies(
		ctx context.Context,
	) (map[shared.StreamId]*protocol.SyncCookie, error)
}

type AppRegistryStreamsTracker struct {
	track_streams.StreamsTrackerImpl
	queue         EncryptedMessageQueue
	streamCookies map[shared.StreamId]*protocol.SyncCookie // Loaded on startup
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
	otelTracer trace.Tracer,
) (track_streams.StreamsTracker, error) {
	tracker := &AppRegistryStreamsTracker{
		queue:         store,
		streamCookies: make(map[shared.StreamId]*protocol.SyncCookie),
	}
	if err := tracker.StreamsTrackerImpl.Init(
		ctx,
		onChainConfig,
		riverRegistry,
		nodes,
		listener,
		tracker,
		metricsFactory,
		config.StreamTracking,
		otelTracer,
	); err != nil {
		return nil, err
	}

	return tracker, nil
}

func (tracker *AppRegistryStreamsTracker) TrackStream(ctx context.Context, streamId shared.StreamId, _ bool) bool {
	streamType := streamId.Type()

	if streamType == shared.STREAM_CHANNEL_BIN {
		return true
	}
	if streamType != shared.STREAM_USER_INBOX_BIN {
		return false
	}
	userAddress, err := shared.GetUserAddressFromStreamId(streamId)
	if err != nil {
		return false
	}

	// Check if this user is a registered bot/app
	isForwardable, _, err := tracker.queue.IsForwardableApp(ctx, userAddress)
	if err != nil {
		return false
	}

	return isForwardable
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

// GetStreamCookie returns the stored sync cookie for a stream, if one exists.
// This is used during startup to resume from the last processed position.
func (tracker *AppRegistryStreamsTracker) GetStreamCookie(
	streamID shared.StreamId,
) (*protocol.SyncCookie, bool) {
	cookie, ok := tracker.streamCookies[streamID]
	return cookie, ok
}

// LoadStreamCookies loads all persisted sync cookies from storage.
// This should be called before the tracker starts processing streams.
func (tracker *AppRegistryStreamsTracker) LoadStreamCookies(ctx context.Context) error {
	cookies, err := tracker.queue.GetStreamSyncCookies(ctx)
	if err != nil {
		return err
	}

	tracker.streamCookies = cookies
	return nil
}
