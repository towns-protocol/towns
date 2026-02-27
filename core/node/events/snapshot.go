package events

import (
	"bytes"
	"encoding/hex"
	"fmt"
	"slices"

	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events/migrations"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// ParsedSnapshot is a wrapper around the snapshot and its envelope.
type ParsedSnapshot struct {
	Snapshot *Snapshot
	Envelope *Envelope
}

// MakeParsedSnapshot creates a parsed snapshot from the given wallet and snapshot.
func MakeParsedSnapshot(wallet *crypto.Wallet, snapshot *Snapshot) (*ParsedSnapshot, error) {
	envelope, err := MakeSnapshotEnvelope(wallet, snapshot)
	if err != nil {
		return nil, err
	}

	return &ParsedSnapshot{
		Snapshot: snapshot,
		Envelope: envelope,
	}, nil
}

// MakeSnapshotEnvelope creates a snapshot envelope from the given snapshot.
func MakeSnapshotEnvelope(wallet *crypto.Wallet, snapshot *Snapshot) (*Envelope, error) {
	snapshotBytes, err := proto.Marshal(snapshot)
	if err != nil {
		return nil, AsRiverError(err, Err_INTERNAL).
			Message("Failed to serialize snapshot to bytes").
			Func("MakeSnapshotEnvelope")
	}

	hash := crypto.TownsHashForSnapshots.Hash(snapshotBytes)
	signature, err := wallet.SignHash(hash)
	if err != nil {
		return nil, err
	}

	return &Envelope{
		Event:     snapshotBytes,
		Signature: signature,
		Hash:      hash[:],
	}, nil
}

// ParseSnapshot parses the given envelope into a snapshot.
// It verifies the hash and signature of the envelope.
func ParseSnapshot(envelope *Envelope, signer common.Address) (*Snapshot, error) {
	hash := crypto.TownsHashForSnapshots.Hash(envelope.Event)
	if !bytes.Equal(hash[:], envelope.Hash) {
		return nil, RiverError(Err_BAD_EVENT_HASH, "Bad hash provided",
			"computed", hash, "got", envelope.Hash).
			Func("ParseSnapshot")
	}

	signerPubKey, err := crypto.RecoverSignerPublicKey(hash[:], envelope.Signature)
	if err != nil {
		return nil, err
	}

	var sn Snapshot
	if err = proto.Unmarshal(envelope.Event, &sn); err != nil {
		return nil, AsRiverError(err, Err_INVALID_ARGUMENT).
			Message("Failed to decode snapshot from bytes").
			Func("ParseSnapshot")
	}

	if addr := crypto.PublicKeyToAddress(signerPubKey); addr.Cmp(signer) != 0 {
		return nil, RiverError(Err_BAD_EVENT_SIGNATURE, "Bad signature provided",
			"computedAddress", addr,
			"expectedAddress", signer).
			Func("ParseSnapshot")
	}

	return &sn, nil
}

func Make_GenesisSnapshot(events []*ParsedEvent) (*Snapshot, error) {
	if len(events) == 0 {
		return nil, RiverError(Err_INVALID_ARGUMENT, "no events to make snapshot from")
	}

	creatorAddress := events[0].Event.CreatorAddress

	inceptionPayload := events[0].Event.GetInceptionPayload()

	if inceptionPayload == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "inceptionEvent is not an inception event")
	}

	content, err := make_SnapshotContent(inceptionPayload)
	if err != nil {
		return nil, err
	}

	members, err := make_SnapshotMembers(inceptionPayload, creatorAddress)
	if err != nil {
		return nil, err
	}

	snapshot := &Snapshot{
		Content:         content,
		Members:         members,
		SnapshotVersion: migrations.CurrentSnapshotVersion(),
	}

	for i, event := range events[1:] {
		// start at index 1 to account for inception event
		err = Update_Snapshot(snapshot, event, 0, int64(1+i))
		if err != nil {
			return nil, err
		}
	}

	return snapshot, nil
}

func make_SnapshotContent(iInception IsInceptionPayload) (IsSnapshot_Content, error) {
	if iInception == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "inceptionEvent is not an inception event")
	}

	switch inception := iInception.(type) {
	case *SpacePayload_Inception:
		return &Snapshot_SpaceContent{
			SpaceContent: &SpacePayload_Snapshot{
				Inception: inception,
			},
		}, nil
	case *ChannelPayload_Inception:
		return &Snapshot_ChannelContent{
			ChannelContent: &ChannelPayload_Snapshot{
				Inception: inception,
			},
		}, nil
	case *DmChannelPayload_Inception:
		return &Snapshot_DmChannelContent{
			DmChannelContent: &DmChannelPayload_Snapshot{
				Inception: inception,
			},
		}, nil
	case *GdmChannelPayload_Inception:
		return &Snapshot_GdmChannelContent{
			GdmChannelContent: &GdmChannelPayload_Snapshot{
				Inception: inception,
			},
		}, nil
	case *UserPayload_Inception:
		return &Snapshot_UserContent{
			UserContent: &UserPayload_Snapshot{
				Inception: inception,
			},
		}, nil
	case *UserSettingsPayload_Inception:
		return &Snapshot_UserSettingsContent{
			UserSettingsContent: &UserSettingsPayload_Snapshot{
				Inception: inception,
			},
		}, nil
	case *UserInboxPayload_Inception:
		return &Snapshot_UserInboxContent{
			UserInboxContent: &UserInboxPayload_Snapshot{
				Inception: inception,
			},
		}, nil
	case *UserMetadataPayload_Inception:
		return &Snapshot_UserMetadataContent{
			UserMetadataContent: &UserMetadataPayload_Snapshot{
				Inception: inception,
			},
		}, nil
	case *MediaPayload_Inception:
		return &Snapshot_MediaContent{
			MediaContent: &MediaPayload_Snapshot{
				Inception: inception,
			},
		}, nil
	case *MetadataPayload_Inception:
		return &Snapshot_MetadataContent{
			MetadataContent: &MetadataPayload_Snapshot{
				Inception: inception,
			},
		}, nil
	default:
		return nil, RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown inception type %T", iInception))
	}
}

