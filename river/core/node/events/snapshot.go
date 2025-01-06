package events

import (
	"bytes"
	"fmt"
	"slices"

	"google.golang.org/protobuf/proto"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/events/migrations"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

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
	default:
		return nil, RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown inception type %T", iInception))
	}
}

func make_SnapshotMembers(iInception IsInceptionPayload, creatorAddress []byte) (*MemberPayload_Snapshot, error) {
	if iInception == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "inceptionEvent is not an inception event")
	}

	// initialize the snapshot with an empty maps
	snapshot := &MemberPayload_Snapshot{
		Mls: &MemberPayload_Snapshot_Mls{
			Members:      make(map[string]*MemberPayload_Snapshot_Mls_Member),
			EpochSecrets: make(map[uint64][]byte),
		},
	}

	switch inception := iInception.(type) {
	case *UserPayload_Inception, *UserSettingsPayload_Inception, *UserInboxPayload_Inception, *UserMetadataPayload_Inception:
		// for all user streams, get the address from the stream id
		userAddress, err := shared.GetUserAddressFromStreamIdBytes(iInception.GetStreamId())
		if err != nil {
			return nil, err
		}
		snapshot.Joined = insertMember(nil, &MemberPayload_Snapshot_Member{
			UserAddress: userAddress.Bytes(),
		})
		return snapshot, nil
	case *DmChannelPayload_Inception:
		// for dm channels, add both parties are members
		snapshot.Joined = insertMember(nil, &MemberPayload_Snapshot_Member{
			UserAddress: inception.FirstPartyAddress,
		}, &MemberPayload_Snapshot_Member{
			UserAddress: inception.SecondPartyAddress,
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
	iSnapshot = migrations.MigrateSnapshot(iSnapshot)
	switch payload := event.Event.Payload.(type) {
	case *StreamEvent_SpacePayload:
		return update_Snapshot_Space(iSnapshot, payload.SpacePayload, event.Event.CreatorAddress, eventNum)
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
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown payload type %T", event.Event.Payload))
	}
}

func update_Snapshot_Space(
	iSnapshot *Snapshot,
	spacePayload *SpacePayload,
	creatorAddress []byte,
	eventNum int64,
) error {
	snapshot := iSnapshot.Content.(*Snapshot_SpaceContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a space snapshot")
	}
	switch content := spacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
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
					return err
				}
				channel.Settings = existingChannel.Settings
			}
		}
		snapshot.SpaceContent.Channels = insertChannel(snapshot.SpaceContent.Channels, channel)
		return nil
	case *SpacePayload_UpdateChannelAutojoin_:
		channel, err := findChannel(snapshot.SpaceContent.Channels, content.UpdateChannelAutojoin.ChannelId)
		if err != nil {
			return err
		}
		channel.Settings.Autojoin = content.UpdateChannelAutojoin.Autojoin
		return nil
	case *SpacePayload_UpdateChannelHideUserJoinLeaveEvents_:
		channel, err := findChannel(snapshot.SpaceContent.Channels, content.UpdateChannelHideUserJoinLeaveEvents.ChannelId)
		if err != nil {
			return err
		}
		channel.Settings.HideUserJoinLeaveEvents = content.UpdateChannelHideUserJoinLeaveEvents.HideUserJoinLeaveEvents
		return nil
	case *SpacePayload_SpaceImage:
		snapshot.SpaceContent.SpaceImage = &SpacePayload_SnappedSpaceImage{
			Data:           content.SpaceImage,
			CreatorAddress: creatorAddress,
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
			currencyAddress := common.BytesToAddress(transactionContent.Tip.GetEvent().GetCurrency())
			currency := currencyAddress.Hex()
			if _, ok := snapshot.UserContent.TipsSent[currency]; !ok {
				snapshot.UserContent.TipsSent[currency] = 0
			}
			snapshot.UserContent.TipsSent[currency] += transactionContent.Tip.GetEvent().GetAmount()
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
			currencyAddress := common.BytesToAddress(transactionContent.Tip.GetEvent().GetCurrency())
			currency := currencyAddress.Hex()
			if _, ok := snapshot.UserContent.TipsReceived[currency]; !ok {
				snapshot.UserContent.TipsReceived[currency] = 0
			}
			snapshot.UserContent.TipsReceived[currency] += transactionContent.Tip.GetEvent().GetAmount()
			return nil
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
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a membership snapshot")
	}
	switch content := memberPayload.Content.(type) {
	case *MemberPayload_Membership_:
		switch content.Membership.Op {
		case MembershipOp_SO_JOIN:
			snapshot.Joined = insertMember(snapshot.Joined, &MemberPayload_Snapshot_Member{
				UserAddress:  content.Membership.UserAddress,
				MiniblockNum: miniblockNum,
				EventNum:     eventNum,
			})
			return nil
		case MembershipOp_SO_LEAVE:
			snapshot.Joined = removeMember(snapshot.Joined, content.Membership.UserAddress)
			return nil
		case MembershipOp_SO_INVITE:
			// not tracking invites currently
			return nil
		case MembershipOp_SO_UNSPECIFIED:
			return RiverError(Err_INVALID_ARGUMENT, "membership op is unspecified")
		default:
			return RiverError(Err_INVALID_ARGUMENT, "unknown membership op %v", content.Membership.Op)
		}
	case *MemberPayload_KeySolicitation_:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return err
		}
		applyKeySolicitation(member, content.KeySolicitation)
		return nil
	case *MemberPayload_KeyFulfillment_:
		member, err := findMember(snapshot.Joined, content.KeyFulfillment.UserAddress)
		if err != nil {
			return err
		}
		applyKeyFulfillment(member, content.KeyFulfillment)
		return nil
	case *MemberPayload_DisplayName:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return err
		}
		member.DisplayName = &WrappedEncryptedData{Data: content.DisplayName, EventNum: eventNum, EventHash: eventHash}
		return nil
	case *MemberPayload_Username:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return err
		}
		member.Username = &WrappedEncryptedData{Data: content.Username, EventNum: eventNum, EventHash: eventHash}
		return nil
	case *MemberPayload_EnsAddress:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return err
		}
		member.EnsAddress = content.EnsAddress
		return nil
	case *MemberPayload_Nft_:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return err
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
		snapshot.EncryptionAlgorithm.Algorithm = content.EncryptionAlgorithm.Algorithm
		return nil
	case *MemberPayload_MemberBlockchainTransaction_:
		switch transactionContent := content.MemberBlockchainTransaction.Transaction.Content.(type) {
		case nil:
			return nil
		case *BlockchainTransaction_Tip_:
			if snapshot.Tips == nil {
				snapshot.Tips = make(map[string]uint64)
			}
			currencyAddress := common.BytesToAddress(transactionContent.Tip.GetEvent().GetCurrency())
			currency := currencyAddress.Hex()
			if _, ok := snapshot.Tips[currency]; !ok {
				snapshot.Tips[currency] = 0
			}
			snapshot.Tips[currency] += transactionContent.Tip.GetEvent().GetAmount()
			return nil
		default:
			return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown member blockchain transaction type %T", transactionContent))
		}
	case *MemberPayload_Mls_:
		return update_Snapshot_Mls(iSnapshot, content.Mls, creatorAddress)
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown membership payload type %T", memberPayload.Content))
	}
}

