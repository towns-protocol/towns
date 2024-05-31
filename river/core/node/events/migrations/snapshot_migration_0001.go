package migrations

import (
	"bytes"
	"slices"

	. "github.com/river-build/river/core/node/protocol"
)

// nasty bug with the insert_sorted function, it was inserting an extra element at the end
// every insert, we need to remove duplicates
func snapshot_migration_0001(iSnapshot *Snapshot) *Snapshot {
	// gotta fix everywhere we used insertSorted, keep the first instance

	if iSnapshot.Members != nil {
		iSnapshot.Members.Joined = slices.CompactFunc(
			iSnapshot.Members.Joined,
			func(i, j *MemberPayload_Snapshot_Member) bool {
				return bytes.Equal(i.UserAddress, j.UserAddress)
			},
		)
	}

	switch snapshot := iSnapshot.Content.(type) {
	case *Snapshot_SpaceContent:
		if snapshot.SpaceContent != nil {
			snapshot.SpaceContent.Channels = slices.CompactFunc(
				snapshot.SpaceContent.Channels,
				func(i, j *SpacePayload_ChannelMetadata) bool {
					return bytes.Equal(i.ChannelId, j.ChannelId)
				},
			)
		}
	case *Snapshot_UserContent:
		if snapshot.UserContent != nil {
			snapshot.UserContent.Memberships = slices.CompactFunc(
				snapshot.UserContent.Memberships,
				func(i, j *UserPayload_UserMembership) bool {
					return bytes.Equal(i.StreamId, j.StreamId)
				},
			)
		}

	case *Snapshot_UserSettingsContent:
		if snapshot.UserSettingsContent != nil {
			snapshot.UserSettingsContent.FullyReadMarkers = slices.CompactFunc(
				snapshot.UserSettingsContent.FullyReadMarkers,
				func(i, j *UserSettingsPayload_FullyReadMarkers) bool {
					return bytes.Equal(i.StreamId, j.StreamId)
				},
			)
		}
	}

	return iSnapshot
}