func make_SnapshotMembers(iInception IsInceptionPayload, creatorAddress []byte) (*MemberPayload_Snapshot, error) {
	if iInception == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "inceptionEvent is not an inception event")
	}

	// initialize the snapshot with an empty maps
	snapshot := &MemberPayload_Snapshot{}

	switch inception := iInception.(type) {
	case *UserPayload_Inception, *UserSettingsPayload_Inception, *UserInboxPayload_Inception, *UserMetadataPayload_Inception:
		// All user inception types implement GetAppAddress
		type hasAppAddress interface {
			GetAppAddress() []byte
		}
		userInception := iInception.(hasAppAddress)

		// for all user streams, get the address from the stream id
		userAddress, err := shared.GetUserAddressFromStreamIdBytes(iInception.GetStreamId())
		if err != nil {
			return nil, err
		}
		snapshot.Joined = insertMember(nil, &MemberPayload_Snapshot_Member{
			UserAddress: userAddress.Bytes(),
			AppAddress:  userInception.GetAppAddress(),
		})
		return snapshot, nil
	case *DmChannelPayload_Inception:
		// for dm channels, add both parties are members
		snapshot.Joined = insertMember(nil, &MemberPayload_Snapshot_Member{
			UserAddress: inception.FirstPartyAddress,
			AppAddress:  inception.FirstPartyAppAddress,
		}, &MemberPayload_Snapshot_Member{
			UserAddress: inception.SecondPartyAddress,
			AppAddress:  inception.SecondPartyAppAddress,
		})
		return snapshot, nil
	case *MediaPayload_Inception:
		// for media payloads, add the creator as a member
		snapshot.Joined = insertMember(nil, &MemberPayload_Snapshot_Member{
			UserAddress: creatorAddress,
		})
		return snapshot, nil
	default:
		// for all other payloads, leave them memberless by default
		return snapshot, nil
	}
}

// mutate snapshot with content of event if applicable
func Update_Snapshot(iSnapshot *Snapshot, event *ParsedEvent, miniblockNum int64, eventNum int64) error {
	migrations.MigrateSnapshot(iSnapshot)
	switch payload := event.Event.Payload.(type) {
	case *StreamEvent_SpacePayload:
		return update_Snapshot_Space(iSnapshot, payload.SpacePayload, event.Event.CreatorAddress, eventNum, event.Hash.Bytes())
	case *StreamEvent_ChannelPayload:
		return update_Snapshot_Channel(iSnapshot, payload.ChannelPayload)
	case *StreamEvent_DmChannelPayload:
		return update_Snapshot_DmChannel(iSnapshot, payload.DmChannelPayload)
	case *StreamEvent_GdmChannelPayload:
		return update_Snapshot_GdmChannel(iSnapshot, payload.GdmChannelPayload, miniblockNum, event.Hash.Bytes())
	case *StreamEvent_UserPayload:
		return update_Snapshot_User(iSnapshot, payload.UserPayload)
	case *StreamEvent_UserSettingsPayload:
		return update_Snapshot_UserSettings(iSnapshot, payload.UserSettingsPayload)
	case *StreamEvent_UserMetadataPayload:
		return update_Snapshot_UserMetadata(iSnapshot, payload.UserMetadataPayload, eventNum, event.Hash.Bytes())
	case *StreamEvent_UserInboxPayload:
		return update_Snapshot_UserInbox(iSnapshot, payload.UserInboxPayload, miniblockNum)
	case *StreamEvent_MemberPayload:
		return update_Snapshot_Member(iSnapshot, payload.MemberPayload, event.Event.CreatorAddress, miniblockNum, eventNum, event.Hash.Bytes())
	case *StreamEvent_MediaPayload:
		return RiverError(Err_BAD_PAYLOAD, "Media payload snapshots are not supported")
	case *StreamEvent_MetadataPayload:
		return update_Snapshot_Metadata(iSnapshot, payload.MetadataPayload)
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown payload type", "payloadType", fmt.Sprintf("%T", event.Event.Payload))
	}
}

