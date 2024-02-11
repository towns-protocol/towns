package events

import (
	"context"
	"sync"

	"github.com/river-build/river/dlog"
	"github.com/river-build/river/storage"

	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"

	mapset "github.com/deckarep/golang-set/v2"
	"google.golang.org/protobuf/proto"
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

	// Returns true if miniblock was created, false if not.
	MakeMiniblock(ctx context.Context, forceSnapshot bool) (bool, error) // TODO: doesn't seem pertinent to SyncStream
}

func SyncStreamsResponseFromStreamAndCookie(result *StreamAndCookie) *SyncStreamsResponse {
	return &SyncStreamsResponse{
		Stream: result,
	}
}

type streamImpl struct {
	params *StreamCacheParams

	streamId string
	nodes    *StreamNodes

	// Mutex protects fields below
	// View is copied on write.
	// I.e. if there no calls to AddEvent, readers share the same view object
	// out of lock, which is immutable, so if there is a need to modify, lock is taken, copy
	// of view is created, and copy is modified and stored.
	mu        sync.RWMutex
	view      *streamViewImpl
	loadError error
	receivers mapset.Set[SyncResultReceiver]
}

var _ SyncStream = (*streamImpl)(nil)

// Should be called with lock held
// Either view or loadError will be set in Stream.
func (s *streamImpl) loadInternal(ctx context.Context) {
	if s.view != nil || s.loadError != nil {
		return
	}
	streamData, err := s.params.Storage.ReadStreamFromLastSnapshot(
		ctx,
		s.streamId,
		max(0, s.params.StreamConfig.RecencyConstraints.Generations-1),
	)
	if err != nil {
		s.loadError = err
		return
	}

	view, err := MakeStreamView(streamData)
	if err != nil {
		s.loadError = err
	} else {
		s.view = view
	}
}

