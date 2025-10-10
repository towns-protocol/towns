package events

import (
	"context"
	"math"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/storage"
)

const defaultGetMiniblocksPageSize = 128

type streamReconcilerStats struct {
	forwardCalled            bool
	backwardCalled           bool
	backfillCalled           bool
	forwardPagesAttempted    int
	forwardPagesSucceeded    int
	forwardMbsSucceeded      int
	backfillPagesAttempted   int
	backfillPagesSucceeded   int
	backfillMbsSucceeded     int
	reinitializeAttempted    int
	reinitializeSucceeded    int
	reinitializeMbsSucceeded int
}

// streamReconciler tracks state for a single stream reconciliation attempt.
type streamReconciler struct {
	ctx          context.Context
	cache        *StreamCache
	stream       *Stream
	streamRecord *river.StreamWithId

	// remotes is the list of remotes to use for reconciliation.
	remotes remoteTracker

	// expectedLastMbInclusive is last expected miniblock number to be reconciled.
	expectedLastMbInclusive int64

	// localLastMbNumInclusive is the last miniblock number in the local database. -1 if not found.
	localLastMbInclusive int64

	// localStartMbInclusive is the start miniblock number to reconcile.
	// Computed from trim settings based on the stream type.
	// The given miniblock must contain a snapshot.
	localStartMbInclusive int64

	// notFound is true if the given stream is not found in the local database.
	notFound bool

	// stats to inspect by tests
	stats streamReconcilerStats
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
	var cancel context.CancelFunc
	sr.ctx, cancel = context.WithTimeout(sr.cache.params.ServerCtx, 5*time.Minute)
	defer cancel()

	if sr.streamRecord.IsSealed() {
		return sr.cache.normalizeEphemeralStream(
			sr.ctx,
			sr.stream,
			sr.streamRecord.LastMbNum(),
			sr.streamRecord.IsSealed(),
		)
	}

	sr.expectedLastMbInclusive = sr.streamRecord.LastMbNum()
	sr.localStartMbInclusive = sr.calculateLocalStartMbInclusive()

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
		_ = sr.remotes.execute(sr.setExpectedLastMbFromRemote)
		sr.localStartMbInclusive = sr.calculateLocalStartMbInclusive()
	}

	backwardThreshold := sr.cache.params.ChainConfig.Get().StreamBackwardsReconciliationThreshold
	enableBackwardReconciliation := backwardThreshold > 0

	// TODO: Implement below
	{
		historyWindow := sr.cache.params.ChainConfig.Get().StreamHistoryMiniblocks.ForType(sr.stream.streamId.Type())

		miniblockRanges, err := sr.cache.params.Storage.GetMiniblockNumberRanges(sr.ctx, sr.stream.streamId)
		if err != nil {
			return err
		}

		if len(miniblockRanges) == 0 {
			// TODO: stream is not present or has 0 miniblocks -> import from genesis
			sr.notFound = true
			sr.localLastMbInclusive = -1
		}

		if miniblockRanges[len(miniblockRanges)-1].EndInclusive >= sr.expectedLastMbInclusive {
			// TODO: Stream is up to date with the expected last miniblock, but it's possible that there are gaps in the middle.
		}

		// TODO:
		//  0. Calculate the lowest miniblock number to reconcile based on the history window and given set of ranges.
		//  1. if len(presentRanges) > 1, there are gaps -> fill gaps
		//  2. if presentRanges[len(presentRanges)-1].EndInclusive >= sr.expectedLastMbInclusive -> no reconciliation required, just fill gaps if relevant
		//  3. if presentRanges[0].StartInclusive > 0 -> delete all miniblocks with number < presentRanges[0].StartInclusive
		//  4. After backfilling gaps, reconciliation, and trimming history check if snapshot trimming is required by using utils.DetermineStreamSnapshotsToNullify function.

		// Reconciliation here stars.
		// ...

		// Delete miniblocks if needed - history trimming.

		// During the gaps filling, we will update a list of miniblocks with snapshots for further trimming.
		// Send the given range of miniblocks to the function that determines which miniblocks should be snapshot-trimmed.
	}

	var err error
	sr.localLastMbInclusive, err = sr.stream.getLastMiniblockNumSkipLoad(sr.ctx)
	if err != nil {
		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			sr.notFound = true
			sr.localLastMbInclusive = -1
		} else {
			return err
		}
	}

	if sr.expectedLastMbInclusive <= sr.localLastMbInclusive {
		// Stream is up to date with the expected last miniblock, but it's possible that there are gaps in the middle.
		if enableBackwardReconciliation {
			return sr.backfillGaps()
		} else {
			return nil
		}
	}

	// Special-case: if stream is stuck at genesis (mb 0), try to import genesis from the stream registry.
	if sr.expectedLastMbInclusive == 0 {
		if err := sr.reconcileFromRegistryGenesisBlock(); err == nil {
			return nil
		}
	}

	if !enableBackwardReconciliation {
		return sr.reconcileForward()
	}

	if (sr.expectedLastMbInclusive - sr.localLastMbInclusive) <= int64(backwardThreshold) {
		err = sr.reconcileForward()
	} else {
		err = sr.reconcileBackward()
	}

	if err != nil {
		return err
	}

	return sr.backfillGaps()
}

