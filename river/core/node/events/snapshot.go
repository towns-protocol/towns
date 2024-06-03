package events

import (
	"bytes"
	"slices"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/events/migrations"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
	"google.golang.org/protobuf/proto"
)

func Make_GenisisSnapshot(events []*ParsedEvent) (*Snapshot, error) {
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
	case *UserDeviceKeyPayload_Inception:
		return &Snapshot_UserDeviceKeyContent{
			UserDeviceKeyContent: &UserDeviceKeyPayload_Snapshot{
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
		return nil, RiverError(Err_INVALID_ARGUMENT, "unknown inception type %T", iInception)
	}
}

func make_SnapshotMembers(iInception IsInceptionPayload, creatorAddress []byte) (*MemberPayload_Snapshot, error) {
	if iInception == nil {
		return nil, RiverError(Err_INVALID_ARGUMENT, "inceptionEvent is not an inception event")
	}

	switch inception := iInception.(type) {
	case *UserPayload_Inception, *UserSettingsPayload_Inception, *UserInboxPayload_Inception, *UserDeviceKeyPayload_Inception:
		// for all user streams, get the address from the stream id
		userAddress, err := shared.GetUserAddressFromStreamIdBytes(iInception.GetStreamId())
		if err != nil {
			return nil, err
		}
		return &MemberPayload_Snapshot{
			Joined: insertMember(nil, &MemberPayload_Snapshot_Member{
				UserAddress: userAddress.Bytes(),
			}),
		}, nil
	case *DmChannelPayload_Inception:
		return &MemberPayload_Snapshot{
			Joined: insertMember(nil, &MemberPayload_Snapshot_Member{
				UserAddress: inception.FirstPartyAddress,
			}, &MemberPayload_Snapshot_Member{
				UserAddress: inception.SecondPartyAddress,
			}),
		}, nil
	case *MediaPayload_Inception:
		return &MemberPayload_Snapshot{
			Joined: insertMember(nil, &MemberPayload_Snapshot_Member{
				UserAddress: creatorAddress,
			}),
		}, nil
	default:
		return &MemberPayload_Snapshot{}, nil
	}
}

// mutate snapshot with content of event if applicable
func Update_Snapshot(iSnapshot *Snapshot, event *ParsedEvent, miniblockNum int64, eventNum int64) error {
	iSnapshot = migrations.MigrateSnapshot(iSnapshot)
	switch payload := event.Event.Payload.(type) {
	case *StreamEvent_SpacePayload:
		return update_Snapshot_Space(iSnapshot, payload.SpacePayload, eventNum)
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
	case *StreamEvent_UserDeviceKeyPayload:
		return update_Snapshot_UserDeviceKey(iSnapshot, payload.UserDeviceKeyPayload)
	case *StreamEvent_UserInboxPayload:
		return update_Snapshot_UserInbox(iSnapshot, payload.UserInboxPayload, miniblockNum)
	case *StreamEvent_MemberPayload:
		return update_Snapshot_Member(iSnapshot, payload.MemberPayload, event.Event.CreatorAddress, miniblockNum, eventNum, event.Hash.Bytes())
	case *StreamEvent_MediaPayload:
		return RiverError(Err_BAD_PAYLOAD, "Media payload snapshots are not supported")
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown payload type %T", event.Event.Payload)
	}
}

func update_Snapshot_Space(iSnapshot *Snapshot, spacePayload *SpacePayload, eventNum int64) error {
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
		}
		snapshot.SpaceContent.Channels = insertChannel(snapshot.SpaceContent.Channels, channel)
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown space payload type %T", spacePayload.Content)
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
		return RiverError(Err_INVALID_ARGUMENT, "unknown channel payload type %T", content)
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
		return RiverError(Err_INVALID_ARGUMENT, "unknown dm channel payload type %T", content)
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
		return RiverError(Err_INVALID_ARGUMENT, "unknown channel payload type %T", channelPayload.Content)
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
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown user payload type %T", userPayload.Content)
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
		return RiverError(Err_INVALID_ARGUMENT, "unknown user settings payload type %T", userSettingsPayload.Content)
	}
}

func update_Snapshot_UserDeviceKey(iSnapshot *Snapshot, userDeviceKeyPayload *UserDeviceKeyPayload) error {
	snapshot := iSnapshot.Content.(*Snapshot_UserDeviceKeyContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a user device key snapshot")
	}
	switch content := userDeviceKeyPayload.Content.(type) {
	case *UserDeviceKeyPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
	case *UserDeviceKeyPayload_EncryptionDevice_:
		if snapshot.UserDeviceKeyContent.EncryptionDevices == nil {
			snapshot.UserDeviceKeyContent.EncryptionDevices = make([]*UserDeviceKeyPayload_EncryptionDevice, 0)
		}
		// filter out the key if it already exists
		i := 0
		for _, key := range snapshot.UserDeviceKeyContent.EncryptionDevices {
			if key.DeviceKey != content.EncryptionDevice.DeviceKey {
				snapshot.UserDeviceKeyContent.EncryptionDevices[i] = key
				i++
			}
		}
		if i == len(snapshot.UserDeviceKeyContent.EncryptionDevices)-1 {
			// just an inplace sort operation
			snapshot.UserDeviceKeyContent.EncryptionDevices[i] = content.EncryptionDevice
		} else {
			// truncate and stick the new key on the end
			MAX_DEVICES := 10
			startIndex := max(0, i-MAX_DEVICES)
			snapshot.UserDeviceKeyContent.EncryptionDevices = append(snapshot.UserDeviceKeyContent.EncryptionDevices[startIndex:i], content.EncryptionDevice)
		}
		return nil
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown user device key payload type %T", userDeviceKeyPayload.Content)
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
		return RiverError(Err_INVALID_ARGUMENT, "unknown user to device payload type %T", userInboxPayload.Content)
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
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown membership payload type %T", memberPayload.Content)
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
