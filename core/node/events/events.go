package events

import (
	"crypto/rand"
	"time"

	"google.golang.org/protobuf/proto"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/shared"

	. "github.com/river-build/river/core/node/protocol"
)

func MakeStreamEvent(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
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
	payload IsStreamEvent_Payload,
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

	hash := crypto.RiverHash(eventBytes)
	signature, err := wallet.SignHash(hash[:])
	if err != nil {
		return nil, err
	}

	return &Envelope{
		Event:     eventBytes,
		Signature: signature,
		Hash:      hash[:],
	}, nil
}

func MakeEnvelopeWithPayload(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
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
	payload IsStreamEvent_Payload,
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

	prevMiniBlockHash := common.BytesToHash(prevMiniblockHash)
	return &ParsedEvent{
		Event:             streamEvent,
		Envelope:          envelope,
		Hash:              common.BytesToHash(envelope.Hash),
		PrevMiniblockHash: &prevMiniBlockHash,
	}, nil
}

func Make_MemberPayload_Membership(
	op MembershipOp,
	userAddress []byte,
	initiatorAddress []byte,
) *StreamEvent_MemberPayload {
	return &StreamEvent_MemberPayload{
		MemberPayload: &MemberPayload{
			Content: &MemberPayload_Membership_{
				Membership: &MemberPayload_Membership{
					Op:               op,
					UserAddress:      userAddress,
					InitiatorAddress: initiatorAddress,
				},
			},
		},
	}
}

func Make_MemberPayload_Username(username *EncryptedData) *StreamEvent_MemberPayload {
	return &StreamEvent_MemberPayload{
		MemberPayload: &MemberPayload{
			Content: &MemberPayload_Username{
				Username: username,
			},
		},
	}
}

func Make_MemberPayload_DisplayName(displayName *EncryptedData) *StreamEvent_MemberPayload {
	return &StreamEvent_MemberPayload{
		MemberPayload: &MemberPayload{
			Content: &MemberPayload_DisplayName{
				DisplayName: displayName,
			},
		},
	}
}

func Make_ChannelPayload_Inception(
	inStreamId string,
	inSpaceId string,
	channelProperties *EncryptedData,
	settings *StreamSettings,
) *StreamEvent_ChannelPayload {
	streamId, err := shared.StreamIdFromString(inStreamId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}
	spaceId, err := shared.StreamIdFromString(inSpaceId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}

	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Inception_{
				Inception: &ChannelPayload_Inception{
					StreamId:          streamId.Bytes(),
					SpaceId:           spaceId.Bytes(),
					ChannelProperties: channelProperties,
					Settings:          settings,
				},
			},
		},
	}
}

// todo delete and replace with Make_MemberPayload_Membership
func Make_ChannelPayload_Membership(op MembershipOp, userId string, initiatorId string) *StreamEvent_MemberPayload {
	userAddress, err := shared.AddressFromUserId(userId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}
	var initiatorAddress []byte
	if initiatorId != "" {
		initiatorAddress, err = shared.AddressFromUserId(initiatorId)
		if err != nil {
			panic(err) // todo convert everything to common.Address
		}
	}
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress)
}

func Make_ChannelPayload_Message(content string) *StreamEvent_ChannelPayload {
	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Message{
				Message: &EncryptedData{
					Ciphertext: content,
				},
			},
		},
	}
}

// todo delete and replace with Make_MemberPayload_Membership
func Make_DmChannelPayload_Membership(op MembershipOp, userId string, initiatorId string) *StreamEvent_MemberPayload {
	userAddress, err := shared.AddressFromUserId(userId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}
	var initiatorAddress []byte
	if initiatorId != "" {
		initiatorAddress, err = shared.AddressFromUserId(initiatorId)
		if err != nil {
			panic(err) // todo convert everything to common.Address
		}
	}
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress)
}

