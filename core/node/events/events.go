package events

import (
	"crypto/rand"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

func MakeStreamEvent(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblock *MiniblockRef,
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
		CreatorAddress:   wallet.Address.Bytes(),
		Salt:             salt,
		Payload:          payload,
		CreatedAtEpochMs: epochMillis,
	}

	if prevMiniblock != nil && prevMiniblock.Hash != (common.Hash{}) {
		event.PrevMiniblockHash = prevMiniblock.Hash[:]
		if prevMiniblock.Num >= 0 {
			event.PrevMiniblockNum = &prevMiniblock.Num
		}
	}

	return event, nil
}

func MakeStreamEventWithTags(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblock *MiniblockRef,
	tags *Tags,
) (*StreamEvent, error) {
	event, err := MakeStreamEvent(wallet, payload, prevMiniblock)
	if err != nil {
		return nil, err
	}

	event.Tags = tags

	if prevMiniblock != nil && prevMiniblock.Hash != (common.Hash{}) {
		event.PrevMiniblockHash = prevMiniblock.Hash[:]
		if prevMiniblock.Num >= 0 {
			event.PrevMiniblockNum = &prevMiniblock.Num
		}
	}

	return event, nil
}

func MakeDelegatedStreamEvent(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblock *MiniblockRef,
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
		CreatorAddress:   wallet.Address.Bytes(),
		Salt:             salt,
		Payload:          payload,
		DelegateSig:      delegateSig,
		CreatedAtEpochMs: epochMillis,
	}

	if prevMiniblock != nil && prevMiniblock.Hash != (common.Hash{}) {
		event.PrevMiniblockHash = prevMiniblock.Hash[:]
		if prevMiniblock.Num >= 0 {
			event.PrevMiniblockNum = &prevMiniblock.Num
		}
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

	hash := crypto.TownsHashForEvents.Hash(eventBytes)
	signature, err := wallet.SignHash(hash)
	if err != nil {
		return nil, err
	}

	return &Envelope{
		Event:     eventBytes,
		Signature: signature,
		Hash:      hash[:],
	}, nil
}

func makeEnvelopeWithPayload(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	ephemeral bool,
	prevMiniblock *MiniblockRef,
) (*Envelope, error) {
	streamEvent, err := MakeStreamEvent(wallet, payload, prevMiniblock)
	if err != nil {
		return nil, err
	}
	streamEvent.Ephemeral = ephemeral
	return MakeEnvelopeWithEvent(wallet, streamEvent)
}

func MakeEphemeralEnvelopeWithPayload(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblock *MiniblockRef,
) (*Envelope, error) {
	return makeEnvelopeWithPayload(wallet, payload, true, prevMiniblock)
}

func MakeEnvelopeWithPayload(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblock *MiniblockRef,
) (*Envelope, error) {
	return makeEnvelopeWithPayload(wallet, payload, false, prevMiniblock)
}

func MakeEnvelopeWithPayloadAndTags(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblock *MiniblockRef,
	tags *Tags,
) (*Envelope, error) {
	streamEvent, err := MakeStreamEventWithTags(wallet, payload, prevMiniblock, tags)
	if err != nil {
		return nil, err
	}
	return MakeEnvelopeWithEvent(wallet, streamEvent)
}

func MakeParsedEventWithPayload(
	wallet *crypto.Wallet,
	payload IsStreamEvent_Payload,
	prevMiniblock *MiniblockRef,
) (*ParsedEvent, error) {
	streamEvent, err := MakeStreamEvent(wallet, payload, prevMiniblock)
	if err != nil {
		return nil, err
	}

	envelope, err := MakeEnvelopeWithEvent(wallet, streamEvent)
	if err != nil {
		return nil, err
	}

	return &ParsedEvent{
		Event:        streamEvent,
		Envelope:     envelope,
		Hash:         common.BytesToHash(envelope.Hash),
		MiniblockRef: prevMiniblock,
	}, nil
}

