package events

import (
	"context"
	"time"

	"connectrpc.com/connect"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/storage"
)

// TODO: move constants from rpc/forwarder.go to shared package so they are available here.
const (
	riverNoForwardHeader = "X-River-No-Forward" // Must be set to "true" to disable forwarding
	riverHeaderTrueValue = "true"
)

// streamReconciler tracks state for a single stream reconciliation attempt.
type streamReconciler struct {
	ctx          context.Context
	cache        *StreamCache
	stream       *Stream
	streamRecord *river.StreamWithId

	// expectedLastMbInclusive is last expected miniblock number to be reconciled.
	expectedLastMbInclusive int64

	// remotes is the list of remotes to use for reconciliation.
	remotes remoteTracker

	// localLastMbNumInclusive is the last miniblock number in the local database. -1 if not found.
	localLastMbInclusive int64

	// localStartMbInclusive is the start miniblock number to reconcile. Computed from trim settings based on the stream type.
	localStartMbInclusive int64

	// notFound is true if local storage returned Err_NOT_FOUND for the stream.
	notFound bool
}

func newStreamReconciler(cache *StreamCache, stream *Stream, streamRecord *river.StreamWithId) *streamReconciler {
	return &streamReconciler{
		cache:        cache,
		stream:       stream,
		streamRecord: streamRecord,
	}
}

// reconcile runs single stream reconciliation attempt.
func (sr *streamReconciler) reconcile() error {
	ctx := sr.cache.params.ServerCtx
	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	if sr.streamRecord.IsSealed() {
		return sr.cache.normalizeEphemeralStream(
			ctx,
			sr.stream,
			sr.streamRecord.LastMbNum(),
			sr.streamRecord.IsSealed(),
		)
	}

	sr.expectedLastMbInclusive = sr.streamRecord.LastMbNum()

	sr.stream.mu.RLock()
	nonReplicatedStream := len(sr.stream.nodesLocked.GetQuorumNodes()) == 1
	remotes, _ := sr.stream.nodesLocked.GetRemotesAndIsLocal()
	remote := sr.stream.nodesLocked.GetStickyPeer()
	sr.stream.mu.RUnlock()

	if len(remotes) == 0 {
		return RiverError(Err_UNAVAILABLE, "Stream has no remotes", "stream", sr.stream.streamId)
	}

	sr.remotes = newRemoteTracker(remote, remotes)

	// if stream is not replicated the stream registry may not have the latest miniblock
	// because nodes only register periodically new miniblocks to reduce transaction costs
	// for non-replicated streams. In that case fetch the latest block number from the remote.
	if nonReplicatedStream {
		sr.remotes.execute(sr.setExpectedLastMbFromRemote)
	}

	backwardThreshold := sr.cache.params.ChainConfig.Get().StreamBackwardsReconciliationThreshold
	enableBackwardReconciliation := backwardThreshold > 0

	var presentRanges, missingRanges []storage.MiniblockRange
	var err error
	if !enableBackwardReconciliation {
		sr.localLastMbInclusive, err = sr.stream.getLastMiniblockNumSkipLoad(ctx)
		if err != nil {
			if IsRiverErrorCode(err, Err_NOT_FOUND) {
				sr.notFound = true
				sr.localLastMbInclusive = -1
			} else {
				return err
			}
		}

		if sr.expectedLastMbInclusive <= sr.localLastMbInclusive {
			return nil
		}
	} else {
		// TODO: DO NOT COMMIT: calculate localStartMbInclusive based on settings.
		presentRanges, err = sr.cache.params.Storage.GetMiniblockNumberRanges(ctx, sr.stream.streamId, sr.localStartMbInclusive)
		if err != nil && !IsRiverErrorCode(err, Err_NOT_FOUND) { // TODO: make sure GetMiniblockNumberRanges returns Err_NOT_FOUND if stream is absent
			return err
		}

		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			sr.notFound = true
		}

		if len(presentRanges) == 0 {
			sr.localLastMbInclusive = -1
			missingRanges = []storage.MiniblockRange{
				{
					StartInclusive: sr.localStartMbInclusive,
					EndInclusive:   sr.expectedLastMbInclusive,
				},
			}
		} else {
			sr.localLastMbInclusive = presentRanges[len(presentRanges)-1].EndInclusive
			missingRanges = calculateMissingRanges(presentRanges, sr.localStartMbInclusive, sr.expectedLastMbInclusive)
			if len(missingRanges) == 0 {
				return nil
			}
		}
	}

	if !enableBackwardReconciliation {
		return sr.reconcileForward()
	}

	// Backwards reconciliation is enabled.
	// It's possible that stream is complete at the end and there are gaps in the middle.
	// In this case only gaps need to be backfilled.
	// If last missing range is at the end, then depending on the threshold setting
	// either forward reconciliation should be used or the stream should be re-initialized at the end
	// and then gaps need to be backfilled.
	lastMissingRange := missingRanges[len(missingRanges)-1]
	if lastMissingRange.EndInclusive == sr.expectedLastMbInclusive {
		rangeLen := lastMissingRange.EndInclusive - lastMissingRange.StartInclusive + 1
		if uint64(rangeLen) <= backwardThreshold {
			return sr.reconcileForward()
		} else {
			return sr.reconcileBackward()
		}
	} else {
		return sr.backfillGaps()
	}
}

