package events

import (
	"bytes"
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

var _ nodes.StreamNodes = (*Stream)(nil)

type ViewStream interface {
	GetView(ctx context.Context) (*StreamView, error)
}

type SyncResultReceiver interface {
	// OnUpdate is called each time a new event is available for a stream.
	OnUpdate(StreamId, *StreamAndCookie)

	// OnSyncDown is called when updates for a stream could not be given.
	// Subscriber is automatically unsubscribed from the stream and no further OnUpdate calls are made.
	OnSyncDown(StreamId)
}

type localStreamState struct {
	// useGetterAndSetterToGetView contains pointer to current immutable view, if loaded, nil otherwise.
	// Use view() and setView() to access it.
	useGetterAndSetterToGetView *StreamView

	// lastScrubbedTime keeps track of when the stream was last scrubbed. Streams that
	// are never scrubbed will not have this value modified.
	lastScrubbedTime time.Time

	receivers mapset.Set[SyncResultReceiver]

	// pendingCandidates contains list of miniblocks that should be applied immediately when candidate is received.
	// When StreamLastMiniblockUpdated is received and promoteCandidate is called,
	// if there is no candidate in local storage, request is stored in pendingCandidates.
	// First element is the oldest candidate with block number view.LastBlock().Num + 1,
	// second element is the next candidate with next block number and so on.
	// If SaveMiniblockCandidate is called and it matched first element of pendingCandidates,
	// it is removed from pendingCandidates and is applied immediately instead of being stored.
	pendingCandidates []*MiniblockRef
}

type Stream struct {
	params *StreamCacheParams

	streamId StreamId

	// Mutex protects fields below
	// View is copied on write.
	// I.e. if there no calls to AddEvent, readers share the same view object
	// out of lock, which is immutable, so if there is a need to modify, lock is taken, copy
	// of view is created, and copy is modified and stored.
	mu deadlock.RWMutex

	lastAppliedBlockNum blockchain.BlockNumber

	// lastAccessedTime keeps track of when the stream was last used by a client
	lastAccessedTime time.Time

	nodesLocked nodes.StreamNodesWithoutLock

	// local is not nil if stream is local to current node. local and all fields of local are protected by mu.
	local *localStreamState
}

// NewStream creates a new stream with the given streamId and lastAppliedBlockNum.
func NewStream(
	streamId StreamId,
	lastAppliedBlockNum blockchain.BlockNumber,
	params *StreamCacheParams,
) *Stream {
	return &Stream{
		params:              params,
		streamId:            streamId,
		lastAppliedBlockNum: lastAppliedBlockNum,
		lastAccessedTime:    time.Now(),
		local:               &localStreamState{},
	}
}

// IsLocal is thread-safe.
func (s *Stream) IsLocal() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.local != nil
}

// StreamId is thread-safe: streamId is immutable.
func (s *Stream) StreamId() StreamId {
	return s.streamId
}

// getViewLocked should be called with at least a read lock.
func (s *Stream) getViewLocked() *StreamView {
	return s.local.useGetterAndSetterToGetView
}

// This should be accessed under lock.
func (s *Stream) setViewLocked(view *StreamView) {
	s.local.useGetterAndSetterToGetView = view
	if view != nil {
		s.lastAccessedTime = time.Now()
		if len(s.local.pendingCandidates) > 0 {
			lastMbNum := view.LastBlock().Ref.Num
			for i, candidate := range s.local.pendingCandidates {
				if candidate.Num > lastMbNum {
					s.local.pendingCandidates = s.local.pendingCandidates[i:]
					return
				}
			}
			s.local.pendingCandidates = nil
		}
	}
}

// lockMuAndLoadView load view and returns with mu held.
// There are situations when local storage is not initialized:
// If stream is created while node was offline,
// or (should be rare) if onAllocated event was lost and stream advanced beyond genesis.
// In this case stream is scheduled for reconciliation and function waits for initialization to complete.
// mu is always locked on return, even if error is returned.
// Return nil view and nil error if stream is not local.
func (s *Stream) lockMuAndLoadView(ctx context.Context) (*StreamView, error) {
	s.mu.Lock()
	if s.local == nil {
		return nil, nil
	}

	if s.getViewLocked() != nil {
		s.lastAccessedTime = time.Now()
		return s.getViewLocked(), nil
	}

	view, err := s.loadViewNoReconcileLocked(ctx)
	if err == nil {
		return view, nil
	}

	if !IsRiverErrorCode(err, Err_NOT_FOUND) {
		return nil, err
	}

	s.mu.Unlock()
	s.params.streamCache.SubmitReconcileStreamTask(s, nil)

	// Wait for reconciliation to complete.
	backoff := BackoffTracker{
		NextDelay:   100 * time.Millisecond,
		MaxAttempts: 12,
		Multiplier:  3,
		Divisor:     2,
	}

	for {
		s.mu.Lock()
		if s.local == nil {
			return nil, nil
		}
		// importMiniblocks initializes view, so there is no need for loading it from the storage.
		if s.getViewLocked() != nil {
			s.lastAccessedTime = time.Now()
			return s.getViewLocked(), nil
		}
		s.mu.Unlock()

		err := backoff.Wait(ctx, nil)
		if err != nil {
			s.mu.Lock()
			return nil, err
		}
	}
}

