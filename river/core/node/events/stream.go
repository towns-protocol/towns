package events

import (
	"bytes"
	"context"
	"github.com/river-build/river/core/node/crypto"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/storage"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"

	mapset "github.com/deckarep/golang-set/v2"
)

type AddableStream interface {
	AddEvent(ctx context.Context, event *ParsedEvent) error
}

type MiniblockStream interface {
	GetMiniblocks(ctx context.Context, fromInclusive int64, ToExclusive int64) ([]*Miniblock, bool, error)
}

type Stream interface {
	AddableStream
	MiniblockStream
}

type SyncResultReceiver interface {
	OnUpdate(r *StreamAndCookie)
	OnSyncError(err error)
}

type SyncStream interface {
	Stream

	Sub(ctx context.Context, cookie *SyncCookie, receiver SyncResultReceiver) error
	Unsub(receiver SyncResultReceiver)

	// MakeMiniblock creates a miniblock proposal, stores it in the registry, and applies it to the stream.
	// MakeMiniblock exits early if another MakeMiniblock is already running,
	// and as such is not determenistic, it's intended to be called periodically.
	MakeMiniblock(ctx context.Context) // TODO: doesn't seem pertinent to SyncStream

	// TestMakeMiniblock is a debug function that creates a miniblock proposal, stores it in the registry, and applies it to the stream.
	// It is intended to be called manually from test code.
	// TestMakeMiniblock always creates a miniblock if there are events in the minipool.
	// TestMakeMiniblock always creates a miniblock if forceSnapshot is true. This miniblock will have a snapshot.
	//
	// If lastKnownMiniblockNumber is -1 and no new miniblock was created, function succeeds and returns zero hash and -1 miniblock number.
	//
	// If lastKnownMiniblockNumber is -1 and a new miniblock was created, function succeeds and returns the hash of the new miniblock and the miniblock number.
	//
	// If lastKnownMiniblockNumber is not -1 and no new miniblock was created, but last block has a higher number than lastKnownMiniblockNumber,
	// function succeeds and returns the hash of the last block and the miniblock number.
	TestMakeMiniblock(
		ctx context.Context,
		forceSnapshot bool,
		lastKnownMiniblockNumber int64,
	) (common.Hash, int64, error)

	ProposeNextMiniblock(ctx context.Context, forceSnapshot bool) (*MiniblockInfo, error)
	MakeMiniblockHeader(ctx context.Context, proposal *MiniblockProposal) (*MiniblockHeader, []*ParsedEvent, error)
	ApplyMiniblock(ctx context.Context, miniblock *MiniblockInfo) error
	GetView(ctx context.Context) (StreamView, error)
}

func SyncStreamsResponseFromStreamAndCookie(result *StreamAndCookie) *SyncStreamsResponse {
	return &SyncStreamsResponse{
		Stream: result,
	}
}

type streamImpl struct {
	params *StreamCacheParams

	// TODO: perf optimization: already in map as key, refactor API to remove dup data.
	streamId StreamId

	// TODO: move under lock to support updated.
	nodes StreamNodes

	// Mutex protects fields below
	// View is copied on write.
	// I.e. if there no calls to AddEvent, readers share the same view object
	// out of lock, which is immutable, so if there is a need to modify, lock is taken, copy
	// of view is created, and copy is modified and stored.
	mu   sync.RWMutex
	view *streamViewImpl

	// lastAccessedTime keeps track when the stream was last used by a client
	lastAccessedTime time.Time

	// TODO: perf optimization: support subs on unloaded streams.
	receivers mapset.Set[SyncResultReceiver]

	// This mutex is used to ensure that only one MakeMiniblock is running at a time.
	makeMiniblockMutex sync.Mutex
}

var _ SyncStream = (*streamImpl)(nil)

// Should be called with lock held
// Either view or loadError will be set in Stream.
func (s *streamImpl) loadInternal(ctx context.Context) error {
	if s.view != nil {
		return nil
	}

	streamRecencyConstraintsGenerations, err :=
		s.params.ChainConfig.GetInt(crypto.StreamRecencyConstraintsGenerationsConfigKey)
	if err != nil {
		return err
	}

	streamData, err := s.params.Storage.ReadStreamFromLastSnapshot(
		ctx,
		s.streamId,
		max(0, streamRecencyConstraintsGenerations-1),
	)
	if err != nil {
		if AsRiverError(err).Code == Err_NOT_FOUND {
			return s.initFromBlockchain(ctx)
		}
		return err
	}

	view, err := MakeStreamView(streamData)
	if err != nil {
		return err
	}

	s.view = view
	return nil
}

