package events

import (
	"bytes"
	"context"
	"sync"
	"time"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/storage"

	mapset "github.com/deckarep/golang-set/v2"
)

type AddableStream interface {
	AddEvent(ctx context.Context, event *ParsedEvent) error
}

type MiniblockStream interface {
	GetMiniblocks(ctx context.Context, fromInclusive int64, ToExclusive int64) ([]*Miniblock, bool, error)
}

// A ScrubTrackable tracks and updates the last time a stream was scrubbed. Scrubbing is a
// process where the stream node analyzes stream membership for members that have lost
// membership entitlements and generates LEAVE events to boot them from the stream. At this
// time, we only apply scrubbing to channels, which are a subset of joinable streams.
type ScrubTrackable interface {
	LastScrubbedTime() time.Time
	MarkScrubbed(ctx context.Context)
}

type Stream interface {
	ScrubTrackable
	AddableStream
	MiniblockStream

	GetView(ctx context.Context) (StreamView, error)
}

type SyncResultReceiver interface {
	// OnUpdate is called each time a new cookie is available for a stream
	OnUpdate(r *StreamAndCookie)
	// OnSyncError is called when a sync subscription failed unrecoverable
	OnSyncError(err error)
	// OnStreamSyncDown is called when updates for a stream could not be given.
	OnStreamSyncDown(StreamId)
}

// TODO: refactor interfaces.
type SyncStream interface {
	Stream

	Sub(ctx context.Context, cookie *SyncCookie, receiver SyncResultReceiver) error
	Unsub(receiver SyncResultReceiver)

	// ApplyMiniblock applies given miniblock, updating the cached stream view and storage.
	ApplyMiniblock(ctx context.Context, miniblock *MiniblockInfo) error

	// SaveMiniblockCandidate saves the given miniblock as a candidate.
	// Once blockchain event making candidate canonical is observed,
	// candidate is read and applied.
	SaveMiniblockCandidate(
		ctx context.Context,
		mb *Miniblock,
	) error
}

func SyncStreamsResponseFromStreamAndCookie(result *StreamAndCookie) *SyncStreamsResponse {
	return &SyncStreamsResponse{
		Stream: result,
	}
}

type streamImpl struct {
	params *StreamCacheParams

	streamId StreamId

	nodes StreamNodes

	// Mutex protects fields below
	// View is copied on write.
	// I.e. if there no calls to AddEvent, readers share the same view object
	// out of lock, which is immutable, so if there is a need to modify, lock is taken, copy
	// of view is created, and copy is modified and stored.
	mu sync.RWMutex

	// useGetterAndSetterToGetView contains pointer to current immutable view, if loaded, nil otherwise.
	// Use view() and setView() to access it.
	useGetterAndSetterToGetView *streamViewImpl

	// lastAccessedTime keeps track of when the stream was last used by a client
	lastAccessedTime time.Time
	// lastScrubbedTime keeps track of when the stream was last scrubbed. Streams that
	// are never scrubbed will not have this value modified.
	lastScrubbedTime time.Time

	receivers mapset.Set[SyncResultReceiver]

	// pendingCandidates contains list of miniblocks that should be applied immdediately when candidate is received.
	// When StreamLastMiniblockUpdated is recevied and promoteCandidate is called,
	// if there is no candidate in local storage, request is stored in pendingCandidates.
	// First element is the oldest candidate with block number view.LastBlock().Num + 1,
	// second element is the next candidate with next block number and so on.
	// If SaveMiniblockCandidate is called and it matched first element of pendingCandidates,
	// it is removed from pendingCandidates and is applied immediately instead of being stored.
	pendingCandidates []*MiniblockRef
}

var _ SyncStream = (*streamImpl)(nil)

func (s *streamImpl) view() *streamViewImpl {
	return s.useGetterAndSetterToGetView
}