// reconcileFromRegistryGenesisBlock attempts to load the genesis miniblock from the stream registry
// and import it locally. Used when the stream registry indicates miniblock 0 and peers may not have
// the genesis due to original node leaving the network.
func (sr *streamReconciler) reconcileFromRegistryGenesisBlock() error {
	ctx, cancel := context.WithTimeout(sr.ctx, time.Minute)
	defer cancel()

	streamID := sr.stream.StreamId()
	_, _, mb, err := sr.cache.params.Registry.StreamRegistry.GetStreamWithGenesis(ctx, streamID, 0)
	if err != nil {
		return err
	}

	if len(mb) == 0 {
		return RiverError(Err_UNAVAILABLE, "Unable to read genesis mb from registry").
			Tags("streamId", streamID).
			Func("reconcileFromRegistryGenesisBlock")
	}

	genesisBlock, err := NewMiniblockInfoFromDescriptor(&storage.MiniblockDescriptor{Data: mb, HasLegacySnapshot: true})
	if err != nil {
		return err
	}

	return sr.stream.importMiniblocks(ctx, []*MiniblockInfo{genesisBlock})
}

func (sr *streamReconciler) setExpectedLastMbFromRemote(remote common.Address) error {
	ctx, cancel := context.WithTimeout(
		sr.ctx,
		time.Minute,
	) // TODO: configurable timeouts through this file
	defer cancel()

	lastMb, err := sr.cache.params.RemoteMiniblockProvider.GetLastMiniblockHash(ctx, remote, sr.stream.streamId)
	if err != nil {
		return err
	}
	sr.expectedLastMbInclusive = max(sr.expectedLastMbInclusive, lastMb.Num)
	return nil
}

func (sr *streamReconciler) reconcileBackward() error {
	sr.stats.backwardCalled = true

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

	return sr.backfillGapsByRanges(presentRanges)
}

func (sr *streamReconciler) reinitializeStreamFromSinglePeer(remote common.Address) error {
	sr.stats.reinitializeAttempted++

	ctx, cancel := context.WithTimeout(
		sr.ctx,
		time.Minute,
	) // TODO: configurable timeouts through this file
	defer cancel()

	numberOfPrecedingMiniblocks := sr.cache.params.ChainConfig.Get().RecencyConstraintsGen
	resp, err := sr.cache.params.RemoteMiniblockProvider.GetStream(
		ctx,
		remote,
		&GetStreamRequest{
			StreamId:                    sr.stream.streamId[:],
			NumberOfPrecedingMiniblocks: int64(numberOfPrecedingMiniblocks),
		},
	)
	if err != nil {
		return err
	}

	err = sr.stream.reinitialize(ctx, resp.GetStream(), !sr.notFound)
	if err != nil {
		return err
	}

	sr.stats.reinitializeSucceeded++
	sr.stats.reinitializeMbsSucceeded += len(resp.GetStream().GetMiniblocks())
	return nil
}

func (sr *streamReconciler) backfillGaps() error {
	sr.stats.backfillCalled = true

	presentRanges, err := sr.cache.params.Storage.GetMiniblockNumberRanges(
		sr.ctx,
		sr.stream.streamId,
		sr.localStartMbInclusive,
	)
	if err != nil {
		return err
	}

	return sr.backfillGapsByRanges(presentRanges)
}

func (sr *streamReconciler) backfillGapsByRanges(presentRanges []storage.MiniblockRange) error {
	sr.stats.backfillCalled = true

	if len(presentRanges) == 0 {
		return RiverError(Err_INTERNAL, "backfillGaps: no present ranges")
	}

	missingRanges := calculateMissingRanges(presentRanges, sr.localStartMbInclusive, sr.expectedLastMbInclusive)
	if len(missingRanges) == 0 {
		return nil
	}

	// Sanity check: at this point last missing range should not be at the end of already reconciled data.
	if missingRanges[len(missingRanges)-1].EndInclusive == sr.expectedLastMbInclusive {
		return RiverError(Err_INTERNAL, "backfillGaps: last missing range is at the end of already reconciled data")
	}

	// Reconcile missing ranges one by one backwards.
	for i := len(missingRanges) - 1; i >= 0; i-- {
		err := sr.backfillRange(missingRanges[i])
		if err != nil {
			return err
		}
	}

	return nil
}

