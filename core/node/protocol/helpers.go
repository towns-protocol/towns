package protocol

import (
	"encoding/hex"
	"encoding/json"

	"github.com/ethereum/go-ethereum/common"
)

const (
	// UseSharedSyncHeaderName is the header name that indicates whether to use the shared syncer or not.
	UseSharedSyncHeaderName = "X-Use-Shared-Sync"
)

func (e *StreamEvent) GetStreamSettings() *StreamSettings {
	if e == nil {
		return nil
	}
	i := e.GetInceptionPayload()
	if i == nil {
		return nil
	}
	return i.GetSettings()
}

// NodeAddresses returns the addresses of the nodes in the CreationCookie.
func (cc *CreationCookie) NodeAddresses() []common.Address {
	if cc == nil {
		return nil
	}

	addresses := make([]common.Address, len(cc.Nodes))
	for i, node := range cc.Nodes {
		addresses[i] = common.BytesToAddress(node)
	}

	return addresses
}

// IsLocal returns true if the given address is in the CreationCookie.Nodes list.
func (cc *CreationCookie) IsLocal(addr common.Address) bool {
	if cc == nil {
		return false
	}

	for _, a := range cc.NodeAddresses() {
		if a.Cmp(addr) == 0 {
			return true
		}
	}

	return false
}

// CopyWithAddr returns a copy of the SyncCookie with the given address.
func (sc *SyncCookie) CopyWithAddr(address common.Address) *SyncCookie {
	return &SyncCookie{
		NodeAddress:       address.Bytes(),
		StreamId:          sc.GetStreamId(),
		MinipoolGen:       sc.GetMinipoolGen(),
		PrevMiniblockHash: sc.GetPrevMiniblockHash(),
	}
}

// GetMiniblockSnapshot returns the snapshot for the given miniblock number.
// Returns nil if the snapshot is not found.
func (x *GetMiniblocksResponse) GetMiniblockSnapshot(num int64) *Envelope {
	if x == nil || x.Snapshots == nil || len(x.Snapshots) == 0 {
		return nil
	}

	return x.Snapshots[num]
}

// TargetSyncIDs returns the list of target sync IDs from the ModifySyncRequest.
func (r *ModifySyncRequest) TargetSyncIDs() []string {
	var targetSyncIds []string

	if r.SyncId != "" {
		targetSyncIds = append(targetSyncIds, r.SyncId)
	}

	if r.GetBackfillStreams().GetSyncId() != "" && r.GetBackfillStreams().GetSyncId() != r.SyncId {
		targetSyncIds = append(targetSyncIds, r.GetBackfillStreams().GetSyncId())
	}

	return targetSyncIds
}

// StreamID returns the stream ID from the SyncStreamsResponse.
// Depending on the operation type, it can be either from the message itself
// or from the next sync cookie of the stream.
func (r *SyncStreamsResponse) StreamID() []byte {
	if r == nil {
		return nil
	}

	if r.GetSyncOp() == SyncOp_SYNC_DOWN {
		return r.GetStreamId()
	}

	return r.GetStream().GetNextSyncCookie().GetStreamId()
}

