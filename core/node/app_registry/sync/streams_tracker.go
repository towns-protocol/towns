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
}

type AppRegistryStreamsTracker struct {
	track_streams.StreamsTrackerImpl
	queue             EncryptedMessageQueue
	appRegistryConfig config.AppRegistryConfig
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
	cookieStore track_streams.SyncCookieStore,
	otelTracer trace.Tracer,
) (track_streams.StreamsTracker, error) {
	tracker := &AppRegistryStreamsTracker{
		queue:             store,
		appRegistryConfig: config,
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
		cookieStore,
	); err != nil {
		return nil, err
	}

	return tracker, nil
}

func (tracker *AppRegistryStreamsTracker) coldStreamsEnabled() bool {
	return tracker.appRegistryConfig.ColdStreamsEnabled
}

func (tracker *AppRegistryStreamsTracker) TrackStream(ctx context.Context, streamId shared.StreamId, isInit bool) bool {
	streamType := streamId.Type()

	// Track channel streams, but skip on init when cold streams is enabled.
	// They will be loaded on-demand when new messages arrive via OnStreamLastMiniblockUpdated.
	if streamType == shared.STREAM_CHANNEL_BIN {
		return !(isInit && tracker.coldStreamsEnabled())
	}

	if streamType != shared.STREAM_USER_INBOX_BIN {
		return false
	}
	userAddress, err := shared.GetUserAddressFromStreamId(streamId)
	if err != nil {
		return false
	}
	isForwardable, _, err := tracker.queue.IsForwardableApp(ctx, userAddress)
	return err == nil && isForwardable
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