func Make_MemberPayload_Membership(
	op MembershipOp,
	userAddress []byte,
	initiatorAddress []byte,
	inReason *MembershipReason,
	appAddress common.Address,
	appSponsorAddress common.Address,
) *StreamEvent_MemberPayload {
	reason := MembershipReason_MR_NONE
	if inReason != nil {
		reason = *inReason
	}
	membership := &MemberPayload_Membership{
		Op:               op,
		UserAddress:      userAddress,
		InitiatorAddress: initiatorAddress,
		Reason:           reason,
		AppAddress:       appAddress[:],
	}
	// Only set app_sponsor_address if it's non-zero (for GDM bot joins)
	if appSponsorAddress != (common.Address{}) {
		membership.AppSponsorAddress = appSponsorAddress[:]
	}
	return &StreamEvent_MemberPayload{
		MemberPayload: &MemberPayload{
			Content: &MemberPayload_Membership_{
				Membership: membership,
			},
		},
	}
}

func Make_MemberPayload_KeySolicitation(
	deviceKey string,
	fallbackKey string,
	isNewDevice bool,
	sessionIds []string,
) *StreamEvent_MemberPayload {
	return &StreamEvent_MemberPayload{
		MemberPayload: &MemberPayload{
			Content: &MemberPayload_KeySolicitation_{
				KeySolicitation: &MemberPayload_KeySolicitation{
					DeviceKey:   deviceKey,
					FallbackKey: fallbackKey,
					IsNewDevice: isNewDevice,
					SessionIds:  sessionIds,
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

func Make_MemberPayload_BlockchainTransaction(
	fromUserAddress []byte,
	transaction *BlockchainTransaction,
) *StreamEvent_MemberPayload {
	return &StreamEvent_MemberPayload{
		MemberPayload: &MemberPayload{
			Content: &MemberPayload_MemberBlockchainTransaction_{
				MemberBlockchainTransaction: &MemberPayload_MemberBlockchainTransaction{
					Transaction:     transaction,
					FromUserAddress: fromUserAddress,
				},
			},
		},
	}
}

func Make_DmChannelPayload_Inception(
	streamId StreamId,
	firstPartyAddress common.Address,
	secondPartyAddress common.Address,
	settings *StreamSettings,
) *StreamEvent_DmChannelPayload {
	return &StreamEvent_DmChannelPayload{
		DmChannelPayload: &DmChannelPayload{
			Content: &DmChannelPayload_Inception_{
				Inception: &DmChannelPayload_Inception{
					StreamId:           streamId[:],
					FirstPartyAddress:  firstPartyAddress[:],
					SecondPartyAddress: secondPartyAddress[:],
					Settings:           settings,
				},
			},
		},
	}
}

func Make_GdmChannelPayload_Inception(
	streamId StreamId,
	settings *StreamSettings,
) *StreamEvent_GdmChannelPayload {
	return &StreamEvent_GdmChannelPayload{
		GdmChannelPayload: &GdmChannelPayload{
			Content: &GdmChannelPayload_Inception_{
				Inception: &GdmChannelPayload_Inception{
					StreamId: streamId[:],
					Settings: settings,
				},
			},
		},
	}
}

func Make_ChannelPayload_Inception(
	streamId StreamId,
	settings *StreamSettings,
) *StreamEvent_ChannelPayload {
	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Inception_{
				Inception: &ChannelPayload_Inception{
					StreamId: streamId[:],
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
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress, nil, common.Address{}, common.Address{})
}

func Make_DMChannelPayload_Message(content string) *StreamEvent_DmChannelPayload {
	return &StreamEvent_DmChannelPayload{
		DmChannelPayload: &DmChannelPayload{
			Content: &DmChannelPayload_Message{
				Message: &EncryptedData{
					Ciphertext: content,
				},
			},
		},
	}
}

func Make_GDMChannelPayload_Message(content string) *StreamEvent_GdmChannelPayload {
	return &StreamEvent_GdmChannelPayload{
		GdmChannelPayload: &GdmChannelPayload{
			Content: &GdmChannelPayload_Message{
				Message: &EncryptedData{
					Ciphertext: content,
				},
			},
		},
	}
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

func Make_ChannelPayload_Message_WithSessionBytes(
	content string,
	sessionIdBytes []byte,
	deviceKey string,
) *StreamEvent_ChannelPayload {
	return &StreamEvent_ChannelPayload{
		ChannelPayload: &ChannelPayload{
			Content: &ChannelPayload_Message{
				Message: &EncryptedData{
					Ciphertext:     content,
					SessionIdBytes: sessionIdBytes,
					SenderKey:      deviceKey,
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
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress, nil, common.Address{}, common.Address{})
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
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress, nil, common.Address{}, common.Address{})
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
	return Make_MemberPayload_Membership(op, userAddress, initiatorAddress, nil, common.Address{}, common.Address{})
}

func Make_SpacePayload_SpaceImage(
	ciphertext string,
	algorithm string,
) *StreamEvent_SpacePayload {
	encryptedData := &EncryptedData{
		Ciphertext: ciphertext,
		Algorithm:  algorithm,
	}
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &SpacePayload_SpaceImage{
				SpaceImage: encryptedData,
			},
		},
	}
}

func Make_SpacePayload_ChannelUpdate(
	op ChannelOp,
	channelId StreamId,
	originEvent *EventRef,
	settings *SpacePayload_ChannelSettings,
) *StreamEvent_SpacePayload {
	return &StreamEvent_SpacePayload{
		SpacePayload: &SpacePayload{
			Content: &SpacePayload_Channel{
				Channel: &SpacePayload_ChannelUpdate{
					Op:          op,
					ChannelId:   channelId[:],
					OriginEvent: originEvent,
					Settings:    settings,
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

func Make_UserInboxPayload_Inception(streamId StreamId, settings *StreamSettings) *StreamEvent_UserInboxPayload {
	return &StreamEvent_UserInboxPayload{
		UserInboxPayload: &UserInboxPayload{
			Content: &UserInboxPayload_Inception_{
				Inception: &UserInboxPayload_Inception{
					StreamId: streamId[:],
					Settings: settings,
				},
			},
		},
	}
}

func Make_UserInboxPayload_GroupEncryptionSessions(
	streamId StreamId,
	sessionIds []string,
	cipherTexts map[string]string,
) *StreamEvent_UserInboxPayload {
	return &StreamEvent_UserInboxPayload{
		UserInboxPayload: &UserInboxPayload{
			Content: &UserInboxPayload_GroupEncryptionSessions_{
				GroupEncryptionSessions: &UserInboxPayload_GroupEncryptionSessions{
					StreamId:    streamId[:],
					SessionIds:  sessionIds,
					Ciphertexts: cipherTexts,
				},
			},
		},
	}
}

func Make_UserMetadataPayload_Inception(
	streamId StreamId,
	settings *StreamSettings,
) *StreamEvent_UserMetadataPayload {
	return &StreamEvent_UserMetadataPayload{
		UserMetadataPayload: &UserMetadataPayload{
			Content: &UserMetadataPayload_Inception_{
				Inception: &UserMetadataPayload_Inception{
					StreamId: streamId[:],
					Settings: settings,
				},
			},
		},
	}
}

func Make_UserMetadataPayload_EncryptionDevice(
	deviceKey string,
	fallbackKey string,
) *StreamEvent_UserMetadataPayload {
	return &StreamEvent_UserMetadataPayload{
		UserMetadataPayload: &UserMetadataPayload{
			Content: &UserMetadataPayload_EncryptionDevice_{
				EncryptionDevice: &UserMetadataPayload_EncryptionDevice{
					DeviceKey:   deviceKey,
					FallbackKey: fallbackKey,
				},
			},
		},
	}
}

func Make_UserPayload_Membership(
	op MembershipOp,
	streamId StreamId,
	inInviter common.Address,
	reason *MembershipReason,
) *StreamEvent_UserPayload {
	var inviter []byte
	if inInviter != (common.Address{}) {
		inviter = inInviter.Bytes()
	}

	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_UserMembership_{
				UserMembership: &UserPayload_UserMembership{
					StreamId: streamId[:],
					Op:       op,
					Inviter:  inviter,
					Reason:   reason,
				},
			},
		},
	}
}

func Make_UserPayload_BlockchainTransaction(
	fromUserAddress []byte,
	transaction *BlockchainTransaction,
) *StreamEvent_UserPayload {
	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_BlockchainTransaction{
				BlockchainTransaction: transaction,
			},
		},
	}
}

func Make_UserPayload_ReceivedBlockchainTransaction(
	fromUserAddress []byte,
	transaction *BlockchainTransaction,
) *StreamEvent_UserPayload {
	return &StreamEvent_UserPayload{
		UserPayload: &UserPayload{
			Content: &UserPayload_ReceivedBlockchainTransaction_{
				ReceivedBlockchainTransaction: &UserPayload_ReceivedBlockchainTransaction{
					Transaction:     transaction,
					FromUserAddress: fromUserAddress,
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

func Make_UserSettingsPayload_FullyReadMarkers(
	fullyReadMarkers *UserSettingsPayload_FullyReadMarkers,
) *StreamEvent_UserSettingsPayload {
	return &StreamEvent_UserSettingsPayload{
		UserSettingsPayload: &UserSettingsPayload{
			Content: &UserSettingsPayload_FullyReadMarkers_{
				FullyReadMarkers: fullyReadMarkers,
			},
		},
	}
}

func Make_MediaPayload_Inception(inception *MediaPayload_Inception) *StreamEvent_MediaPayload {
	return &StreamEvent_MediaPayload{
		MediaPayload: &MediaPayload{
			Content: &MediaPayload_Inception_{
				Inception: inception,
			},
		},
	}
}

func Make_MediaPayload_Chunk(data []byte, chunkIndex int32, iv []byte) *StreamEvent_MediaPayload {
	return &StreamEvent_MediaPayload{
		MediaPayload: &MediaPayload{
			Content: &MediaPayload_Chunk_{
				Chunk: &MediaPayload_Chunk{
					Data:       data,
					ChunkIndex: chunkIndex,
					Iv:         iv,
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

func Make_MetadataPayload_Inception(
	streamId StreamId,
	settings *StreamSettings,
) *StreamEvent_MetadataPayload {
	return &StreamEvent_MetadataPayload{
		MetadataPayload: &MetadataPayload{
			Content: &MetadataPayload_Inception_{
				Inception: &MetadataPayload_Inception{
					StreamId: streamId[:],
					Settings: settings,
				},
			},
		},
	}
}

func Make_MetadataPayload_NewStream(
	streamId StreamId,
	genesisMiniblockHash common.Hash,
	nodeAddresses []common.Address,
	replicationFactor int64,
) *StreamEvent_MetadataPayload {
	nodes := make([][]byte, len(nodeAddresses))
	for i, addr := range nodeAddresses {
		nodes[i] = addr.Bytes()
	}
	return &StreamEvent_MetadataPayload{
		MetadataPayload: &MetadataPayload{
			Content: &MetadataPayload_NewStream_{
				NewStream: &MetadataPayload_NewStream{
					StreamId:             streamId[:],
					GenesisMiniblockHash: genesisMiniblockHash[:],
					Nodes:                nodes,
					ReplicationFactor:    replicationFactor,
				},
			},
		},
	}
}

func Make_MetadataPayload_LastMiniblockUpdate(
	streamId StreamId,
	lastMiniblockHash common.Hash,
	lastMiniblockNum int64,
) *StreamEvent_MetadataPayload {
	return &StreamEvent_MetadataPayload{
		MetadataPayload: &MetadataPayload{
			Content: &MetadataPayload_LastMiniblockUpdate_{
				LastMiniblockUpdate: &MetadataPayload_LastMiniblockUpdate{
					StreamId:          streamId[:],
					LastMiniblockHash: lastMiniblockHash[:],
					LastMiniblockNum:  lastMiniblockNum,
				},
			},
		},
	}
}

func Make_MetadataPayload_PlacementUpdate(
	streamId StreamId,
	nodeAddresses []common.Address,
	replicationFactor int64,
) *StreamEvent_MetadataPayload {
	nodes := make([][]byte, len(nodeAddresses))
	for i, addr := range nodeAddresses {
		nodes[i] = addr.Bytes()
	}
	return &StreamEvent_MetadataPayload{
		MetadataPayload: &MetadataPayload{
			Content: &MetadataPayload_PlacementUpdate_{
				PlacementUpdate: &MetadataPayload_PlacementUpdate{
					StreamId:          streamId[:],
					Nodes:             nodes,
					ReplicationFactor: replicationFactor,
				},
			},
		},
	}
}
