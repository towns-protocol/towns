package testutils

import (
	"google.golang.org/protobuf/proto"

	"casablanca/node/protocol"
)

func EventToPayload(event *protocol.Envelope) (*protocol.Payload, error) {
	var streamEvent protocol.StreamEvent
	err := proto.Unmarshal(event.Event, &streamEvent)
	if err != nil {
		return nil, err
	}
	return streamEvent.Payload, nil
}
