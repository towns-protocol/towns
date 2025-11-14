package eventbus

import (
	"slices"

	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/syncer"
)

// streamSubscribers manages subscribers for a single stream, organized by version.
// The implementation is not thread-safe.
type streamSubscribers map[int][]StreamSubscriber

func (ss streamSubscribers) addPendingUnique(subscriber StreamSubscriber) bool {
	for _, subscribers := range ss {
		if slices.Contains(subscribers, subscriber) {
			return false
		}
	}

	ss[syncer.PendingSubscribersVersion] = append(ss[syncer.PendingSubscribersVersion], subscriber)

	return true
}

func (ss streamSubscribers) findBySyncID(syncID string) (StreamSubscriber, int) {
	for version, subscribers := range ss {
		for _, sub := range subscribers {
			if sub.SyncID() == syncID {
				return sub, version
			}
		}
	}
	return nil, 0
}

func (ss streamSubscribers) movePendingToVersion(syncID string, toVersion int) {
	pendingList := ss[syncer.PendingSubscribersVersion]

	// Find the subscriber
	var found StreamSubscriber
	var foundIndex int = -1

	for i, sub := range pendingList {
		if sub.SyncID() == syncID {
			found = sub
			foundIndex = i
			break
		}
	}

	if foundIndex == -1 {
		return
	}

	// Add to target version
	ss[toVersion] = append(ss[toVersion], found)

	// Remove from pending efficiently
	lastIdx := len(pendingList) - 1
	if foundIndex < lastIdx {
		// Move last element to found position
		pendingList[foundIndex] = pendingList[lastIdx]
	}

	// Truncate the slice
	ss[syncer.PendingSubscribersVersion] = pendingList[:lastIdx]

	// Clean up if empty
	if lastIdx == 0 {
		delete(ss, syncer.PendingSubscribersVersion)
	}
}

func (ss streamSubscribers) removeBySyncID(syncID string) StreamSubscriber {
	var subscription StreamSubscriber
	for version := range ss {
		ss[version] = slices.DeleteFunc(ss[version], func(s StreamSubscriber) bool {
			if s.SyncID() == syncID {
				if subscription == nil {
					subscription = s
				}
				return true
			}
			return false
		})
		if len(ss[version]) == 0 {
			delete(ss, version)
		}
	}
	return subscription
}

func (ss streamSubscribers) isEmpty() bool {
	return len(ss) == 0
}

func (ss streamSubscribers) clearVersion(version int) {
	delete(ss, version)
}

func (ss streamSubscribers) sendUpdateToVersion(version int, msg *SyncStreamsResponse) {
	for _, sub := range ss[version] {
		// Create a copy of the update and unset syncID because each subscriber has its own unique syncID.
		sub.OnUpdate(&SyncStreamsResponse{
			SyncOp:   msg.GetSyncOp(),
			Stream:   msg.GetStream(),
			StreamId: msg.GetStreamId(),
		})
	}
}

func (ss streamSubscribers) sendUpdateToAll(msg *SyncStreamsResponse) {
	for _, subscribers := range ss {
		for _, sub := range subscribers {
			// Create a copy of the update and unset syncID because each subscriber has its own unique syncID.
			sub.OnUpdate(&SyncStreamsResponse{
				SyncOp:   msg.GetSyncOp(),
				Stream:   msg.GetStream(),
				StreamId: msg.GetStreamId(),
			})
		}
	}
}
