package client

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type StreamsSyncer interface {
	Run()
	Address() common.Address
	Modify(ctx context.Context, request *ModifySyncRequest) (*ModifySyncResponse, bool, error)
	DebugDropStream(ctx context.Context, streamID StreamId) (bool, error)
}

// ModifyRequest represents a request to modify the sync state of streams.
//
// IMPORTANT: All failure handler callbacks (AddingFailureHandler, RemovingFailureHandler,
// BackfillingFailureHandler) are invoked while the corresponding stream is locked.
// These callbacks MUST NOT attempt to lock any stream as this will cause a deadlock.
// The callbacks should only perform non-blocking operations such as logging or
// queuing the failure for later processing.
type ModifyRequest struct {
	SyncID                    string
	ToAdd                     []*SyncCookie
	ToRemove                  [][]byte
	ToBackfill                []*ModifySyncRequest_Backfill
	AddingFailureHandler      func(status *SyncStreamOpStatus)
	RemovingFailureHandler    func(status *SyncStreamOpStatus)
	BackfillingFailureHandler func(status *SyncStreamOpStatus)
}

// Validate checks the modify request for errors and returns an error if any are found.
func (mr *ModifyRequest) Validate() error {
	// Make sure the request is not empty
	if len(mr.ToAdd) == 0 && len(mr.ToRemove) == 0 && len(mr.ToBackfill) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "Empty modify sync request")
	}

	// Prevent duplicates in the backfill list
	seen := make(map[StreamId]struct{})
	for _, backfill := range mr.ToBackfill {
		for _, c := range backfill.GetStreams() {
			streamId, err := StreamIdFromBytes(c.GetStreamId())
			if err != nil {
				return RiverError(Err_INVALID_ARGUMENT, "Invalid stream in backfill list")
			}

			if _, exists := seen[streamId]; exists {
				return RiverError(Err_INVALID_ARGUMENT, "Duplicate stream in backfill list")
			}
			seen[streamId] = struct{}{}
		}
	}

	// Prevent duplicates in the add list
	seen = make(map[StreamId]struct{}, len(mr.ToAdd))
	for _, c := range mr.ToAdd {
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
	removeSeen := make(map[StreamId]struct{}, len(mr.ToRemove))
	for _, s := range mr.ToRemove {
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