func update_Snapshot_Space(
	iSnapshot *Snapshot,
	spacePayload *SpacePayload,
	creatorAddress []byte,
	eventNum int64,
	eventHash []byte,
) error {
	snapshot := iSnapshot.Content.(*Snapshot_SpaceContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a space snapshot").
			Func("update_Snapshot_Space").
			Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
			Tag("eventHash", eventHash).Tag("eventNum", eventNum)
	}

	switch content := spacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event").
			Func("update_Snapshot_Space").
			Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
			Tag("eventHash", eventHash).Tag("eventNum", eventNum)
	case *SpacePayload_Channel:
		channel := &SpacePayload_ChannelMetadata{
			ChannelId:         content.Channel.ChannelId,
			Op:                content.Channel.Op,
			OriginEvent:       content.Channel.OriginEvent,
			UpdatedAtEventNum: eventNum,
			Settings:          content.Channel.Settings,
		}
		if channel.Settings == nil {
			if channel.Op == ChannelOp_CO_CREATED {
				// Apply default channel settings for new channels when settings are not provided.
				// Invariant: channel.Settings is defined for all channels in the snapshot.
				channelId, err := shared.StreamIdFromBytes(content.Channel.ChannelId)
				if err != nil {
					return err
				}
				channel.Settings = &SpacePayload_ChannelSettings{
					Autojoin: shared.IsDefaultChannelId(channelId),
				}
			} else if channel.Op == ChannelOp_CO_UPDATED {
				// Find the existing channel and copy over the settings if new ones are not provided.
				existingChannel, err := findChannel(snapshot.SpaceContent.Channels, content.Channel.ChannelId)
				if err != nil {
					return AsRiverError(err, Err_INTERNAL).Message("Could not update channel settings").
						Func("update_Snapshot_Space").
						Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
						Tag("eventHash", eventHash).Tag("eventNum", eventNum).
						Tag("channelId", content.Channel.ChannelId)
				}
				channel.Settings = existingChannel.Settings
			}
		}
		snapshot.SpaceContent.Channels = insertChannel(snapshot.SpaceContent.Channels, channel)
		return nil
	case *SpacePayload_UpdateChannelAutojoin_:
		channel, err := findChannel(snapshot.SpaceContent.Channels, content.UpdateChannelAutojoin.ChannelId)
		if err != nil {
			return AsRiverError(err, Err_INTERNAL).Message("Could not update channel autojoin").
				Func("update_Snapshot_Space").
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("eventHash", eventHash).Tag("eventNum", eventNum).
				Tag("channelId", content.UpdateChannelAutojoin.ChannelId)
		}
		channel.Settings.Autojoin = content.UpdateChannelAutojoin.Autojoin
		return nil
	case *SpacePayload_UpdateChannelHideUserJoinLeaveEvents_:
		channel, err := findChannel(snapshot.SpaceContent.Channels, content.UpdateChannelHideUserJoinLeaveEvents.ChannelId)
		if err != nil {
			return AsRiverError(err, Err_INTERNAL).Message("Could not update channel HideUserJoinLeaveEvents").
				Func("update_Snapshot_Space").
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("eventHash", eventHash).Tag("eventNum", eventNum).
				Tag("channelId", content.UpdateChannelHideUserJoinLeaveEvents.ChannelId)
		}
		channel.Settings.HideUserJoinLeaveEvents = content.UpdateChannelHideUserJoinLeaveEvents.HideUserJoinLeaveEvents
		return nil
	case *SpacePayload_SpaceImage:
		snapshot.SpaceContent.SpaceImage = &SpacePayload_SnappedSpaceImage{
			Data:           content.SpaceImage,
			CreatorAddress: creatorAddress,
			EventNum:       eventNum,
			EventHash:      eventHash,
		}
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown space payload type %T", spacePayload.Content))
	}
}

func update_Snapshot_Channel(iSnapshot *Snapshot, channelPayload *ChannelPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_ChannelContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a channel snapshot")
	}

	switch content := channelPayload.Content.(type) {
	case *ChannelPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
	case *ChannelPayload_Message:
		return nil
	case *ChannelPayload_Redaction_:
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown channel payload type %T", content))
	}
}

func update_Snapshot_DmChannel(
	iSnapshot *Snapshot,
	dmChannelPayload *DmChannelPayload,
) error {
	snapshot := iSnapshot.Content.(*Snapshot_DmChannelContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a dm channel snapshot")
	}
	switch content := dmChannelPayload.Content.(type) {
	case *DmChannelPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
	case *DmChannelPayload_Message:
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown dm channel payload type %T", content))
	}
}

func update_Snapshot_GdmChannel(
	iSnapshot *Snapshot,
	channelPayload *GdmChannelPayload,
	eventNum int64,
	eventHash []byte,
) error {
	snapshot := iSnapshot.Content.(*Snapshot_GdmChannelContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a channel snapshot")
	}

	switch content := channelPayload.Content.(type) {
	case *GdmChannelPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
	case *GdmChannelPayload_ChannelProperties:
		snapshot.GdmChannelContent.ChannelProperties = &WrappedEncryptedData{Data: content.ChannelProperties, EventNum: eventNum, EventHash: eventHash}
		return nil
	case *GdmChannelPayload_Message:
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown channel payload type %T", channelPayload.Content))
	}
}

func update_Snapshot_User(iSnapshot *Snapshot, userPayload *UserPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_UserContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a user snapshot")
	}
	switch content := userPayload.Content.(type) {
	case *UserPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
	case *UserPayload_UserMembership_:
		snapshot.UserContent.Memberships = insertUserMembership(snapshot.UserContent.Memberships, content.UserMembership)
		return nil
	case *UserPayload_UserMembershipAction_:
		return nil
	case *UserPayload_BlockchainTransaction:
		// for sent transactions, sum up things like tips sent
		switch transactionContent := content.BlockchainTransaction.Content.(type) {
		case nil:
			return nil
		case *BlockchainTransaction_Tip_:
			if snapshot.UserContent.TipsSent == nil {
				snapshot.UserContent.TipsSent = make(map[string]uint64)
			}
			if snapshot.UserContent.TipsSentCount == nil {
				snapshot.UserContent.TipsSentCount = make(map[string]uint64)
			}
			currencyAddress := common.BytesToAddress(transactionContent.Tip.GetEvent().GetCurrency())
			currency := currencyAddress.Hex()
			if _, ok := snapshot.UserContent.TipsSent[currency]; !ok {
				snapshot.UserContent.TipsSent[currency] = 0
			}
			snapshot.UserContent.TipsSent[currency] += transactionContent.Tip.GetEvent().GetAmount()
			if _, ok := snapshot.UserContent.TipsSentCount[currency]; !ok {
				snapshot.UserContent.TipsSentCount[currency] = 0
			}
			snapshot.UserContent.TipsSentCount[currency]++
			return nil
		case *BlockchainTransaction_TokenTransfer_:
			return nil
		case *BlockchainTransaction_SpaceReview_:
			return nil
		default:
			return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown blockchain transaction type %T", transactionContent))
		}
	case *UserPayload_ReceivedBlockchainTransaction_:
		// for received transactions, sum up things like tips received
		switch transactionContent := content.ReceivedBlockchainTransaction.Transaction.Content.(type) {
		case nil:
			return nil
		case *BlockchainTransaction_Tip_:
			if snapshot.UserContent.TipsReceived == nil {
				snapshot.UserContent.TipsReceived = make(map[string]uint64)
			}
			if snapshot.UserContent.TipsReceivedCount == nil {
				snapshot.UserContent.TipsReceivedCount = make(map[string]uint64)
			}
			currencyAddress := common.BytesToAddress(transactionContent.Tip.GetEvent().GetCurrency())
			currency := currencyAddress.Hex()
			if _, ok := snapshot.UserContent.TipsReceived[currency]; !ok {
				snapshot.UserContent.TipsReceived[currency] = 0
			}
			snapshot.UserContent.TipsReceived[currency] += transactionContent.Tip.GetEvent().GetAmount()
			if _, ok := snapshot.UserContent.TipsReceivedCount[currency]; !ok {
				snapshot.UserContent.TipsReceivedCount[currency] = 0
			}
			snapshot.UserContent.TipsReceivedCount[currency]++
			return nil
		case *BlockchainTransaction_TokenTransfer_:
			return nil
		case *BlockchainTransaction_SpaceReview_:
			return nil // doesn't ever happen
		default:
			return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown received blockchain transaction type %T", transactionContent))
		}
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown user payload type %T", userPayload.Content))
	}
}

