package events

import (
	"casablanca/node/storage"
	"context"
	"sync"

	. "casablanca/node/base"
	. "casablanca/node/protocol"
)

type Stream struct {
	minipoolInstanceId string
	storage            storage.Storage
	streamId           string

	// Mutex protects fields below
	mu        sync.RWMutex
	view      *streamViewImpl
	receivers map[chan<- *StreamAndCookie]bool
}

func createStream(ctx context.Context, storage storage.Storage, streamId string, events []*ParsedEvent) (*Stream, string, error) {
	envelopes := make([]*Envelope, 0, len(events))
	for _, e := range events {
		envelopes = append(envelopes, e.Envelope)
	}
	_, err := storage.CreateStream(ctx, streamId, envelopes)
	if err != nil {
		return nil, "", err
	}

	view, err := MakeStreamViewFromParsedEvents(events)
	if err != nil {
		return nil, "", err
	}

	stream := &Stream{
		minipoolInstanceId: GenNanoid(),
		storage:            storage,
		streamId:           streamId,
		view:               view,
	}
	return stream, stream.currentSyncCookie(), nil
}

func loadStream(ctx context.Context, storage storage.Storage, streamId string) (*Stream, error) {
	_, events, err := storage.GetStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	view, err := MakeStreamView(events)
	if err != nil {
		return nil, err
	}

	return &Stream{
		minipoolInstanceId: GenNanoid(),
		storage:            storage,
		streamId:           streamId,
		view:               view,
	}, nil
}

// Lock must be held
func (s *Stream) currentSyncCookie() string {
	return MakeSyncCookie(
		SyncCookie{
			StreamId:         s.streamId,
			MiniblockNum:     0,
			MiniblockHashStr: "00",
			MinipoolInstance: s.minipoolInstanceId,
			MinipoolSlot:     len(s.view.events),
		},
	)
}

func (s *Stream) GetView() StreamView {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.view.copy()
}

func (s *Stream) GetViewAndSyncCookie() (StreamView, string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.view.copy(), s.currentSyncCookie()
}

func (s *Stream) AddEvent(ctx context.Context, event *ParsedEvent) (string, error) {
	_, err := s.storage.AddEvent(ctx, s.streamId, event.Envelope)
	// TODO: for some classes of errors, it's not clear if event was added or not
	// for those, perhaps entire Stream structure should be scrapped and reloaded
	if err != nil {
		return "", err
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	prevSyncCookie := s.currentSyncCookie()
	err = s.view.addEvent(event)
	if err != nil {
		return "", err
	}
	currentSyncCookie := s.currentSyncCookie()
	if len(s.receivers) > 0 {
		update := &StreamAndCookie{
			StreamId:           s.streamId,
			Events:             []*Envelope{event.Envelope},
			NextSyncCookie:     []byte(currentSyncCookie),
			OriginalSyncCookie: []byte(prevSyncCookie),
		}
		for receiver := range s.receivers {
			receiver <- update
		}
	}
	return currentSyncCookie, nil
}

func (s *Stream) Sub(syncCookie string, receiver chan<- *StreamAndCookie) (*StreamAndCookie, error) {
	cookie, err := ParseSyncCookie(syncCookie)
	if err != nil {
		return nil, err
	}
	if cookie.StreamId != s.streamId {
		return nil, RpcErrorf(Err_BAD_SYNC_COOKIE, "Stream.Sub: cookie.StreamId=%s, s.streamId=%s", cookie.StreamId, s.streamId)
	}
	slot := cookie.MinipoolSlot
	if slot < 0 {
		return nil, RpcErrorf(Err_BAD_SYNC_COOKIE, "Stream.Sub: bad slot, cookie.MinipoolSlot=%d", slot)
	}
	var prevSyncCookie string
	if cookie.MinipoolInstance != s.minipoolInstanceId {
		slot = 0
		prevSyncCookie = MakeSyncCookie(
			SyncCookie{
				StreamId:         s.streamId,
				MiniblockNum:     0,
				MiniblockHashStr: "00",
				MinipoolInstance: s.minipoolInstanceId,
				MinipoolSlot:     0,
			},
		)
	} else {
		prevSyncCookie = syncCookie
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if slot > len(s.view.events) {
		return nil, RpcErrorf(Err_BAD_SYNC_COOKIE, "Stream.Sub: bad slot, cookie.MinipoolSlot=%d, len(s.view.events)=%d", slot, len(s.view.events))
	}

	if s.receivers == nil {
		s.receivers = make(map[chan<- *StreamAndCookie]bool)
	}
	s.receivers[receiver] = true

	if slot < len(s.view.events) {
		return &StreamAndCookie{
			StreamId:           s.streamId,
			Events:             s.view.envelopes[slot:],
			NextSyncCookie:     []byte(s.currentSyncCookie()),
			OriginalSyncCookie: []byte(prevSyncCookie),
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
