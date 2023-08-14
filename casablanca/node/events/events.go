package events

import (
	"crypto/rand"

	"google.golang.org/protobuf/proto"

	"casablanca/node/crypto"
	"casablanca/node/protocol"
	. "casablanca/node/protocol"
)

func MakeStreamEvent(wallet *crypto.Wallet, payload protocol.IsStreamEvent_Payload, prevHashes [][]byte) *StreamEvent {
	salt := make([]byte, 32)
	_, err := rand.Read(salt)
	if err != nil {
		panic(err)
	}

	event := &StreamEvent{
		CreatorAddress: wallet.Address.Bytes(),
		Salt:           salt,
		PrevEvents:     prevHashes,
		Payload:        payload,
	}

	return event
}

func MakeEnvelopeWithEvent(wallet *crypto.Wallet, streamEvent *StreamEvent) (*Envelope, error) {
	eventBytes, err := proto.Marshal(streamEvent)
	if err != nil {
		return nil, err
	}

	hash := crypto.TownsHash(eventBytes)
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

func MakeEnvelopeWithPayload(wallet *crypto.Wallet, payload protocol.IsStreamEvent_Payload, prevHashes [][]byte) (*Envelope, error) {
	streamEvent := MakeStreamEvent(wallet, payload, prevHashes)

	return MakeEnvelopeWithEvent(wallet, streamEvent)
}

func MakeParsedEventWithPayload(wallet *crypto.Wallet, payload protocol.IsStreamEvent_Payload, prevHashes [][]byte) (*ParsedEvent, error) {
	streamEvent := MakeStreamEvent(wallet, payload, prevHashes)

	envelope, err := MakeEnvelopeWithEvent(wallet, streamEvent)
	if err != nil {
		return nil, err
	}

	prevEventStrs := make([]string, len(streamEvent.PrevEvents))
	for i, prevEvent := range streamEvent.PrevEvents {
		prevEventStrs[i] = string(prevEvent)
	}

	return &ParsedEvent{
		Event:         streamEvent,
		Envelope:      envelope,
		Hash:          envelope.Hash,
		HashStr:       string(envelope.Hash),
		PrevEventStrs: prevEventStrs,
	}, nil
}

func Make_ChannelPayload_Inception(streamId string, spaceId string, channelProperties *EncryptedData, settings *StreamSettings) *StreamEvent_ChannelPayload {
	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Inception_{
				Inception: &ChannelPayload_Inception{
					StreamId:          streamId,
					SpaceId:           spaceId,
					ChannelProperties: channelProperties,
					Settings:          settings,
				},
			},
		},
	}
}

func Make_ChannelPayload_Membership(op protocol.MembershipOp, userId string) *StreamEvent_ChannelPayload {
	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Membership{
				Membership: &Membership{
					Op:     op,
					UserId: userId,
				},
			},
		},
	}
}

func Make_ChannelPayload_Message(content string) *StreamEvent_ChannelPayload {
	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Message{
				Message: &protocol.EncryptedData{
					Text: content,
				},
			},
		},
	}
}

func Make_SpacePayload_Inception(streamId string, name string, settings *StreamSettings) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &SpacePayload_Inception_{
				Inception: &SpacePayload_Inception{
					StreamId: streamId,
					Name:     name,
					Settings: settings,
				},
			},
		},
	}
}

func Make_SpacePayload_Membership(op MembershipOp, userId string) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &protocol.SpacePayload_Membership{
				Membership: &Membership{
					Op:     op,
					UserId: userId,
				},
			},
		},
	}
}

func Make_SpacePayload_Channel(op ChannelOp, channelId string, channelProperties *EncryptedData, originEvent *protocol.EventRef) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &protocol.SpacePayload_Channel_{
				Channel: &SpacePayload_Channel{
					Op:                op,
					ChannelId:         channelId,
					OriginEvent:       originEvent,
					ChannelProperties: channelProperties,
				},
			},
		},
	}
}

func Make_UserPayload_Inception(streamId string, settings *StreamSettings) *StreamEvent_UserPayload {
	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_Inception_{
				Inception: &UserPayload_Inception{
					StreamId: streamId,
					Settings: settings,
				},
			},
		},
	}
}

func Make_UserPayload_Membership(op protocol.MembershipOp, inviterId string, streamId string, originEvent *protocol.EventRef) *StreamEvent_UserPayload {
	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &protocol.UserPayload_UserMembership_{
				UserMembership: &UserPayload_UserMembership{
					StreamId:    streamId,
					OriginEvent: originEvent,
					InviterId:   inviterId,
					Op:          op,
				},
			},
		},
	}
}

func Make_UserSettingsPayload_Inception(streamId string, settings *StreamSettings) *StreamEvent_UserSettingsPayload {
	return &StreamEvent_UserSettingsPayload{
		UserSettingsPayload: &UserSettingsPayload{
			Content: &UserSettingsPayload_Inception_{
				Inception: &UserSettingsPayload_Inception{
					StreamId: streamId,
					Settings: settings,
				},
			},
		},
	}
}

func Make_MiniblockHeader(miniblockHeader *MiniblockHeader) *StreamEvent_MiniblockHeader {
	return &StreamEvent_MiniblockHeader{
		MiniblockHeader: miniblockHeader,
	}
}
