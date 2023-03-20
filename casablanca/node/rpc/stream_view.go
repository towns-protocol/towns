package rpc

import (
	. "casablanca/node/events"
	"casablanca/node/protocol"
	"fmt"

	log "github.com/sirupsen/logrus"
)

type cachedEvent struct {
	streamKey string
}

/**
 * StreamView is a cache of all the events for a stream,
 * used to avoid loading from storage on every request
 */
type StreamView struct {
	getLocalOrderEvents func() ([]*protocol.Envelope, error)
	loaded              bool
	events              map[string]*ParsedEvent
	eventsOrder         []string
}

func NewView(getLocalOrderEventsFunc func() ([]*protocol.Envelope, error)) *StreamView {
	r := &StreamView{
		getLocalOrderEvents: getLocalOrderEventsFunc,
		loaded:              false,
		events:              make(map[string]*ParsedEvent),
		eventsOrder:         make([]string, 0),
	}
	return r
}

func (r *StreamView) getOrderedEvents() ([]*ParsedEvent, error) {
	if !r.loaded {
		return nil, fmt.Errorf("streamview not loaded")
	}
	res := make([]*ParsedEvent, len(r.eventsOrder))
	for i, hash := range r.eventsOrder {
		res[i] = r.events[hash]
	}
	return res, nil
}

func (r *StreamView) getOrderedEventsCached() ([]*ParsedEvent, error) {
	if r.loaded {
		return r.getOrderedEvents()
	}

	res, err := r.getLocalOrderEvents()
	if err != nil {
		return nil, err
	}

	for _, e := range res {
		parsedEvent, err := ParseEvent(e)
		if err != nil {
			return nil, err
		}
		if _, ok := r.events[string(parsedEvent.Envelope.Hash)]; ok {
			return nil, fmt.Errorf("prev event")
		}
		r.events[string(parsedEvent.Envelope.Hash)] = parsedEvent
		r.eventsOrder = append(r.eventsOrder, string(parsedEvent.Envelope.Hash))
	}
	r.loaded = true

	return r.getOrderedEvents()
}

func (r *StreamView) Get() ([]*ParsedEvent, error) {
	return r.getOrderedEventsCached()
}

func (r *StreamView) StreamKind(streamId string) (protocol.StreamKind, error) {
	parsedEvent, err := r.getOrderedEventsCached()
	if err != nil {
		return 0, err
	}
	if len(parsedEvent) == 0 {
		return 0, fmt.Errorf("no payloads for stream %s", streamId)
	}
	switch parsedEvent[0].Event.Payload.Payload.(type) {
	case *protocol.Payload_Inception_:
		inception := (*protocol.Payload_Inception)(parsedEvent[0].Event.Payload.GetInception())
		return inception.StreamKind, nil
	default:
		return 0, fmt.Errorf("unknown stream kind")
	}
}

func (r *StreamView) JoinedUsers(streamId string) (map[string]struct{}, error) {
	parsedEvent, err := r.getOrderedEventsCached()
	if err != nil {
		return nil, err
	}
	if len(parsedEvent) == 0 {
		return nil, fmt.Errorf("no payloads for stream %s", streamId)
	}

	users := make(map[string]struct{})
	for _, e := range parsedEvent {
		switch e.Event.Payload.Payload.(type) {
		case *protocol.Payload_JoinableStream_:
			joinableStream := e.Event.Payload.GetJoinableStream()
			user := joinableStream.GetUserId()
			switch joinableStream.Op {
			case protocol.StreamOp_SO_JOIN:
				users[user] = struct{}{}
			case protocol.StreamOp_SO_LEAVE:
				delete(users, user)
			}
		}
	}
	return users, nil
}

func (r *StreamView) GetAllLeafEvents() ([][]byte, error) {
	events, err := r.getOrderedEventsCached()
	if err != nil {
		return nil, err
	}

	if len(events) == 0 {
		panic("no events")
	}
	leafEventHashes := make(map[string]struct{})
	for _, event := range events {
		leafEventHashes[string(event.Hash)] = struct{}{}
		log.Debug("leaf event", "hash", event.Hash)
		for _, prev := range event.Event.PrevEvents {
			log.Debug("deleting prev event", "hash", prev)
			delete(leafEventHashes, string(prev))
		}
	}
	if len(leafEventHashes) == 0 {
		return nil, fmt.Errorf("no leaf events")
	}
	hashes := make([][]byte, 0, len(leafEventHashes))
	for hash := range leafEventHashes {
		hashes = append(hashes, []byte(hash))
	}
	return hashes, nil
}

func (r *StreamView) AddEvent(event *protocol.Envelope) error {
	if !r.loaded {
		return fmt.Errorf("streamview not loaded")
	}
	parsedEvent, err := ParseEvent(event)
	if err != nil {
		return err
	}
	r.events[string(parsedEvent.Envelope.Hash)] = parsedEvent
	r.eventsOrder = append(r.eventsOrder, string(parsedEvent.Envelope.Hash))
	return nil
}