func (sr *streamReconciler) calculateLocalStartMbInclusive() int64 {
	if sr.expectedLastMbInclusive <= 0 {
		return 0
	}

	historyWindow := sr.cache.params.ChainConfig.Get().StreamHistoryMiniblocks.ForType(sr.stream.streamId.Type())
	if historyWindow == 0 {
		return 0
	}

	var history int64
	if historyWindow >= math.MaxInt64 {
		history = math.MaxInt64
	} else {
		history = int64(historyWindow)
	}

	start := sr.expectedLastMbInclusive - history
	if start < 0 {
		return 0
	}
	return start
}

func (sr *streamReconciler) backfillRange(missingRange storage.MiniblockRange) error {
	pageSize := sr.cache.params.Config.StreamReconciliation.GetMiniblocksPageSize
	if pageSize <= 0 {
		pageSize = defaultGetMiniblocksPageSize
	}

	for missingRange.StartInclusive <= missingRange.EndInclusive {
		// Grab page size at the end of the range.
		curRange := missingRange
		if curRange.EndInclusive-curRange.StartInclusive+1 > pageSize {
			curRange.StartInclusive = curRange.EndInclusive - pageSize + 1
		}
		missingRange.EndInclusive = curRange.StartInclusive - 1

		err := sr.backfillPage(curRange)
		if err != nil {
			return err
		}
	}

	return nil
}

func (sr *streamReconciler) backfillPage(curRange storage.MiniblockRange) error {
	fromInclusive := curRange.StartInclusive
	toExclusive := curRange.EndInclusive + 1

	var err error
	err = sr.remotes.execute(func(remote common.Address) error {
		fromInclusive, err = sr.backfillPageFromSinglePeer(remote, fromInclusive, toExclusive)
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

func (sr *streamReconciler) backfillPageFromSinglePeer(
	remote common.Address,
	fromInclusive int64,
	toExclusive int64,
) (int64, error) {
	sr.stats.backfillPagesAttempted++

	ctx, cancel := context.WithTimeout(sr.ctx, time.Minute)
	defer cancel()

	mbs, err := sr.cache.params.RemoteMiniblockProvider.GetMbs(
		ctx,
		remote,
		sr.stream.streamId,
		fromInclusive,
		toExclusive,
	)
	if err != nil {
		return fromInclusive, err
	}
	if len(mbs) == 0 {
		return fromInclusive, RiverError(Err_UNAVAILABLE, "Current peer returned no miniblocks")
	}
	if mbs[0].Ref.Num != fromInclusive {
		return fromInclusive, RiverError(Err_INTERNAL, "Current peer returned miniblock with unexpected number")
	}

	storageMbs, err := MiniblockInfosToStorageMbs(mbs)
	if err != nil {
		return fromInclusive, err
	}

	err = sr.cache.params.Storage.WritePrecedingMiniblocks(
		ctx,
		sr.stream.streamId,
		storageMbs,
	)
	if err != nil {
		return fromInclusive, err
	}

	sr.stats.backfillPagesSucceeded++
	sr.stats.backfillMbsSucceeded += len(mbs)

	return fromInclusive + int64(len(mbs)), nil
}

func (sr *streamReconciler) reconcileForward() error {
	sr.stats.forwardCalled = true

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
		pageSize = defaultGetMiniblocksPageSize
	}
	var err error
	for fromInclusive < toExclusive {
		fromInclusive, err = sr.reconcilePageForwardFromSinglePeer(
			remote,
			fromInclusive,
			min(fromInclusive+pageSize, toExclusive),
		)
		if err != nil {
			return fromInclusive, err
		}
	}
	return fromInclusive, nil
}

func (sr *streamReconciler) reconcilePageForwardFromSinglePeer(
	remote common.Address,
	fromInclusive int64,
	toExclusive int64,
) (int64, error) {
	sr.stats.forwardPagesAttempted++

	ctx, cancel := context.WithTimeout(sr.ctx, time.Minute)
	defer cancel()

	mbs, err := sr.cache.params.RemoteMiniblockProvider.GetMbs(
		ctx,
		remote,
		sr.stream.streamId,
		fromInclusive,
		toExclusive,
	)
	if err != nil {
		return fromInclusive, err
	}
	if len(mbs) == 0 {
		return fromInclusive, RiverError(Err_UNAVAILABLE, "Current peer returned no miniblocks")
	}
	if mbs[0].Ref.Num != fromInclusive {
		return fromInclusive, RiverError(Err_INTERNAL, "Current peer returned miniblock with unexpected number")
	}

	err = sr.stream.importMiniblocks(ctx, mbs)
	if err != nil {
		return fromInclusive, err
	}

	sr.stats.forwardPagesSucceeded++
	sr.stats.forwardMbsSucceeded += len(mbs)

	return fromInclusive + int64(len(mbs)), nil
}
