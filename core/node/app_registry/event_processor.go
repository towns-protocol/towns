package app_registry

import (
	"context"
	"encoding/hex"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/shared"
)

type MessageToAppProcessor struct {
	cache *CachedEncryptedMessageQueue
}

func NewAppMessageProcessor(
	ctx context.Context,
	cache *CachedEncryptedMessageQueue,
) *MessageToAppProcessor {
	return &MessageToAppProcessor{
		cache: cache,
	}
}

func (p *MessageToAppProcessor) OnMessageEvent(
	ctx context.Context,
	channelId shared.StreamId,
	spaceId *shared.StreamId,
	members mapset.Set[string],
	event *events.ParsedEvent,
) {
	log := logging.FromCtx(ctx).With("func", "MessageToAppProcessor.OnMessageEvent")
	appIds := make([]common.Address, 0, members.Cardinality())

	// TODO: Apply logic to filter out which events to send to which apps based on app preferences.

	members.Each(func(memberId string) bool {
		appId := common.HexToAddress(memberId)
		if p.cache.HasRegisteredWebhook(ctx, appId) {
			appIds = append(appIds, appId)
		}

		return false
	})
	streamEnvelope, err := event.GetEnvelopeBytes()
	if err != nil {
		log.Errorw("Error marshalling stream envelope", "event", event, "streamId", channelId, "spaceId", spaceId)
		return
	}

	// The cache is also a broker that will dispatch sendable messages to the appropriate
	// consumers in order to make webhook calls to app services.
	message := event.GetEncryptedMessage()
	// Ignore membership changes, etc, and focus only on channel content.
	if message != nil {
		// Session ids are stored in key solicitations and responses as encoded hex strings, but are sent
		// as raw bytes in channel messages. Here, we encode and store as a hex string for convenience.
		encodedSessionId := hex.EncodeToString(message.SessionIdBytes)
		if err := p.cache.DispatchOrEnqueueMessages(ctx, appIds, encodedSessionId, channelId, streamEnvelope); err != nil {
			log.Errorw(
				"Error enqueueing messages for stream event",
				"event",
				event,
				"streamId",
				channelId,
				"spaceId",
				spaceId,
				"error",
				err,
			)
		}
	}
}