func (s *streamImpl) setView(view *streamViewImpl) {
	s.useGetterAndSetterToGetView = view
	if view != nil && len(s.pendingCandidates) > 0 {
		lastMbNum := view.LastBlock().Ref.Num
		for i, candidate := range s.pendingCandidates {
			if candidate.Num > lastMbNum {
				s.pendingCandidates = s.pendingCandidates[i:]
				return
			}
		}
		s.pendingCandidates = nil
	}
}

func (s *streamImpl) LastScrubbedTime() time.Time {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.lastScrubbedTime
}

func (s *streamImpl) MarkScrubbed(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.lastScrubbedTime = time.Now()
}

// Should be called with lock held
func (s *streamImpl) loadInternal(ctx context.Context) error {
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

	view, err := MakeStreamView(ctx, streamData)
	if err != nil {
		dlog.FromCtx(ctx).
			Error("Stream.loadInternal: Failed to parse stream data loaded from storage", "error", err, "streamId", s.streamId)
		return err
	}

	s.setView(view)
	return nil
}

// ApplyMiniblock applies given miniblock, updating the cached stream view and storage.
func (s *streamImpl) ApplyMiniblock(ctx context.Context, miniblock *MiniblockInfo) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.loadInternal(ctx); err != nil {
		return err
	}

	return s.applyMiniblockImplNoLock(ctx, miniblock, nil)
}