func update_Snapshot_UserSettings(iSnapshot *Snapshot, userSettingsPayload *UserSettingsPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_UserSettingsContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a user settings snapshot")
	}
	switch content := userSettingsPayload.Content.(type) {
	case *UserSettingsPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
	case *UserSettingsPayload_FullyReadMarkers_:
		snapshot.UserSettingsContent.FullyReadMarkers = insertFullyReadMarker(snapshot.UserSettingsContent.FullyReadMarkers, content.FullyReadMarkers)
		return nil
	case *UserSettingsPayload_UserBlock_:
		snapshot.UserSettingsContent.UserBlocksList = insertUserBlock(snapshot.UserSettingsContent.UserBlocksList, content.UserBlock)
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown user settings payload type %T", userSettingsPayload.Content))
	}
}

func update_Snapshot_UserMetadata(
	iSnapshot *Snapshot,
	userMetadataPayload *UserMetadataPayload,
	eventNum int64,
	eventHash []byte,
) error {
	snapshot := iSnapshot.Content.(*Snapshot_UserMetadataContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a user metadata snapshot")
	}
	switch content := userMetadataPayload.Content.(type) {
	case *UserMetadataPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
	case *UserMetadataPayload_EncryptionDevice_:
		if snapshot.UserMetadataContent.EncryptionDevices == nil {
			snapshot.UserMetadataContent.EncryptionDevices = make([]*UserMetadataPayload_EncryptionDevice, 0)
		}
		// filter out the key if it already exists
		i := 0
		for _, key := range snapshot.UserMetadataContent.EncryptionDevices {
			if key.DeviceKey != content.EncryptionDevice.DeviceKey {
				snapshot.UserMetadataContent.EncryptionDevices[i] = key
				i++
			}
		}
		if i == len(snapshot.UserMetadataContent.EncryptionDevices)-1 {
			// just an inplace sort operation
			snapshot.UserMetadataContent.EncryptionDevices[i] = content.EncryptionDevice
		} else {
			// truncate and stick the new key on the end
			MAX_DEVICES := 10
			startIndex := max(0, i-MAX_DEVICES)
			snapshot.UserMetadataContent.EncryptionDevices = append(snapshot.UserMetadataContent.EncryptionDevices[startIndex:i], content.EncryptionDevice)
		}
		return nil
	case *UserMetadataPayload_ProfileImage:
		snapshot.UserMetadataContent.ProfileImage = &WrappedEncryptedData{Data: content.ProfileImage, EventNum: eventNum, EventHash: eventHash}
		return nil
	case *UserMetadataPayload_Bio:
		snapshot.UserMetadataContent.Bio = &WrappedEncryptedData{Data: content.Bio, EventNum: eventNum, EventHash: eventHash}
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown user metadata payload type %T", userMetadataPayload.Content))
	}
}

func update_Snapshot_UserInbox(
	iSnapshot *Snapshot,
	userInboxPayload *UserInboxPayload,
	miniblockNum int64,
) error {
	snapshot := iSnapshot.Content.(*Snapshot_UserInboxContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a user to device snapshot")
	}
	switch content := userInboxPayload.Content.(type) {
	case *UserInboxPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
	case *UserInboxPayload_GroupEncryptionSessions_:
		if snapshot.UserInboxContent.DeviceSummary == nil {
			snapshot.UserInboxContent.DeviceSummary = make(map[string]*UserInboxPayload_Snapshot_DeviceSummary)
		}
		// loop over keys in the ciphertext map
		for deviceKey := range content.GroupEncryptionSessions.Ciphertexts {
			if summary, ok := snapshot.UserInboxContent.DeviceSummary[deviceKey]; ok {
				summary.UpperBound = miniblockNum
			} else {
				snapshot.UserInboxContent.DeviceSummary[deviceKey] = &UserInboxPayload_Snapshot_DeviceSummary{
					LowerBound: miniblockNum,
					UpperBound: miniblockNum,
				}
			}
		}
		// cleanup devices
		cleanup_Snapshot_UserInbox(snapshot, miniblockNum)

		return nil
	case *UserInboxPayload_Ack_:
		if snapshot.UserInboxContent.DeviceSummary == nil {
			return nil
		}
		deviceKey := content.Ack.DeviceKey
		if summary, ok := snapshot.UserInboxContent.DeviceSummary[deviceKey]; ok {
			if summary.UpperBound <= content.Ack.MiniblockNum {
				delete(snapshot.UserInboxContent.DeviceSummary, deviceKey)
			} else {
				summary.LowerBound = content.Ack.MiniblockNum + 1
			}
		}
		cleanup_Snapshot_UserInbox(snapshot, miniblockNum)
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown user to device payload type %T", userInboxPayload.Content))
	}
}

