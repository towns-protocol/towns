package events

import (
	"bytes"
	"context"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

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

	ApplyMiniblock(ctx context.Context, miniblock *MiniblockInfo) error
	PromoteCandidate(ctx context.Context, mbHash common.Hash, mbNum int64) error
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
	mu   sync.RWMutex
	view *streamViewImpl

	// lastAccessedTime keeps track of when the stream was last used by a client
	lastAccessedTime time.Time
	// lastScrubbedTime keeps track of when the stream was last scrubbed. Streams that
	// are never scrubbed will not have this value modified.
	lastScrubbedTime time.Time

	// TODO: perf optimization: support subs on unloaded streams.
	receivers mapset.Set[SyncResultReceiver]
}

var _ SyncStream = (*streamImpl)(nil)

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
// Either view or loadError will be set in Stream.
func (s *streamImpl) loadInternal(ctx context.Context) error {
	if s.view != nil {
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

	s.view = view
	return nil
}

// ApplyMiniblock applies the selected miniblock candidate, updating the cached stream view and storage.
func (s *streamImpl) ApplyMiniblock(ctx context.Context, miniblock *MiniblockInfo) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.loadInternal(ctx); err != nil {
		return err
	}

	return s.applyMiniblockImplNoLock(ctx, miniblock)
}

// importMiniblocks imports the given miniblocks.
func (s *streamImpl) importMiniblocks(
	ctx context.Context,
	miniblocks []*MiniblockInfo,
) error {
	if len(miniblocks) == 0 {
		return nil
	}

	blocksToWriteToStorage := make([]*storage.MiniblockData, len(miniblocks))
	for i, miniblock := range miniblocks {
		bytes, err := miniblock.ToBytes()
		if err != nil {
			return err
		}

		blocksToWriteToStorage[i] = &storage.MiniblockData{
			StreamID:      s.streamId,
			Number:        miniblock.Ref.Num,
			MiniBlockInfo: bytes,
		}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.view == nil {
		importFromGenesis := miniblocks[0].header().MiniblockNum == 0
		if importFromGenesis {
			if err := s.initFromGenesis(ctx, miniblocks[0], blocksToWriteToStorage[0]); err != nil {
				return err
			}
			miniblocks = miniblocks[1:]
			blocksToWriteToStorage = blocksToWriteToStorage[1:]
		}

		if err := s.loadInternal(ctx); err != nil {
			return err
		}
	}

	// apply mini-blocks one by one on view, backup existing view in case
	// applying/writing miniblocks fails rollback view.
	var (
		err  error
		view = s.view
	)

	allNewEvents := []*Envelope{}
	for _, miniblock := range miniblocks {
		if miniblock.Ref.Num <= view.LastBlock().Ref.Num {
			blocksToWriteToStorage = blocksToWriteToStorage[1:]
			continue
		}

		var newEvents []*Envelope
		view, newEvents, err = view.copyAndApplyBlock(miniblock, s.params.ChainConfig.Get())
		if err != nil {
			return err
		}
		allNewEvents = append(allNewEvents, newEvents...)
		allNewEvents = append(allNewEvents, miniblock.headerEvent.Envelope)
	}

	err = s.params.Storage.ImportMiniblocks(ctx, blocksToWriteToStorage)
	if err != nil {
		return err
	}

	prevSyncCookie := s.view.SyncCookie(s.params.Wallet.Address)
	s.view = view
	newSyncCookie := s.view.SyncCookie(s.params.Wallet.Address)
	s.notifySubscribers(allNewEvents, newSyncCookie, prevSyncCookie)
	return nil
}

func (s *streamImpl) applyMiniblockImplNoLock(ctx context.Context, miniblock *MiniblockInfo) error {
	// Check if the miniblock is already applied.
	if miniblock.Ref.Num <= s.view.LastBlock().Ref.Num {
		return nil
	}

	// TODO: strict check here.
	// TODO: tests for this.

	// Lets see if this miniblock can be applied.
	newSV, newEvents, err := s.view.copyAndApplyBlock(miniblock, s.params.ChainConfig.Get())
	if err != nil {
		return err
	}

	newMinipool := make([][]byte, 0, newSV.minipool.events.Len())
	for _, e := range newSV.minipool.events.Values {
		b, err := e.GetEnvelopeBytes()
		if err != nil {
			return err
		}
		newMinipool = append(newMinipool, b)
	}

	err = s.params.Storage.PromoteMiniblockCandidate(
		ctx,
		s.streamId,
		s.view.minipool.generation,
		miniblock.Ref.Hash,
		miniblock.headerEvent.Event.GetMiniblockHeader().GetSnapshot() != nil,
		newMinipool,
	)
	if err != nil {
		return err
	}

	prevSyncCookie := s.view.SyncCookie(s.params.Wallet.Address)
	s.view = newSV
	newSyncCookie := s.view.SyncCookie(s.params.Wallet.Address)

	newEvents = append(newEvents, miniblock.headerEvent.Envelope)
	s.notifySubscribers(newEvents, newSyncCookie, prevSyncCookie)
	return nil
}

func (s *streamImpl) PromoteCandidate(ctx context.Context, mbHash common.Hash, mbNum int64) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if err := s.loadInternal(ctx); err != nil {
		return err
	}

	// Check if the miniblock is already applied.
	if mbNum <= s.view.LastBlock().Ref.Num {
		// Log error if hash doesn't match.
		mb, _ := s.view.blockWithNum(mbNum)
		if mb != nil && mbHash != mb.Ref.Hash {
			dlog.FromCtx(ctx).Error("PromoteCandidate: Miniblock is already applied",
				"streamId", s.streamId,
				"blockNum", mbNum,
				"blockHash", mbHash,
				"lastBlockNum", s.view.LastBlock().Ref.Num,
				"lastBlockHash", s.view.LastBlock().Ref.Hash,
			)
		}
		return nil
	}

	miniblockBytes, err := s.params.Storage.ReadMiniblockCandidate(ctx, s.streamId, mbHash, mbNum)
	if err != nil {
		return err
	}

	miniblock, err := NewMiniblockInfoFromBytes(miniblockBytes, mbNum)
	if err != nil {
		return err
	}

	return s.applyMiniblockImplNoLock(ctx, miniblock)
}