func (s *streamImpl) ProposeNextMiniblock(ctx context.Context, forceSnapshot bool) (*MiniblockProposal, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Do nothing if not loaded since it's possible for tick to arrive after stream is unloaded.
	if s.view == nil {
		return nil, nil
	}

	return s.view.ProposeNextMiniblock(ctx, s.params.StreamConfig, forceSnapshot)
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

func (s *streamImpl) ApplyMiniblock(ctx context.Context, miniblockHeader *MiniblockHeader, envelopes []*ParsedEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	miniblockHeaderEvent, err := MakeParsedEventWithPayload(
		s.params.Wallet,
		Make_MiniblockHeader(miniblockHeader),
		miniblockHeader.PrevMiniblockHash,
	)
	if err != nil {
		return err
	}

	miniblock, err := NewMiniblockInfoFromParsed(miniblockHeaderEvent, envelopes)
	if err != nil {
		return err
	}

	// Lets see if this miniblock can be applied.
	newSV, err := s.view.copyAndApplyBlock(miniblock, s.params.StreamConfig)
	if err != nil {
		return err
	}

	miniblockBytes, err := miniblock.ToBytes()
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

	err = s.params.Storage.WriteBlock(
		ctx,
		s.streamId,
		s.view.minipool.generation,
		s.view.minipool.nextSlotNumber(),
		miniblockBytes,
		miniblockHeader.GetSnapshot() != nil,
		newMinipool,
	)
	if err != nil {
		return err
	}

	prevSyncCookie := s.view.SyncCookie(s.params.Wallet.AddressStr)
	s.view = newSV
	newSyncCookie := s.view.SyncCookie(s.params.Wallet.AddressStr)

	s.notifySubscribers([]*Envelope{miniblockHeaderEvent.Envelope}, newSyncCookie, prevSyncCookie)
	return nil
}

// Returns true if miniblock was created, false if not.
func (s *streamImpl) MakeMiniblock(ctx context.Context, forceSnapshot bool) (bool, error) {
	log := dlog.FromCtx(ctx)

	proposal, err := s.ProposeNextMiniblock(ctx, forceSnapshot)
	if err != nil {
		log.Error("Stream.MakeMiniblock: ProposeNextMiniblock failed", "error", err, "streamId", s.streamId)
		return false, err
	}
	if proposal == nil {
		return false, nil
	}

	miniblockHeader, envelopes, err := s.MakeMiniblockHeader(ctx, proposal)
	if err != nil {
		log.Error("Stream.MakeMiniblock: MakeMiniblockHeader failed", "error", err, "streamId", s.streamId)
		return false, err
	}
	if miniblockHeader == nil {
		return false, nil
	}

	err = s.ApplyMiniblock(ctx, miniblockHeader, envelopes)
	if err != nil {
		log.Error("Stream.MakeMiniblock: ApplyMiniblock failed", "error", err, "streamId", s.streamId)
		return false, err
	}
	return true, nil
}

func createStream(
	ctx context.Context,
	params *StreamCacheParams,
	streamId string,
	nodes *StreamNodes,
	genesisMiniblock *Miniblock,
) (*streamImpl, *streamViewImpl, error) {
	serializedMiniblock, err := proto.Marshal(genesisMiniblock)
	if err != nil {
		return nil, nil, err
	}

	err = params.Storage.CreateStreamStorage(ctx, streamId, serializedMiniblock)
	if err != nil {
		return nil, nil, err
	}

	// TODO: redundant parsing here.
	view, err := MakeStreamView(&storage.ReadStreamFromLastSnapshotResult{
		StartMiniblockNumber: 0,
		Miniblocks:           [][]byte{serializedMiniblock},
	})
	if err != nil {
		return nil, nil, err
	}

	stream := &streamImpl{
		params:   params,
		streamId: streamId,
		nodes:    nodes,
		view:     view,
	}
	return stream, view, nil
}

func (s *streamImpl) GetView(ctx context.Context) (StreamView, error) {
	s.mu.RLock()
	view := s.view
	loadError := s.loadError
	s.mu.RUnlock()
	if view != nil || loadError != nil {
		return view, loadError
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadInternal(ctx)
	return s.view, s.loadError
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

// Returns
// miniblocks: with indexes from fromIndex inclusive, to toIndex exlusive
// terminus: true if fromIndex is 0, or if there are no more blocks because they've been garbage collected
func (s *streamImpl) GetMiniblocks(ctx context.Context, fromInclusive int64, toExclusive int64) ([]*Miniblock, bool, error) {
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
		miniblocks[i] = miniblock.proto
	}

	terminus := fromInclusive == 0
	return miniblocks, terminus, nil
}

func (s *streamImpl) AddEvent(ctx context.Context, event *ParsedEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadInternal(ctx)
	if s.loadError != nil {
		return s.loadError
	}

	return s.addEventImpl(ctx, event)
}

func (s *streamImpl) notifySubscribers(envelopes []*Envelope, newSyncCookie *SyncCookie, prevSyncCookie *SyncCookie) {
	if s.receivers != nil && s.receivers.Cardinality() > 0 {
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

	err = s.params.Storage.WriteEvent(ctx, s.streamId, s.view.minipool.generation, s.view.minipool.nextSlotNumber(), envelopeBytes)
	// TODO: for some classes of errors, it's not clear if event was added or not
	// for those, perhaps entire Stream structure should be scrapped and reloaded
	if err != nil {
		return err
	}

	newSV, err := s.view.copyAndAddEvent(event)
	if err != nil {
		return err
	}
	prevSyncCookie := s.view.SyncCookie(s.params.Wallet.AddressStr)
	s.view = newSV
	newSyncCookie := s.view.SyncCookie(s.params.Wallet.AddressStr)

	s.notifySubscribers([]*Envelope{event.Envelope}, newSyncCookie, prevSyncCookie)

	return nil
}

func (s *streamImpl) Sub(ctx context.Context, cookie *SyncCookie, receiver SyncResultReceiver) error {
	log := dlog.FromCtx(ctx)
	if cookie.NodeAddress != s.params.Wallet.AddressStr {
		return RiverError(
			Err_BAD_SYNC_COOKIE,
			"cookies is not for this node",
			"cookie.NodeAddress",
			cookie.NodeAddress,
			"s.params.Wallet.AddressStr",
			s.params.Wallet.AddressStr,
		)
	}
	if cookie.StreamId != s.streamId {
		return RiverError(Err_BAD_SYNC_COOKIE, "bad stream id", "cookie.StreamId", cookie.StreamId, "s.streamId", s.streamId)
	}
	slot := cookie.MinipoolSlot
	if slot < 0 {
		return RiverError(Err_BAD_SYNC_COOKIE, "bad slot", "cookie.MinipoolSlot", slot).Func("Stream.Sub")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadInternal(ctx)
	if s.loadError != nil {
		return s.loadError
	}

	if cookie.MinipoolGen == int64(s.view.minipool.generation) {
		if slot > int64(s.view.minipool.events.Len()) {
			return RiverError(Err_BAD_SYNC_COOKIE, "Stream.Sub: bad slot")
		}

		if s.receivers == nil {
			s.receivers = mapset.NewSet[SyncResultReceiver]()
		}
		s.receivers.Add(receiver)

		if slot < int64(s.view.minipool.events.Len()) {
			envelopes := make([]*Envelope, 0, s.view.minipool.events.Len()-int(slot))
			for _, e := range s.view.minipool.events.Values[slot:] {
				envelopes = append(envelopes, e.Envelope)
			}
			receiver.OnUpdate(
				&StreamAndCookie{
					Events:         envelopes,
					NextSyncCookie: s.view.SyncCookie(s.params.Wallet.AddressStr),
				},
			)
		}
		return nil
	} else {
		if s.receivers == nil {
			s.receivers = mapset.NewSet[SyncResultReceiver]()
		}
		s.receivers.Add(receiver)

		envelopes := make([]*Envelope, 0, 16)
		miniblockIndex, err := s.view.indexOfMiniblockWithNum(cookie.MinipoolGen)
		if err != nil {
			// The user's sync cookie is out of date. Send a sync reset and return an up-to-date StreamAndCookie.
			log.Warn("Stream.Sub: out of date cookie.MiniblockNum. Sending sync reset.", "error", err.Error())
			receiver.OnUpdate(
				&StreamAndCookie{
					Events:         s.view.MinipoolEnvelopes(),
					NextSyncCookie: s.view.SyncCookie(s.params.Wallet.AddressStr),
					Miniblocks:     s.view.MiniblocksFromLastSnapshot(),
					SyncReset:      true,
				},
			)
			return nil
		}

		// append events from blocks
		err = s.view.forEachEvent(miniblockIndex, func(e *ParsedEvent) (bool, error) {
			envelopes = append(envelopes, e.Envelope)
			return true, nil
		})
		if err != nil {
			panic("Should never happen: Stream.Sub: forEachEvent failed: " + err.Error())
		}

		// append events from minipool
		err = s.view.minipool.forEachEvent(func(e *ParsedEvent) (bool, error) {
			envelopes = append(envelopes, e.Envelope)
			return true, nil
		})
		if err != nil {
			panic("Should never happen: Stream.Sub: forEachEvent failed: " + err.Error())
		}

		if len(envelopes) > 0 {
			receiver.OnUpdate(
				&StreamAndCookie{
					Events:         envelopes,
					NextSyncCookie: s.view.SyncCookie(s.params.Wallet.AddressStr),
				},
			)
		}
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
	s.loadError = nil
	if s.receivers != nil && s.receivers.Cardinality() > 0 {
		err := RiverError(Err_INTERNAL, "Stream unloaded")
		for r := range s.receivers.Iter() {
			r.OnSyncError(err)
		}
	}
	s.receivers = nil
}

// Periodic miniblock creation maybe disabled in tests.
func (s *streamImpl) mbCreationEnabled() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.view != nil && !s.view.snapshot.GetInceptionPayload().GetSettings().GetDisableMiniblockCreation()
}