// loadViewNoReconcileLocked should be called with a lock held.
// Returns nil view and nil error if stream is not local.
func (s *Stream) loadViewNoReconcileLocked(ctx context.Context) (*StreamView, error) {
	if s.local == nil {
		return nil, nil
	}

	if s.getViewLocked() != nil {
		s.lastAccessedTime = time.Now()
		return s.getViewLocked(), nil
	}

	streamRecencyConstraintsGenerations := int(s.params.ChainConfig.Get().RecencyConstraintsGen)

	streamData, err := s.params.Storage.ReadStreamFromLastSnapshot(
		ctx,
		s.streamId,
		streamRecencyConstraintsGenerations,
	)
	if err != nil {
		return nil, err
	}

	view, err := MakeStreamView(ctx, s.streamId, streamData)
	if err != nil {
		return nil, err
	}

	s.setViewLocked(view)
	return view, nil
}

// ApplyMiniblock applies given miniblock, updating the cached stream view and storage.
// ApplyMiniblock is thread-safe.
func (s *Stream) ApplyMiniblock(ctx context.Context, miniblock *MiniblockInfo) error {
	_, err := s.lockMuAndLoadView(ctx)
	defer s.mu.Unlock()
	if err != nil {
		return err
	}

	return s.applyMiniblockImplLocked(ctx, miniblock, nil)
}

// importMiniblocks imports the given miniblocks.
// importMiniblocks is thread-safe.
func (s *Stream) importMiniblocks(
	ctx context.Context,
	miniblocks []*MiniblockInfo,
) error {
	if len(miniblocks) == 0 {
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	return s.importMiniblocksLocked(ctx, miniblocks)
}

// importMiniblocksLocked should be called with a lock held.
func (s *Stream) importMiniblocksLocked(
	ctx context.Context,
	miniblocks []*MiniblockInfo,
) error {
	blocksToWriteToStorage, err := MiniblockInfosToStorageMbs(miniblocks)
	if err != nil {
		return err
	}

	if s.getViewLocked() == nil {
		// Do we have genesis miniblock?
		if miniblocks[0].Header().MiniblockNum == 0 {
			err := s.initFromGenesisLocked(ctx, miniblocks[0], blocksToWriteToStorage[0].Data)
			if err != nil && !IsRiverErrorCode(err, Err_ALREADY_EXISTS) {
				return err
			}
			miniblocks = miniblocks[1:]
			blocksToWriteToStorage = blocksToWriteToStorage[1:]
		}

		_, err := s.loadViewNoReconcileLocked(ctx)
		if err != nil {
			return err
		}
	}

	originalView := s.getViewLocked()

	// Skip known blocks.
	for len(miniblocks) > 0 && miniblocks[0].Ref.Num <= originalView.LastBlock().Ref.Num {
		blocksToWriteToStorage = blocksToWriteToStorage[1:]
		miniblocks = miniblocks[1:]
	}

	if len(miniblocks) == 0 {
		return nil
	}

	currentView := originalView
	var newEvents []*Envelope
	allNewEvents := []*Envelope{}
	var snapshot *Envelope
	for _, miniblock := range miniblocks {
		currentView, newEvents, err = currentView.copyAndApplyBlock(miniblock, s.params.ChainConfig.Get())
		if err != nil {
			return err
		}
		allNewEvents = append(allNewEvents, newEvents...)
		allNewEvents = append(allNewEvents, miniblock.headerEvent.Envelope)
		if len(miniblock.Header().GetSnapshotHash()) > 0 {
			snapshot = miniblock.SnapshotEnvelope
		}
	}

	newMinipoolBytes, err := currentView.minipool.getEnvelopeBytes()
	if err != nil {
		return err
	}

	err = s.params.Storage.WriteMiniblocks(
		ctx,
		s.streamId,
		blocksToWriteToStorage,
		currentView.minipool.generation,
		newMinipoolBytes,
		originalView.minipool.generation,
		originalView.minipool.events.Len(),
	)
	if err != nil {
		return err
	}

	s.setViewLocked(currentView)
	newSyncCookie := s.getViewLocked().SyncCookie(s.params.Wallet.Address)
	// TODO: should we notify with entire miniblocks for efficiency?
	s.notifySubscribersLocked(allNewEvents, newSyncCookie, snapshot)
	return nil
}

// applyMiniblockImplLocked should be called with a lock held.
func (s *Stream) applyMiniblockImplLocked(
	ctx context.Context,
	info *MiniblockInfo,
	miniblock *storage.MiniblockDescriptor,
) error {
	// Check if the miniblock is already applied.
	if info.Ref.Num <= s.getViewLocked().LastBlock().Ref.Num {
		return nil
	}

	// TODO: strict check here.
	// TODO: tests for this.

	// Lets see if this miniblock can be applied.
	prevSV := s.getViewLocked()
	newSV, newEvents, err := prevSV.copyAndApplyBlock(info, s.params.ChainConfig.Get())
	if err != nil {
		return err
	}

	newMinipool, err := newSV.minipool.getEnvelopeBytes()
	if err != nil {
		return err
	}

	var mbBytes []byte
	var snapshotBytes []byte
	if miniblock != nil {
		mbBytes = miniblock.Data
		snapshotBytes = miniblock.Snapshot
	}
	storageMb, err := info.AsStorageMbWithBytes(mbBytes, snapshotBytes)
	if err != nil {
		return err
	}

	err = s.params.Storage.WriteMiniblocks(
		ctx,
		s.streamId,
		[]*storage.MiniblockDescriptor{storageMb},
		newSV.minipool.generation,
		newMinipool,
		prevSV.minipool.generation,
		prevSV.minipool.events.Len(),
	)
	if err != nil {
		return err
	}

	s.setViewLocked(newSV)
	newSyncCookie := s.getViewLocked().SyncCookie(s.params.Wallet.Address)

	newEvents = append(newEvents, info.headerEvent.Envelope)
	var snapshot *Envelope
	if len(info.Header().GetSnapshotHash()) > 0 {
		snapshot = info.SnapshotEnvelope
	}
	s.notifySubscribersLocked(newEvents, newSyncCookie, snapshot)
	return nil
}

// promoteCandidate is thread-safe.
func (s *Stream) promoteCandidate(ctx context.Context, mb *MiniblockRef) error {
	_, err := s.lockMuAndLoadView(ctx)
	defer s.mu.Unlock()
	if err != nil {
		return err
	}
	return s.promoteCandidateLocked(ctx, mb)
}

// promoteCandidateLocked should be called with a lock held.
func (s *Stream) promoteCandidateLocked(ctx context.Context, mb *MiniblockRef) error {
	if s.local == nil {
		return RiverError(Err_FAILED_PRECONDITION, "can't promote candidate for non-local stream").
			Tag("stream", s.streamId)
	}

	// Check if the miniblock is already applied.
	lastMbNum := s.getViewLocked().LastBlock().Ref.Num
	if mb.Num <= lastMbNum {
		// Log error if hash doesn't match.
		appliedMb, _ := s.getViewLocked().blockWithNum(mb.Num)
		if appliedMb != nil && appliedMb.Ref.Hash != mb.Hash {
			logging.FromCtx(ctx).Errorw("PromoteCandidate: Miniblock is already applied",
				"streamId", s.streamId,
				"blockNum", mb.Num,
				"blockHash", mb.Hash,
				"lastBlockNum", s.getViewLocked().LastBlock().Ref.Num,
				"lastBlockHash", s.getViewLocked().LastBlock().Ref.Hash,
			)
		}
		return nil
	}

	if mb.Num > lastMbNum+1 {
		return s.schedulePromotionLocked(mb)
	}

	miniblockCandidate, err := s.params.Storage.ReadMiniblockCandidate(ctx, s.streamId, mb.Hash, mb.Num)
	if err != nil {
		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			return s.schedulePromotionLocked(mb)
		}
		return err
	}

	miniblock, err := NewMiniblockInfoFromDescriptor(miniblockCandidate)
	if err != nil {
		return err
	}

	return s.applyMiniblockImplLocked(ctx, miniblock, miniblockCandidate)
}