func cleanup_Snapshot_UserInbox(snapshot *Snapshot_UserInboxContent, currentMiniblockNum int64) {
	maxGenerations := int64(
		3600,
	) // blocks are made every 2 seconds if events exist. 3600 would be 5 days of blocks 24 hours a day
	if snapshot.UserInboxContent.DeviceSummary != nil {
		for deviceKey, deviceSummary := range snapshot.UserInboxContent.DeviceSummary {
			isOlderThanMaxGenerations := (currentMiniblockNum - deviceSummary.LowerBound) > maxGenerations
			if isOlderThanMaxGenerations {
				delete(snapshot.UserInboxContent.DeviceSummary, deviceKey)
			}
		}
	}
}

func update_Snapshot_Member(
	iSnapshot *Snapshot,
	memberPayload *MemberPayload,
	creatorAddress []byte,
	miniblockNum int64,
	eventNum int64,
	eventHash []byte,
) error {
	snapshot := iSnapshot.Members
	if snapshot == nil {
		return RiverError(
			Err_INVALID_ARGUMENT,
			"blockheader snapshot is not a membership snapshot",
		).Func("update_Snapshot_Member").
			Tag("eventHash", hex.EncodeToString(eventHash)).
			Tag("eventNum", eventNum).
			Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
			Tag("miniblockNum", miniblockNum)
	}
	switch content := memberPayload.Content.(type) {
	case *MemberPayload_Membership_:
		switch content.Membership.Op {
		case MembershipOp_SO_JOIN:
			member := &MemberPayload_Snapshot_Member{
				UserAddress:       content.Membership.UserAddress,
				MiniblockNum:      miniblockNum,
				EventNum:          eventNum,
				AppAddress:        content.Membership.AppAddress,
				AppSponsorAddress: content.Membership.AppSponsorAddress,
			}
			snapshot.Joined = insertMember(snapshot.Joined, member)
			return nil
		case MembershipOp_SO_LEAVE:
			snapshot.Joined = removeMember(snapshot.Joined, content.Membership.UserAddress)
			return nil
		case MembershipOp_SO_INVITE:
			// not tracking invites currently
			return nil
		case MembershipOp_SO_UNSPECIFIED:
			return RiverError(Err_INVALID_ARGUMENT, "membership op is unspecified").
				Func("update_Snapshot_Member").
				Tag("eventHash", hex.EncodeToString(eventHash)).
				Tag("eventNum", eventNum).
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("miniblockNum", miniblockNum)
		default:
			return RiverError(Err_INVALID_ARGUMENT, "unknown membership op %v", content.Membership.Op).
				Func("update_Snapshot_Member").
				Tag("eventHash", hex.EncodeToString(eventHash)).
				Tag("eventNum", eventNum).
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("miniblockNum", miniblockNum)
		}
	case *MemberPayload_KeySolicitation_:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return AsRiverError(err, Err_NOT_FOUND).Message("Could not find creator of KeySolicitation member payload in stream members").
				Func("update_Snapshot_Member").
				Tag("eventHash", hex.EncodeToString(eventHash)).
				Tag("eventNum", eventNum).
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("miniblockNum", miniblockNum)
		}
		applyKeySolicitation(member, content.KeySolicitation)
		return nil
	case *MemberPayload_KeyFulfillment_:
		member, err := findMember(snapshot.Joined, content.KeyFulfillment.UserAddress)
		if err != nil {
			return AsRiverError(err, Err_NOT_FOUND).Message("Could not find creator of KeyFulfillment member payload in stream members").
				Func("update_Snapshot_Member").
				Tag("contentType", "KeySolicitation").
				Tag("eventHash", hex.EncodeToString(eventHash)).
				Tag("eventNum", eventNum).
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("KeyFulfillment.UserAddress", hex.EncodeToString(content.KeyFulfillment.UserAddress)).
				Tag("miniblockNum", miniblockNum)
		}
		applyKeyFulfillment(member, content.KeyFulfillment)
		return nil
	case *MemberPayload_DisplayName:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return AsRiverError(err, Err_NOT_FOUND).Message("Could not find creator of DisplayName member payload in stream members").
				Func("update_Snapshot_Member").
				Tag("contentType", "DisplayName").
				Tag("eventHash", hex.EncodeToString(eventHash)).
				Tag("eventNum", eventNum).
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("miniblockNum", miniblockNum)
		}
		member.DisplayName = &WrappedEncryptedData{Data: content.DisplayName, EventNum: eventNum, EventHash: eventHash}
		return nil
	case *MemberPayload_Username:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return AsRiverError(err, Err_NOT_FOUND).Message("Could not find creator of UserName member payload in stream members").
				Tag("contentType", "Username").
				Func("update_Snapshot_Member").
				Tag("eventHash", hex.EncodeToString(eventHash)).
				Tag("eventNum", eventNum).
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("miniblockNum", miniblockNum)
		}
		member.Username = &WrappedEncryptedData{Data: content.Username, EventNum: eventNum, EventHash: eventHash}
		return nil
	case *MemberPayload_EnsAddress:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return AsRiverError(err, Err_NOT_FOUND).Message("Could not find creator of EnsAddress member payload in stream members").
				Func("update_Snapshot_Member").
				Tag("contentType", "EnsAddress").
				Tag("eventHash", hex.EncodeToString(eventHash)).
				Tag("eventNum", eventNum).
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("miniblockNum", miniblockNum)
		}
		member.EnsAddress = content.EnsAddress
		return nil
	case *MemberPayload_Nft_:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return AsRiverError(err, Err_NOT_FOUND).Message("Could not find creator of Nft member payload in stream members").
				Func("update_Snapshot_Member").
				Tag("contentType", "Nft").
				Tag("eventHash", hex.EncodeToString(eventHash)).
				Tag("eventNum", eventNum).
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("miniblockNum", miniblockNum)
		}
		member.Nft = content.Nft
		return nil
	case *MemberPayload_Pin_:
		snappedPin := &MemberPayload_SnappedPin{Pin: content.Pin, CreatorAddress: creatorAddress}
		snapshot.Pins = append(snapshot.Pins, snappedPin)
		return nil
	case *MemberPayload_Unpin_:
		snapPins := snapshot.Pins
		for i, snappedPin := range snapPins {
			if bytes.Equal(snappedPin.Pin.EventId, content.Unpin.EventId) {
				snapPins = append(snapPins[:i], snapshot.Pins[i+1:]...)
				break
			}
		}
		snapshot.Pins = snapPins
		return nil
	case *MemberPayload_EncryptionAlgorithm_:
		if content.EncryptionAlgorithm == nil {
			return RiverError(Err_INVALID_ARGUMENT, "member payload encryption algorithm not set")
		}
		snapshot.EncryptionAlgorithm = content.EncryptionAlgorithm
		return nil
	case *MemberPayload_MemberBlockchainTransaction_:
		switch transactionContent := content.MemberBlockchainTransaction.Transaction.Content.(type) {
		case nil:
			return nil
		case *BlockchainTransaction_Tip_:
			if snapshot.Tips == nil {
				snapshot.Tips = make(map[string]uint64)
			}
			if snapshot.TipsCount == nil {
				snapshot.TipsCount = make(map[string]uint64)
			}
			currencyAddress := common.BytesToAddress(transactionContent.Tip.GetEvent().GetCurrency())
			currency := currencyAddress.Hex()
			if _, ok := snapshot.Tips[currency]; !ok {
				snapshot.Tips[currency] = 0
			}
			if _, ok := snapshot.TipsCount[currency]; !ok {
				snapshot.TipsCount[currency] = 0
			}
			ammount := transactionContent.Tip.GetEvent().GetAmount()
			snapshot.Tips[currency] += ammount
			snapshot.TipsCount[currency]++

			sender, err := findMember(snapshot.Joined, content.MemberBlockchainTransaction.FromUserAddress)
			if err != nil {
				return AsRiverError(err, Err_NOT_FOUND).Message("Could not find FromUserAddress of member blockchain transaction payload in stream members").
					Func("update_Snapshot_Member").
					Tag("party", "sender").
					Tag("contentType", "MemberBlockchainTransaction").
					Tag("eventHash", hex.EncodeToString(eventHash)).
					Tag("eventNum", eventNum).
					Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
					Tag("miniblockNum", miniblockNum).
					Tag("FromUserAddress", hex.EncodeToString(content.MemberBlockchainTransaction.FromUserAddress))
			}
			if sender.TipsSent == nil {
				sender.TipsSent = make(map[string]uint64)
			}
			if sender.TipsSentCount == nil {
				sender.TipsSentCount = make(map[string]uint64)
			}
			if _, ok := sender.TipsSent[currency]; !ok {
				sender.TipsSent[currency] = 0
			}
			if _, ok := sender.TipsSentCount[currency]; !ok {
				sender.TipsSentCount[currency] = 0
			}
			sender.TipsSent[currency] += ammount
			sender.TipsSentCount[currency]++

			receiver, err := findMember(snapshot.Joined, transactionContent.Tip.ToUserAddress)
			if err != nil {
				return AsRiverError(err, Err_NOT_FOUND).Message("Could not find ToUserAddress of member Tip transaction payload in stream members").
					Func("update_Snapshot_Member").
					Tag("party", "receiver").
					Tag("contentType", "MemberBlockchainTransaction").
					Tag("eventHash", hex.EncodeToString(eventHash)).
					Tag("eventNum", eventNum).
					Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
					Tag("miniblockNum", miniblockNum).
					Tag("ToUserAddress", hex.EncodeToString(transactionContent.Tip.ToUserAddress))
			}
			if receiver.TipsReceived == nil {
				receiver.TipsReceived = make(map[string]uint64)
			}
			if receiver.TipsReceivedCount == nil {
				receiver.TipsReceivedCount = make(map[string]uint64)
			}
			if _, ok := receiver.TipsReceived[currency]; !ok {
				receiver.TipsReceived[currency] = 0
			}
			if _, ok := receiver.TipsReceivedCount[currency]; !ok {
				receiver.TipsReceivedCount[currency] = 0
			}
			receiver.TipsReceived[currency] += ammount
			receiver.TipsReceivedCount[currency]++

			return nil
		case *BlockchainTransaction_TokenTransfer_:
			return nil
		case *BlockchainTransaction_SpaceReview_:
			return nil
		default:
			return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown member blockchain transaction type %T", transactionContent)).
				Func("update_Snapshot_Member").
				Tag("eventHash", hex.EncodeToString(eventHash)).
				Tag("eventNum", eventNum).
				Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
				Tag("miniblockNum", miniblockNum)

		}
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown membership payload type %T", memberPayload.Content)).
			Func("update_Snapshot_Member").
			Tag("eventHash", hex.EncodeToString(eventHash)).
			Tag("eventNum", eventNum).
			Tag("creatorAddress", hex.EncodeToString(creatorAddress)).
			Tag("miniblockNum", miniblockNum)
	}
}