func (s *streamImpl) generateMiniblockProposal(ctx context.Context, forceSnapshot bool) (*MiniblockProposal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Do nothing if not loaded since it's possible for tick to arrive after stream is unloaded.
	if s.view == nil {
		return nil, nil
	}

	return s.view.ProposeNextMiniblock(ctx, s.params.ChainConfig, forceSnapshot)
}

func (s *streamImpl) ProposeNextMiniblock(ctx context.Context, forceSnapshot bool) (*MiniblockInfo, error) {
	proposal, err := s.generateMiniblockProposal(ctx, forceSnapshot)
	if err != nil {
		return nil, AsRiverError(err).Func("Stream.ProposeNextMiniblock").
			Message("Failed to generate miniblock proposal").
			Tag("streamId", s.streamId)
	}

	// empty minipool, do not propose.
	if proposal == nil {
		return nil, nil
	}

	miniblock, err := s.constructMiniblockFromProposal(ctx, proposal)
	if err != nil {
		return nil, AsRiverError(err).Func("Stream.ProposeNextMiniblock").
			Message("Failed to construct miniblock from proposal").
			Tag("streamId", s.streamId)
	}

	if miniblock == nil {
		return nil, nil
	}

	// Save proposal in storage
	if err = s.storeMiniblockCandidate(ctx, miniblock); err != nil {
		return nil, AsRiverError(
			err,
		).Func("Stream.ProposeNextMiniblock").
			Message("Failed to store miniblock candidate").
			Tag("streamId", s.streamId)
	}
	return miniblock, nil
}

func (s *streamImpl) MakeMiniblockHeader(
	ctx context.Context,
	proposal *MiniblockProposal,
) (*MiniblockHeader, []*ParsedEvent, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Do nothing if not loaded since it's possible for tick to arrive after stream is unloaded.
	if s.view == nil {
		return nil, nil, nil
	}

	return s.view.makeMiniblockHeader(ctx, proposal)
}

// Store miniblock proposal in storage to prevent data loss between proposal and election. This block
// can later be promoted within the db.
func (s *streamImpl) storeMiniblockCandidate(ctx context.Context, miniblock *MiniblockInfo) error {
	miniblockBytes, err := miniblock.ToBytes()
	if err != nil {
		return AsRiverError(err).Func("Stream.storeMiniblockCandidate").Message("Failed to serialize miniblock")
	}

	return s.params.Storage.WriteBlockProposal(
		ctx,
		s.streamId,
		miniblock.Hash,
		miniblock.Num,
		miniblockBytes,
	)
}

// ApplyMiniblock applies the selected miniblock candidate, updating the cached stream view and storage.
func (s *streamImpl) ApplyMiniblock(ctx context.Context, miniblock *MiniblockInfo) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.view == nil {
		if err := s.loadInternal(ctx); err != nil {
			return err
		}
	}

	// Lets see if this miniblock can be applied.
	newSV, err := s.view.copyAndApplyBlock(miniblock, s.params.ChainConfig)
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

	err = s.params.Storage.PromoteBlock(
		ctx,
		s.streamId,
		s.view.minipool.generation,
		miniblock.Hash,
		miniblock.headerEvent.Event.GetMiniblockHeader().GetSnapshot() != nil,
		newMinipool,
	)
	if err != nil {
		return err
	}

	prevSyncCookie := s.view.SyncCookie(s.params.Wallet.Address)
	s.view = newSV
	newSyncCookie := s.view.SyncCookie(s.params.Wallet.Address)

	s.notifySubscribers([]*Envelope{miniblock.headerEvent.Envelope}, newSyncCookie, prevSyncCookie)
	return nil
}