func update_Snapshot_Mls(
	iSnapshot *Snapshot,
	mlsPayload *MemberPayload_Mls,
	creatorAddress []byte,
) error {
	if iSnapshot.Members.GetMls() == nil {
		iSnapshot.Members.Mls = &MemberPayload_Snapshot_Mls{
			Members:      make(map[string]*MemberPayload_Snapshot_Mls_Member),
			EpochSecrets: make(map[uint64][]byte),
		}
	}
	snapshot := iSnapshot.Members.Mls
	if snapshot.Members == nil {
		snapshot.Members = make(map[string]*MemberPayload_Snapshot_Mls_Member)
	}

	if snapshot.EpochSecrets == nil {
		snapshot.EpochSecrets = make(map[uint64][]byte)
	}

	switch content := mlsPayload.Content.(type) {
	case *MemberPayload_Mls_InitializeGroup_:
		if len(snapshot.ExternalGroupSnapshot) > 0 || len(snapshot.GroupInfoMessage) > 0 {
			return RiverError(Err_INVALID_ARGUMENT, "duplicate mls initialization")
		}
		memberAddress := common.BytesToAddress(creatorAddress).Hex()
		snapshot.ExternalGroupSnapshot = content.InitializeGroup.ExternalGroupSnapshot
		snapshot.GroupInfoMessage = content.InitializeGroup.GroupInfoMessage
		snapshot.Members[memberAddress] = &MemberPayload_Snapshot_Mls_Member{
			SignaturePublicKeys: [][]byte{content.InitializeGroup.SignaturePublicKey},
		}
		return nil
	case *MemberPayload_Mls_ExternalJoin_:
		memberAddress := common.BytesToAddress(creatorAddress).Hex()
		if _, ok := snapshot.Members[memberAddress]; !ok {
			snapshot.Members[memberAddress] = &MemberPayload_Snapshot_Mls_Member{
				SignaturePublicKeys: make([][]byte, 0),
			}
		}
		snapshot.Members[memberAddress].SignaturePublicKeys = append(snapshot.Members[memberAddress].SignaturePublicKeys, content.ExternalJoin.SignaturePublicKey)
		return nil
	case *MemberPayload_Mls_EpochSecrets_:
		for _, secret := range content.EpochSecrets.Secrets {
			if _, ok := snapshot.EpochSecrets[secret.Epoch]; !ok {
				snapshot.EpochSecrets[secret.Epoch] = secret.Secret
			}
		}
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("unknown MLS payload type %T", mlsPayload.Content))
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
	return findSorted(
		channels,
		channelId,
		bytes.Compare,
		func(channel *SpacePayload_ChannelMetadata) []byte {
			return channel.ChannelId
		},
	)
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
	return findSorted(
		members,
		memberAddress,
		bytes.Compare,
		func(member *MemberPayload_Snapshot_Member) []byte {
			return member.UserAddress
		},
	)
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
	return findSorted(
		memberships,
		streamId,
		bytes.Compare,
		func(membership *UserPayload_UserMembership) []byte {
			return membership.StreamId
		},
	)
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
		for _, event := range member.Solicitations {
			if event.DeviceKey == keyFulfillment.DeviceKey {
				event.SessionIds = removeCommon(event.SessionIds, keyFulfillment.SessionIds)
				event.IsNewDevice = false
				break
			}
		}
	}
}
