package events

import (
	"context"
	"math"
	"runtime/pprof"
	"slices"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/shared"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/storage"
)

const (
	defaultGetMiniblocksPageSize = 128
)

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

	// presentRanges is the list of miniblock ranges that are present in the local database.
	// Each range contains the start and end miniblock numbers (inclusive) and list of miniblocks
	// with snapshots.
	presentRanges []storage.MiniblockRange

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

func newStreamReconciler(
	cache *StreamCache,
	stream *Stream,
	streamRecord *river.StreamWithId,
) *streamReconciler {
	return &streamReconciler{
		cache:                   cache,
		stream:                  stream,
		streamRecord:            streamRecord,
		expectedLastMbInclusive: streamRecord.LastMbNum(),
	}
}

// reconcileAndTrim runs stream reconciliation and trimming processes.
func (sr *streamReconciler) reconcileAndTrim() error {
	var err error
	pprof.Do(
		sr.cache.params.ServerCtx,
		pprof.Labels("STREAM_ID", sr.stream.streamId.String(), "START_TIME", time.Now().UTC().Format(time.RFC3339)),
		func(context.Context) {
			err = sr.reconcile()
		},
	)

	if err != nil {
		return err
	}

	return sr.trim()
}

// trim runs stream history and snapshot trimming process.
func (sr *streamReconciler) trim() error {
	var cancel context.CancelFunc
	sr.ctx, cancel = context.WithTimeout(sr.cache.params.ServerCtx, 5*time.Minute)
	defer cancel()

	// Fetching the list of miniblock ranges from the storage. This is used to determine what actions to take
	// such as backward/forwards reconciliation, gaps filling.
	// TODO: Stored ranges should be up to date after reconciliation, so no need to re-fetch them. Address TODO in
	// "reconcile" function.
	err := sr.loadRanges()
	if err != nil {
		return err
	}

	// Stream not found, nothing to trim.
	if len(sr.presentRanges) == 0 {
		return nil
	}

	// It is not allowed to trim a stream that has gaps. There is an exception for genesis miniblock mentioned below.
	if len(sr.presentRanges) > 2 {
		return RiverError(Err_INTERNAL, "Stream has gaps after reconciliation").
			Tags("streamId", sr.stream.streamId, "ranges", sr.presentRanges)
	}

	// If there are a gap in ranges, it is only possible to have the following:
	//  1. [0] - genesis miniblock only, no snapshots.
	//  2. [0+N...] - a complete range from Nth miniblock to the latest miniblock.
	if len(sr.presentRanges) == 2 &&
		sr.presentRanges[0].StartInclusive != 0 &&
		sr.presentRanges[0].EndInclusive != 0 {
		return RiverError(Err_INTERNAL, "Stream has an unexpected gap after reconciliation").
			Tags("streamId", sr.stream.streamId, "ranges", sr.presentRanges)
	}

	latestRange := sr.presentRanges[0]
	if len(sr.presentRanges) > 0 {
		latestRange = sr.presentRanges[len(sr.presentRanges)-1]
	}

	var retentionIntervalMbs int64
	if interval := int64(sr.cache.params.ChainConfig.Get().StreamSnapshotIntervalInMiniblocks); interval > 0 {
		retentionIntervalMbs = max(interval, storage.MinRetentionIntervalMiniblocks)
	}

	var nullifySnapshotMbs []int64
	if len(latestRange.SnapshotSeqNums) > 0 {
		lastSnapshotMiniblock := slices.Max(latestRange.SnapshotSeqNums)
		nullifySnapshotMbs = storage.DetermineStreamSnapshotsToNullify(
			latestRange.StartInclusive, lastSnapshotMiniblock-1, latestRange.SnapshotSeqNums,
			retentionIntervalMbs, storage.MinKeepMiniblocks,
		)
	}

	err = sr.cache.params.Storage.TrimStream(sr.ctx, sr.stream.StreamId(), sr.localStartMbInclusive, nullifySnapshotMbs)
	if err != nil {
		return RiverError(Err_INTERNAL, "Failed to trim stream").
			Tags("streamId", sr.stream.streamId, "localStartMbInclusive", sr.localStartMbInclusive, "error", err)
	}

	return nil
}