func (s *streamImpl) initFromGenesis(
	ctx context.Context,
	genesisInfo *MiniblockInfo,
	genesis *storage.MiniblockData,
) error {
	if genesis.Number != 0 {
		return RiverError(Err_BAD_BLOCK, "init from genesis must be from block with num 0")
	}

	_, registeredGenesisHash, _, err := s.params.Registry.GetStreamWithGenesis(ctx, genesis.StreamID)
	if err != nil {
		return err
	}

	if registeredGenesisHash != genesisInfo.Ref.Hash {
		return RiverError(Err_BAD_BLOCK, "Invalid genesis block hash").
			Tags("registryHash", registeredGenesisHash, "blockHash", genesisInfo.Ref.Hash).
			Func("initFromGenesis")
	}

	if err := s.params.Storage.CreateStreamStorage(ctx, s.streamId, genesis.MiniBlockInfo); err != nil {
		if AsRiverError(err).Code != Err_ALREADY_EXISTS {
			return err
		}
	}

	view, err := MakeStreamView(
		ctx,
		&storage.ReadStreamFromLastSnapshotResult{
			StartMiniblockNumber: 0,
			Miniblocks:           [][]byte{genesis.MiniBlockInfo},
		},
	)
	if err != nil {
		return err
	}
	s.view = view

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
	s.view = view
	return nil
}