// importMiniblocks imports the given miniblocks.
func (s *streamImpl) importMiniblocks(
	ctx context.Context,
	miniblocks []*MiniblockInfo,
) error {
	if len(miniblocks) == 0 {
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	return s.importMiniblocksNoLock(ctx, miniblocks)
}

func (s *streamImpl) importMiniblocksNoLock(
	ctx context.Context,
	miniblocks []*MiniblockInfo,
) error {
	firstMbNum := miniblocks[0].Ref.Num
	blocksToWriteToStorage := make([]*storage.WriteMiniblockData, len(miniblocks))
	for i, miniblock := range miniblocks {
		if miniblock.Ref.Num != firstMbNum+int64(i) {
			return RiverError(Err_INTERNAL, "miniblock numbers are not sequential").Func("importMiniblocks")
		}
		mb, err := miniblock.asStorageMb()
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

	prevSyncCookie := originalView.SyncCookie(s.params.Wallet.Address)
	s.setView(currentView)
	newSyncCookie := s.view().SyncCookie(s.params.Wallet.Address)
	s.notifySubscribers(allNewEvents, newSyncCookie, prevSyncCookie)
	return nil
}

func (s *streamImpl) applyMiniblockImplNoLock(
	ctx context.Context,
	miniblock *MiniblockInfo,
	miniblockBytes []byte,
) error {
	// Check if the miniblock is already applied.
	if miniblock.Ref.Num <= s.view().LastBlock().Ref.Num {
		return nil
	}

	// TODO: strict check here.
	// TODO: tests for this.

	// Lets see if this miniblock can be applied.
	prevSV := s.view()
	newSV, newEvents, err := prevSV.copyAndApplyBlock(miniblock, s.params.ChainConfig.Get())
	if err != nil {
		return err
	}

	newMinipool, err := newSV.minipool.getEnvelopeBytes()
	if err != nil {
		return err
	}

	if miniblockBytes == nil {
		miniblockBytes, err = miniblock.ToBytes()
		if err != nil {
			return err
		}
	}

	err = s.params.Storage.WriteMiniblocks(
		ctx,
		s.streamId,
		[]*storage.WriteMiniblockData{miniblock.asStorageMbWithData(miniblockBytes)},
		newSV.minipool.generation,
		newMinipool,
		prevSV.minipool.generation,
		prevSV.minipool.events.Len(),
	)
	if err != nil {
		return err
	}

	prevSyncCookie := s.view().SyncCookie(s.params.Wallet.Address)
	s.setView(newSV)
	newSyncCookie := s.view().SyncCookie(s.params.Wallet.Address)

	newEvents = append(newEvents, miniblock.headerEvent.Envelope)
	s.notifySubscribers(newEvents, newSyncCookie, prevSyncCookie)
	return nil
}

func (s *streamImpl) promoteCandidate(ctx context.Context, mb *MiniblockRef) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.loadInternal(ctx); err != nil {
		return err
	}

	// Check if the miniblock is already applied.
	lastMbNum := s.view().LastBlock().Ref.Num
	if mb.Num <= lastMbNum {
		// Log error if hash doesn't match.
		appliedMb, _ := s.view().blockWithNum(mb.Num)
		if appliedMb != nil && appliedMb.Ref.Hash != mb.Hash {
			dlog.FromCtx(ctx).Error("PromoteCandidate: Miniblock is already applied",
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
		return s.schedulePromotionNoLock(ctx, mb)
	}

	miniblockBytes, err := s.params.Storage.ReadMiniblockCandidate(ctx, s.streamId, mb.Hash, mb.Num)
	if err != nil {
		if IsRiverErrorCode(err, Err_NOT_FOUND) {
			return s.schedulePromotionNoLock(ctx, mb)
		}
		return err
	}

	miniblock, err := NewMiniblockInfoFromBytes(miniblockBytes, mb.Num)
	if err != nil {
		return err
	}

	return s.applyMiniblockImplNoLock(ctx, miniblock, miniblockBytes)
}

func (s *streamImpl) schedulePromotionNoLock(ctx context.Context, mb *MiniblockRef) error {
	if len(s.pendingCandidates) == 0 {
		if mb.Num != s.view().LastBlock().Ref.Num+1 {
			return RiverError(Err_INTERNAL, "schedulePromotionNoLock: next promotion is not for the next block")
		}
		s.pendingCandidates = append(s.pendingCandidates, mb)
	} else {
		lastPending := s.pendingCandidates[len(s.pendingCandidates)-1]
		if mb.Num != lastPending.Num+1 {
			return RiverError(Err_INTERNAL, "schedulePromotionNoLock: pending candidates are not consecutive")
		}
		s.pendingCandidates = append(s.pendingCandidates, mb)
	}
	return nil
}

func (s *streamImpl) initFromGenesis(
	ctx context.Context,
	genesisInfo *MiniblockInfo,
	genesisBytes []byte,
) error {
	if genesisInfo.Header().MiniblockNum != 0 {
		return RiverError(Err_BAD_BLOCK, "init from genesis must be from block with num 0")
	}

	// TODO: move this call out of the lock
	_, registeredGenesisHash, _, err := s.params.Registry.GetStreamWithGenesis(ctx, s.streamId)
	if err != nil {
		return err
	}

	if registeredGenesisHash != genesisInfo.Ref.Hash {
		return RiverError(Err_BAD_BLOCK, "Invalid genesis block hash").
			Tags("registryHash", registeredGenesisHash, "blockHash", genesisInfo.Ref.Hash).
			Func("initFromGenesis")
	}

	if err := s.params.Storage.CreateStreamStorage(ctx, s.streamId, genesisBytes); err != nil {
		// TODO: this error is not handle correctly here: if stream is in storage, caller of this initFromGenesis
		// should read it from storage.
		if AsRiverError(err).Code != Err_ALREADY_EXISTS {
			return err
		}
	}

	view, err := MakeStreamView(
		ctx,
		&storage.ReadStreamFromLastSnapshotResult{
			StartMiniblockNumber: 0,
			Miniblocks:           [][]byte{genesisBytes},
		},
	)
	if err != nil {
		return err
	}
	s.setView(view)

	return nil
}

func (s *streamImpl) initFromBlockchain(ctx context.Context) error {
	record, _, mb, err := s.params.Registry.GetStreamWithGenesis(ctx, s.streamId)
	if err != nil {
		return err
	}

	nodes := NewStreamNodes(record.Nodes, s.params.Wallet.Address)
	if !nodes.IsLocal() {
		return RiverError(
			Err_INTERNAL,
			"initFromBlockchain: Stream is not local",
			"streamId", s.streamId,
			"nodes", record.Nodes,
			"localNode", s.params.Wallet,
		)
	}
	s.nodes = nodes

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

	err = s.params.Storage.CreateStreamStorage(ctx, s.streamId, mb)
	if err != nil {
		return err
	}

	// Successfully put data into storage, init stream view.
	view, err := MakeStreamView(
		ctx,
		&storage.ReadStreamFromLastSnapshotResult{
			StartMiniblockNumber: 0,
			Miniblocks:           [][]byte{mb},
		},
	)
	if err != nil {
		return err
	}
	s.setView(view)
	return nil
}

func (s *streamImpl) getView(ctx context.Context) (*streamViewImpl, error) {
	s.mu.RLock()
	view := s.view()
	s.mu.RUnlock()
	if view != nil {
		return view, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastAccessedTime = time.Now()
	if err := s.loadInternal(ctx); err != nil {
		return nil, err
	}
	return s.view(), nil
}

func (s *streamImpl) GetView(ctx context.Context) (StreamView, error) {
	view, err := s.getView(ctx)
	// Return nil interface, if implementation is nil.
	if err != nil {
		return nil, err
	}
	return view, nil
}

// Returns StreamView if it's already loaded, or nil if it's not.
func (s *streamImpl) tryGetView() StreamView {
	s.mu.RLock()
	defer s.mu.RUnlock()
	// Return nil interface, if implementation is nil. This is go for you.
	if s.view() != nil {
		return s.view()
	} else {
		return nil
	}
}

// tryCleanup unloads its internal view when s haven't got activity within the given expiration period.
// It returns true when the view is unloaded
func (s *streamImpl) tryCleanup(expiration time.Duration) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

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

	if len(s.pendingCandidates) != 0 {
		return false
	}

	s.setView(nil)
	return true
}

// Returns
// miniblocks: with indexes from fromIndex inclusive, to toIndex exlusive
// terminus: true if fromIndex is 0, or if there are no more blocks because they've been garbage collected
func (s *streamImpl) GetMiniblocks(
	ctx context.Context,
	fromInclusive int64,
	toExclusive int64,
) ([]*Miniblock, bool, error) {
	blocks, err := s.params.Storage.ReadMiniblocks(ctx, s.streamId, fromInclusive, toExclusive)
	if err != nil {
		return nil, false, err
	}

	miniblocks := make([]*Miniblock, len(blocks))
	startMiniblockNumber := int64(-1)
	for i, binMiniblock := range blocks {
		miniblock, err := NewMiniblockInfoFromBytes(binMiniblock, startMiniblockNumber+int64(i))
		if err != nil {
			return nil, false, err
		}
		if i == 0 {
			startMiniblockNumber = miniblock.Header().MiniblockNum
		}
		miniblocks[i] = miniblock.Proto
	}

	terminus := fromInclusive == 0
	return miniblocks, terminus, nil
}

func (s *streamImpl) AddEvent(ctx context.Context, event *ParsedEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.loadInternal(ctx); err != nil {
		return err
	}

	return s.addEventImpl(ctx, event)
}

// caller must have a RW lock on s.mu
func (s *streamImpl) notifySubscribers(envelopes []*Envelope, newSyncCookie *SyncCookie, prevSyncCookie *SyncCookie) {
	if s.receivers != nil && s.receivers.Cardinality() > 0 {
		s.lastAccessedTime = time.Now()

		resp := &StreamAndCookie{
			Events:         envelopes,
			NextSyncCookie: newSyncCookie,
		}
		for receiver := range s.receivers.Iter() {
			receiver.OnUpdate(resp)
		}
	}
}

// Lock must be taken.
func (s *streamImpl) addEventImpl(ctx context.Context, event *ParsedEvent) error {
	envelopeBytes, err := event.GetEnvelopeBytes()
	if err != nil {
		return err
	}

	// Check if event can be added before writing to storage.
	newSV, err := s.view().copyAndAddEvent(event)
	if err != nil {
		return err
	}

	err = s.params.Storage.WriteEvent(
		ctx,
		s.streamId,
		s.view().minipool.generation,
		s.view().minipool.nextSlotNumber(),
		envelopeBytes,
	)
	// TODO: for some classes of errors, it's not clear if event was added or not
	// for those, perhaps entire Stream structure should be scrapped and reloaded
	if err != nil {
		return err
	}

	prevSyncCookie := s.view().SyncCookie(s.params.Wallet.Address)
	s.setView(newSV)
	newSyncCookie := s.view().SyncCookie(s.params.Wallet.Address)

	s.notifySubscribers([]*Envelope{event.Envelope}, newSyncCookie, prevSyncCookie)

	return nil
}

func (s *streamImpl) Sub(ctx context.Context, cookie *SyncCookie, receiver SyncResultReceiver) error {
	log := dlog.FromCtx(ctx)
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
	slot := cookie.MinipoolSlot
	if slot < 0 {
		return RiverError(Err_BAD_SYNC_COOKIE, "bad slot", "cookie.MinipoolSlot", slot).Func("Stream.Sub")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if err := s.loadInternal(ctx); err != nil {
		return err
	}

	s.lastAccessedTime = time.Now()

	if cookie.MinipoolGen == s.view().minipool.generation {
		if slot > int64(s.view().minipool.events.Len()) {
			return RiverError(Err_BAD_SYNC_COOKIE, "Stream.Sub: bad slot")
		}

		if s.receivers == nil {
			s.receivers = mapset.NewSet[SyncResultReceiver]()
		}
		s.receivers.Add(receiver)

		envelopes := make([]*Envelope, 0, s.view().minipool.events.Len()-int(slot))
		if slot < int64(s.view().minipool.events.Len()) {
			for _, e := range s.view().minipool.events.Values[slot:] {
				envelopes = append(envelopes, e.Envelope)
			}
		}
		// always send response, even if there are no events so that the client knows it's upToDate
		receiver.OnUpdate(
			&StreamAndCookie{
				Events:         envelopes,
				NextSyncCookie: s.view().SyncCookie(s.params.Wallet.Address),
			},
		)
		return nil
	} else {
		if s.receivers == nil {
			s.receivers = mapset.NewSet[SyncResultReceiver]()
		}
		s.receivers.Add(receiver)

		miniblockIndex, err := s.view().indexOfMiniblockWithNum(cookie.MinipoolGen)
		if err != nil {
			// The user's sync cookie is out of date. Send a sync reset and return an up-to-date StreamAndCookie.
			log.Warn("Stream.Sub: out of date cookie.MiniblockNum. Sending sync reset.",
				"stream", s.streamId, "error", err.Error())

			receiver.OnUpdate(
				&StreamAndCookie{
					Events:         s.view().MinipoolEnvelopes(),
					NextSyncCookie: s.view().SyncCookie(s.params.Wallet.Address),
					Miniblocks:     s.view().MiniblocksFromLastSnapshot(),
					SyncReset:      true,
				},
			)
			return nil
		}

		// append events from blocks
		envelopes := make([]*Envelope, 0, 16)
		err = s.view().forEachEvent(miniblockIndex, func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
			envelopes = append(envelopes, e.Envelope)
			return true, nil
		})
		if err != nil {
			panic("Should never happen: Stream.Sub: forEachEvent failed: " + err.Error())
		}

		// always send response, even if there are no events so that the client knows it's upToDate
		receiver.OnUpdate(
			&StreamAndCookie{
				Events:         envelopes,
				NextSyncCookie: s.view().SyncCookie(s.params.Wallet.Address),
			},
		)
		return nil
	}
}

// It's ok to unsub non-existing receiver.
// Such situation arises during ForceFlush.
func (s *streamImpl) Unsub(receiver SyncResultReceiver) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.receivers != nil {
		s.receivers.Remove(receiver)
	}
}

// ForceFlush transitions Stream object to unloaded state.
// All subbed receivers will receive empty response and must
// terminate corresponding sync loop.
func (s *streamImpl) ForceFlush(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.setView(nil)
	if s.receivers != nil && s.receivers.Cardinality() > 0 {
		err := RiverError(Err_INTERNAL, "Stream unloaded")
		for r := range s.receivers.Iter() {
			r.OnSyncError(err)
		}
	}
	s.receivers = nil
}

func (s *streamImpl) canCreateMiniblock() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Loaded, has events in minipool, and periodic miniblock creation is not disabled in test settings.
	return s.view() != nil &&
		s.view().minipool.events.Len() > 0 &&
		!s.view().snapshot.GetInceptionPayload().GetSettings().GetDisableMiniblockCreation()
}

type streamImplStatus struct {
	loaded            bool
	numMinipoolEvents int
	numSubscribers    int
	lastAccess        time.Time
}

func (s *streamImpl) getStatus() *streamImplStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ret := &streamImplStatus{
		numSubscribers: s.receivers.Cardinality(),
		lastAccess:     s.lastAccessedTime,
	}

	if s.view() != nil {
		ret.loaded = true
		ret.numMinipoolEvents = s.view().minipool.events.Len()
	}

	return ret
}

