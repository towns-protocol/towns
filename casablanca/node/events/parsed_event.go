package events

import (
	. "casablanca/node/protocol"

	"google.golang.org/protobuf/proto"
)

type ParsedEvent struct {
	// TODO: remove StreamId from here
	StreamId string
	Event    *StreamEvent
	Envelope *Envelope
	Hash     []byte
}

func ParseEvent(streamId string, envelope *Envelope) (*ParsedEvent, error) {
	var streamEvent StreamEvent
	err := proto.Unmarshal(envelope.Event, &streamEvent)
	if err != nil {
		return nil, err
	}

	// TODO: check hash and signature

	return &ParsedEvent{
		StreamId: streamId,
		Event:    &streamEvent,
		Envelope: envelope,
		Hash:     envelope.Hash,
	}, nil
}

func ParseEvents(streamId string, events []*Envelope) ([]*ParsedEvent, error) {
	parsedEvents := make([]*ParsedEvent, len(events))
	for i, event := range events {
		parsedEvent, err := ParseEvent(streamId, event)
		if err != nil {
			return nil, err
		}
		parsedEvents[i] = parsedEvent
	}
	return parsedEvents, nil
}

func (e *ParsedEvent) GetInceptionPayload() *Payload_Inception {
	return e.Event.GetPayload().GetInception()
}

func (e *ParsedEvent) GetJoinableStreamPayload() *Payload_JoinableStream {
	return e.Event.GetPayload().GetJoinableStream()
}