// schedulePromotionLocked should be called with a lock held.
// TODO: REPLICATION: FIX: there should be periodic check to trigger reconciliation if scheduled promotion is not acted
// upon.
func (s *Stream) schedulePromotionLocked(mb *MiniblockRef) error {
	if len(s.local.pendingCandidates) == 0 {
		if mb.Num != s.getViewLocked().LastBlock().Ref.Num+1 {
			return RiverError(
				Err_STREAM_RECONCILIATION_REQUIRED,
				"schedulePromotionNoLock: next promotion is not for the next block",
			).Tags("stream", s.streamId)
		}
		s.local.pendingCandidates = append(s.local.pendingCandidates, mb)
	} else if len(s.local.pendingCandidates) > 3 {
		return RiverError(Err_STREAM_RECONCILIATION_REQUIRED, "schedulePromotionNoLock: too many pending candidates")
	} else {
		lastPending := s.local.pendingCandidates[len(s.local.pendingCandidates)-1]
		if mb.Num != lastPending.Num+1 {
			return RiverError(Err_STREAM_RECONCILIATION_REQUIRED, "schedulePromotionNoLock: pending candidates are not consecutive").
				Tag("stream", s.streamId)
		}
		s.local.pendingCandidates = append(s.local.pendingCandidates, mb)
	}
	return nil
}

func (s *Stream) initFromGenesisLocked(
	ctx context.Context,
	genesisInfo *MiniblockInfo,
	genesisBytes []byte,
) error {
	if genesisInfo.Header().MiniblockNum != 0 {
		return RiverError(Err_INTERNAL, "init from genesis must be from block with num 0")
	}

	if len(genesisBytes) == 0 {
		return RiverError(Err_INTERNAL, "init from genesis: empty genesis bytes", "streamId", s.streamId)
	}

	storageMb, err := genesisInfo.AsStorageMbWithBytes(genesisBytes, nil)
	if err != nil {
		return err
	}

	err = s.params.Storage.CreateStreamStorage(
		ctx,
		s.streamId,
		storageMb,
	)
	if err != nil {
		return err
	}

	view, err := MakeStreamView(
		ctx,
		s.streamId,
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: []*storage.MiniblockDescriptor{storageMb},
		},
	)
	if err != nil {
		return err
	}
	s.setViewLocked(view)

	return nil
}

// GetViewIfLocalEx returns stream view if stream is local, nil if stream is not local,
// and error if stream is local and failed to load.
// If local storage is not initialized, it will wait for it to be initialized.
// If allowNoQuorum is true, it will return the view even if the local node is not in quorum.
// GetViewIfLocalEx is thread-safe.
func (s *Stream) GetViewIfLocalEx(ctx context.Context, allowNoQuorum bool) (*StreamView, error) {
	view, isLocal := s.tryGetView(allowNoQuorum)
	if !isLocal {
		return nil, nil
	}
	if view != nil {
		return view, nil
	}

	view, err := s.lockMuAndLoadView(ctx)
	defer s.mu.Unlock()
	if err != nil {
		return nil, err
	}

	s.lastAccessedTime = time.Now()
	s.maybeScrubLocked()

	return view, nil
}

