package events

import (
	"google.golang.org/protobuf/proto"

	"casablanca/node/crypto"
	"casablanca/node/protocol"
	. "casablanca/node/protocol"
)

func MakeStreamEvent(wallet *crypto.Wallet, payload protocol.IsStreamEvent_Payload, prevHashes [][]byte) *StreamEvent {
	event := &StreamEvent{
		CreatorAddress: wallet.Address.Bytes(),
		Salt:           []byte("salt"), //TODO: do we really need salt in non-inception events? If needed, randomize it
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

func Make_UserPayload_Inception(streamId string) *StreamEvent_UserPayload {
	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_Inception_{
				Inception: &UserPayload_Inception{
					StreamId: streamId,
				},
			},
		},
	}
}

func Make_ChannelPayload_Inception(streamId string, spaceId string) *StreamEvent_ChannelPayload {
	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Inception_{
				Inception: &ChannelPayload_Inception{
					StreamId: streamId,
					SpaceId:  spaceId,
				},
			},
		},
	}
}

func Make_SpacePayload_Inception(streamId string) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &SpacePayload_Inception_{
				Inception: &SpacePayload_Inception{
					StreamId: streamId,
				},
			},
		},
	}
}

func Make_UserSettingsPayload_Inception(streamId string) *StreamEvent_UserSettingsPayload {
	return &StreamEvent_UserSettingsPayload{
		UserSettingsPayload: &UserSettingsPayload{
			Content: &UserSettingsPayload_Inception_{
				Inception: &UserSettingsPayload_Inception{
					StreamId: streamId,
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

func Make_SpacePayload_Channel(op ChannelOp, channelId string, originEvent *protocol.EventRef) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &protocol.SpacePayload_Channel_{
				Channel: &SpacePayload_Channel{
					Op:          op,
					ChannelId:   channelId,
					OriginEvent: originEvent,
				},
			},
		},
	}
}

func Make_ChannelPayload_Message(content string) *StreamEvent_ChannelPayload {
	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Message_{
				Message: &protocol.ChannelPayload_Message{
					Text: content,
				},
			},
		},
	}
}