func (s *streamImpl) getView(ctx context.Context) (*streamViewImpl, error) {
	s.mu.RLock()
	view := s.view
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
	return s.view, nil
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
	if s.view != nil {
		return s.view
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
	if s.view == nil {
		return true
	}

	expired := time.Since(s.lastAccessedTime) >= expiration

	// unload if there is no activity within expiration
	if expired && s.view.minipool.events.Len() == 0 {
		s.view = nil
		return true
	}
	return false
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
			startMiniblockNumber = miniblock.header().MiniblockNum
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
	newSV, err := s.view.copyAndAddEvent(event)
	if err != nil {
		return err
	}

	err = s.params.Storage.WriteEvent(
		ctx,
		s.streamId,
		s.view.minipool.generation,
		s.view.minipool.nextSlotNumber(),
		envelopeBytes,
	)
	// TODO: for some classes of errors, it's not clear if event was added or not
	// for those, perhaps entire Stream structure should be scrapped and reloaded
	if err != nil {
		return err
	}

	prevSyncCookie := s.view.SyncCookie(s.params.Wallet.Address)
	s.view = newSV
	newSyncCookie := s.view.SyncCookie(s.params.Wallet.Address)

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

	if cookie.MinipoolGen == s.view.minipool.generation {
		if slot > int64(s.view.minipool.events.Len()) {
			return RiverError(Err_BAD_SYNC_COOKIE, "Stream.Sub: bad slot")
		}

		if s.receivers == nil {
			s.receivers = mapset.NewSet[SyncResultReceiver]()
		}
		s.receivers.Add(receiver)

		envelopes := make([]*Envelope, 0, s.view.minipool.events.Len()-int(slot))
		if slot < int64(s.view.minipool.events.Len()) {
			for _, e := range s.view.minipool.events.Values[slot:] {
				envelopes = append(envelopes, e.Envelope)
			}
		}
		// always send response, even if there are no events so that the client knows it's upToDate
		receiver.OnUpdate(
			&StreamAndCookie{
				Events:         envelopes,
				NextSyncCookie: s.view.SyncCookie(s.params.Wallet.Address),
			},
		)
		return nil
	} else {
		if s.receivers == nil {
			s.receivers = mapset.NewSet[SyncResultReceiver]()
		}
		s.receivers.Add(receiver)

		miniblockIndex, err := s.view.indexOfMiniblockWithNum(cookie.MinipoolGen)
		if err != nil {
			// The user's sync cookie is out of date. Send a sync reset and return an up-to-date StreamAndCookie.
			log.Warn("Stream.Sub: out of date cookie.MiniblockNum. Sending sync reset.", "error", err.Error())
			receiver.OnUpdate(
				&StreamAndCookie{
					Events:         s.view.MinipoolEnvelopes(),
					NextSyncCookie: s.view.SyncCookie(s.params.Wallet.Address),
					Miniblocks:     s.view.MiniblocksFromLastSnapshot(),
					SyncReset:      true,
				},
			)
			return nil
		}

		// append events from blocks
		envelopes := make([]*Envelope, 0, 16)
		err = s.view.forEachEvent(miniblockIndex, func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error) {
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
				NextSyncCookie: s.view.SyncCookie(s.params.Wallet.Address),
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
	s.view = nil
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
	return s.view != nil &&
		s.view.minipool.events.Len() > 0 &&
		!s.view.snapshot.GetInceptionPayload().GetSettings().GetDisableMiniblockCreation()
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

	if s.view != nil {
		ret.loaded = true
		ret.numMinipoolEvents = s.view.minipool.events.Len()
	}

	return ret
}

func (s *streamImpl) SaveMiniblockCandidate(ctx context.Context, mb *Miniblock) error {
	mbInfo, err := NewMiniblockInfoFromProto(
		mb,
		NewMiniblockInfoFromProtoOpts{DontParseEvents: true, ExpectedBlockNumber: -1},
	)
	if err != nil {
		return err
	}

	serialized, err := mbInfo.ToBytes()
	if err != nil {
		return err
	}

	view, err := s.getView(ctx)
	if err != nil {
		return err
	}

	if mbInfo.Ref.Num <= view.LastBlock().Ref.Num {
		// TODO: better error code.
		return RiverError(
			Err_INTERNAL,
			"Miniblock is too old",
			"candidate.Num",
			mbInfo.Ref.Num,
			"lastBlock.Num",
			view.LastBlock().Ref.Num,
			"streamId",
			s.streamId,
		)
	}

	return s.params.Storage.WriteMiniblockCandidate(
		ctx,
		s.streamId,
		mbInfo.Ref.Hash,
		mbInfo.Ref.Num,
		serialized,
	)
}