// GetViewIfLocal returns stream view if stream is local, nil if stream is not local,
// and error if stream is local and failed to load.
// If local storage is not initialized, it will wait for it to be initialized.
// GetViewIfLocal is thread-safe.
func (s *Stream) GetViewIfLocal(ctx context.Context) (*StreamView, error) {
	return s.GetViewIfLocalEx(ctx, false)
}

// GetView returns stream view if stream is local, and error if stream is not local or failed to load.
// If local storage is not initialized, it will wait for it to be initialized.
// GetView is thread-safe.
func (s *Stream) GetView(ctx context.Context) (*StreamView, error) {
	view, err := s.GetViewIfLocal(ctx)
	if err != nil {
		return nil, err
	}
	if view == nil {
		return nil, RiverError(Err_INTERNAL, "getView: stream is not local")
	}
	return view, nil
}

// tryGetView returns StreamView if it's already loaded, or nil if it's not.
// The second return value is true if the view is local.
// If allowNoQuorum is true, it will return the view even if the local node is not in quorum.
// tryGetView is thread-safe.
func (s *Stream) tryGetView(allowNoQuorum bool) (*StreamView, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.local == nil {
		return nil, false
	}

	isLocal := false
	if !allowNoQuorum {
		isLocal = s.nodesLocked.IsLocalInQuorum()
	} else {
		isLocal = s.nodesLocked.IsLocal()
	}

	if isLocal && s.getViewLocked() != nil {
		s.maybeScrubLocked()
		return s.getViewLocked(), true
	} else {
		return nil, isLocal
	}
}

// maybeScrubLocked schedules a stream scrub if the stream is eligible based on it's
// last scrub time.
// maybeScrubLocked should be taken with a lock.
func (s *Stream) maybeScrubLocked() {
	if !ValidChannelStreamId(&s.streamId) {
		return
	}

	if s.params.Config.Scrubbing.ScrubEligibleDuration > 0 &&
		time.Since(s.local.lastScrubbedTime) > s.params.Config.Scrubbing.ScrubEligibleDuration {
		go s.maybeScheduleScrub()
	}
}

func (s *Stream) shouldScrub() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.params.Config.Scrubbing.ScrubEligibleDuration > 0 &&
		time.Since(s.local.lastScrubbedTime) > s.params.Config.Scrubbing.ScrubEligibleDuration {
		s.local.lastScrubbedTime = time.Now()
		return true
	}
	return false
}

func (s *Stream) maybeScheduleScrub() {
	if s.shouldScrub() {
		s.params.Scrubber.Scrub(s.streamId)
	}
}

// tryCleanup unloads its internal view when s haven't got activity within the given expiration period.
// It returns true when the view is unloaded
// tryCleanup is thread-safe.
func (s *Stream) tryCleanup(expiration time.Duration) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.local == nil {
		// TODO: add purge from cache for non-local streams.
		return false
	}

	// return immediately if the view is already purged or if the mini block creation routine is running for this stream
	if s.getViewLocked() == nil {
		return true
	}

	if time.Since(s.lastAccessedTime) < expiration {
		return false
	}

	if s.getViewLocked().minipool.size() != 0 {
		return false
	}

	if len(s.local.pendingCandidates) != 0 {
		return false
	}

	s.setViewLocked(nil)
	return true
}

// GetMiniblocks returns miniblock data directly from storage, bypassing the cache.
// This is useful when we expect block data to be substantial and do not want to bust the cache.
// miniblocks: with indexes from fromIndex inclusive, to toIndex exclusive
// terminus: true if fromIndex is 0, or if there are no more blocks because they've been garbage collected
// GetMiniblocks is thread-safe.
func (s *Stream) GetMiniblocks(
	ctx context.Context,
	fromInclusive int64,
	toExclusive int64,
	omitSnapshot bool,
) ([]*MiniblockInfo, bool, error) {
	blocks, err := s.params.Storage.ReadMiniblocks(ctx, s.streamId, fromInclusive, toExclusive, omitSnapshot)
	if err != nil {
		return nil, false, err
	}

	miniblocks := make([]*MiniblockInfo, len(blocks))
	for i, block := range blocks {
		opts := NewParsedMiniblockInfoOpts()
		if block.Number > -1 {
			opts = opts.WithExpectedBlockNumber(block.Number)
		}
		if omitSnapshot {
			opts = opts.WithSkipSnapshotValidation()
		}
		miniblocks[i], err = NewMiniblockInfoFromDescriptorWithOpts(block, opts)
		if err != nil {
			return nil, false, err
		}
	}

	terminus := fromInclusive == 0
	return miniblocks, terminus, nil
}

// AddEvent adds an event to the stream.
// AddEvent is thread-safe.
func (s *Stream) AddEvent(ctx context.Context, event *ParsedEvent) error {
	_, err := s.AddEvent2(ctx, event)
	return err
}

// AddEvent2 adds an event to the stream and returns the new stream view.
// AddEvent2 is thread-safe.
func (s *Stream) AddEvent2(ctx context.Context, event *ParsedEvent) (*StreamView, error) {
	return s.addEvent(ctx, event, false)
}

// notifySubscribersLocked updates all callers with unseen events and the new sync cookie.
// Callers must have a lock held.
func (s *Stream) notifySubscribersLocked(
	envelopes []*Envelope,
	newSyncCookie *SyncCookie,
	snapshot *Envelope,
) {
	if s.local.receivers != nil && s.local.receivers.Cardinality() > 0 {
		s.lastAccessedTime = time.Now()

		resp := &StreamAndCookie{
			Events:         envelopes,
			NextSyncCookie: newSyncCookie,
			Snapshot:       snapshot,
		}
		for receiver := range s.local.receivers.Iter() {
			receiver.OnUpdate(s.streamId, resp)
		}
	}
}

