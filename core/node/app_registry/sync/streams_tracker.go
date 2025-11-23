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
	"github.com/towns-protocol/towns/core/node/logging"
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

	DispatchOrEnqueueMessages(
		ctx context.Context,
		appIds []common.Address,
		sessionId string,
		streamId shared.StreamId,
		streamEventBytes []byte,
	) (err error)

	GetAllActiveBotAddresses(ctx context.Context) ([]common.Address, error)
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
	otelTracer trace.Tracer,
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
		config.StreamTracking,
		otelTracer,
	); err != nil {
		return nil, err
	}

	// Load all registered bot inbox streams at startup
	if err := tracker.loadBotInboxStreams(ctx); err != nil {
		log := logging.FromCtx(ctx)
		log.Errorw("Failed to load bot inbox streams at startup", "error", err)
		return nil, err
	}

	return tracker, nil
}

func (tracker *AppRegistryStreamsTracker) TrackStream(ctx context.Context, streamId shared.StreamId, _ bool) bool {
	streamType := streamId.Type()

	return streamType == shared.STREAM_CHANNEL_BIN
}

// loadBotInboxStreams loads all registered bot inbox streams at startup
func (tracker *AppRegistryStreamsTracker) loadBotInboxStreams(ctx context.Context) error {
	log := logging.FromCtx(ctx)

	// Get all active bot addresses
	botAddresses, err := tracker.queue.GetAllActiveBotAddresses(ctx)
	if err != nil {
		return err
	}

	log.Infow("Loading bot inbox streams", "count", len(botAddresses))

	// Add inbox stream for each bot
	for _, botAddress := range botAddresses {
		// Create inbox stream ID for the bot
		inboxStreamId := shared.UserInboxStreamIdFromAddress(botAddress)

		// Add the stream to the tracker
		added, err := tracker.AddStream(inboxStreamId, track_streams.ApplyHistoricalContent{Enabled: true})
		if err != nil {
			log.Errorw("Failed to add bot inbox stream",
				"bot", botAddress.Hex(),
				"streamId", inboxStreamId,
				"error", err)
			// Continue loading other bot streams even if one fails
		} else if added {
			log.Debugw("Added bot inbox stream",
				"bot", botAddress.Hex(),
				"streamId", inboxStreamId)
		}
	}

	return nil
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
