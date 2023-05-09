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

func (r *StreamView) InceptionPayload(streamId string) (protocol.IsInceptionPayload, error) {
	parsedEvents, err := r.getOrderedEventsCached()
	if err != nil {
		return nil, err
	}
	if len(parsedEvents) == 0 {
		return nil, fmt.Errorf("no payloads for stream %s", streamId)
	}
	payload := parsedEvents[0].Event.GetInceptionPayload()
	if payload == nil {
		return nil, fmt.Errorf("no inception payload for stream %s", streamId)
	}
	return payload, nil
}

func (r *StreamView) JoinedUsers(streamId string) (map[string]struct{}, error) {
	parsedEvents, err := r.getOrderedEventsCached()
	if err != nil {
		return nil, err
	}
	if len(parsedEvents) == 0 {
		return nil, fmt.Errorf("no payloads for stream %s", streamId)
	}

	users := make(map[string]struct{})
	for _, e := range parsedEvents {
		switch payload := e.Event.Payload.(type) {
		case *protocol.StreamEvent_SpacePayload:
			switch spacePayload := payload.SpacePayload.Payload.(type) {
			case *protocol.SpacePayload_Membership:
				user := spacePayload.Membership.UserId
				if spacePayload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
					users[user] = struct{}{}
				} else if spacePayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
					delete(users, user)
				}
			default:
				break
			}
		case *protocol.StreamEvent_ChannelPayload:
			switch channelPayload := payload.ChannelPayload.Payload.(type) {
			case *protocol.ChannelPayload_Membership:
				user := channelPayload.Membership.UserId
				if channelPayload.Membership.GetOp() == protocol.MembershipOp_SO_JOIN {
					users[user] = struct{}{}
				} else if channelPayload.Membership.GetOp() == protocol.MembershipOp_SO_LEAVE {
					delete(users, user)
				}
			default:
				break
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

func (r *StreamView) GetStreamInfo(ctx context.Context, streamId string, userId string) (*common.RoomInfo, error) {
	parsedEvents, err := r.getOrderedEventsCached()
	if err != nil {
		return nil, err
	}
	if len(parsedEvents) == 0 {
		return nil, fmt.Errorf("no payloads for stream %s", streamId)
	}
	e := parsedEvents[0]
	payload := e.Event.GetInceptionPayload()
	if payload == nil {
		return nil, fmt.Errorf("no inception payload for stream %s", streamId)
	}

	creator := common.UserIdFromAddress(e.Event.GetCreatorAddress())
	switch inception := payload.(type) {
	case *protocol.UserPayload_Inception:
		return &common.RoomInfo{
			SpaceNetworkId: inception.StreamId,
			RoomType:       common.User,
			IsOwner:        creator == userId,
		}, nil
	case *protocol.ChannelPayload_Inception:
		return &common.RoomInfo{
			SpaceNetworkId:   inception.SpaceId,
			ChannelNetworkId: inception.StreamId,
			RoomType:         common.Channel,
			IsOwner:          creator == userId,
		}, nil
	case *protocol.SpacePayload_Inception:
		return &common.RoomInfo{
			SpaceNetworkId: inception.StreamId,
			RoomType:       common.Space,
			IsOwner:        creator == userId,
		}, nil
	case *protocol.UserSettingsPayload_Inception:
		return &common.RoomInfo{
			SpaceNetworkId: inception.StreamId,
			RoomType:       common.UserSettings,
			IsOwner:        creator == userId,
		}, nil
	default:
		return nil, fmt.Errorf("unimplemented stream type %T", inception)
	}
}