func (s *Stream) addEvent(ctx context.Context, event *ParsedEvent, relaxDuplicateCheck bool) (*StreamView, error) {
	_, err := s.lockMuAndLoadView(ctx)
	defer s.mu.Unlock()
	if err != nil {
		return nil, err
	}

	return s.addEventLocked(ctx, event, relaxDuplicateCheck)
}

// addEventLocked adds an event to the stream.
// If relaxDuplicateCheck is true, it will not return an error if referenced miniblock can't be found in the cache.
// In this case duplicate check can't be completed.
// This options is used to add events that are reported by other nodes.
// Without this option there are rare situations when events stay in minipools forever since they have mbs that too
// old to be in the cache and thus can't complete the duplicate check.
// addEventLocked is not thread-safe.
// Callers must have a lock held.
func (s *Stream) addEventLocked(
	ctx context.Context,
	event *ParsedEvent,
	relaxDuplicateCheck bool,
) (*StreamView, error) {
	envelopeBytes, err := event.GetEnvelopeBytes()
	if err != nil {
		return nil, err
	}

	oldSV := s.getViewLocked()
	err = oldSV.ValidateNextEvent(ctx, s.params.ChainConfig.Get(), event, time.Time{})
	if err != nil {
		if IsRiverErrorCode(err, Err_DUPLICATE_EVENT) {
			return oldSV, nil
		}
		skipError := relaxDuplicateCheck && IsRiverErrorCode(err, Err_BAD_PREV_MINIBLOCK_HASH)
		if !skipError {
			return nil, AsRiverError(err).Func("copyAndAddEvent")
		}
		logging.FromCtx(ctx).Warnw("Stream.addEventLocked: adding event with relaxed duplicate check", "error", err)
	}

	newSV := oldSV
	if !event.Event.Ephemeral {
		newSV, err = s.addEventToMinipoolAndStorageLocked(ctx, event, oldSV, envelopeBytes)
		if err != nil {
			return nil, err
		}
	}

	newSyncCookie := s.getViewLocked().SyncCookie(s.params.Wallet.Address)
	s.notifySubscribersLocked([]*Envelope{event.Envelope}, newSyncCookie, nil)

	return newSV, nil
}

func (s *Stream) addEventToMinipoolAndStorageLocked(
	ctx context.Context,
	event *ParsedEvent,
	oldSV *StreamView,
	envelopeBytes []byte,
) (*StreamView, error) {
	// Check if event can be added before writing to storage.
	newSV, err := oldSV.copyAndAddEvent(event)
	if err != nil {
		return nil, err
	}

	err = s.params.Storage.WriteEvent(
		ctx,
		s.streamId,
		oldSV.minipool.generation,
		oldSV.minipool.nextSlotNumber(),
		envelopeBytes,
	)
	// TODO: for some classes of errors, it's not clear if event was added or not
	// for those, perhaps entire Stream structure should be scrapped and reloaded
	if err != nil {
		// Populate error message with as many details as possible since a possible race
		// condition that appears here has been notoriously difficult to debug.
		eventsStr := fmt.Sprintf("[...%d events]", len(s.getViewLocked().minipool.events.Map))
		if len(s.getViewLocked().minipool.events.Map) <= 16 {
			var sb strings.Builder
			sb.WriteString("[\n")
			for hash, event := range s.getViewLocked().minipool.events.Map {
				sb.WriteString(fmt.Sprintf("  %s %s,\n", hash, event.ShortDebugStr()))
			}
			sb.WriteString("]")
			eventsStr = sb.String()
		}

		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).
			Tag("inMemoryBlocks", len(s.getViewLocked().blocks)).
			Tag("inMemoryEvents", eventsStr)
	}

	s.setViewLocked(newSV)
	return newSV, nil
}

// UpdatesSinceCookie retrieves the stream content since the given cookie and sends it to the callback.
// This function locks the stream until the callback is executed.
// One of the use cases is to properly handle race condition when sending stream delta to the sync client
// (avoid updating the stream until the delta is sent to the client).
func (s *Stream) UpdatesSinceCookie(
	ctx context.Context,
	cookie *SyncCookie,
	cb func(*StreamAndCookie) error,
) error {
	if !s.IsLocal() {
		return RiverError(
			Err_NOT_FOUND,
			"stream not local",
			"cookie.StreamId",
			cookie.StreamId,
			"s.streamId",
			s.streamId,
		)
	}
	if !bytes.Equal(cookie.NodeAddress, s.params.Wallet.Address.Bytes()) {
		return RiverError(
			Err_BAD_SYNC_COOKIE,
			"cookies is not for this node",
			"cookie.NodeAddress",
			cookie.NodeAddress,
			"s.params.Wallet.AddressStr",
			s.params.Wallet,
		)
	}
	if !s.streamId.EqualsBytes(cookie.StreamId) {
		return RiverError(
			Err_BAD_SYNC_COOKIE,
			"bad stream id",
			"cookie.StreamId",
			cookie.StreamId,
			"s.streamId",
			s.streamId,
		)
	}

	view, err := s.lockMuAndLoadView(ctx)
	defer s.mu.Unlock()
	if err != nil {
		return err
	}

	resp, err := view.GetStreamSince(ctx, s.params.Wallet.Address, cookie)
	if err != nil {
		return err
	}

	return cb(resp)
}