// todo delete and replace with Make_MemberPayload_Membership
func Make_GdmChannelPayload_Membership(op MembershipOp, userId string, initiatorId string) *StreamEvent_MemberPayload {
	userAddress, err := shared.AddressFromUserId(userId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}
	var initiatorAddress []byte
	if initiatorId != "" {
		initiatorAddress, err = shared.AddressFromUserId(initiatorId)
		if err != nil {
			panic(err) // todo convert everything to common.Address
		}
	}
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress)
}

func Make_SpacePayload_Inception(inStreamId string, settings *StreamSettings) *StreamEvent_SpacePayload {
	streamId, err := shared.StreamIdFromString(inStreamId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}

	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &SpacePayload_Inception_{
				Inception: &SpacePayload_Inception{
					StreamId: streamId.Bytes(),
					Settings: settings,
				},
			},
		},
	}
}

// todo delete and replace with Make_MemberPayload_Membership
func Make_SpacePayload_Membership(op MembershipOp, userId string, initiatorId string) *StreamEvent_MemberPayload {
	userAddress, err := shared.AddressFromUserId(userId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}
	var initiatorAddress []byte
	if initiatorId != "" {
		initiatorAddress, err = shared.AddressFromUserId(initiatorId)
		if err != nil {
			panic(err) // todo convert everything to common.Address
		}
	}
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress)
}

func Make_SpacePayload_Channel(
	op ChannelOp,
	inChannelId string,
	channelProperties *EncryptedData,
	originEvent *EventRef,
	isDefault bool,
) *StreamEvent_SpacePayload {
	channelId, err := shared.StreamIdFromString(inChannelId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &SpacePayload_Channel_{
				Channel: &SpacePayload_Channel{
					Op:                op,
					ChannelId:         channelId.Bytes(),
					OriginEvent:       originEvent,
					ChannelProperties: channelProperties,
					IsDefault:         isDefault,
				},
			},
		},
	}
}

func Make_UserPayload_Inception(inStreamId string, settings *StreamSettings) *StreamEvent_UserPayload {
	streamId, err := shared.StreamIdFromString(inStreamId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}

	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_Inception_{
				Inception: &UserPayload_Inception{
					StreamId: streamId.Bytes(),
					Settings: settings,
				},
			},
		},
	}
}

func Make_UserDeviceKeyPayload_Inception(
	inStreamId string,
	settings *StreamSettings,
) *StreamEvent_UserDeviceKeyPayload {
	streamId, err := shared.StreamIdFromString(inStreamId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}

	return &StreamEvent_UserDeviceKeyPayload{
		UserDeviceKeyPayload: &UserDeviceKeyPayload{
			Content: &UserDeviceKeyPayload_Inception_{
				Inception: &UserDeviceKeyPayload_Inception{
					StreamId: streamId.Bytes(),
					Settings: settings,
				},
			},
		},
	}
}

func Make_UserPayload_Membership(
	op MembershipOp,
	inStreamId string,
	inInviter *string,
) *StreamEvent_UserPayload {
	streamId, err := shared.StreamIdFromString(inStreamId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}

	var inviter []byte
	if inInviter != nil {
		inviter, err = shared.AddressFromUserId(*inInviter)
		if err != nil {
			panic(err) // todo convert everything to shared.StreamId
		}
	}

	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_UserMembership_{
				UserMembership: &UserPayload_UserMembership{
					StreamId: streamId.Bytes(),
					Op:       op,
					Inviter:  inviter,
				},
			},
		},
	}
}

func Make_UserSettingsPayload_Inception(inStreamId string, settings *StreamSettings) *StreamEvent_UserSettingsPayload {
	streamId, err := shared.StreamIdFromString(inStreamId)
	if err != nil {
		panic(err) // todo convert everything to shared.StreamId
	}

	return &StreamEvent_UserSettingsPayload{
		UserSettingsPayload: &UserSettingsPayload{
			Content: &UserSettingsPayload_Inception_{
				Inception: &UserSettingsPayload_Inception{
					StreamId: streamId.Bytes(),
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
