package events

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gammazero/workerpool"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

func (s *streamCacheImpl) submitSyncStreamTask(
	ctx context.Context,
	pool *workerpool.WorkerPool,
	streamId StreamId,
	lastMbInContract *MiniblockRef,
) {
	pool.Submit(func() {
		err := s.syncStreamFromPeers(ctx, streamId, lastMbInContract)
		if err != nil {
			dlog.FromCtx(ctx).
				Error("Unable to sync stream from peers", "stream", streamId, "error", err, "targetMiniblockNum", lastMbInContract.Num)
		}
	})
}

// syncStreamFromPeers syncs the database for the given streamResult by fetching missing blocks from peers
// participating in the stream.
// TODO: change. It is assumed that stream is already in the local DB and only miniblocks maybe in the need of syncing.
func (s *streamCacheImpl) syncStreamFromPeers(
	ctx context.Context,
	streamId StreamId,
	lastMbInContract *MiniblockRef,
) error {
	stream, err := s.getStreamImpl(ctx, streamId)
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

	if lastMbInContract.Num <= lastMiniblockNum {
		return nil
	}

	fromInclusive := lastMiniblockNum + 1
	toExclusive := lastMbInContract.Num + 1

	numRemotes := stream.nodes.NumRemotes()

	if numRemotes == 0 {
		return RiverError(Err_UNAVAILABLE, "Stream has no remotes", "stream", streamId)
	}

	remote := stream.nodes.GetStickyPeer()
	var nextFromInclusive int64
	for range numRemotes {
		nextFromInclusive, err = s.syncStreamFromSinglePeer(ctx, stream, remote, fromInclusive, toExclusive)
		if err == nil && nextFromInclusive >= toExclusive {
			return nil
		}
		remote = stream.nodes.AdvanceStickyPeer(remote)
	}

	return AsRiverError(err, Err_UNAVAILABLE).
		Tags("stream", streamId, "missingFromInclusive", nextFromInclusive, "missingToExlusive", toExclusive).
		Message("No peer could provide miniblocks for stream reconciliation")
}

// syncStreamFromSinglePeer syncs the database for the given streamResult by fetching missing blocks from a single peer.
// It returns block number of last block successfully synced + 1.
func (s *streamCacheImpl) syncStreamFromSinglePeer(
	ctx context.Context,
	stream *streamImpl,
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
			mb, err := NewMiniblockInfoFromProto(mbProto, NewMiniblockInfoFromProtoOpts{
				ExpectedBlockNumber: currentFromInclusive + int64(i),
			})
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