func (s *Snapshot) ParsedStringWithIndent(indent string) string {
	if s == nil {
		return indent + "<nil snapshot>"
	}

	type baseInfo struct {
		Type            string
		SnapshotVersion int32
		MemberCount     int
	}

	memberCount := 0
	if s.Members != nil && s.Members.Joined != nil {
		memberCount = len(s.Members.Joined)
	}

	base := baseInfo{
		Type:            "", // Will be set in each case
		SnapshotVersion: s.SnapshotVersion,
		MemberCount:     memberCount,
	}

	// Handle each snapshot content type
	switch content := s.Content.(type) {
	case *Snapshot_SpaceContent:
		if content.SpaceContent == nil {
			return indent + "<nil SpaceContent>"
		}

		channelCount := 0
		if content.SpaceContent.Channels != nil {
			channelCount = len(content.SpaceContent.Channels)
		}

		data := struct {
			Type            string
			SnapshotVersion int32
			MemberCount     int
			SpaceId         string
			ChannelCount    int
		}{
			Type:            "SpaceContent",
			SnapshotVersion: base.SnapshotVersion,
			MemberCount:     base.MemberCount,
			SpaceId:         hex.EncodeToString(content.SpaceContent.GetInception().GetStreamId()),
			ChannelCount:    channelCount,
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<SpaceContent format error>"
		}
		return string(bytes)

	case *Snapshot_ChannelContent:
		if content.ChannelContent == nil {
			return indent + "<nil ChannelContent>"
		}

		data := struct {
			Type            string
			SnapshotVersion int32
			MemberCount     int
			StreamId        string
			SpaceId         string
		}{
			Type:            "ChannelContent",
			SnapshotVersion: base.SnapshotVersion,
			MemberCount:     base.MemberCount,
			StreamId:        hex.EncodeToString(content.ChannelContent.GetInception().GetStreamId()),
			SpaceId:         hex.EncodeToString(content.ChannelContent.GetInception().GetSpaceId()),
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<ChannelContent format error>"
		}
		return string(bytes)

	case *Snapshot_DmChannelContent:
		if content.DmChannelContent == nil {
			return indent + "<nil DmChannelContent>"
		}

		data := struct {
			Type               string
			SnapshotVersion    int32
			MemberCount        int
			StreamId           string
			FirstPartyAddress  string
			SecondPartyAddress string
		}{
			Type:               "DmChannelContent",
			SnapshotVersion:    base.SnapshotVersion,
			MemberCount:        base.MemberCount,
			StreamId:           hex.EncodeToString(content.DmChannelContent.GetInception().GetStreamId()),
			FirstPartyAddress:  hex.EncodeToString(content.DmChannelContent.GetInception().GetFirstPartyAddress()),
			SecondPartyAddress: hex.EncodeToString(content.DmChannelContent.GetInception().GetSecondPartyAddress()),
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<DmChannelContent format error>"
		}
		return string(bytes)

	case *Snapshot_GdmChannelContent:
		if content.GdmChannelContent == nil {
			return indent + "<nil GdmChannelContent>"
		}

		data := struct {
			Type            string
			SnapshotVersion int32
			MemberCount     int
			StreamId        string
		}{
			Type:            "GdmChannelContent",
			SnapshotVersion: base.SnapshotVersion,
			MemberCount:     base.MemberCount,
			StreamId:        hex.EncodeToString(content.GdmChannelContent.GetInception().GetStreamId()),
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<GdmChannelContent format error>"
		}
		return string(bytes)

	case *Snapshot_UserContent:
		if content.UserContent == nil {
			return indent + "<nil UserContent>"
		}

		membershipCount := 0
		if content.UserContent.Memberships != nil {
			membershipCount = len(content.UserContent.Memberships)
		}

		data := struct {
			Type            string
			SnapshotVersion int32
			MemberCount     int
			StreamId        string
			MembershipCount int
		}{
			Type:            "UserContent",
			SnapshotVersion: base.SnapshotVersion,
			MemberCount:     base.MemberCount,
			StreamId:        hex.EncodeToString(content.UserContent.GetInception().GetStreamId()),
			MembershipCount: membershipCount,
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<UserContent format error>"
		}
		return string(bytes)

	case *Snapshot_UserSettingsContent:
		if content.UserSettingsContent == nil {
			return indent + "<nil UserSettingsContent>"
		}

		data := struct {
			Type            string
			SnapshotVersion int32
			MemberCount     int
			StreamId        string
		}{
			Type:            "UserSettingsContent",
			SnapshotVersion: base.SnapshotVersion,
			MemberCount:     base.MemberCount,
			StreamId:        hex.EncodeToString(content.UserSettingsContent.GetInception().GetStreamId()),
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<UserSettingsContent format error>"
		}
		return string(bytes)

	case *Snapshot_UserMetadataContent:
		if content.UserMetadataContent == nil {
			return indent + "<nil UserMetadataContent>"
		}

		deviceCount := 0
		if content.UserMetadataContent.EncryptionDevices != nil {
			deviceCount = len(content.UserMetadataContent.EncryptionDevices)
		}

		data := struct {
			Type            string
			SnapshotVersion int32
			MemberCount     int
			StreamId        string
			DeviceCount     int
			HasProfile      bool
			HasBio          bool
		}{
			Type:            "UserMetadataContent",
			SnapshotVersion: base.SnapshotVersion,
			MemberCount:     base.MemberCount,
			StreamId:        hex.EncodeToString(content.UserMetadataContent.GetInception().GetStreamId()),
			DeviceCount:     deviceCount,
			HasProfile:      content.UserMetadataContent.ProfileImage != nil,
			HasBio:          content.UserMetadataContent.Bio != nil,
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<UserMetadataContent format error>"
		}
		return string(bytes)

	case *Snapshot_UserInboxContent:
		if content.UserInboxContent == nil {
			return indent + "<nil UserInboxContent>"
		}

		data := struct {
			Type            string
			SnapshotVersion int32
			MemberCount     int
			StreamId        string
		}{
			Type:            "UserInboxContent",
			SnapshotVersion: base.SnapshotVersion,
			MemberCount:     base.MemberCount,
			StreamId:        hex.EncodeToString(content.UserInboxContent.GetInception().GetStreamId()),
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<UserInboxContent format error>"
		}
		return string(bytes)

	case *Snapshot_MediaContent:
		if content.MediaContent == nil {
			return indent + "<nil MediaContent>"
		}

		data := struct {
			Type            string
			SnapshotVersion int32
			MemberCount     int
			StreamId        string
			ChunkCount      int32
			HasChannel      bool
			HasSpace        bool
			HasUser         bool
		}{
			Type:            "MediaContent",
			SnapshotVersion: base.SnapshotVersion,
			MemberCount:     base.MemberCount,
			StreamId:        hex.EncodeToString(content.MediaContent.GetInception().GetStreamId()),
			ChunkCount:      content.MediaContent.GetInception().GetChunkCount(),
			HasChannel:      content.MediaContent.GetInception().ChannelId != nil,
			HasSpace:        content.MediaContent.GetInception().SpaceId != nil,
			HasUser:         content.MediaContent.GetInception().UserId != nil,
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<MediaContent format error>"
		}
		return string(bytes)

	case *Snapshot_MetadataContent:
		if content.MetadataContent == nil {
			return indent + "<nil MetadataContent>"
		}

		streamCount := 0
		if content.MetadataContent.Streams != nil {
			streamCount = len(content.MetadataContent.Streams)
		}

		data := struct {
			Type            string
			SnapshotVersion int32
			MemberCount     int
			StreamId        string
			StreamCount     int
		}{
			Type:            "MetadataContent",
			SnapshotVersion: base.SnapshotVersion,
			MemberCount:     base.MemberCount,
			StreamId:        hex.EncodeToString(content.MetadataContent.GetInception().GetStreamId()),
			StreamCount:     streamCount,
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<MetadataContent format error>"
		}
		return string(bytes)

	default:
		return indent + "<unknown snapshot type>"
	}
}
