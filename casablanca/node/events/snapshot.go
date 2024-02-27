package events

import (
	"bytes"
	"sort"

	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/shared"
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
		Content: content,
		Members: members,
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
		userAddress, err := shared.GetUserAddressFromStreamId(iInception.GetStreamId())
		if err != nil {
			return nil, err
		}
		return &MemberPayload_Snapshot{
			Joined: addMember(nil, &MemberPayload_Snapshot_Member{
				UserAddress: userAddress.Bytes(),
			}),
		}, nil
	case *DmChannelPayload_Inception:
		return &MemberPayload_Snapshot{
			Joined: addMember(nil, &MemberPayload_Snapshot_Member{
				UserAddress: inception.FirstPartyAddress,
			}, &MemberPayload_Snapshot_Member{
				UserAddress: inception.SecondPartyAddress,
			}),
		}, nil
	case *MediaPayload_Inception:
		return &MemberPayload_Snapshot{
			Joined: addMember(nil, &MemberPayload_Snapshot_Member{
				UserAddress: creatorAddress,
			}),
		}, nil
	default:
		return &MemberPayload_Snapshot{}, nil
	}
}

// mutate snapshot with content of event if applicable
func Update_Snapshot(iSnapshot *Snapshot, event *ParsedEvent, miniblockNum int64, eventNum int64) error {
	switch payload := event.Event.Payload.(type) {
	case *StreamEvent_SpacePayload:
		return update_Snapshot_Space(iSnapshot, payload.SpacePayload, eventNum, event.Hash.Bytes())
	case *StreamEvent_ChannelPayload:
		return update_Snapshot_Channel(iSnapshot, payload.ChannelPayload)
	case *StreamEvent_DmChannelPayload:
		return update_Snapshot_DmChannel(iSnapshot, payload.DmChannelPayload, miniblockNum, event.Hash.Bytes())
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

func update_Snapshot_Space(iSnapshot *Snapshot, spacePayload *SpacePayload, eventNum int64, eventHash []byte) error {
	snapshot := iSnapshot.Content.(*Snapshot_SpaceContent)
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a space snapshot")
	}
	switch content := spacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "cannot update blockheader with inception event")
	case *SpacePayload_Channel_:
		if snapshot.SpaceContent.Channels == nil {
			snapshot.SpaceContent.Channels = make(map[string]*SpacePayload_Channel)
		}
		snapshot.SpaceContent.Channels[content.Channel.ChannelId] = content.Channel
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
	eventNum int64,
	eventHash []byte,
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
		if snapshot.UserContent.Memberships == nil {
			snapshot.UserContent.Memberships = make(map[string]*UserPayload_UserMembership)
		}
		snapshot.UserContent.Memberships[content.UserMembership.StreamId] = content.UserMembership
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
		if snapshot.UserSettingsContent.FullyReadMarkers == nil {
			snapshot.UserSettingsContent.FullyReadMarkers = make(map[string]*UserSettingsPayload_FullyReadMarkers)
		}
		snapshot.UserSettingsContent.FullyReadMarkers[content.FullyReadMarkers.ChannelStreamId] = content.FullyReadMarkers
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
	maxGenerations := int64(3600) // blocks are made every 2 seconds if events exist. 3600 would be 5 days of blocks 24 hours a day
	if snapshot.UserInboxContent.DeviceSummary != nil {
		for deviceKey, deviceSummary := range snapshot.UserInboxContent.DeviceSummary {
			isOlderThanMaxGenerations := (currentMiniblockNum - deviceSummary.LowerBound) > maxGenerations
			if isOlderThanMaxGenerations {
				delete(snapshot.UserInboxContent.DeviceSummary, deviceKey)
			}
		}
	}
}

func update_Snapshot_Member(iSnapshot *Snapshot, memberPayload *MemberPayload, creatorAddress []byte, miniblockNum int64, eventNum int64, eventHash []byte) error {
	snapshot := iSnapshot.Members
	if snapshot == nil {
		return RiverError(Err_INVALID_ARGUMENT, "blockheader snapshot is not a membership snapshot")
	}
	switch content := memberPayload.Content.(type) {
	case *MemberPayload_Membership_:
		switch content.Membership.Op {
		case MembershipOp_SO_JOIN:
			snapshot.Joined = addMember(snapshot.Joined, &MemberPayload_Snapshot_Member{
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
		// if solicitation exists for this device key, remove it by shifting the slice
		i := 0
		for _, event := range member.Solicitations {
			if event.DeviceKey != content.KeySolicitation.DeviceKey {
				member.Solicitations[i] = event
				i++
			}
		}
		// sort the event keys in the new event
		event := content.KeySolicitation
		event.SessionIds = sort.StringSlice(event.SessionIds)
		// append it
		MAX_DEVICES := 10
		startIndex := max(0, i-MAX_DEVICES)
		member.Solicitations = append(member.Solicitations[startIndex:i], event)
		return nil
	case *MemberPayload_KeyFulfillment_:
		member, err := findMember(snapshot.Joined, creatorAddress)
		if err != nil {
			return err
		}
		// clear out any fulfilled session ids for the device key
		for _, event := range member.Solicitations {
			if event.DeviceKey == content.KeyFulfillment.DeviceKey {
				event.SessionIds = removeCommon(event.SessionIds, content.KeyFulfillment.SessionIds)
				event.IsNewDevice = false
				break
			}
		}
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

func findMember(members []*MemberPayload_Snapshot_Member, memberAddress []byte) (*MemberPayload_Snapshot_Member, error) {
	index := sort.Search(len(members), func(i int) bool {
		return bytes.Compare(members[i].UserAddress, memberAddress) >= 0
	})

	if index < len(members) && bytes.Equal(members[index].UserAddress, memberAddress) {
		return members[index], nil
	}

	return nil, RiverError(Err_INVALID_ARGUMENT, "member not found")
}

func removeMember(members []*MemberPayload_Snapshot_Member, memberAddress []byte) []*MemberPayload_Snapshot_Member {
	index := sort.Search(len(members), func(i int) bool {
		return bytes.Compare(members[i].UserAddress, memberAddress) >= 0
	})

	// Check if the element is found at the index.
	if index < len(members) && bytes.Equal(members[index].UserAddress, memberAddress) {
		// Remove the element by slicing.
		return append(members[:index], members[index+1:]...)
	}

	// Element not found, return the original slice.
	return members
}

func addMember(members []*MemberPayload_Snapshot_Member, newMembers ...*MemberPayload_Snapshot_Member) []*MemberPayload_Snapshot_Member {
	for _, member := range newMembers {
		index := sort.Search(len(members), func(i int) bool {
			return bytes.Compare(members[i].UserAddress, member.UserAddress) >= 0
		})

		// Check if the element is found at the index.
		if index < len(members) && bytes.Equal(members[index].UserAddress, member.UserAddress) {
			return members
		}

		// Insert the element by slicing.
		members = append(members, nil)
		copy(members[index+1:], members[index:])
		members[index] = member
	}
	return members
}
