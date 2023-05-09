package storage

import (
	"casablanca/node/common"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"context"
	"fmt"
)

/**
 * StreamView is a cache of all the events for a stream,
 * used to avoid loading from storage on every request
 */
type StreamView struct {
	getLocalOrderEvents func() ([]*protocol.Envelope, error)
	loaded              bool
	events              map[string]*events.ParsedEvent
	eventsOrder         []string
}

func NewView(getLocalOrderEventsFunc func() ([]*protocol.Envelope, error)) *StreamView {
	r := &StreamView{
		getLocalOrderEvents: getLocalOrderEventsFunc,
		loaded:              false,
		events:              make(map[string]*events.ParsedEvent),
		eventsOrder:         make([]string, 0),
	}
	return r
}

func NewViewFromStreamId(ctx context.Context, store Storage, streamId string) *StreamView {
	view := NewView(func() ([]*protocol.Envelope, error) {
		_, events, err := store.GetStream(ctx, streamId)
		if err != nil {
			return nil, err
		}
		return events, nil
	})
	return view
}

func (r *StreamView) getOrderedEvents() ([]*events.ParsedEvent, error) {
	if !r.loaded {
		return nil, fmt.Errorf("streamview not loaded")
	}
	res := make([]*events.ParsedEvent, len(r.eventsOrder))
	for i, hash := range r.eventsOrder {
		res[i] = r.events[hash]
	}
	return res, nil
}

func (r *StreamView) getOrderedEventsCached() ([]*events.ParsedEvent, error) {
	if r.loaded {
		return r.getOrderedEvents()
	}

	res, err := r.getLocalOrderEvents()
	if err != nil {
		return nil, err
	}

	for _, event := range res {
		parsedEvent, err := events.ParseEvent(event, true)
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

func (r *StreamView) Get() ([]*events.ParsedEvent, error) {
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
			case protocol.MembershipOp_SO_JOIN:
				users[user] = struct{}{}
			case protocol.MembershipOp_SO_LEAVE:
				delete(users, user)
			}
		}
	}
	return users, nil
}

func (r *StreamView) GetAllLeafEvents(ctx context.Context) ([][]byte, error) {
	log := infra.GetLogger(ctx)
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
	parsedEvent, err := events.ParseEvent(event, true)
	if err != nil {
		return err
	}
	r.events[string(parsedEvent.Envelope.Hash)] = parsedEvent
	r.eventsOrder = append(r.eventsOrder, string(parsedEvent.Envelope.Hash))
	return nil
}

func (r *StreamView) GetStreamInfo(ctx context.Context, roomId string, userId string) (*common.RoomInfo, error) {
	parsedEvent, err := r.getOrderedEventsCached()
	if err != nil {
		return nil, err
	}
	if len(parsedEvent) == 0 {
		return nil, fmt.Errorf("no payloads for stream %s", roomId)
	}

	for _, e := range parsedEvent {
		creator := common.UserIdFromAddress(e.Event.GetCreatorAddress())
		switch e.Event.Payload.Payload.(type) {
		case *protocol.Payload_Inception_:
			inception := e.Event.Payload.GetInception()
			switch inception.StreamKind {
			case protocol.StreamKind_SK_CHANNEL:
				return &common.RoomInfo{
					SpaceNetworkId:   inception.SpaceId,
					ChannelNetworkId: inception.StreamId,
					RoomType:         common.Channel,
					IsOwner:          creator == userId,
				}, nil
			case protocol.StreamKind_SK_SPACE:

				return &common.RoomInfo{
					SpaceNetworkId: inception.StreamId,
					RoomType:       common.Space,
					IsOwner:        creator == userId,
				}, nil

			case protocol.StreamKind_SK_USER:

				return &common.RoomInfo{
					SpaceNetworkId: inception.StreamId,
					RoomType:       common.User,
					IsOwner:        creator == userId,
				}, nil

			}
		}
	}
	return nil, fmt.Errorf("no inception event found")
}
