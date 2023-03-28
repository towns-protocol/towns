package events

import (
	"casablanca/node/protocol"

	"google.golang.org/protobuf/proto"
)

type ParsedEvent struct {
	Event    *protocol.StreamEvent
	Envelope *protocol.Envelope
	Hash     []byte
}

type FullEvent struct {
	StreamId    string
	SeqNum      int64
	ParsedEvent *ParsedEvent
}

func ParseEvent(envelope *protocol.Envelope) (*ParsedEvent, error) {
	var streamEvent protocol.StreamEvent
	err := proto.Unmarshal(envelope.Event, &streamEvent)
	if err != nil {
		return nil, err
	}

	// TODO: check hash and signature

	return &ParsedEvent{
		Event:    &streamEvent,
		Envelope: envelope,
		Hash:     envelope.Hash,
	}, nil
}

func ParseEvents(events []*protocol.Envelope) ([]*ParsedEvent, error) {
	parsedEvents := make([]*ParsedEvent, len(events))
	for i, event := range events {
		parsedEvent, err := ParseEvent(event)
		if err != nil {
			return nil, err
		}
		parsedEvents[i] = parsedEvent
	}
	return parsedEvents, nil
}

func (e *ParsedEvent) GetInceptionPayload() *protocol.Payload_Inception {
	return e.Event.GetPayload().GetInception()
}

func (e *ParsedEvent) GetJoinableStreamPayload() *protocol.Payload_JoinableStream {
	return e.Event.GetPayload().GetJoinableStream()
}
