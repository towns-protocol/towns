package rpc

import (
	. "casablanca/node/events"
	"casablanca/node/protocol"
	"fmt"
)

type cachedEvent struct {
	streamKey string
}

/**
 * Rollup is a cache of all the events for a stream,
 * used to avoid loading from storage on every request
 */
type Rollup struct {
	loader func(string) ([]*protocol.Envelope, error)
}

func NewRollup(loader func(string) ([]*protocol.Envelope, error)) *Rollup {
	r := &Rollup{
		loader: loader,
	}
	return r
}

/**
 * Get the payloads for a stream
 *  locks only for the lookup, blocks till the stream is loaded
 * @param stream the stream id
 * @return the payloads for the stream
 */

func (r *Rollup) Get(streamId string) ([]*ParsedEvent, error) {
	res, err := r.loader(streamId)
	if err != nil {
		return nil, err
	}
	parsedEvents := make([]*ParsedEvent, len(res))
	for i, e := range res {
		parsedEvents[i], err = ParseEvent(streamId, e)
		if err != nil {
			return nil, err
		}
	}

	return parsedEvents, nil
}

func (r *Rollup) StreamKind(streamId string) (protocol.StreamKind, error) {
	parsedEvent, err := r.Get(streamId)
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

func (r *Rollup) JoinedUsers(streamId string) (map[string]struct{}, error) {
	parsedEvent, err := r.Get(streamId)
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
