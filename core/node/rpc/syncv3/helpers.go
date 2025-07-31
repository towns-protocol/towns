package syncv3

import (
	"sync"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

// ValidateModifySync validates the ModifySyncRequest to ensure it is well-formed.
func ValidateModifySync(req *ModifySyncRequest) error {
	// Make sure the request is not empty
	if len(req.GetAddStreams()) == 0 && len(req.GetRemoveStreams()) == 0 && len(req.GetBackfillStreams().GetStreams()) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "Empty modify sync request")
	}

	// Prevent duplicates in the backfill list
	seen := make(map[StreamId]struct{})
	for _, c := range req.GetBackfillStreams().GetStreams() {
		streamId, err := StreamIdFromBytes(c.GetStreamId())
		if err != nil {
			return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in backfill list")
		}

		if _, exists := seen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in backfill list")
		}
		seen[streamId] = struct{}{}
	}

	// Prevent duplicates in the add list
	seen = make(map[StreamId]struct{}, len(req.GetAddStreams()))
	for _, c := range req.GetAddStreams() {
		streamId, err := StreamIdFromBytes(c.GetStreamId())
		if err != nil {
			return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in add list")
		}

		if _, exists := seen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in add list")
		}
		seen[streamId] = struct{}{}
	}

	// Prevent duplicates in the remove list
	removeSeen := make(map[StreamId]struct{}, len(req.GetRemoveStreams()))
	for _, s := range req.GetRemoveStreams() {
		streamId, err := StreamIdFromBytes(s)
		if err != nil {
			return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in remove list")
		}

		if _, exists := removeSeen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in remove list")
		}
		removeSeen[streamId] = struct{}{}

		if _, exists := seen[streamId]; exists {
			return RiverError(Err_INVALID_ARGUMENT, "Stream in remove list is also in add list")
		}
	}

	return nil
}

// distributeMessage distributes the given message to the appropriate operations in the registry.
// If the message has target sync IDs, it sends the message to the first operation associated with the first target sync ID.
// If no target sync IDs are present, it sends the message to all operations associated with the specified stream ID.
func distributeMessage(registry Registry, streamID StreamId, msg *SyncStreamsResponse) {
	if len(msg.GetTargetSyncIds()) > 0 {
		op, exists := registry.GetOp(msg.GetTargetSyncIds()[0])
		if exists {
			// Remove the first target sync ID from the message and send it to the operation
			msg.TargetSyncIds = msg.TargetSyncIds[1:]
			op.OnStreamUpdate(msg)
		}
		return
	}

	ops := registry.GetStreamOps(streamID)
	if len(ops) == 0 {
		return
	}

	var wg sync.WaitGroup
	wg.Add(len(ops))
	for _, op := range ops {
		go func(op Operation) {
			op.OnStreamUpdate(&SyncStreamsResponse{
				SyncId:   msg.GetSyncId(),
				SyncOp:   msg.GetSyncOp(),
				Stream:   msg.GetStream(),
				StreamId: msg.GetStreamId(),
			})
			wg.Done()
		}(op)
	}
	wg.Wait()
}
