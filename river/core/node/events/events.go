package events

import (
	"crypto/rand"
	"time"

	"google.golang.org/protobuf/proto"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

func MakeStreamEvent(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblockHash []byte,
) (*StreamEvent, error) {
	salt := make([]byte, 32)
	_, err := rand.Read(salt)
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Failed to create random salt").
			Func("MakeStreamEvent")
	}
	epochMillis := time.Now().UnixNano() / int64(time.Millisecond)

	event := &StreamEvent{
		CreatorAddress:    wallet.Address.Bytes(),
		Salt:              salt,
		PrevMiniblockHash: prevMiniblockHash,
		Payload:           payload,
		CreatedAtEpochMs:  epochMillis,
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
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Failed to create random salt").
			Func("MakeDelegatedStreamEvent")
	}
	epochMillis := time.Now().UnixNano() / int64(time.Millisecond)

	event := &StreamEvent{
		CreatorAddress:    wallet.Address.Bytes(),
		Salt:              salt,
		PrevMiniblockHash: prevMiniblockHash,
		Payload:           payload,
		DelegateSig:       delegateSig,
		CreatedAtEpochMs:  epochMillis,
	}

	return event, nil
}

func MakeEnvelopeWithEvent(wallet *crypto.Wallet, streamEvent *StreamEvent) (*Envelope, error) {
	eventBytes, err := proto.Marshal(streamEvent)
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Failed to serialize stream event to bytes").
			Func("MakeEnvelopeWithEvent")
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
	streamParentId []byte,
) *StreamEvent_MemberPayload {
	return &StreamEvent_MemberPayload{
		MemberPayload: &MemberPayload{
			Content: &MemberPayload_Membership_{
				Membership: &MemberPayload_Membership{
					Op:               op,
					UserAddress:      userAddress,
					InitiatorAddress: initiatorAddress,
					StreamParentId:   streamParentId,
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
	streamId StreamId,
	spaceId StreamId,
	settings *StreamSettings,
) *StreamEvent_ChannelPayload {
	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Inception_{
				Inception: &ChannelPayload_Inception{
					StreamId: streamId[:],
					SpaceId:  spaceId[:],
					Settings: settings,
				},
			},
		},
	}
}

// todo delete and replace with Make_MemberPayload_Membership
func Make_ChannelPayload_Membership(
	op MembershipOp,
	userId string,
	initiatorId string,
	spaceId *StreamId,
) *StreamEvent_MemberPayload {
	userAddress, err := AddressFromUserId(userId)
	if err != nil {
		panic(err) // todo convert everything to StreamId
	}
	var initiatorAddress []byte
	if initiatorId != "" {
		initiatorAddress, err = AddressFromUserId(initiatorId)
		if err != nil {
			panic(err) // todo convert everything to common.Address
		}
	}
	var spaceIdBytes []byte
	if spaceId != nil {
		spaceIdBytes = spaceId[:]
	} else {
		spaceIdBytes = nil
	}
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress, spaceIdBytes)
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
	userAddress, err := AddressFromUserId(userId)
	if err != nil {
		panic(err) // todo convert everything to StreamId
	}
	var initiatorAddress []byte
	if initiatorId != "" {
		initiatorAddress, err = AddressFromUserId(initiatorId)
		if err != nil {
			panic(err) // todo convert everything to common.Address
		}
	}
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress, nil)
}

// todo delete and replace with Make_MemberPayload_Membership
func Make_GdmChannelPayload_Membership(op MembershipOp, userId string, initiatorId string) *StreamEvent_MemberPayload {
	userAddress, err := AddressFromUserId(userId)
	if err != nil {
		panic(err) // todo convert everything to StreamId
	}
	var initiatorAddress []byte
	if initiatorId != "" {
		initiatorAddress, err = AddressFromUserId(initiatorId)
		if err != nil {
			panic(err) // todo convert everything to common.Address
		}
	}
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress, nil)
}

func Make_SpacePayload_Inception(streamId StreamId, settings *StreamSettings) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &SpacePayload_Inception_{
				Inception: &SpacePayload_Inception{
					StreamId: streamId[:],
					Settings: settings,
				},
			},
		},
	}
}

// todo delete and replace with Make_MemberPayload_Membership
func Make_SpacePayload_Membership(op MembershipOp, userId string, initiatorId string) *StreamEvent_MemberPayload {
	userAddress, err := AddressFromUserId(userId)
	if err != nil {
		panic(err) // todo convert everything to StreamId
	}
	var initiatorAddress []byte
	if initiatorId != "" {
		initiatorAddress, err = AddressFromUserId(initiatorId)
		if err != nil {
			panic(err) // todo convert everything to common.Address
		}
	}
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress, nil)
}

func Make_SpacePayload_ChannelUpdate(
	op ChannelOp,
	channelId StreamId,
	originEvent *EventRef,
) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &SpacePayload_Channel{
				Channel: &SpacePayload_ChannelUpdate{
					Op:          op,
					ChannelId:   channelId[:],
					OriginEvent: originEvent,
				},
			},
		},
	}
}

func Make_UserPayload_Inception(streamId StreamId, settings *StreamSettings) *StreamEvent_UserPayload {
	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_Inception_{
				Inception: &UserPayload_Inception{
					StreamId: streamId[:],
					Settings: settings,
				},
			},
		},
	}
}

func Make_UserDeviceKeyPayload_Inception(
	streamId StreamId,
	settings *StreamSettings,
) *StreamEvent_UserDeviceKeyPayload {
	return &StreamEvent_UserDeviceKeyPayload{
		UserDeviceKeyPayload: &UserDeviceKeyPayload{
			Content: &UserDeviceKeyPayload_Inception_{
				Inception: &UserDeviceKeyPayload_Inception{
					StreamId: streamId[:],
					Settings: settings,
				},
			},
		},
	}
}

func Make_UserPayload_Membership(
	op MembershipOp,
	streamId StreamId,
	inInviter *string,
	streamParentId []byte,
) *StreamEvent_UserPayload {
	var inviter []byte
	if inInviter != nil {
		var err error
		inviter, err = AddressFromUserId(*inInviter)
		if err != nil {
			panic(err) // todo convert everything to StreamId
		}
	}

	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_UserMembership_{
				UserMembership: &UserPayload_UserMembership{
					StreamId:       streamId[:],
					Op:             op,
					Inviter:        inviter,
					StreamParentId: streamParentId,
				},
			},
		},
	}
}

func Make_UserSettingsPayload_Inception(streamId StreamId, settings *StreamSettings) *StreamEvent_UserSettingsPayload {
	return &StreamEvent_UserSettingsPayload{
		UserSettingsPayload: &UserSettingsPayload{
			Content: &UserSettingsPayload_Inception_{
				Inception: &UserSettingsPayload_Inception{
					StreamId: streamId[:],
					Settings: settings,
				},
			},
		},
	}
}

func Make_UserSettingsPayload_UserBlock(userBlock *UserSettingsPayload_UserBlock) *StreamEvent_UserSettingsPayload {
	return &StreamEvent_UserSettingsPayload{
		UserSettingsPayload: &UserSettingsPayload{
			Content: &UserSettingsPayload_UserBlock_{
				UserBlock: userBlock,
			},
		},
	}
}

func Make_MiniblockHeader(miniblockHeader *MiniblockHeader) *StreamEvent_MiniblockHeader {
	return &StreamEvent_MiniblockHeader{
		MiniblockHeader: miniblockHeader,
	}
}