func (s *streamImpl) SaveMiniblockCandidate(ctx context.Context, mb *Miniblock) error {
	mbInfo, err := NewMiniblockInfoFromProto(
		mb,
		NewMiniblockInfoFromProtoOpts{ExpectedBlockNumber: -1},
	)
	if err != nil {
		return err
	}

	applied, err := s.tryApplyCandidate(ctx, mbInfo)
	if err != nil {
		return err
	}
	if applied {
		return nil
	}

	serialized, err := mbInfo.ToBytes()
	if err != nil {
		return err
	}

	return s.params.Storage.WriteMiniblockCandidate(
		ctx,
		s.streamId,
		mbInfo.Ref.Hash,
		mbInfo.Ref.Num,
		serialized,
	)
}

func (s *streamImpl) tryApplyCandidate(ctx context.Context, mb *MiniblockInfo) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	err := s.loadInternal(ctx)
	if err != nil {
		return false, err
	}

	if mb.Ref.Num <= s.view().LastBlock().Ref.Num {
		existing, err := s.view().blockWithNum(mb.Ref.Num)
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

	if len(s.pendingCandidates) > 0 {
		pending := s.pendingCandidates[0]
		if mb.Ref.Num == pending.Num && mb.Ref.Hash == pending.Hash {
			err = s.importMiniblocksNoLock(ctx, []*MiniblockInfo{mb})
			if err != nil {
				return false, err
			}

			for len(s.pendingCandidates) > 0 {
				pending = s.pendingCandidates[0]
				ok := s.tryReadAndApplyCandidateNoLock(ctx, pending)
				if !ok {
					break
				}
			}

			return true, nil
		}
	}

	return false, nil
}

func (s *streamImpl) tryReadAndApplyCandidateNoLock(ctx context.Context, mbRef *MiniblockRef) bool {
	miniblockBytes, err := s.params.Storage.ReadMiniblockCandidate(ctx, s.streamId, mbRef.Hash, mbRef.Num)
	if err == nil {
		miniblock, err := NewMiniblockInfoFromBytes(miniblockBytes, mbRef.Num)
		if err == nil {
			err = s.importMiniblocksNoLock(ctx, []*MiniblockInfo{miniblock})
			if err == nil {
				return true
			}
		}
	}

	if !IsRiverErrorCode(err, Err_NOT_FOUND) {
		dlog.FromCtx(ctx).
			Error("Stream.tryReadAndApplyCandidateNoLock: failed to read miniblock candidate", "error", err)
	}
	return false
}

// getLastMiniblockNumSkipLoad returns the last miniblock number for the given stream from the view if loaded,
// or from storage otherwise.
func (s *streamImpl) getLastMiniblockNumSkipLoad(ctx context.Context) (int64, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	view := s.view()
	if view != nil {
		return view.LastBlock().Ref.Num, nil
	}

	return s.params.Storage.GetLastMiniblockNumber(ctx, s.streamId)
}
