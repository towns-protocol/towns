package events

import (
	"bytes"
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/towns-protocol/towns/core/node/registries"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/linkdata/deadlock"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
)

type ViewStream interface {
	GetView(ctx context.Context) (*StreamView, error)
}

type SyncResultReceiver interface {
	// OnUpdate is called each time a new cookie is available for a stream
	OnUpdate(r *StreamAndCookie)
	// OnSyncError is called when a sync subscription failed unrecoverable
	OnSyncError(err error)
	// OnStreamSyncDown is called when updates for a stream could not be given.
	OnStreamSyncDown(StreamId)
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

	lastAppliedBlockNum crypto.BlockNumber

	// lastAccessedTime keeps track of when the stream was last used by a client
	lastAccessedTime time.Time

	nodesLocked nodes.StreamNodesWithoutLock

	// local is not nil if stream is local to current node. local and all fields of local are protected by mu.
	local *localStreamState
}

var _ nodes.StreamNodes = (*Stream)(nil)

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

// view should be called with at least a read lock.
func (s *Stream) view() *StreamView {
	return s.local.useGetterAndSetterToGetView
}

// This should be accessed under lock.
func (s *Stream) setView(view *StreamView) {
	s.local.useGetterAndSetterToGetView = view
	if view != nil && len(s.local.pendingCandidates) > 0 {
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

// loadInternal should be called with a lock held.
func (s *Stream) loadInternal(ctx context.Context) error {
	if s.view() != nil {
		return nil
	}

	streamRecencyConstraintsGenerations := int(s.params.ChainConfig.Get().RecencyConstraintsGen)

	streamData, err := s.params.Storage.ReadStreamFromLastSnapshot(
		ctx,
		s.streamId,
		streamRecencyConstraintsGenerations,
	)
	if err != nil {
		if AsRiverError(err).Code == Err_NOT_FOUND {
			return s.initFromBlockchain(ctx)
		}
		return err
	}

	view, err := MakeStreamView(streamData)
	if err != nil {
		logging.FromCtx(ctx).
			Errorw("Stream.loadInternal: Failed to parse stream data loaded from storage",
				"error", err, "streamId", s.streamId)
		return err
	}

	s.setView(view)
	return nil
}

// ApplyMiniblock applies given miniblock, updating the cached stream view and storage.
// ApplyMiniblock is thread-safe.
func (s *Stream) ApplyMiniblock(ctx context.Context, miniblock *MiniblockInfo) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.loadInternal(ctx); err != nil {
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
	firstMbNum := miniblocks[0].Ref.Num
	blocksToWriteToStorage := make([]*storage.WriteMiniblockData, len(miniblocks))
	for i, miniblock := range miniblocks {
		if miniblock.Ref.Num != firstMbNum+int64(i) {
			return RiverError(Err_INTERNAL, "miniblock numbers are not sequential").Func("importMiniblocks")
		}
		mb, err := miniblock.AsStorageMb()
		if err != nil {
			return err
		}
		blocksToWriteToStorage[i] = mb
	}

	if s.view() == nil {
		// Do we have genesis miniblock?
		if miniblocks[0].Header().MiniblockNum == 0 {
			err := s.initFromGenesis(ctx, miniblocks[0], blocksToWriteToStorage[0].Data)
			if err != nil {
				return err
			}
			miniblocks = miniblocks[1:]
			blocksToWriteToStorage = blocksToWriteToStorage[1:]
		}

		err := s.loadInternal(ctx)
		if err != nil {
			return err
		}
	}

	originalView := s.view()

	// Skip known blocks.
	for len(miniblocks) > 0 && miniblocks[0].Ref.Num <= originalView.LastBlock().Ref.Num {
		blocksToWriteToStorage = blocksToWriteToStorage[1:]
		miniblocks = miniblocks[1:]
	}
	if len(miniblocks) == 0 {
		return nil
	}

	currentView := originalView
	var err error
	var newEvents []*Envelope
	allNewEvents := []*Envelope{}
	for _, miniblock := range miniblocks {
		currentView, newEvents, err = currentView.copyAndApplyBlock(miniblock, s.params.ChainConfig.Get())
		if err != nil {
			return err
		}
		allNewEvents = append(allNewEvents, newEvents...)
		allNewEvents = append(allNewEvents, miniblock.headerEvent.Envelope)
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

	s.setView(currentView)
	newSyncCookie := s.view().SyncCookie(s.params.Wallet.Address)
	s.notifySubscribersLocked(allNewEvents, newSyncCookie)
	return nil
}

// applyMiniblockImplLocked should be called with a lock held.
func (s *Stream) applyMiniblockImplLocked(
	ctx context.Context,
	info *MiniblockInfo,
	miniblock *storage.MiniblockDescriptor,
) error {
	// Check if the miniblock is already applied.
	if info.Ref.Num <= s.view().LastBlock().Ref.Num {
		return nil
	}

	// TODO: strict check here.
	// TODO: tests for this.

	// Lets see if this miniblock can be applied.
	prevSV := s.view()
	newSV, newEvents, err := prevSV.copyAndApplyBlock(info, s.params.ChainConfig.Get())
	if err != nil {
		return err
	}

	newMinipool, err := newSV.minipool.getEnvelopeBytes()
	if err != nil {
		return err
	}

	var storageMb *storage.WriteMiniblockData
	if miniblock != nil {
		storageMb = &storage.WriteMiniblockData{
			Number:   info.Ref.Num,
			Hash:     info.Ref.Hash,
			Snapshot: info.GetSnapshot(),
			Data:     miniblock.Data,
		}
	} else {
		if storageMb, err = info.AsStorageMb(); err != nil {
			return err
		}
	}

	err = s.params.Storage.WriteMiniblocks(
		ctx,
		s.streamId,
		[]*storage.WriteMiniblockData{storageMb},
		newSV.minipool.generation,
		newMinipool,
		prevSV.minipool.generation,
		prevSV.minipool.events.Len(),
	)
	if err != nil {
		return err
	}

	s.setView(newSV)
	newSyncCookie := s.view().SyncCookie(s.params.Wallet.Address)

	newEvents = append(newEvents, info.headerEvent.Envelope)
	s.notifySubscribersLocked(newEvents, newSyncCookie)
	return nil
}

// promoteCandidate is thread-safe.
func (s *Stream) promoteCandidate(ctx context.Context, mb *MiniblockRef) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.promoteCandidateLocked(ctx, mb)
}

// promoteCandidateLocked shouldbe called with a lock held.
func (s *Stream) promoteCandidateLocked(ctx context.Context, mb *MiniblockRef) error {
	if s.local == nil {
		return nil
	}

	if s.local == nil {
		return nil
	}

	if err := s.loadInternal(ctx); err != nil {
		return err
	}

	// Check if the miniblock is already applied.
	lastMbNum := s.view().LastBlock().Ref.Num
	if mb.Num <= lastMbNum {
		// Log error if hash doesn't match.
		appliedMb, _ := s.view().blockWithNum(mb.Num)
		if appliedMb != nil && appliedMb.Ref.Hash != mb.Hash {
			logging.FromCtx(ctx).Errorw("PromoteCandidate: Miniblock is already applied",
				"streamId", s.streamId,
				"blockNum", mb.Num,
				"blockHash", mb.Hash,
				"lastBlockNum", s.view().LastBlock().Ref.Num,
				"lastBlockHash", s.view().LastBlock().Ref.Hash,
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
// TODO: REPLICATION: FIX: there should be periodic check to trigger reconciliation if scheduled promotion is not acted upon.
func (s *Stream) schedulePromotionLocked(mb *MiniblockRef) error {
	if len(s.local.pendingCandidates) == 0 {
		if mb.Num != s.view().LastBlock().Ref.Num+1 {
			return RiverError(Err_INTERNAL, "schedulePromotionNoLock: next promotion is not for the next block")
		}
		s.local.pendingCandidates = append(s.local.pendingCandidates, mb)
	} else {
		lastPending := s.local.pendingCandidates[len(s.local.pendingCandidates)-1]
		if mb.Num != lastPending.Num+1 {
			return RiverError(Err_INTERNAL, "schedulePromotionNoLock: pending candidates are not consecutive")
		}
		s.local.pendingCandidates = append(s.local.pendingCandidates, mb)
	}
	return nil
}

// initFromGenesis is not thread-safe. It should be called with a lock held.
func (s *Stream) initFromGenesis(
	ctx context.Context,
	genesisInfo *MiniblockInfo,
	genesisBytes []byte,
) error {
	if genesisInfo.Header().MiniblockNum != 0 {
		return RiverError(Err_BAD_BLOCK, "init from genesis must be from block with num 0")
	}

	// TODO: move this call out of the lock
	_, registeredGenesisHash, _, blockNum, err := s.params.Registry.GetStreamWithGenesis(ctx, s.streamId)
	if err != nil {
		return err
	}

	if registeredGenesisHash != genesisInfo.Ref.Hash {
		return RiverError(Err_BAD_BLOCK, "Invalid genesis block hash").
			Tags("registryHash", registeredGenesisHash, "blockHash", genesisInfo.Ref.Hash).
			Func("initFromGenesis")
	}

	if err = s.params.Storage.CreateStreamStorage(
		ctx,
		s.streamId,
		&storage.WriteMiniblockData{Data: genesisBytes},
	); err != nil {
		// TODO: this error is not handle correctly here: if stream is in storage, caller of this initFromGenesis
		// should read it from storage.
		if AsRiverError(err).Code != Err_ALREADY_EXISTS {
			return err
		}
	}

	s.lastAppliedBlockNum = blockNum

	view, err := MakeStreamView(
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: []*storage.MiniblockDescriptor{{
				Data:   genesisBytes,
				Number: genesisInfo.Ref.Num,
				Hash:   genesisInfo.Ref.Hash,
			}},
		},
	)
	if err != nil {
		return err
	}
	s.setView(view)

	return nil
}

// initFromBlockchain is not thread-safe. It should be called with a lock held.
func (s *Stream) initFromBlockchain(ctx context.Context) error {
	// TODO: move this call out of the lock
	record, hash, mb, blockNum, err := s.params.Registry.GetStreamWithGenesis(ctx, s.streamId)
	if err != nil {
		return err
	}

	s.nodesLocked.ResetFromStreamResult(record, s.params.Wallet.Address)
	if !s.nodesLocked.IsLocal() {
		return RiverError(
			Err_INTERNAL,
			"initFromBlockchain: Stream is not local",
			"streamId", s.streamId,
			"nodes", record.Nodes,
			"localNode", s.params.Wallet,
		)
	}

	if record.LastMiniblockNum > 0 {
		return RiverError(
			Err_INTERNAL,
			"initFromBlockchain: Stream is past genesis",
			"streamId",
			s.streamId,
			"record",
			record,
		)
	}

	if err = s.params.Storage.CreateStreamStorage(
		ctx,
		s.streamId,
		&storage.WriteMiniblockData{Data: mb},
	); err != nil {
		return err
	}

	s.lastAppliedBlockNum = blockNum

	// Successfully put data into storage, init stream view.
	view, err := MakeStreamView(
		&storage.ReadStreamFromLastSnapshotResult{
			Miniblocks: []*storage.MiniblockDescriptor{{
				Data:   mb,
				Number: blockNum.AsBigInt().Int64(),
				Hash:   hash,
			}},
		},
	)
	if err != nil {
		return err
	}
	s.setView(view)
	return nil
}

// GetViewIfLocal returns stream view if stream is local, nil if stream is not local,
// and error if stream is local and failed to load.
// GetViewIfLocal is thread-safe.
func (s *Stream) GetViewIfLocal(ctx context.Context) (*StreamView, error) {
	view, isLocal := s.tryGetView()
	if !isLocal {
		return nil, nil
	}
	if view != nil {
		return view, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastAccessedTime = time.Now()
	if err := s.loadInternal(ctx); err != nil {
		return nil, err
	}
	s.maybeScrubLocked()
	return s.view(), nil
}

// GetView returns stream view if stream is local, and error if stream is not local or failed to load.
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
// tryGetView is thread-safe.
func (s *Stream) tryGetView() (*StreamView, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	isLocal := s.nodesLocked.IsLocalInQuorum() && s.local != nil
	if isLocal && s.view() != nil {
		s.maybeScrubLocked()
		return s.view(), true
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
	if s.view() == nil {
		return true
	}

	if time.Since(s.lastAccessedTime) < expiration {
		return false
	}

	if s.view().minipool.size() != 0 {
		return false
	}

	if len(s.local.pendingCandidates) != 0 {
		return false
	}

	s.setView(nil)
	return true
}

// GetMiniblocks returns miniblock data directly fromn storage, bypassing the cache.
// This is useful when we expect block data to be substantial and do not want to bust the cache.
// miniblocks: with indexes from fromIndex inclusive, to toIndex exclusive
// terminus: true if fromIndex is 0, or if there are no more blocks because they've been garbage collected
// GetMiniblocks is thread-safe.
func (s *Stream) GetMiniblocks(
	ctx context.Context,
	fromInclusive int64,
	toExclusive int64,
) ([]*MiniblockInfo, bool, error) {
	blocks, err := s.params.Storage.ReadMiniblocks(ctx, s.streamId, fromInclusive, toExclusive)
	if err != nil {
		return nil, false, err
	}

	miniblocks := make([]*MiniblockInfo, len(blocks))
	for i, block := range blocks {
		miniblocks[i], err = NewMiniblockInfoFromDescriptor(block)
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
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.loadInternal(ctx); err != nil {
		return nil, err
	}

	return s.addEventLocked(ctx, event)
}

// notifySubscribersLocked updates all callers with unseen events and the new sync cookie.
// Callers must have a lock held.
func (s *Stream) notifySubscribersLocked(
	envelopes []*Envelope,
	newSyncCookie *SyncCookie,
) {
	if s.local.receivers != nil && s.local.receivers.Cardinality() > 0 {
		s.lastAccessedTime = time.Now()

		resp := &StreamAndCookie{
			Events:         envelopes,
			NextSyncCookie: newSyncCookie,
		}
		for receiver := range s.local.receivers.Iter() {
			receiver.OnUpdate(resp)
		}
	}
}

// addEventLocked is not thread-safe.
// Callers must have a lock held.
func (s *Stream) addEventLocked(ctx context.Context, event *ParsedEvent) (*StreamView, error) {
	envelopeBytes, err := event.GetEnvelopeBytes()
	if err != nil {
		return nil, err
	}

	oldSV := s.view()
	err = oldSV.ValidateNextEvent(ctx, s.params.ChainConfig.Get(), event, time.Time{})
	if err != nil {
		if IsRiverErrorCode(err, Err_DUPLICATE_EVENT) {
			return oldSV, nil
		}
		return nil, AsRiverError(err).Func("copyAndAddEvent")
	}

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
		eventsStr := fmt.Sprintf("[...%d events]", len(s.view().minipool.events.Map))
		if len(s.view().minipool.events.Map) <= 16 {
			var sb strings.Builder
			sb.WriteString("[\n")
			for hash, event := range s.view().minipool.events.Map {
				sb.WriteString(fmt.Sprintf("  %s %s,\n", hash, event.ShortDebugStr()))
			}
			sb.WriteString("]")
			eventsStr = sb.String()
		}

		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).
			Tag("inMemoryBlocks", len(s.view().blocks)).
			Tag("inMemoryEvents", eventsStr)
	}

	s.setView(newSV)
	newSyncCookie := s.view().SyncCookie(s.params.Wallet.Address)

	s.notifySubscribersLocked([]*Envelope{event.Envelope}, newSyncCookie)

	return newSV, nil
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

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.loadInternal(ctx); err != nil {
		return err
	}

	s.lastAccessedTime = time.Now()

	resp, err := s.view().GetStreamSince(ctx, s.params.Wallet, cookie)
	if err != nil {
		return err
	}

	if s.local.receivers == nil {
		s.local.receivers = mapset.NewSet[SyncResultReceiver]()
	}
	s.local.receivers.Add(receiver)

	receiver.OnUpdate(resp)

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

	s.setView(nil)
	if s.local.receivers != nil && s.local.receivers.Cardinality() > 0 {
		err := RiverError(Err_INTERNAL, "Stream unloaded")
		for r := range s.local.receivers.Iter() {
			r.OnSyncError(err)
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
		s.view() != nil &&
		s.view().minipool.events.Len() > 0 &&
		!s.view().snapshot.GetInceptionPayload().GetSettings().GetDisableMiniblockCreation()
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

	if s.view() != nil {
		ret.loaded = true
		ret.numMinipoolEvents = s.view().minipool.events.Len()
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

// tryApplyCandidate tries to apply the miniblock candidate to the stream. It will apply iff
// it matches the first in the list of pending candidates, and then it will apply the entire
// list of pending candidates. It will also return a true result if this block matches the
// last block applied to the stream.
// tryApplyCandidate is thread-safe.
func (s *Stream) tryApplyCandidate(ctx context.Context, mb *MiniblockInfo) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	err := s.loadInternal(ctx)
	if err != nil {
		return false, err
	}

	if mb.Ref.Num <= s.view().LastBlock().Ref.Num {
		existing, err := s.view().blockWithNum(mb.Ref.Num)
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
			s.view().LastBlock().Ref.Num,
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

	view := s.view()
	if view != nil {
		return view.LastBlock().Ref.Num, nil
	}

	return s.params.Storage.GetLastMiniblockNumber(ctx, s.streamId)
}

// applyStreamEvents applies the list of stream events to the stream.
// applyStreamEvents is thread-safe.
func (s *Stream) applyStreamEvents(
	ctx context.Context,
	events []river.StreamUpdatedEvent,
	blockNum crypto.BlockNumber,
) {
	if len(events) == 0 {
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Sanity check
	if s.lastAppliedBlockNum >= blockNum {
		logging.FromCtx(ctx).
			Errorw("applyStreamEvents: already applied events for block", "blockNum", blockNum, "streamId", s.streamId,
				"lastAppliedBlockNum", s.lastAppliedBlockNum,
			)
		return
	}

	for _, e := range events {
		switch e.Reason() {
		case river.StreamUpdatedEventTypePlacementUpdated:
			ev := e.(*river.StreamState)
			s.nodesLocked.ResetFromStreamState(ev, s.params.Wallet.Address)
		case river.StreamUpdatedEventTypeLastMiniblockBatchUpdated:
			event := e.(*river.StreamMiniblockUpdate)
			err := s.promoteCandidateLocked(ctx, &MiniblockRef{
				Hash: event.LastMiniblockHash,
				Num:  int64(event.LastMiniblockNum),
			})
			if err != nil {
				logging.FromCtx(ctx).Errorw("onStreamLastMiniblockUpdated: failed to promote candidate", "err", err)
			}
		case river.StreamUpdatedEventTypeAllocate:
			logging.FromCtx(ctx).Errorw("applyStreamEvents: unexpected stream allocation event",
				"event", e, "streamId", s.streamId)
			continue
		case river.StreamUpdatedEventTypeCreate:
			logging.FromCtx(ctx).Errorw("applyStreamEvents: unexpected stream creation event",
				"event", e, "streamId", s.streamId)
			continue
		default:
			logging.FromCtx(ctx).Errorw("applyStreamEvents: unknown event", "event", e, "streamId", s.streamId)
		}
	}

	s.lastAppliedBlockNum = blockNum
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

func (s *Stream) ResetFromStreamState(state *river.StreamState, localNode common.Address) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.nodesLocked.ResetFromStreamState(state, localNode)
}

func (s *Stream) ResetFromStreamResult(result *registries.GetStreamResult, localNode common.Address) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.nodesLocked.ResetFromStreamResult(result, localNode)
}

func (s *Stream) Reset(replicationFactor int, nodes []common.Address, localNode common.Address) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.nodesLocked.Reset(replicationFactor, nodes, localNode)
}

func (s *Stream) GetSyncNodes() []common.Address {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.nodesLocked.GetSyncNodes()
}

func (s *Stream) IsLocalInQuorum() bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.nodesLocked.IsLocalInQuorum()
}
