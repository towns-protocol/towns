package events

import (
	"casablanca/node/storage"
	"context"
	"sync"

	. "casablanca/node/base"
	. "casablanca/node/protocol"
)

type Stream struct {
	storage  storage.Storage
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
}

// Should be called with lock held
// Either view or loadError will be set in Stream.
func (s *Stream) loadInternal(ctx context.Context) {
	if s.view != nil || s.loadError != nil {
		return
	}
	events, err := s.storage.GetStream(ctx, s.streamId)
	if err != nil {
		s.loadError = err
		return
	}

	view, err := MakeStreamView(events)
	if err != nil {
		s.loadError = err
	} else {
		s.view = view
	}
}

func createStream(ctx context.Context, storage storage.Storage, streamId string, events []*ParsedEvent) (*Stream, *streamViewImpl, error) {
	envelopes := make([]*Envelope, 0, len(events))
	for _, e := range events {
		envelopes = append(envelopes, e.Envelope)
	}
	err := storage.CreateStream(ctx, streamId, envelopes)
	if err != nil {
		return nil, nil, err
	}

	view, err := MakeStreamViewFromParsedEvents(events)
	if err != nil {
		return nil, nil, err
	}

	stream := &Stream{
		storage:  storage,
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

	err := s.storage.AddEvent(ctx, s.streamId, event.Envelope)
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

	var prevSyncCookie *SyncCookie
	if cookie.MinipoolInstance != s.view.syncCookie.MinipoolInstance {
		slot = 0
		prevSyncCookie = SyncCookieCopy(cookie)
		prevSyncCookie.MinipoolSlot = 0
	} else {
		prevSyncCookie = cookie
	}

	if slot > int64(len(s.view.events)) {
		return nil, RpcErrorf(Err_BAD_SYNC_COOKIE, "Stream.Sub: bad slot, cookie.MinipoolSlot=%d, len(s.view.events)=%d", slot, len(s.view.events))
	}

	if s.receivers == nil {
		s.receivers = make(map[chan<- *StreamAndCookie]bool)
	}
	s.receivers[receiver] = true

	if slot < int64(len(s.view.events)) {
		return &StreamAndCookie{
			StreamId:           s.streamId,
			Events:             s.view.envelopes[slot:],
			NextSyncCookie:     s.view.syncCookie,
			OriginalSyncCookie: prevSyncCookie,
		}, nil
	} else {
		return nil, nil
	}
}

func (s *Stream) Unsub(receiver chan<- *StreamAndCookie) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.receivers, receiver)
}