func removeCommon(x, y []string) []string {
	result := make([]string, 0, len(x))
	i, j := 0, 0

	for i < len(x) && j < len(y) {
		if x[i] < y[j] {
			result = append(result, x[i])
			i++
		} else if x[i] > y[j] {
			j++
		} else {
			i++
			j++
		}
	}

	// Append remaining elements from x
	if i < len(x) {
		result = append(result, x[i:]...)
	}

	return result
}

type SnapshotElement interface{}

func findSorted[T any, K any](elements []*T, key K, cmp func(K, K) int, keyFn func(*T) K) (*T, error) {
	index, found := slices.BinarySearchFunc(elements, key, func(a *T, b K) int {
		return cmp(keyFn(a), b)
	})
	if found {
		return elements[index], nil
	}
	return nil, RiverError(Err_INVALID_ARGUMENT, "element not found")
}

func insertSorted[T any, K any](elements []*T, element *T, cmp func(K, K) int, keyFn func(*T) K) []*T {
	index, found := slices.BinarySearchFunc(elements, keyFn(element), func(a *T, b K) int {
		return cmp(keyFn(a), b)
	})
	if found {
		elements[index] = element
		return elements
	}
	elements = append(elements, nil)
	copy(elements[index+1:], elements[index:])
	elements[index] = element
	return elements
}

