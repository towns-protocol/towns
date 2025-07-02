package subscription

import (
	"slices"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// MessageDistributor defines the contract for distributing messages to subscriptions
type MessageDistributor interface {
	DistributeMessage(streamID StreamId, msg *SyncStreamsResponse)
	DistributeBackfillMessage(streamID StreamId, msg *SyncStreamsResponse)
}

// distributor implements MessageDistributor for distributing messages to subscriptions
type distributor struct {
	registry Registry
	logger   *logging.Log
}

// newDistributor creates a new message distributor
func newDistributor(registry Registry, logger *logging.Log) *distributor {
	return &distributor{
		registry: registry,
		logger:   logger,
	}
}

// DistributeMessage distributes a regular sync message to all relevant subscriptions
func (d *distributor) DistributeMessage(streamID StreamId, msg *SyncStreamsResponse) {
	subscriptions := d.registry.GetSubscriptionsForStream(streamID)
	if len(subscriptions) == 0 {
		return
	}

	// Handle SYNC_DOWN by removing stream from registry
	if msg.GetSyncOp() == SyncOp_SYNC_DOWN {
		for _, sub := range subscriptions {
			d.registry.RemoveStreamFromSubscription(sub.syncID, streamID)
		}
	}

	// Send message to all subscriptions
	var wg sync.WaitGroup
	var toRemove []string

	for _, subscription := range subscriptions {
		if subscription.isClosed() {
			if msg.GetSyncOp() != SyncOp_SYNC_DOWN {
				toRemove = append(toRemove, subscription.syncID)
			}
			continue
		}

		wg.Add(1)
		go func(msg *SyncStreamsResponse, subscription *Subscription) {
			defer wg.Done()
			d.sendMessageToSubscription(streamID, msg, subscription)
		}(proto.CloneOf(msg), subscription)
	}
	wg.Wait()

	// Clean up closed subscriptions
	for _, syncID := range toRemove {
		d.registry.RemoveSubscription(syncID)
	}
}

// DistributeBackfillMessage distributes a backfill message to a specific subscription
func (d *distributor) DistributeBackfillMessage(streamID StreamId, msg *SyncStreamsResponse) {
	if len(msg.GetTargetSyncIds()) == 0 {
		return
	}

	targetSyncID := msg.GetTargetSyncIds()[0]
	subscription, exists := d.registry.GetSubscriptionByID(targetSyncID)
	if !exists || subscription.isClosed() {
		return
	}

	// Check if the subscription is still associated with this stream
	subscriptions := d.registry.GetSubscriptionsForStream(streamID)
	found := false
	for _, sub := range subscriptions {
		if sub.syncID == targetSyncID {
			found = true
			break
		}
	}
	if !found {
		return // Subscription is no longer associated with this stream
	}

	// Remove the target sync ID from the message
	msg.TargetSyncIds = msg.TargetSyncIds[1:]

	// Send the backfill message
	subscription.Send(msg)

	// Mark stream as no longer initializing and store backfill events
	if _, found = subscription.initializingStreams.LoadAndDelete(streamID); found {
		hashes := d.extractBackfillHashes(msg)
		subscription.backfillEvents.Store(streamID, hashes)
	}
}

// sendMessageToSubscription sends a message to a specific subscription with proper filtering
func (d *distributor) sendMessageToSubscription(streamID StreamId, msg *SyncStreamsResponse, subscription *Subscription) {
	// Handle SYNC_UPDATE special logic
	if msg.GetSyncOp() == SyncOp_SYNC_UPDATE {
		// Skip if subscription is still initializing
		if _, found := subscription.initializingStreams.Load(streamID); found {
			return
		}

		// Filter out backfill events that were already sent
		backfillEvents, _ := subscription.backfillEvents.LoadAndDelete(streamID)
		if len(backfillEvents) > 0 {
			msg.Stream.Events = slices.DeleteFunc(msg.Stream.Events, func(e *Envelope) bool {
				return slices.Contains(backfillEvents, common.BytesToHash(e.Hash))
			})
			msg.Stream.Miniblocks = slices.DeleteFunc(msg.Stream.Miniblocks, func(mb *Miniblock) bool {
				return slices.Contains(backfillEvents, common.BytesToHash(mb.Header.Hash))
			})
		}
	}

	subscription.Send(msg)
}

// extractBackfillHashes extracts hashes from backfill events and miniblocks
func (d *distributor) extractBackfillHashes(msg *SyncStreamsResponse) []common.Hash {
	hashes := make([]common.Hash, 0, len(msg.GetStream().GetEvents())+len(msg.GetStream().GetMiniblocks()))

	for _, event := range msg.GetStream().GetEvents() {
		hashes = append(hashes, common.BytesToHash(event.Hash))
	}

	for _, miniblock := range msg.GetStream().GetMiniblocks() {
		hashes = append(hashes, common.BytesToHash(miniblock.Header.Hash))
	}

	return hashes
}
