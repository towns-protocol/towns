package events

import (
	"google.golang.org/protobuf/proto"

	"casablanca/node/crypto"
	"casablanca/node/protocol"
	. "casablanca/node/protocol"
)

func MakeStreamEvent(wallet *crypto.Wallet, payload *Payload, prevHashes [][]byte) *StreamEvent {
	return &StreamEvent{
		CreatorAddress: wallet.Address.Bytes(),
		Salt:           []byte("salt"), //TODO: do we really need salt in non-inception events? If needed, randomize it
		PrevEvents:     prevHashes,
		Payload:        payload,
	}
}

func MakeEnvelopeWithEvent(wallet *crypto.Wallet, streamEvent *StreamEvent) (*Envelope, error) {
	eventBytes, err := proto.Marshal(streamEvent)
	if err != nil {
		return nil, err
	}

	hash := crypto.HashPersonalMessage(eventBytes)
	signature, err := wallet.SignHash(hash)
	if err != nil {
		return nil, err
	}

	return &Envelope{
		Event:     eventBytes,
		Signature: signature,
		Hash:      hash,
	}, nil
}

func MakeEnvelopeWithPayload(wallet *crypto.Wallet, payload *Payload, prevHashes [][]byte) (*Envelope, error) {
	streamEvent := MakeStreamEvent(wallet, payload, prevHashes)

	return MakeEnvelopeWithEvent(wallet, streamEvent)
}

func WrapPayload_Inception(inception *Payload_Inception) *Payload {
	return &Payload{
		Payload: &Payload_Inception_{Inception: inception},
	}
}

func MakePayload_Inception(streamId string, streamKind StreamKind, spaceId string) *Payload {
	return WrapPayload_Inception(
		&Payload_Inception{
			StreamId:   streamId,
			StreamKind: streamKind,
			SpaceId:    spaceId,
		},
	)
}

func WrapPayload_UserMembershipOp(op *Payload_UserMembershipOp) *Payload {
	return &Payload{
		Payload: &Payload_UserMembershipOp_{UserMembershipOp: op},
	}
}

func MakePayload_UserMembershipOp(op MembershipOp, streamId string, inviterId string, originEvent *EventRef) *Payload {
	return WrapPayload_UserMembershipOp(
		&Payload_UserMembershipOp{
			Op:          op,
			StreamId:    streamId,
			InviterId:   inviterId,
			OriginEvent: originEvent,
		},
	)
}

func WrapPayload_Channel(channel *Payload_Channel) *Payload {
	return &Payload{
		Payload: &Payload_Channel_{Channel: channel},
	}
}

func MakePayload_Channel(op ChannelOp, channelId string, originEvent *EventRef) *Payload {
	return WrapPayload_Channel(
		&Payload_Channel{
			Op:          op,
			ChannelId:   channelId,
			OriginEvent: originEvent,
		},
	)
}

func WrapPayload_JoinableStream(op *Payload_JoinableStream) *Payload {
	return &Payload{
		Payload: &Payload_JoinableStream_{JoinableStream: op},
	}
}

func MakePayload_JoinableStream(op MembershipOp, userId string) *Payload {
	return WrapPayload_JoinableStream(
		&Payload_JoinableStream{
			Op:     op,
			UserId: userId,
		},
	)
}

func WrapPayload_Message(message *Payload_Message) *Payload {
	return &Payload{
		Payload: &Payload_Message_{Message: message},
	}
}

func MakePayload_Message(content string) *Payload {
	return WrapPayload_Message(
		&protocol.Payload_Message{
			Text: content,
		},
	)
}
