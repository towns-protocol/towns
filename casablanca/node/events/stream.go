package events

import (
	"casablanca/node/dlog"
	"casablanca/node/storage"
	"context"
	"sync"
	"time"

	. "casablanca/node/base"
	. "casablanca/node/protocol"

	mapset "github.com/deckarep/golang-set/v2"
	"google.golang.org/protobuf/proto"
)

type Stream interface {
	GetMiniblocks(ctx context.Context, fromIndex int, toIndex int) ([]*Miniblock, bool, error)
	AddEvent(ctx context.Context, event *ParsedEvent) error
}

type SyncStream interface {
	Stream
	Sub(ctx context.Context, cookie *SyncCookie, receiver chan<- *StreamAndCookie) (*StreamAndCookie, error)
	Unsub(receiver chan<- *StreamAndCookie)
}

type streamImpl struct {
	params *StreamCacheParams

	streamId string

	// Mutex protects fields below
	// View is copied on write.
	// I.e. if there no calls to AddEvent, readers share the same view object
	// out of lock, which is immutable, so if there is a need to modify, lock is taken, copy
	// of view is created, and copy is modified and stored.
	mu        sync.RWMutex
	view      *streamViewImpl
	loadError error
	receivers mapset.Set[chan<- *StreamAndCookie]

	miniblockTicker           *time.Ticker
	miniblockTickerContext    context.Context
	miniblockTickerCancelFunc context.CancelFunc
}

var _ SyncStream = (*streamImpl)(nil)

// Should be called with lock held
// Either view or loadError will be set in Stream.
func (s *streamImpl) loadInternal(ctx context.Context) {
	if s.view != nil || s.loadError != nil {
		return
	}
	streamData, err := s.params.Storage.GetStreamFromLastSnapshot(ctx, s.streamId)
	if err != nil {
		s.loadError = err
		return
	}

	// TODO: stop reading preceding miniblocks once snapshots work end-to-end.
	var preceedingMiniblocks [][]byte
	if streamData.StartMiniblockNumber > 0 {
		preceedingMiniblocks, err = s.params.Storage.GetMiniblocks(ctx, s.streamId, 0, streamData.StartMiniblockNumber)
		if err != nil {
			s.loadError = err
			return
		}
	}

	view, err := MakeStreamView(preceedingMiniblocks, streamData)
	if err != nil {
		s.loadError = err
	} else {
		s.view = view

		s.startTicker(view.InceptionPayload().GetSettings().GetMiniblockTimeMs())
	}
}

func (s *streamImpl) startTicker(miniblockTimeMs uint64) {
	s.miniblockTickerContext, s.miniblockTickerCancelFunc = context.WithCancel(s.params.DefaultCtx)
	if miniblockTimeMs == 0 {
		miniblockTimeMs = 2000
	}
	s.miniblockTicker = time.NewTicker(time.Duration(miniblockTimeMs) * time.Millisecond) // TODO: make configurable, disable setting from client if not test run. https://linear.app/hnt-labs/issue/HNT-2011
	go s.miniblockTick(s.miniblockTickerContext)
}

func (s *streamImpl) miniblockTick(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-s.miniblockTicker.C:
			s.maybeMakeMiniblock(ctx)
		}
	}
}

func (s *streamImpl) stopTicker() {
	// Should be called under lock.
	if s.miniblockTicker == nil {
		s.miniblockTicker.Stop()
		s.miniblockTicker = nil
	}
	if s.miniblockTickerCancelFunc != nil {
		s.miniblockTickerCancelFunc()
		s.miniblockTickerCancelFunc = nil
	}
	s.miniblockTickerContext = nil
}