// Sub subscribes to the stream, sending all content between the cookie and the current stream state.
// This method is thread-safe.
// Only local streams are allowed to subscribe.
func (s *Stream) Sub(ctx context.Context, cookie *SyncCookie, receiver SyncResultReceiver) error {
	if !s.IsLocal() {
		return RiverError(
			Err_NOT_FOUND,
			"stream not found",
			"cookie.StreamId",
			cookie.StreamId,
			"s.streamId",
			s.streamId,
		)
	}
	if !bytes.Equal(cookie.NodeAddress, s.params.Wallet.Address.Bytes()) {
		return RiverError(
			Err_BAD_SYNC_COOKIE,
			"cookies is not for this node",
			"cookie.NodeAddress",
			cookie.NodeAddress,
			"s.params.Wallet.AddressStr",
			s.params.Wallet,
		)
	}
	if !s.streamId.EqualsBytes(cookie.StreamId) {
		return RiverError(
			Err_BAD_SYNC_COOKIE,
			"bad stream id",
			"cookie.StreamId",
			cookie.StreamId,
			"s.streamId",
			s.streamId,
		)
	}

	view, err := s.lockMuAndLoadView(ctx)
	defer s.mu.Unlock()
	if err != nil {
		return err
	}

	resp, err := view.GetStreamSince(ctx, s.params.Wallet.Address, cookie)
	if err != nil {
		return err
	}

	if s.local.receivers == nil {
		s.local.receivers = mapset.NewSet[SyncResultReceiver]()
	}
	s.local.receivers.Add(receiver)

	receiver.OnUpdate(s.streamId, resp)

	return nil
}

// SubNoCookie subscribes to the stream. Does not send initial cookie-based update.
// This method is thread-safe.
// Only local streams are allowed to subscribe.
func (s *Stream) SubNoCookie(ctx context.Context, receiver SyncResultReceiver) error {
	if !s.IsLocal() {
		return RiverError(
			Err_NOT_FOUND,
			"stream not found",
			"s.streamId",
			s.streamId,
		)
	}

	_, err := s.lockMuAndLoadView(ctx)
	defer s.mu.Unlock()
	if err != nil {
		return err
	}

	if s.local.receivers == nil {
		s.local.receivers = mapset.NewSet[SyncResultReceiver]()
	}
	s.local.receivers.Add(receiver)

	return nil
}

// Unsub unsubscribes the receiver from sync. It's ok to unsub non-existing receiver.
// Such situation arises during ForceFlush.
// Unsub is thread-safe.
func (s *Stream) Unsub(receiver SyncResultReceiver) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.local.receivers != nil {
		s.local.receivers.Remove(receiver)
	}
}

// ForceFlush transitions Stream object to unloaded state.
// All subbed receivers will receive empty response and must
// terminate corresponding sync loop.
// ForceFlush is thread-safe.
func (s *Stream) ForceFlush(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.local == nil {
		return
	}

	s.setViewLocked(nil)
	s.unsubAllLocked()
}

// unsubAllLocked sends SYNC_DOWN message to all receivers and unsubscribes all receivers from the stream.
func (s *Stream) unsubAllLocked() {
	if s.local.receivers != nil && s.local.receivers.Cardinality() > 0 {
		for r := range s.local.receivers.Iter() {
			r.OnSyncDown(s.streamId)
		}
	}
	s.local.receivers = nil
}

// canCreateMiniblock determines if a stream is eligible to create a miniblock.
// canCreateMiniblock is thread-safe.
func (s *Stream) canCreateMiniblock() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Loaded, has events in minipool, and periodic miniblock creation is not disabled in test settings.
	return s.local != nil &&
		s.getViewLocked() != nil &&
		s.getViewLocked().minipool.events.Len() > 0 &&
		!s.getViewLocked().snapshot.GetInceptionPayload().GetSettings().GetDisableMiniblockCreation()
}

type streamImplStatus struct {
	loaded            bool
	numMinipoolEvents int
	numSubscribers    int
	lastAccess        time.Time
}

// getStatus returns a snapshot of useful statistics describing the stream's in-memory state.
// getStatus is thread-safe.
func (s *Stream) getStatus() *streamImplStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ret := &streamImplStatus{
		numSubscribers: s.local.receivers.Cardinality(),
		lastAccess:     s.lastAccessedTime,
	}

	if s.getViewLocked() != nil {
		ret.loaded = true
		ret.numMinipoolEvents = s.getViewLocked().minipool.events.Len()
	}

	return ret
}

// SaveMiniblockCandidate saves the miniblock candidate for the stream. If the candidate matches
// the first block in the list of pending candidates, it will be applied. This method is thread-safe.
// Note: saving the candidate itself, without applying it, does not modify the stream's in-memory
// cached state at all.
func (s *Stream) SaveMiniblockCandidate(ctx context.Context, candidate *MiniblockInfo) error {
	applied, err := s.tryApplyCandidate(ctx, candidate)
	if err != nil {
		return err
	}

	if applied {
		return nil
	}

	storageMb, err := candidate.AsStorageMb()
	if err != nil {
		return err
	}

	return s.params.Storage.WriteMiniblockCandidate(ctx, s.streamId, storageMb)
}