// reconcile runs single stream reconciliation attempt.
// TODO: instead of re-loading ranges in the end, modify them during reconciliation process without querying DB.
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

	sr.stream.mu.RLock()
	nonReplicatedStream := len(sr.stream.nodesLocked.GetQuorumNodes()) == 1
	remotes, _ := sr.stream.nodesLocked.GetRemotesAndIsLocal()
	remote := sr.stream.nodesLocked.GetStickyPeer()
	sr.stream.mu.RUnlock()

	if len(remotes) == 0 {
		// if the database is already in sync with the stream record, there is no need to reconcile
		if dbMbNum, err := sr.cache.params.Storage.GetLastMiniblockNumber(sr.ctx, sr.stream.StreamId()); err == nil {
			if dbMbNum == sr.streamRecord.LastMbNum() {
				return nil // local stream already in sync, no need to reconcile
			}
		}

		// For non-replicated streams it is possible that the node missed the stream updated event
		// and never promoted the candidate in its DB and can't reconcile the stream from other nodes.
		// Try to promote the local candidate to finish reconciliation.
		lastMBHash := sr.streamRecord.LastMbHash()
		lastMbNum := sr.streamRecord.LastMbNum()

		promoted, err := sr.tryPromoteLocalCandidate(lastMbNum, lastMBHash)
		if err != nil {
			return err
		}
		if promoted {
			return nil
		}

		// Stream stuck: can't reconcile from other nodes nor make the local stream
		// in line with the stream registry.
		return RiverError(Err_UNAVAILABLE, "Stream stuck, no remotes", "stream", sr.stream.streamId)
	}

	sr.remotes = newRemoteTracker(remote, remotes)

	// if stream is not replicated the stream registry may not have the latest miniblock
	// because nodes only register periodically new miniblocks to reduce transaction costs
	// for non-replicated streams. In that case fetch the latest block number from the remote.
	if nonReplicatedStream {
		_ = sr.remotes.execute(sr.setExpectedLastMbFromRemote)
	}

	backwardThreshold := sr.cache.params.ChainConfig.Get().StreamBackwardsReconciliationThreshold
	enableBackwardReconciliation := backwardThreshold > 0

	// Fetching the list of miniblock ranges from the storage. This is used to determine what actions to take
	// such as backward/forwards reconciliation, gaps filling.
	err := sr.loadRanges()
	if err != nil {
		return err
	}

	// If stream is 1 miniblock behind the stream canonical chain, and has the candidate available,
	// promote it instead of asking remotes. Otherwise it is possible that all replicas missed the
	// stream update event and none of them promoted the candidate, causing the stream to get stuck.
	if sr.localLastMbInclusive+1 == sr.streamRecord.LastMbNum() {
		lastMBHash := sr.streamRecord.LastMbHash()
		lastMbNum := sr.streamRecord.LastMbNum()

		promoted, err := sr.tryPromoteLocalCandidate(lastMbNum, lastMBHash)
		if err != nil {
			return err
		}
		if promoted {
			return nil
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

	// Recalculate missing ranges from db and backfill gaps if there are some.
	if err = sr.loadRanges(); err != nil {
		return err
	}

	return sr.backfillGaps()
}

// tryPromoteLocalCandidate attempts to promote a local miniblock candidate if one exists.
// Returns (true, nil) if a candidate was successfully promoted.
// Returns (false, nil) if no candidate exists (NOT_FOUND error).
// Returns (false, err) for any other error (database errors, promotion failures, etc.).
func (sr *streamReconciler) tryPromoteLocalCandidate(mbNum int64, mbHash common.Hash) (bool, error) {
	candidate, err := sr.cache.params.Storage.ReadMiniblockCandidate(
		sr.ctx, sr.stream.StreamId(), mbHash, mbNum)
	if err != nil {
		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			// No candidate available - this is expected in many cases
			return false, nil
		}
		// Database or other error - propagate it
		return false, err
	}

	if candidate == nil {
		// Shouldn't happen if err is nil, but handle defensively
		return false, nil
	}

	// Promote the candidate
	err = sr.stream.promoteCandidate(sr.ctx, &shared.MiniblockRef{Hash: mbHash, Num: mbNum})
	if err != nil {
		return false, err
	}

	return true, nil
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
	// TODO: configurable timeouts through this file
	ctx, cancel := context.WithTimeout(sr.ctx, time.Minute)
	defer cancel()

	lastMb, err := sr.cache.params.RemoteMiniblockProvider.GetLastMiniblockHash(ctx, remote, sr.stream.streamId)
	if err != nil {
		return err
	}

	sr.expectedLastMbInclusive = max(sr.expectedLastMbInclusive, lastMb.Num)

	return nil
}

// reconcileBackward reconciles the stream backwards from the last expected miniblock.
// First reinitialize the stream.
// If after that stream doesn't have miniblocks to that last expected, run forward reconciliation from this point.
func (sr *streamReconciler) reconcileBackward() error {
	sr.stats.backwardCalled = true

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
		if err = sr.reconcileForward(); err != nil {
			return err
		}
	}

	return nil
}

func (sr *streamReconciler) reinitializeStreamFromSinglePeer(remote common.Address) error {
	sr.stats.reinitializeAttempted++

	// TODO: configurable timeouts through this file
	ctx, cancel := context.WithTimeout(sr.ctx, time.Minute)
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

	if len(sr.presentRanges) == 0 {
		return RiverError(Err_INTERNAL, "backfillGaps: no present ranges")
	}

	missingRanges := calculateMissingRanges(sr.presentRanges, sr.localStartMbInclusive, sr.expectedLastMbInclusive)
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

// reconcileStreamForwardFromSinglePeer reconciles the database for the given streamResult by fetching missing blocks
// from a single peer.
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

func (sr *streamReconciler) loadRanges() error {
	var err error
	sr.presentRanges, err = sr.cache.params.Storage.GetMiniblockNumberRanges(sr.ctx, sr.stream.streamId)
	if err != nil {
		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			sr.notFound = true
			sr.localLastMbInclusive = -1
		} else {
			return err
		}
	}

	if len(sr.presentRanges) == 0 {
		sr.notFound = true
		sr.localLastMbInclusive = -1
	} else {
		sr.localLastMbInclusive = sr.presentRanges[len(sr.presentRanges)-1].EndInclusive
	}

	sr.localStartMbInclusive = sr.calculateLocalStartMbInclusive()

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

	return storage.FindClosestSnapshotMiniblock(sr.presentRanges, start)
}