func (s *streamImpl) makeMiniblock(ctx context.Context) error {
	miniblockHeader, envelopes := s.view.makeMiniblockHeader(ctx)

	prevHashes := [][]byte{s.view.LastEvent().Hash}
	miniblockHeaderEvent, err := MakeParsedEventWithPayload(s.params.Wallet, Make_MiniblockHeader(miniblockHeader), prevHashes)
	if err != nil {
		return err
	}

	miniblock, err := NewMiniblockInfoFromParsed(miniblockHeaderEvent, envelopes)
	if err != nil {
		return err
	}

	miniblockBytes, err := miniblock.ToBytes()
	if err != nil {
		return err
	}

	err = s.params.Storage.CreateBlock(
		ctx,
		s.streamId,
		s.view.GetMinipoolGeneration(),
		s.view.minipool.nextSlotNumber(),
		miniblockBytes,
		miniblockHeader.GetSnapshot() != nil,
		nil,
	)
	if err != nil {
		return err
	}

	newSV, err := s.view.copyAndApplyBlock(miniblock)
	if err != nil {
		return err
	}
	prevSyncCookie := s.view.SyncCookie()
	s.view = newSV
	newSyncCookie := s.view.SyncCookie()

	s.notifySubscribers([]*Envelope{miniblockHeaderEvent.Envelope}, newSyncCookie, prevSyncCookie)
	return nil
}

func (s *streamImpl) maybeMakeMiniblock(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()

	log := dlog.CtxLog(ctx)

	// Do nothing if not loaded since it's possible for tick to arrive after stream is unloaded.
	if s.view == nil {
		return
	}

	viewInitialLen := s.view.minipool.events.Len()
	if viewInitialLen > 0 {
		err := s.makeMiniblock(ctx)
		if err != nil {
			log.Error("Failed to add miniblock event",
				"error", err,
				"streamId", s.streamId,
			)
		}
	}
}