// tryApplyCandidate tries to apply the miniblock candidate to the stream. It will apply if
// it matches the first in the list of pending candidates, and then it will apply the entire
// list of pending candidates. It will also return a true result if this block matches the
// last block applied to the stream.
// tryApplyCandidate is thread-safe.
func (s *Stream) tryApplyCandidate(ctx context.Context, mb *MiniblockInfo) (bool, error) {
	// try to apply the candidate
	_, err := s.lockMuAndLoadView(ctx)
	defer s.mu.Unlock()
	if err != nil {
		return false, err
	}

	if mb.Ref.Num <= s.getViewLocked().LastBlock().Ref.Num {
		existing, err := s.getViewLocked().blockWithNum(mb.Ref.Num)
		// Check if block is already applied
		if err == nil && existing.Ref.Hash == mb.Ref.Hash {
			return true, nil
		}

		return false, RiverError(
			Err_INTERNAL,
			"Candidate miniblock is too old",
			"candidate.Num",
			mb.Ref.Num,
			"lastBlock.Num",
			s.getViewLocked().LastBlock().Ref.Num,
			"streamId",
			s.streamId,
		)
	}

	if len(s.local.pendingCandidates) > 0 {
		pending := s.local.pendingCandidates[0]
		if mb.Ref.Num == pending.Num && mb.Ref.Hash == pending.Hash {
			err = s.importMiniblocksLocked(ctx, []*MiniblockInfo{mb})
			if err != nil {
				return false, err
			}

			for len(s.local.pendingCandidates) > 0 {
				pending = s.local.pendingCandidates[0]
				ok := s.tryReadAndApplyCandidateLocked(ctx, pending)
				if !ok {
					break
				}
			}

			return true, nil
		}
	}

	return false, nil
}

// tryReadAndApplyCandidateLocked searches for the candidate in storage and applies it if it exists.
// tryReadAndApplyCandidateLocked is not thread-safe.
func (s *Stream) tryReadAndApplyCandidateLocked(ctx context.Context, mbRef *MiniblockRef) bool {
	miniblockCandidate, err := s.params.Storage.ReadMiniblockCandidate(ctx, s.streamId, mbRef.Hash, mbRef.Num)
	if err == nil {
		miniblock, err := NewMiniblockInfoFromDescriptor(miniblockCandidate)
		if err == nil {
			if err = s.importMiniblocksLocked(ctx, []*MiniblockInfo{miniblock}); err == nil {
				return true
			}
		}
	}

	if !IsRiverErrorCode(err, Err_NOT_FOUND) {
		logging.FromCtx(ctx).
			Errorw("Stream.tryReadAndApplyCandidateNoLock: failed to read miniblock candidate", "error", err)
	}
	return false
}

// getLastMiniblockNumSkipLoad returns the last miniblock number for the given stream from the view if loaded,
// or from storage otherwise.
// getLastMiniblockNumSkipLoad is thread-safe.
func (s *Stream) getLastMiniblockNumSkipLoad(ctx context.Context) (int64, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	view := s.getViewLocked()
	if view != nil {
		return view.LastBlock().Ref.Num, nil
	}

	return s.params.Storage.GetLastMiniblockNumber(ctx, s.streamId)
}

// applyStreamMiniblockUpdates applies the list miniblock updates to the stream.
// applyStreamMiniblockUpdates is thread-safe.
func (s *Stream) applyStreamMiniblockUpdates(
	ctx context.Context,
	events []river.StreamUpdatedEvent,
	blockNum blockchain.BlockNumber,
) {
	if len(events) == 0 {
		return
	}

	view, err := s.lockMuAndLoadView(ctx)
	if err != nil {
		s.mu.Unlock()
		logging.FromCtx(ctx).Errorw("applyStreamEvents: failed to load view", "error", err)
		return
	}

	if view == nil {
		s.mu.Unlock()
		return // stream is not local, no need to apply miniblock updates
	}

	// Track if we need to submit a sync task after releasing the lock
	needsSyncTask := false

	// TODO: REPLICATION: FIX: this function now can be called multiple times per block.
	// Sanity check
	// if s.lastAppliedBlockNum >= blockNum {
	// 	logging.FromCtx(ctx).
	// 		Errorw("applyStreamEvents: already applied events for block", "blockNum", blockNum, "streamId", s.streamId,
	// 			"lastAppliedBlockNum", s.lastAppliedBlockNum,
	// 		)
	// 	return
	// }

	for _, e := range events {
		if e.Reason() == river.StreamUpdatedEventTypeLastMiniblockBatchUpdated {
			event := e.(*river.StreamMiniblockUpdate)
			err := s.promoteCandidateLocked(ctx, &MiniblockRef{
				Hash: event.LastMiniblockHash,
				Num:  int64(event.LastMiniblockNum),
			})
			if err != nil {
				if IsRiverErrorCode(err, Err_STREAM_RECONCILIATION_REQUIRED) {
					needsSyncTask = true
				} else {
					logging.FromCtx(ctx).Errorw("onStreamLastMiniblockUpdated: failed to promote candidate", "error", err)
				}
			}
		} else {
			logging.FromCtx(ctx).Errorw("applyStreamEvents: unknown event", "event", e, "streamId", s.streamId)
		}
	}

	s.lastAppliedBlockNum = blockNum
	s.mu.Unlock()

	if needsSyncTask {
		s.params.streamCache.SubmitReconcileStreamTask(s, nil)
	}
}

