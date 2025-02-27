package events

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gammazero/workerpool"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
)

func (s *StreamCache) submitSyncStreamTask(
	ctx context.Context,
	stream *Stream,
) {
	s.stoppedMu.RLock()
	defer s.stoppedMu.RUnlock()

	if !s.stopped {
		s.submitSyncStreamTaskToPool(ctx, s.onlineSyncWorkerPool, stream, nil)
	}
}

func (s *StreamCache) submitSyncStreamTaskToPool(
	ctx context.Context,
	pool *workerpool.WorkerPool,
	stream *Stream,
	streamRecord *registries.GetStreamResult,
) {
	pool.Submit(func() {
		s.syncStreamFromPeers(ctx, stream, streamRecord)
	})
}

func (s *StreamCache) syncStreamFromPeers(
	ctx context.Context,
	stream *Stream,
	streamRecord *registries.GetStreamResult,
) {
	var err error
	if streamRecord == nil {
		streamRecord, err = s.params.Registry.GetStreamOnLatestBlock(ctx, stream.streamId)
		if err != nil {
			logging.FromCtx(ctx).
				Errorw("syncStreamFromPeers:Unable to get stream record",
					"stream", stream.streamId,
					"error", err)
			return
		}
	}

	err = s.syncStreamFromPeersImpl(ctx, stream, streamRecord)
	if err != nil {
		logging.FromCtx(ctx).
			Errorw("syncStreamFromPeers: Unable to sync stream from peers",
				"stream", stream.streamId,
				"error", err,
				"streamRecord", streamRecord)
	}
}

// syncStreamFromPeersImpl syncs the database for the given streamResult by fetching missing blocks from peers
// participating in the stream.
// TODO: change. It is assumed that stream is already in the local DB and only miniblocks maybe in the need of syncing.
func (s *StreamCache) syncStreamFromPeersImpl(
	ctx context.Context,
	stream *Stream,
	streamRecord *registries.GetStreamResult,
) error {
	// TODO: double check if this is correct to normalize here
	// Try to normalize the given stream if needed.
	err := s.normalizeEphemeralStream(ctx, stream, int64(streamRecord.LastMiniblockNum), streamRecord.IsSealed)
	if err != nil {
		return err
	}

	lastMiniblockNum, err := stream.getLastMiniblockNumSkipLoad(ctx)
	if err != nil {
		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			lastMiniblockNum = -1
		} else {
			return err
		}
	}

	if int64(streamRecord.LastMiniblockNum) <= lastMiniblockNum {
		return nil
	}

	fromInclusive := lastMiniblockNum + 1
	toExclusive := int64(streamRecord.LastMiniblockNum) + 1

	remotes, _ := stream.GetRemotesAndIsLocal()
	if len(remotes) == 0 {
		return RiverError(Err_UNAVAILABLE, "Stream has no remotes", "stream", stream.streamId)
	}

	remote := stream.GetStickyPeer()
	var nextFromInclusive int64
	for range remotes {
		nextFromInclusive, err = s.syncStreamFromSinglePeer(ctx, stream, remote, fromInclusive, toExclusive)
		if err == nil && nextFromInclusive >= toExclusive {
			return nil
		}
		remote = stream.AdvanceStickyPeer(remote)
	}

	return AsRiverError(err, Err_UNAVAILABLE).
		Tags("stream", stream.streamId, "missingFromInclusive", nextFromInclusive, "missingToExlusive", toExclusive).
		Message("No peer could provide miniblocks for stream reconciliation")
}

// syncStreamFromSinglePeer syncs the database for the given streamResult by fetching missing blocks from a single peer.
// It returns block number of last block successfully synced + 1.
func (s *StreamCache) syncStreamFromSinglePeer(
	ctx context.Context,
	stream *Stream,
	remote common.Address,
	fromInclusive int64,
	toExclusive int64,
) (int64, error) {
	pageSize := s.params.Config.StreamReconciliation.GetMiniblocksPageSize
	if pageSize <= 0 {
		pageSize = 128
	}

	currentFromInclusive := fromInclusive
	for {
		if currentFromInclusive >= toExclusive {
			return currentFromInclusive, nil
		}

		currentToExclusive := min(currentFromInclusive+pageSize, toExclusive)

		mbProtos, err := s.params.RemoteMiniblockProvider.GetMbs(
			ctx,
			remote,
			stream.streamId,
			currentFromInclusive,
			currentToExclusive,
		)
		if err != nil {
			return currentFromInclusive, err
		}

		if len(mbProtos) == 0 {
			return currentFromInclusive, nil
		}

		mbs := make([]*MiniblockInfo, len(mbProtos))
		for i, mbProto := range mbProtos {
			mb, err := NewMiniblockInfoFromProto(
				mbProto,
				NewParsedMiniblockInfoOpts().WithExpectedBlockNumber(currentFromInclusive+int64(i)),
			)
			if err != nil {
				return currentFromInclusive, err
			}
			mbs[i] = mb
		}

		err = stream.importMiniblocks(ctx, mbs)
		if err != nil {
			return currentFromInclusive, err
		}

		currentFromInclusive += int64(len(mbs))
	}
}
