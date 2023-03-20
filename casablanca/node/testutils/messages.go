package testutils

import (
	"fmt"

	"google.golang.org/protobuf/proto"

	"casablanca/node/protocol"
	"casablanca/node/rpc"
)

func UserStreamInceptionEvent(idx int, creator []byte, streamId string) (*protocol.Envelope, error) {
	event := protocol.StreamEvent{
		CreatorAddress: creator,
		DelegageSig:    []byte(fmt.Sprintf("delegage sig%d", idx)),
		Salt:           []byte(fmt.Sprintf("salt %d", idx)),
		PrevEvents:     [][]byte{},
		Payload: &protocol.Payload{
			Payload: &protocol.Payload_Inception_{
				Inception: &protocol.Payload_Inception{
					StreamId:   streamId,
					SpaceId:    "",
					StreamKind: protocol.StreamKind_SK_USER,
				},
			},
		},
	}

	eventBuffer, err := proto.Marshal(&event)
	if err != nil {
		return nil, err
	}

	// Create a new stream
	inceptionEvent := &protocol.Envelope{
		Hash:      []byte(fmt.Sprintf("hash%d", idx)),
		Signature: []byte(fmt.Sprintf("signature%d", idx)),
		Event:     eventBuffer,
	}

	return inceptionEvent, nil
}

func SpaceStreamInceptionEvent(idx int, creator []byte, streamId string) (*protocol.Envelope, error) {
	event := protocol.StreamEvent{
		CreatorAddress: creator,
		DelegageSig:    []byte(fmt.Sprintf("delegage sig%d", idx)),
		Salt:           []byte(fmt.Sprintf("salt %d", idx)),
		PrevEvents:     [][]byte{},
		Payload: &protocol.Payload{
			Payload: &protocol.Payload_Inception_{
				Inception: &protocol.Payload_Inception{
					StreamId:   streamId,
					SpaceId:    "",
					StreamKind: protocol.StreamKind_SK_SPACE,
				},
			},
		},
	}

	eventBuffer, err := proto.Marshal(&event)
	if err != nil {
		return nil, err
	}

	// Create a new stream
	inceptionEvent := &protocol.Envelope{
		Hash:      []byte(fmt.Sprintf("hash%d", idx)),
		Signature: []byte(fmt.Sprintf("signature%d", idx)),
		Event:     eventBuffer,
	}

	return inceptionEvent, nil
}

func ChannelStreamInceptionEvent(idx int, creator []byte, streamId string, spaceId string) (*protocol.Envelope, error) {
	event := protocol.StreamEvent{
		CreatorAddress: creator,
		DelegageSig:    []byte(fmt.Sprintf("delegage sig%d", idx)),
		Salt:           []byte(fmt.Sprintf("salt %d", idx)),
		PrevEvents:     [][]byte{},
		Payload: &protocol.Payload{
			Payload: &protocol.Payload_Inception_{
				Inception: &protocol.Payload_Inception{
					StreamId:   streamId,
					SpaceId:    spaceId,
					StreamKind: protocol.StreamKind_SK_CHANNEL,
				},
			},
		},
	}

	eventBuffer, err := proto.Marshal(&event)
	if err != nil {
		return nil, err
	}

	// Create a new stream
	inceptionEvent := &protocol.Envelope{
		Hash:      []byte(fmt.Sprintf("hash%d", idx)),
		Signature: []byte(fmt.Sprintf("signature%d", idx)),
		Event:     eventBuffer,
	}

	return inceptionEvent, nil
}


func MessageEvent(idx int, creator []byte, content string, prevHash []byte) (*protocol.Envelope, error) {
	event := protocol.StreamEvent{
		CreatorAddress: creator,
		DelegageSig:    []byte("delegage sig"),
		Salt:           []byte("salt"),
		PrevEvents:     [][]byte{prevHash},
		Payload: &protocol.Payload{
			Payload: &protocol.Payload_Message_{
				Message: &protocol.Payload_Message{
					Text: content,
				},
			},
		},
	}

	eventBuffer, err := proto.Marshal(&event)
	if err != nil {
		return nil, err
	}

	message := &protocol.Envelope{
		Hash:      []byte(fmt.Sprintf("hash%d", idx)),
		Signature: []byte(fmt.Sprintf("signature%d", idx)),
		Event:     eventBuffer,
	}

	return message, nil
}

func JoinEvent(idx int, creator []byte, user []byte, prevHash []byte) (*protocol.Envelope, error) {
	userId := rpc.UserIdFromAddress(user)
	event := protocol.StreamEvent{
		CreatorAddress: creator,
		DelegageSig:    []byte("delegage sig"),
		Salt:           []byte("salt"),
		PrevEvents:     [][]byte{prevHash},
		Payload: &protocol.Payload{
			Payload: &protocol.Payload_JoinableStream_{
				JoinableStream: &protocol.Payload_JoinableStream{
					Op:     protocol.StreamOp_SO_JOIN,
					UserId: userId,
				},
			},
		},
	}

	eventBuffer, err := proto.Marshal(&event)
	if err != nil {
		return nil, err
	}

	join := &protocol.Envelope{
		Hash:      []byte(fmt.Sprintf("hash%d", idx)),
		Signature: []byte(fmt.Sprintf("signature%d", idx)),
		Event:     eventBuffer,
	}

	return join, nil
}

func EventToPayload(event *protocol.Envelope) (*protocol.Payload, error) {
	var streamEvent protocol.StreamEvent
	err := proto.Unmarshal(event.Event, &streamEvent)
	if err != nil {
		return nil, err
	}
	return streamEvent.Payload, nil
}