// reinitialize replaces the stream's storage and view with data from a remote peer.
// This is used during stream reconciliation when the local stream is significantly behind
// or missing data. The function validates the incoming stream data and snapshot,
// writes new miniblocks and snapshot to storage (creates or updates based on updateExisting),
// and creates a new stream view from the provided data.
//
// If updateExisting is false, returns an error if the stream already exists in storage.
// If updateExisting is true, allows updating an existing stream with new data.
func (s *Stream) reinitialize(ctx context.Context, stream *StreamAndCookie, updateExisting bool) error {
	if stream == nil {
		return RiverError(Err_INTERNAL, "stream is nil")
	}

	if stream.NextSyncCookie == nil {
		return RiverError(Err_INTERNAL, "next sync cookie is nil")
	}

	if !s.streamId.EqualsBytes(stream.NextSyncCookie.StreamId) {
		return RiverError(Err_INTERNAL, "stream id mismatch")
	}

	if len(stream.Miniblocks) == 0 {
		return RiverError(
			Err_INVALID_ARGUMENT,
			"no miniblocks in StreamAndCookie",
			"streamId",
			s.streamId,
		).Func("reinitialize")
	}

	if stream.Snapshot != nil &&
		(stream.SnapshotMiniblockIndex < 0 || stream.SnapshotMiniblockIndex >= int64(len(stream.Miniblocks))) {
		return RiverError(
			Err_INVALID_ARGUMENT,
			"invalid snapshot miniblock index",
			"streamId",
			s.streamId,
		).Func("reinitialize")
	}

	opts := NewParsedMiniblockInfoOpts().WithDoNotParseEvents(true)
	miniblocks, snapshot, snapshotMbIndex, err := ParseMiniblocksFromProto(stream.Miniblocks, stream.Snapshot, opts)
	if err != nil {
		return err
	}
	if snapshot == nil {
		return RiverError(Err_INTERNAL, "snapshot is nil").Func("reinitialize")
	}

	storageMiniblocks, err := MiniblockInfosToStorageMbs(miniblocks)
	if err != nil {
		return err
	}

	// Reinitialize data is prepared.
	// Take lock, drop view, apply data to the database.
	// Since it's a reset "in the future", current subscribers can't be updated continuosly and are dropped.
	s.mu.Lock()
	defer s.mu.Unlock()

	s.setViewLocked(nil)
	s.unsubAllLocked()

	lastSnapshotMiniblockNum := miniblocks[snapshotMbIndex].Ref.Num
	err = s.params.Storage.ReinitializeStreamStorage(
		ctx,
		s.streamId,
		storageMiniblocks,
		lastSnapshotMiniblockNum,
		updateExisting,
	)
	if err != nil {
		return err
	}

	// If success, update the view.
	// TODO: REFACTOR: introduce MakeStreamView from parsed data (to avoid re-parsing).
	view, err := MakeStreamView(ctx, s.streamId, &storage.ReadStreamFromLastSnapshotResult{
		Miniblocks:              storageMiniblocks,
		SnapshotMiniblockOffset: snapshotMbIndex,
		MinipoolEnvelopes:       [][]byte{},
	})
	if err != nil {
		return err
	}
	s.setViewLocked(view)

	return nil
}

// GetQuorumNodes returns the list of nodes this stream resides on according to the stream
// registry. GetQuorumNodes is thread-safe.
func (s *Stream) GetQuorumNodes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return slices.Clone(s.nodesLocked.GetQuorumNodes())
}

// GetRemotesAndIsLocal returns
// remotes - a list of non-local nodes on which the stream resides
// isLocal - boolean, whether the stream is hosted on this node
// GetRemotesAndIsLocal is thread-safe.
func (s *Stream) GetRemotesAndIsLocal() ([]common.Address, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	r, l := s.nodesLocked.GetRemotesAndIsLocal()
	return slices.Clone(r), l
}

// GetQuorumAndReconcileNodesAndIsLocal returns
// quorumNodes - a list of non-local nodes that participate in the stream quorum
// reconcileNodes - a list of non-local nodes that reconcile the stream into local storage but don't participate in
// quorum (yet)
// isLocal - boolean, whether the stream is hosted on this node
// GetQuorumAndReconcileNodesAndIsLocal is thread-safe.
func (s *Stream) GetQuorumAndReconcileNodesAndIsLocal() ([]common.Address, []common.Address, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	qn, sn, l := s.nodesLocked.GetQuorumAndReconcileNodesAndIsLocal()
	return slices.Clone(qn), slices.Clone(sn), l
}

// GetStickyPeer returns the peer this node typically uses to forward requests to for this
// stream. If the node becomes unavailable, the sticky peer can be updated with AdvanceStickyPeer.
// This method is thread-safe.
func (s *Stream) GetStickyPeer() common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.nodesLocked.GetStickyPeer()
}

// AdvanceStickyPeer updates the peer used for forwarding requests for this stream. AdvanceStickyPeer
// can be used whenever a node becomes unavailable.
// AdvanceStickyPeer is thread-safe.
func (s *Stream) AdvanceStickyPeer(currentPeer common.Address) common.Address {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.nodesLocked.AdvanceStickyPeer(currentPeer)
}

func (s *Stream) ResetFromStreamWithId(stream *river.StreamWithId, localNode common.Address) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.nodesLocked.ResetFromStreamWithId(stream, localNode)
}

func (s *Stream) Reset(replicationFactor int, nodes []common.Address, localNode common.Address) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.nodesLocked.Reset(replicationFactor, nodes, localNode)
}

func (s *Stream) GetReconcileNodes() []common.Address {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return slices.Clone(s.nodesLocked.GetReconcileNodes())
}

func (s *Stream) IsLocalInQuorum() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.nodesLocked.IsLocalInQuorum()
}

// TestOnlyHelper_SetView injects the provided view directly into the stream. This helper is intended
// for unit tests so they can bypass storage initialization.
func (s *Stream) TestOnlyHelper_SetView(view *StreamView) {
	s.mu.Lock()
	s.setViewLocked(view)
	s.mu.Unlock()
}