func removeSorted[T any, K any](elements []*T, key K, cmp func(K, K) int, keyFn func(*T) K) []*T {
	index, found := slices.BinarySearchFunc(elements, key, func(a *T, b K) int {
		return cmp(keyFn(a), b)
	})
	if found {
		return append(elements[:index], elements[index+1:]...)
	}
	return elements
}

func findChannel(channels []*SpacePayload_ChannelMetadata, channelId []byte) (*SpacePayload_ChannelMetadata, error) {
	metadata, err := findSorted(
		channels,
		channelId,
		bytes.Compare,
		func(channel *SpacePayload_ChannelMetadata) []byte {
			return channel.ChannelId
		},
	)
	if err != nil {
		return nil, AsRiverError(err).Func("findChannel").Tag("channelId", hex.EncodeToString(channelId))
	}
	return metadata, nil
}

func insertChannel(
	channels []*SpacePayload_ChannelMetadata,
	newChannels ...*SpacePayload_ChannelMetadata,
) []*SpacePayload_ChannelMetadata {
	for _, channel := range newChannels {
		channels = insertSorted(
			channels,
			channel,
			bytes.Compare,
			func(channel *SpacePayload_ChannelMetadata) []byte {
				return channel.ChannelId
			},
		)
	}
	return channels
}

func findMember(
	members []*MemberPayload_Snapshot_Member,
	memberAddress []byte,
) (*MemberPayload_Snapshot_Member, error) {
	payload, err := findSorted(
		members,
		memberAddress,
		bytes.Compare,
		func(member *MemberPayload_Snapshot_Member) []byte {
			return member.UserAddress
		},
	)
	if err != nil {
		return nil, AsRiverError(err).Func("findMember").
			Tag("memberAddress", hex.EncodeToString(memberAddress))
	}
	return payload, nil
}

func removeMember(members []*MemberPayload_Snapshot_Member, memberAddress []byte) []*MemberPayload_Snapshot_Member {
	return removeSorted(
		members,
		memberAddress,
		bytes.Compare,
		func(member *MemberPayload_Snapshot_Member) []byte {
			return member.UserAddress
		},
	)
}

func insertMember(
	members []*MemberPayload_Snapshot_Member,
	newMembers ...*MemberPayload_Snapshot_Member,
) []*MemberPayload_Snapshot_Member {
	for _, member := range newMembers {
		members = insertSorted(
			members,
			member,
			bytes.Compare,
			func(member *MemberPayload_Snapshot_Member) []byte {
				return member.UserAddress
			},
		)
	}
	return members
}

func findUserMembership(
	memberships []*UserPayload_UserMembership,
	streamId []byte,
) (*UserPayload_UserMembership, error) {
	payload, err := findSorted(
		memberships,
		streamId,
		bytes.Compare,
		func(membership *UserPayload_UserMembership) []byte {
			return membership.StreamId
		},
	)
	if err != nil {
		return nil, AsRiverError(err).Func("findUserMembership").
			Tag("streamId", hex.EncodeToString(streamId))
	}
	return payload, nil
}

func insertUserMembership(
	memberships []*UserPayload_UserMembership,
	newMemberships ...*UserPayload_UserMembership,
) []*UserPayload_UserMembership {
	for _, membership := range newMemberships {
		memberships = insertSorted(
			memberships,
			membership,
			bytes.Compare,
			func(membership *UserPayload_UserMembership) []byte {
				return membership.StreamId
			},
		)
	}
	return memberships
}

func insertFullyReadMarker(
	markers []*UserSettingsPayload_FullyReadMarkers,
	newMarker *UserSettingsPayload_FullyReadMarkers,
) []*UserSettingsPayload_FullyReadMarkers {
	return insertSorted(
		markers,
		newMarker,
		bytes.Compare,
		func(marker *UserSettingsPayload_FullyReadMarkers) []byte {
			return marker.StreamId
		},
	)
}

