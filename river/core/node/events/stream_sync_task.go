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
	pool *workerpool.WorkerPool,
	stream *Stream,
	streamRecord *registries.GetStreamResult,
) {
	pool.Submit(func() {
		if err := s.syncStreamFromPeers(
			ctx,
			stream,
			int64(streamRecord.LastMiniblockNum),
			streamRecord.IsSealed,
		); err != nil {
			logging.FromCtx(ctx).
				Errorw("Unable to sync stream from peers",
					"stream", stream.streamId,
					"error", err,
					"targetMiniblockNum", streamRecord.LastMiniblockNum)
		}
	})
}

// syncStreamFromPeers syncs the database for the given streamResult by fetching missing blocks from peers
// participating in the stream.
// TODO: change. It is assumed that stream is already in the local DB and only miniblocks maybe in the need of syncing.
func (s *StreamCache) syncStreamFromPeers(
	ctx context.Context,
	stream *Stream,
	lastContractMbNum int64,
	isSealed bool,
) error {
	// Try to normalize the given stream if needed.
	err := s.normalizeEphemeralStream(ctx, stream, lastContractMbNum, isSealed)
	if err != nil {
		return err
	}

	stream, err = s.getStreamImpl(ctx, stream.streamId, false)
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

	if lastContractMbNum <= lastMiniblockNum {
		return nil
	}

	fromInclusive := lastMiniblockNum + 1
	toExclusive := lastContractMbNum + 1

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
