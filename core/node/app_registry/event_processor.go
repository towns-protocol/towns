package app_registry

import (
	"context"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

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
	appIds := make([]common.Address, members.Cardinality(), 0)
	// TODO: Apply logic to filter out which events to send to which apps based on app preferences.

	members.Each(func(memberId string) bool {
		appId := common.HexToAddress(memberId)
		if p.cache.HasRegisteredWebhook(ctx, appId) {
			appIds = append(appIds, appId)
		}

		return false
	})
	streamBytes, err := proto.Marshal(event.Event)
	if err != nil {
		logging.FromCtx(ctx).
			Errorw("Error marshalling stream event", "event", event, "streamId", channelId, "spaceId", spaceId)
		return
	}

	// The cache is also a broker that will dispatch sendable messages to the appropriate
	// consumers in order to make webhook calls to app services.
	if err := p.cache.EnqueueMessages(ctx, appIds, event.GetChannelMessage().Message.SessionId, channelId, streamBytes); err != nil {
		logging.FromCtx(ctx).
			Errorw("Error enqueueing messages for stream event", "event", event, "streamId", channelId, "spaceId", spaceId, "error", err)
	}
}
