package events

import (
	"casablanca/node/dlog"
	"context"
	"sync"
	"time"

	. "casablanca/node/base"
	. "casablanca/node/protocol"
)

type Stream struct {
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
	receivers map[chan<- *StreamAndCookie]bool

	miniblockTicker           *time.Ticker
	miniblockTickerContext    context.Context
	miniblockTickerCancelFunc context.CancelFunc
}

// Should be called with lock held
// Either view or loadError will be set in Stream.
func (s *Stream) loadInternal(ctx context.Context) {
	if s.view != nil || s.loadError != nil {
		return
	}
	events, err := s.params.Storage.GetStream(ctx, s.streamId)
	if err != nil {
		s.loadError = err
		return
	}

	view, err := MakeStreamView(events)
	if err != nil {
		s.loadError = err
	} else {
		s.view = view

		s.startTicker(view.InceptionPayload().GetSettings().GetMiniblockTimeMs())
	}
}

func (s *Stream) startTicker(miniblockTimeMs uint64) {
	s.miniblockTickerContext, s.miniblockTickerCancelFunc = context.WithCancel(s.params.DefaultCtx)
	if miniblockTimeMs == 0 {
		miniblockTimeMs = 2000
	}
	s.miniblockTicker = time.NewTicker(time.Duration(miniblockTimeMs) * time.Millisecond) // TODO: make configurable, disable setting from client if not test run.
	go s.miniblockTick(s.miniblockTickerContext)
}

func (s *Stream) miniblockTick(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-s.miniblockTicker.C:
			s.maybeMakeMiniblock(ctx)
		}
	}
}

func (s *Stream) stopTicker() {
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

func (s *Stream) maybeMakeMiniblock(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Do nothing if not loaded since it's possible for tick to arrive after stream is unloaded.
	if s.view == nil {
		return
	}

	viewInitialLen := s.view.minipool.events.Len()
	if viewInitialLen > 0 {
		log := dlog.CtxLog(ctx)

		block := s.view.makeMiniblockHeader()

		prevHashes := [][]byte{s.view.LastEvent().Hash}
		event, err := MakeParsedEventWithPayload(s.params.Wallet, Make_MiniblockHeader(block), prevHashes)
		if err == nil {
			_, err = s.addEventImpl(ctx, event)
		}

		if err != nil {
			log.Error("Failed to add miniblock event",
				"error", err,
				"streamId", s.streamId,
				"blockNum", block.MiniblockNum,
				"blockHash", event.Hash,
				"blockLen", len(block.EventHashes),
				"numEventsInInitialMinipool", viewInitialLen,
			)
			return
		}

		log.Debug("Made miniblock",
			"streamId", s.streamId,
			"blockNum", block.MiniblockNum,
			"blockHash", event.Hash,
			"blockLen", len(block.EventHashes),
			"numEventsInInitialMinipool", viewInitialLen,
			"numEventsInNewMinipool", s.view.minipool.events.Len(),
		)
	}
}

func createStream(ctx context.Context, params *StreamCacheParams, streamId string, events []*ParsedEvent) (*Stream, *streamViewImpl, error) {
	envelopes := make([]*Envelope, 0, len(events))
	for _, e := range events {
		envelopes = append(envelopes, e.Envelope)
	}
	err := params.Storage.CreateStream(ctx, streamId, envelopes)
	if err != nil {
		return nil, nil, err
	}

	view, err := MakeStreamViewFromParsedEvents(events)
	if err != nil {
		return nil, nil, err
	}

	stream := &Stream{
		params:   params,
		streamId: streamId,
		view:     view,
	}
	return stream, view, nil
}

func (s *Stream) GetView(ctx context.Context) (StreamView, error) {
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

func (s *Stream) AddEvent(ctx context.Context, event *ParsedEvent) (*SyncCookie, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadInternal(ctx)
	if s.loadError != nil {
		return nil, s.loadError
	}

	return s.addEventImpl(ctx, event)
}

// Lock must be taken.
func (s *Stream) addEventImpl(ctx context.Context, event *ParsedEvent) (*SyncCookie, error) {
	err := s.params.Storage.AddEvent(ctx, s.streamId, event.Envelope)
	// TODO: for some classes of errors, it's not clear if event was added or not
	// for those, perhaps entire Stream structure should be scrapped and reloaded
	if err != nil {
		return nil, err
	}

	newSV, err := s.view.copyAndAddEvent(event)
	if err != nil {
		return nil, err
	}
	prevSyncCookie := s.view.SyncCookie()
	s.view = newSV
	newSyncCookie := s.view.SyncCookie()

	if len(s.receivers) > 0 {
		update := &StreamAndCookie{
			StreamId:           s.streamId,
			Events:             []*Envelope{event.Envelope},
			NextSyncCookie:     newSyncCookie,
			OriginalSyncCookie: prevSyncCookie,
		}
		for receiver := range s.receivers {
			receiver <- update
		}
	}
	return newSyncCookie, nil
}

func (s *Stream) Sub(ctx context.Context, cookie *SyncCookie, receiver chan<- *StreamAndCookie) (*StreamAndCookie, error) {
	if cookie.StreamId != s.streamId {
		return nil, RpcErrorf(Err_BAD_SYNC_COOKIE, "Stream.Sub: cookie.StreamId=%s, s.streamId=%s", cookie.StreamId, s.streamId)
	}
	slot := cookie.MinipoolSlot
	if slot < 0 {
		return nil, RpcErrorf(Err_BAD_SYNC_COOKIE, "Stream.Sub: bad slot, cookie.MinipoolSlot=%d", slot)
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.loadInternal(ctx)
	if s.loadError != nil {
		return nil, s.loadError
	}

	if cookie.MinipoolInstance == s.view.minipool.instance {
		if slot > int64(s.view.minipool.events.Len()) {
			return nil, RpcErrorf(Err_BAD_SYNC_COOKIE, "Stream.Sub: bad slot")
		}

		if s.receivers == nil {
			s.receivers = make(map[chan<- *StreamAndCookie]bool)
		}
		s.receivers[receiver] = true

		if slot < int64(s.view.minipool.events.Len()) {
			envelopes := make([]*Envelope, 0, s.view.minipool.events.Len()-int(slot))
			for _, e := range s.view.minipool.events.A[slot:] {
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
			s.receivers = make(map[chan<- *StreamAndCookie]bool)
		}
		s.receivers[receiver] = true

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
func (s *Stream) Unsub(receiver chan<- *StreamAndCookie) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.receivers != nil {
		delete(s.receivers, receiver)
	}
}

// ForceFlush transitions Stream object to unloaded state.
// All subbed receivers will receive empty response and must
// terminate corresponding sync loop.
func (s *Stream) ForceFlush(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.view = nil
	s.loadError = nil
	if s.receivers != nil && len(s.receivers) > 0 {
		empty := &StreamAndCookie{
			StreamId: s.streamId,
		}
		for r := range s.receivers {
			r <- empty
		}
	}
	s.receivers = nil

	s.stopTicker()
}