func (sr *streamReconciler) setExpectedLastMbFromRemote(remote common.Address) error {
	ctx, cancel := context.WithTimeout(
		sr.ctx,
		time.Minute,
	) // TODO: configurable timeouts through this file
	defer cancel()

	client, err := sr.cache.params.NodeRegistry.GetStreamServiceClientForAddress(remote)
	if err != nil {
		return err
	}

	req := connect.NewRequest(&GetLastMiniblockHashRequest{
		StreamId: sr.stream.streamId[:],
	})
	req.Header().Set(riverNoForwardHeader, riverHeaderTrueValue)
	resp, err := client.GetLastMiniblockHash(ctx, req)
	if err != nil {
		return err
	}

	sr.expectedLastMbInclusive = max(sr.expectedLastMbInclusive, resp.Msg.MiniblockNum)
	return nil
}

func (sr *streamReconciler) reconcileBackward() error {
	// First reinitialize the stream.
	// If after that stream doesn't have miniblocks to that last expected, run forward reconciliation from this point.
	// Backfill gaps.

	err := sr.remotes.execute(sr.reinitializeStreamFromSinglePeer)
	if err != nil {
		return err
	}

	// Reinitialize should create new view.
	view, _ := sr.stream.tryGetView(true)
	if view == nil {
		return RiverError(Err_INTERNAL, "reinitializeStreamFromSinglePeer: view is nil")
	}

	sr.localLastMbInclusive = view.LastBlock().Ref.Num
	if sr.localLastMbInclusive < sr.expectedLastMbInclusive {
		err = sr.reconcileForward()
		if err != nil {
			return err
		}
	}

	// Recalculate missing ranges from db.
	presentRanges, err := sr.cache.params.Storage.GetMiniblockNumberRanges(
		sr.ctx,
		sr.stream.streamId,
		sr.localStartMbInclusive,
	)
	if err != nil {
		return err
	}

	if len(presentRanges) == 0 {
		return RiverError(Err_INTERNAL, "reconcileBackward: no present ranges after reinitialization")
	}

	sr.localLastMbInclusive = presentRanges[len(presentRanges)-1].EndInclusive
	missingRanges := calculateMissingRanges(presentRanges, sr.localStartMbInclusive, sr.expectedLastMbInclusive)
	if len(missingRanges) == 0 {
		return nil
	}

	return sr.backfillGaps()
}

func (sr *streamReconciler) reinitializeStreamFromSinglePeer(remote common.Address) error {
	ctx, cancel := context.WithTimeout(
		sr.ctx,
		time.Minute,
	) // TODO: configurable timeouts through this file
	defer cancel()

	client, err := sr.cache.params.NodeRegistry.GetStreamServiceClientForAddress(remote)
	if err != nil {
		return err
	}

	numberOfPrecedingMiniblocks := sr.cache.params.ChainConfig.Get().RecencyConstraintsGen

	req := connect.NewRequest(&GetStreamRequest{
		StreamId:                    sr.stream.streamId[:],
		NumberOfPrecedingMiniblocks: int64(numberOfPrecedingMiniblocks),
	})
	req.Header().Set(riverNoForwardHeader, riverHeaderTrueValue)
	resp, err := client.GetStream(ctx, req)
	if err != nil {
		return err
	}

	return sr.stream.reinitialize(ctx, resp.Msg.GetStream(), !sr.notFound)
}

func (sr *streamReconciler) backfillGaps() error {
	return nil
}

func (sr *streamReconciler) reconcileForward() error {
	fromInclusive := sr.localLastMbInclusive + 1
	toExclusive := sr.expectedLastMbInclusive + 1

	var err error
	err = sr.remotes.execute(func(remote common.Address) error {
		fromInclusive, err = sr.reconcileForwardFromSinglePeer(remote, fromInclusive, toExclusive)
		if err != nil {
			return err
		}
		if fromInclusive >= toExclusive {
			return nil
		}
		return RiverError(Err_UNAVAILABLE, "Current peer returned less than expected miniblocks")
	})
	if err != nil {
		return AsRiverError(err).
			Tags("stream", sr.stream.streamId, "missingFromInclusive", fromInclusive, "missingToExclusive", toExclusive, "localLastMbInclusive", sr.localLastMbInclusive)
	}
	return nil
}

// reconcileStreamForwardFromSinglePeer reconciles the database for the given streamResult by fetching missing blocks from a single peer.
// It returns the block number of the last block successfully reconciled + 1.
func (sr *streamReconciler) reconcileForwardFromSinglePeer(
	remote common.Address,
	fromInclusive int64,
	toExclusive int64,
) (int64, error) {
	pageSize := sr.cache.params.Config.StreamReconciliation.GetMiniblocksPageSize
	if pageSize <= 0 {
		pageSize = 128
	}

	var ctx context.Context
	var cancel context.CancelFunc
	defer func() {
		if cancel != nil {
			cancel()
		}
	}()

	currentFromInclusive := fromInclusive
	for {
		if currentFromInclusive >= toExclusive {
			return currentFromInclusive, nil
		}

		ctx, cancel = context.WithTimeout(sr.ctx, time.Minute)

		currentToExclusive := min(currentFromInclusive+pageSize, toExclusive)

		mbs, err := sr.cache.params.RemoteMiniblockProvider.GetMbs(
			ctx,
			remote,
			sr.stream.streamId,
			currentFromInclusive,
			currentToExclusive,
		)
		if err != nil {
			return currentFromInclusive, err
		}

		if len(mbs) == 0 {
			return currentFromInclusive, nil
		}

		err = sr.stream.importMiniblocks(ctx, mbs)
		if err != nil {
			return currentFromInclusive, err
		}

		currentFromInclusive += int64(len(mbs))
		cancel()
		cancel = nil
	}
}
