package events

import (
	"crypto/rand"
	"time"

	"google.golang.org/protobuf/proto"

	"github.com/river-build/river/crypto"
	"github.com/river-build/river/protocol"
	. "github.com/river-build/river/protocol"
)

func MakeStreamEvent(
	wallet *crypto.Wallet,
	payload protocol.IsStreamEvent_Payload,
	prevMiniblockHash []byte,
) (*StreamEvent, error) {
	salt := make([]byte, 32)
	_, err := rand.Read(salt)
	if err != nil {
		return nil, err
	}
	epocMillis := time.Now().UnixNano() / int64(time.Millisecond)

	event := &StreamEvent{
		CreatorAddress:    wallet.Address.Bytes(),
		Salt:              salt,
		PrevMiniblockHash: prevMiniblockHash,
		Payload:           payload,
		CreatedAtEpocMs:   epocMillis,
	}

	return event, nil
}

func MakeDelegatedStreamEvent(
	wallet *crypto.Wallet,
	payload protocol.IsStreamEvent_Payload,
	prevMiniblockHash []byte,
	delegateSig []byte,
) (*StreamEvent, error) {
	salt := make([]byte, 32)
	_, err := rand.Read(salt)
	if err != nil {
		return nil, err
	}
	epocMillis := time.Now().UnixNano() / int64(time.Millisecond)

	event := &StreamEvent{
		CreatorAddress:    wallet.Address.Bytes(),
		Salt:              salt,
		PrevMiniblockHash: prevMiniblockHash,
		Payload:           payload,
		DelegateSig:       delegateSig,
		CreatedAtEpocMs:   epocMillis,
	}

	return event, nil
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

func MakeEnvelopeWithPayload(
	wallet *crypto.Wallet,
	payload protocol.IsStreamEvent_Payload,
	prevMiniblockHash []byte,
) (*Envelope, error) {
	streamEvent, err := MakeStreamEvent(wallet, payload, prevMiniblockHash)
	if err != nil {
		return nil, err
	}
	return MakeEnvelopeWithEvent(wallet, streamEvent)
}

func MakeParsedEventWithPayload(
	wallet *crypto.Wallet,
	payload protocol.IsStreamEvent_Payload,
	prevMiniblockHash []byte,
) (*ParsedEvent, error) {
	streamEvent, err := MakeStreamEvent(wallet, payload, prevMiniblockHash)
	if err != nil {
		return nil, err
	}

	envelope, err := MakeEnvelopeWithEvent(wallet, streamEvent)
	if err != nil {
		return nil, err
	}

	return &ParsedEvent{
		Event:             streamEvent,
		Envelope:          envelope,
		Hash:              envelope.Hash,
		HashStr:           string(envelope.Hash),
		PrevMiniblockHash: string(prevMiniblockHash),
	}, nil
}

func Make_ChannelPayload_Inception(
	streamId string,
	spaceId string,
	channelProperties *EncryptedData,
	settings *StreamSettings,
) *StreamEvent_ChannelPayload {
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
					Ciphertext: content,
				},
			},
		},
	}
}

func Make_SpacePayload_Inception(streamId string, settings *StreamSettings) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &SpacePayload_Inception_{
				Inception: &SpacePayload_Inception{
					StreamId: streamId,
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

func Make_SpacePayload_Channel(
	op ChannelOp,
	channelId string,
	channelProperties *EncryptedData,
	originEvent *protocol.EventRef,
) *StreamEvent_SpacePayload {
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

func Make_SpacePayload_Username(username *EncryptedData) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &protocol.SpacePayload_Username{
				Username: username,
			},
		},
	}
}

func Make_SpacePayload_DisplayName(displayName *EncryptedData) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &protocol.SpacePayload_DisplayName{
				DisplayName: displayName,
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

func Make_UserDeviceKeyPayload_Inception(
	streamId string,
	userId string,
	settings *StreamSettings,
) *StreamEvent_UserDeviceKeyPayload {
	return &StreamEvent_UserDeviceKeyPayload{
		UserDeviceKeyPayload: &UserDeviceKeyPayload{
			Content: &UserDeviceKeyPayload_Inception_{
				Inception: &UserDeviceKeyPayload_Inception{
					StreamId: streamId,
					UserId:   userId,
					Settings: settings,
				},
			},
		},
	}
}

func Make_UserPayload_Membership(
	op protocol.MembershipOp,
	inviterId string,
	streamId string,
	originEvent *protocol.EventRef,
) *StreamEvent_UserPayload {
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