func createStream(ctx context.Context, params *StreamCacheParams, streamId string, genesisMiniblockEvents []*ParsedEvent) (*streamImpl, *streamViewImpl, error) {
	header, err := Make_GenisisMiniblockHeader(genesisMiniblockEvents)
	if err != nil {
		return nil, nil, err
	}
	headerEnvelope, err := MakeEnvelopeWithPayload(
		params.Wallet,
		Make_MiniblockHeader(header),
		[][]byte{genesisMiniblockEvents[len(genesisMiniblockEvents)-1].Hash},
	)
	if err != nil {
		return nil, nil, err
	}

	envelopes := make([]*Envelope, len(genesisMiniblockEvents))
	for i, e := range genesisMiniblockEvents {
		envelopes[i] = e.Envelope
	}

	miniblock := &Miniblock{
		Events: envelopes,
		Header: headerEnvelope,
	}

	serializedMiniblock, err := proto.Marshal(miniblock)
	if err != nil {
		return nil, nil, err
	}

	err = params.Storage.CreateStream(ctx, streamId, serializedMiniblock)
	if err != nil {
		return nil, nil, err
	}

	// TODO: redundant parsing here.
	view, err := MakeStreamView(nil, &storage.GetStreamFromLastSnapshotResult{
		StartMiniblockNumber: 0,
		Miniblocks:           [][]byte{serializedMiniblock},
	})
	if err != nil {
		return nil, nil, err
	}

	stream := &streamImpl{
		params:   params,
		streamId: streamId,
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

// Returns
// miniblocks: with indexes from fromIndex inclusive, to toIndex exlusive
// terminus: true if fromIndex is 0, or if there are no more blocks because they've been garbage collected
func (s *streamImpl) GetMiniblocks(ctx context.Context, fromIndex int, toIndex int) ([]*Miniblock, bool, error) {
	blocks, err := s.params.Storage.GetMiniblocks(ctx, s.streamId, fromIndex, toIndex)
	if err != nil {
		return nil, false, err
	}

	miniblocks := make([]*Miniblock, len(blocks))
	for i, binMiniblock := range blocks {
		miniblock, err := NewMiniblockInfoFromBytes(binMiniblock)
		if err != nil {
			return nil, false, err
		}
		miniblocks[i] = miniblock.proto
	}

	terminus := fromIndex == 0
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
		update := &StreamAndCookie{
			StreamId:           s.streamId,
			Events:             envelopes,
			NextSyncCookie:     newSyncCookie,
			OriginalSyncCookie: prevSyncCookie,
		}
		for receiver := range s.receivers.Iter() {
			receiver <- update
		}
	}
}

// Lock must be taken.
func (s *streamImpl) addEventImpl(ctx context.Context, event *ParsedEvent) error {
	envelopeBytes, err := event.GetEnvelopeBytes()
	if err != nil {
		return err
	}

	err = s.params.Storage.AddEvent(ctx, s.streamId, len(s.view.blocks), s.view.minipool.nextSlotNumber(), envelopeBytes)
	// TODO: for some classes of errors, it's not clear if event was added or not
	// for those, perhaps entire Stream structure should be scrapped and reloaded
	if err != nil {
		return err
	}

	newSV, err := s.view.copyAndAddEvent(event)
	if err != nil {
		return err
	}
	prevSyncCookie := s.view.SyncCookie()
	s.view = newSV
	newSyncCookie := s.view.SyncCookie()

	s.notifySubscribers([]*Envelope{event.Envelope}, newSyncCookie, prevSyncCookie)

	return nil
}

func (s *streamImpl) Sub(ctx context.Context, cookie *SyncCookie, receiver chan<- *StreamAndCookie) (*StreamAndCookie, error) {
	if cookie.StreamId != s.streamId {
		return nil, RiverError(Err_BAD_SYNC_COOKIE, "bad stream id", "cookie.StreamId", cookie.StreamId, "s.streamId", s.streamId)
	}
	slot := cookie.MinipoolSlot
	if slot < 0 {
		return nil, RiverError(Err_BAD_SYNC_COOKIE, "bad slot", "cookie.MinipoolSlot", slot).Func("Stream.Sub")
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadInternal(ctx)
	if s.loadError != nil {
		return nil, s.loadError
	}

	if cookie.MinipoolInstance == s.view.minipool.instance {
		if slot > int64(s.view.minipool.events.Len()) {
			return nil, RiverError(Err_BAD_SYNC_COOKIE, "Stream.Sub: bad slot")
		}

		if s.receivers == nil {
			s.receivers = mapset.NewSet[chan<- *StreamAndCookie]()
		}
		s.receivers.Add(receiver)

		if slot < int64(s.view.minipool.events.Len()) {
			envelopes := make([]*Envelope, 0, s.view.minipool.events.Len()-int(slot))
			for _, e := range s.view.minipool.events.Values[slot:] {
				envelopes = append(envelopes, e.Envelope)
			}
			return &StreamAndCookie{
				StreamId:           s.streamId,
				Events:             envelopes,
				NextSyncCookie:     s.view.SyncCookie(),
				OriginalSyncCookie: cookie,
			}, nil
		} else {
			return nil, nil
		}
	} else {
		if s.receivers == nil {
			s.receivers = mapset.NewSet[chan<- *StreamAndCookie]()
		}
		s.receivers.Add(receiver)

		envelopes := make([]*Envelope, 0, 16)
		err := s.view.forEachEvent(int(cookie.MiniblockNum), func(e *ParsedEvent) (bool, error) {
			envelopes = append(envelopes, e.Envelope)
			return true, nil
		})
		if err != nil {
			return nil, err
		}

		if len(envelopes) > 0 {
			return &StreamAndCookie{
				StreamId:       s.streamId,
				Events:         envelopes,
				NextSyncCookie: s.view.SyncCookie(),
				OriginalSyncCookie: &SyncCookie{
					StreamId:     s.streamId,
					MiniblockNum: cookie.MiniblockNum,
					MinipoolSlot: 0,
				},
			}, nil
		} else {
			return nil, nil
		}
	}
}

// It's ok to unsub non-existing receiver.
// Such situation arises during ForceFlush.
func (s *streamImpl) Unsub(receiver chan<- *StreamAndCookie) {
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
		empty := &StreamAndCookie{
			StreamId: s.streamId,
		}
		for r := range s.receivers.Iter() {
			r <- empty
		}
	}
	s.receivers = nil

	s.stopTicker()
}