func insertUserBlock(
	userBlocksArr []*UserSettingsPayload_Snapshot_UserBlocks,
	newUserBlock *UserSettingsPayload_UserBlock,
) []*UserSettingsPayload_Snapshot_UserBlocks {
	userIdBytes := newUserBlock.UserId

	newBlock := &UserSettingsPayload_Snapshot_UserBlocks_Block{
		IsBlocked: newUserBlock.IsBlocked,
		EventNum:  newUserBlock.EventNum,
	}

	existingUserBlocks, err := findSorted(
		userBlocksArr,
		userIdBytes,
		bytes.Compare,
		func(userBlocks *UserSettingsPayload_Snapshot_UserBlocks) []byte {
			return userBlocks.UserId
		},
	)
	if err != nil {
		// not found, create a new user block
		existingUserBlocks = &UserSettingsPayload_Snapshot_UserBlocks{
			UserId: userIdBytes,
			Blocks: nil,
		}
	}

	existingUserBlocks.Blocks = append(existingUserBlocks.Blocks, newBlock)

	return insertSorted(
		userBlocksArr,
		existingUserBlocks,
		bytes.Compare,
		func(userBlocks *UserSettingsPayload_Snapshot_UserBlocks) []byte {
			return userBlocks.UserId
		},
	)
}

func applyKeySolicitation(member *MemberPayload_Snapshot_Member, keySolicitation *MemberPayload_KeySolicitation) {
	if member != nil {
		// if solicitation exists for this device key, remove it by shifting the slice
		i := 0
		for _, event := range member.Solicitations {
			if event.DeviceKey != keySolicitation.DeviceKey {
				member.Solicitations[i] = event
				i++
			}
		}
		// clone to avoid data race
		event := proto.Clone(keySolicitation).(*MemberPayload_KeySolicitation)

		// append it
		MAX_DEVICES := 10
		startIndex := max(0, i-MAX_DEVICES)
		member.Solicitations = append(member.Solicitations[startIndex:i], event)
	}
}

func applyKeyFulfillment(member *MemberPayload_Snapshot_Member, keyFulfillment *MemberPayload_KeyFulfillment) {
	if member != nil {
		// clear out any fulfilled session ids for the device key
		for i := 0; i < len(member.Solicitations); {
			event := member.Solicitations[i]
			if event.DeviceKey == keyFulfillment.DeviceKey {
				event.SessionIds = removeCommon(event.SessionIds, keyFulfillment.SessionIds)
				event.IsNewDevice = false
				if len(event.SessionIds) == 0 {
					// Remove the solicitation if SessionIds is empty
					member.Solicitations = append(member.Solicitations[:i], member.Solicitations[i+1:]...)
				}
				break
			}
			i++
		}
	}
}

func update_Snapshot_Metadata(iSnapshot *Snapshot, metadataPayload *MetadataPayload) error {
	snapshot, ok := iSnapshot.Content.(*Snapshot_MetadataContent)
	if !ok {
		return RiverError(Err_INVALID_ARGUMENT, "snapshot is not a metadata snapshot").
			Func("update_Snapshot_Metadata")
	}

	switch content := metadataPayload.GetContent().(type) {
	case *MetadataPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update snapshot with inception event").
			Func("update_Snapshot_Metadata")
	case *MetadataPayload_NewStream_:
		streamRecord := &StreamRecord{
			StreamId:          content.NewStream.GetStreamId(),
			LastMiniblockHash: content.NewStream.GetGenesisMiniblockHash(),
			LastMiniblockNum:  0, // Genesis miniblock is always 0
			Nodes:             content.NewStream.GetNodes(),
			ReplicationFactor: content.NewStream.GetReplicationFactor(),
		}
		snapshot.MetadataContent.Streams = insertStreamRecord(snapshot.MetadataContent.Streams, streamRecord)
		return nil
	case *MetadataPayload_LastMiniblockUpdate_:
		streamRecord, err := findStreamRecord(snapshot.MetadataContent.Streams, content.LastMiniblockUpdate.GetStreamId())
		if err != nil {
			return AsRiverError(err, Err_NOT_FOUND).Message("Could not find stream record for LastMiniblockUpdate").
				Func("update_Snapshot_Metadata").
				Tag("streamId", hex.EncodeToString(content.LastMiniblockUpdate.GetStreamId()))
		}
		streamRecord.LastMiniblockHash = content.LastMiniblockUpdate.GetLastMiniblockHash()
		streamRecord.LastMiniblockNum = content.LastMiniblockUpdate.GetLastMiniblockNum()
		return nil
	case *MetadataPayload_PlacementUpdate_:
		streamRecord, err := findStreamRecord(snapshot.MetadataContent.Streams, content.PlacementUpdate.GetStreamId())
		if err != nil {
			return AsRiverError(err, Err_NOT_FOUND).Message("Could not find stream record for PlacementUpdate").
				Func("update_Snapshot_Metadata").
				Tag("streamId", hex.EncodeToString(content.PlacementUpdate.GetStreamId()))
		}
		streamRecord.Nodes = content.PlacementUpdate.GetNodes()
		streamRecord.ReplicationFactor = content.PlacementUpdate.GetReplicationFactor()
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown metadata payload type", "type", fmt.Sprintf("%T", content)).
			Func("update_Snapshot_Metadata")
	}
}

func findStreamRecord(
	streams []*StreamRecord,
	streamId []byte,
) (*StreamRecord, error) {
	streamRecord, err := findSorted(
		streams,
		streamId,
		bytes.Compare,
		func(stream *StreamRecord) []byte {
			return stream.StreamId
		},
	)
	if err != nil {
		return nil, AsRiverError(err).Func("findStreamRecord").
			Tag("streamId", hex.EncodeToString(streamId))
	}
	return streamRecord, nil
}

func insertStreamRecord(
	streams []*StreamRecord,
	newStreams ...*StreamRecord,
) []*StreamRecord {
	for _, stream := range newStreams {
		streams = insertSorted(
			streams,
			stream,
			bytes.Compare,
			func(stream *StreamRecord) []byte {
				return stream.StreamId
			},
		)
	}
	return streams
}