func (s *streamImpl) constructMiniblockFromProposal(
	ctx context.Context,
	proposal *MiniblockProposal,
) (*MiniblockInfo, error) {
	miniblockHeader, envelopes, err := s.MakeMiniblockHeader(ctx, proposal)
	if err != nil {
		return nil, AsRiverError(err).Func("Stream.constructMiniblockFromProposal").
			Message("Failed to make miniblock header").
			Tag("streamId", s.streamId)
	}
	if miniblockHeader == nil {
		return nil, nil
	}

	miniblockHeaderEvent, err := MakeParsedEventWithPayload(
		s.params.Wallet,
		Make_MiniblockHeader(miniblockHeader),
		miniblockHeader.PrevMiniblockHash,
	)
	if err != nil {
		return nil, AsRiverError(err).Func("Stream.constructMiniblockFromProposal").
			Message("Failed to make miniblock header event").
			Tag("streamId", s.streamId)
	}

	return NewMiniblockInfoFromParsed(miniblockHeaderEvent, envelopes)
}

func (s *streamImpl) MakeMiniblock(ctx context.Context) {
	if !s.makeMiniblockMutex.TryLock() {
		return
	}
	defer s.makeMiniblockMutex.Unlock()

	_, _, err := s.makeMiniblockImpl(ctx, false, -1)
	if err != nil {
		dlog.FromCtx(ctx).Error("Stream.MakeMiniblock failed", "error", err, "streamId", s.streamId)
	}
}

func (s *streamImpl) TestMakeMiniblock(
	ctx context.Context,
	forceSnapshot bool,
	lastKnownMiniblockNumber int64,
) (common.Hash, int64, error) {
	s.makeMiniblockMutex.Lock()
	defer s.makeMiniblockMutex.Unlock()

	return s.makeMiniblockImpl(ctx, forceSnapshot, lastKnownMiniblockNumber)
}

func (s *streamImpl) makeMiniblockImpl(
	ctx context.Context,
	forceSnapshot bool,
	lastKnownMiniblockNumber int64,
) (common.Hash, int64, error) {
	// 1. Create miniblock
	miniblock, err := s.ProposeNextMiniblock(ctx, forceSnapshot)
	if err != nil {
		return common.Hash{}, -1, err
	}

	// empty minipool, do not propose.
	if miniblock == nil {
		if lastKnownMiniblockNumber > -1 {
			s.mu.RLock()
			defer s.mu.RUnlock()
			if s.view != nil {
				lastMiniblock := s.view.LastBlock()
				if lastMiniblock.Num > lastKnownMiniblockNumber {
					return lastMiniblock.Hash, lastMiniblock.Num, nil
				} else {
					return common.Hash{}, -1, nil
				}
			} else {
				return common.Hash{}, -1, RiverError(Err_INTERNAL, "makeMiniblockImpl: Stream is not loaded", "streamId", s.streamId)
			}
		}
		return common.Hash{}, -1, nil
	}

	// 2. Update registry with candidate block metadata
	err = s.params.Registry.SetStreamLastMiniblock(
		ctx,
		s.streamId,
		*miniblock.headerEvent.PrevMiniblockHash,
		miniblock.headerEvent.Hash,
		uint64(miniblock.Num),
		false,
	)
	if err != nil {
		return common.Hash{}, -1, err
	}

	// 3. Commit proposal as current block
	err = s.ApplyMiniblock(ctx, miniblock)
	if err != nil {
		return common.Hash{}, -1, err
	}
	return miniblock.Hash, miniblock.Num, nil
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
	view, err := MakeStreamView(&storage.ReadStreamFromLastSnapshotResult{
		StartMiniblockNumber: 0,
		Miniblocks:           [][]byte{mb},
	})
	if err != nil {
		return err
	}
	s.view = view
	return nil
}

func (s *streamImpl) GetView(ctx context.Context) (StreamView, error) {
	s.mu.RLock()
	view := s.view
	s.mu.RUnlock()
	if view != nil {
		return view, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.lastAccessedTime = time.Now()
	err := s.loadInternal(ctx)
	if err != nil {
		return nil, err
	}
	return s.view, nil
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
	err := s.loadInternal(ctx)
	if err != nil {
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

	newSV, err := s.view.copyAndAddEvent(event)
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
	err := s.loadInternal(ctx)
	if err != nil {
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

	// Loaded, has events in minipool, fake leader and periodic miniblock creation is not disabled in test settings.
	return s.view != nil &&
		s.view.minipool.events.Len() > 0 &&
		s.nodes.LocalIsLeader() &&
		!s.view.snapshot.GetInceptionPayload().GetSettings().GetDisableMiniblockCreation()
}
