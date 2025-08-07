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

// ToMap returns a map representation of the EncryptedData.
// This is a helper function for debugging/introspection purposes only.
// DO NOT use this in production hot paths as it is not optimized for logging.
func (e *EncryptedData) ToMap() map[string]any {
	if e == nil {
		return nil
	}

	data := make(map[string]any)

	// Check which fields are populated and use them
	if len(e.CiphertextBytes) > 0 {
		data["Ciphertext"] = hex.EncodeToString(e.CiphertextBytes)
	} else if e.Ciphertext != "" {
		data["Ciphertext"] = e.Ciphertext
	}

	if len(e.SessionIdBytes) > 0 {
		data["SessionId"] = hex.EncodeToString(e.SessionIdBytes)
	} else if e.SessionId != "" {
		data["SessionId"] = e.SessionId
	}

	if e.Algorithm != "" {
		data["Algorithm"] = e.Algorithm
	}

	return data
}

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

// ToMap returns a map representation of the StreamSettings.
// This is a helper function for debugging/introspection purposes only.
// DO NOT use this in production hot paths as it is not optimized for logging.
func (s *StreamSettings) ToMap() map[string]any {
	if s == nil {
		return nil
	}

	data := make(map[string]any)

	// Only include non-default values
	if s.DisableMiniblockCreation {
		data["DisableMiniblockCreation"] = s.DisableMiniblockCreation
	}
	if s.LightStream {
		data["LightStream"] = s.LightStream
	}

	return data
}

// ToMap returns a map representation of the ChannelSettings.
// This is a helper function for debugging/introspection purposes only.
// DO NOT use this in production hot paths as it is not optimized for logging.
func (cs *SpacePayload_ChannelSettings) ToMap() map[string]any {
	if cs == nil {
		return nil
	}

	data := make(map[string]any)

	// Only include non-default values
	if cs.Autojoin {
		data["Autojoin"] = cs.Autojoin
	}
	if cs.HideUserJoinLeaveEvents {
		data["HideUserJoinLeaveEvents"] = cs.HideUserJoinLeaveEvents
	}

	return data
}

// ToMap returns a map representation of the WrappedEncryptedData.
// This is a helper function for debugging/introspection purposes only.
// DO NOT use this in production hot paths as it is not optimized for logging.
func (w *WrappedEncryptedData) ToMap() map[string]any {
	if w == nil {
		return nil
	}

	data := make(map[string]any)

	// Add the encrypted data if present
	if w.Data != nil {
		encData := w.Data.ToMap()
		if len(encData) > 0 {
			for k, v := range encData {
				data[k] = v
			}
		}
	}

	// Add event metadata
	if w.EventNum > 0 {
		data["EventNum"] = w.EventNum
	}
	if len(w.EventHash) > 0 {
		data["EventHash"] = hex.EncodeToString(w.EventHash)
	}

	return data
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

// ParsedStreamWithIndent renders a version of the snapshot that is easily read and understood. Please
// note that this method is not optimized for performance and should not be used in any hot path. It
// is for debugging purposes only.
func (s *Snapshot) ParsedStringWithIndent(indent string) string {
	if s == nil {
		return indent + "<nil snapshot>"
	}

	memberCount := 0
	var memberDetails []map[string]any
	var snapshotMemberInfo map[string]any

	if s.Members != nil {
		snapshotMemberInfo = make(map[string]any)

		if s.Members.Joined != nil {
			memberCount = len(s.Members.Joined)
			// Collect member details
			for _, member := range s.Members.Joined {
				memberInfo := map[string]any{
					"user_address ": hex.EncodeToString(member.UserAddress),
					"miniblock_num": member.MiniblockNum,
					"event_num    ": member.EventNum,
				}
				if member.Username != nil && member.Username.Data != nil {
					memberInfo["username"] = member.Username.Data.ToMap()
				}
				if member.DisplayName != nil && member.DisplayName.Data != nil {
					memberInfo["display_name"] = member.DisplayName.Data.ToMap()
				}
				if len(member.EnsAddress) > 0 {
					memberInfo["ens_address"] = hex.EncodeToString(member.EnsAddress)
				}
				if len(member.Solicitations) > 0 {
					var solicitations []map[string]any
					for _, solicitation := range member.Solicitations {
						solInfo := map[string]any{
							"device_key   (b64)": solicitation.DeviceKey,
							"fallback_key (b64)": solicitation.FallbackKey,
							"is_new_device     ": solicitation.IsNewDevice,
						}
						if len(solicitation.SessionIds) > 0 {
							solInfo["session_ids"] = solicitation.SessionIds
						}
						solicitations = append(solicitations, solInfo)
					}
					memberInfo["solicitations"] = solicitations
				}
				memberDetails = append(memberDetails, memberInfo)
			}
		}

		// Add pins info if present
		if len(s.Members.Pins) > 0 {
			snapshotMemberInfo["pins_count"] = len(s.Members.Pins)
		}

		// Add tips info if present
		if len(s.Members.Tips) > 0 {
			snapshotMemberInfo["tips"] = s.Members.Tips
		}

		// Add tips count info if present
		if len(s.Members.TipsCount) > 0 {
			snapshotMemberInfo["tips_count"] = s.Members.TipsCount
		}

		// Add encryption algorithm info if present
		if s.Members.EncryptionAlgorithm != nil {
			snapshotMemberInfo["encryption_algorithm"] = s.Members.EncryptionAlgorithm.String()
		}
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

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
			"ChannelCount":    channelCount,
		}

		// Add inception details
		if inception := content.SpaceContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId": hex.EncodeToString(inception.GetStreamId()),
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			data["Inception"] = inceptionData
		}

		// Add channel details
		if content.SpaceContent.Channels != nil && len(content.SpaceContent.Channels) > 0 {
			channelList := make([]map[string]any, 0, len(content.SpaceContent.Channels))
			for _, channel := range content.SpaceContent.Channels {
				channelInfo := map[string]any{
					"ChannelId": hex.EncodeToString(channel.ChannelId),
					"Op":        channel.Op.String(),
				}
				if channel.Settings != nil {
					if settingsMap := channel.Settings.ToMap(); len(settingsMap) > 0 {
						channelInfo["Settings"] = settingsMap
					}
				}
				if channel.UpdatedAtEventNum > 0 {
					channelInfo["UpdatedAtEventNum"] = channel.UpdatedAtEventNum
				}
				channelList = append(channelList, channelInfo)
			}
			data["Channels"] = channelList
		}

		if len(memberDetails) > 0 {
			data["Members"] = memberDetails
		}
		if len(snapshotMemberInfo) > 0 {
			data["SnapshotMemberInfo"] = snapshotMemberInfo
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<SpaceContent format error>"
		}
		return "[SpaceContent] " + string(bytes)

	case *Snapshot_ChannelContent:
		if content.ChannelContent == nil {
			return indent + "<nil ChannelContent>"
		}

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
		}

		// Add inception details
		if inception := content.ChannelContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId": hex.EncodeToString(inception.GetStreamId()),
				"SpaceId":  hex.EncodeToString(inception.GetSpaceId()),
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			if channelSettings := inception.GetChannelSettings().ToMap(); len(channelSettings) > 0 {
				inceptionData["ChannelSettings"] = channelSettings
			}
			data["Inception"] = inceptionData
		}

		if len(memberDetails) > 0 {
			data["Members"] = memberDetails
		}
		if len(snapshotMemberInfo) > 0 {
			data["SnapshotMemberInfo"] = snapshotMemberInfo
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<ChannelContent format error>"
		}
		return "[ChannelContent] " + string(bytes)

	case *Snapshot_DmChannelContent:
		if content.DmChannelContent == nil {
			return indent + "<nil DmChannelContent>"
		}

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
		}

		// Add inception details
		if inception := content.DmChannelContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId":           hex.EncodeToString(inception.GetStreamId()),
				"FirstPartyAddress":  hex.EncodeToString(inception.GetFirstPartyAddress()),
				"SecondPartyAddress": hex.EncodeToString(inception.GetSecondPartyAddress()),
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			data["Inception"] = inceptionData
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<DmChannelContent format error>"
		}
		return "[DmChannelContent] " + string(bytes)

	case *Snapshot_GdmChannelContent:
		if content.GdmChannelContent == nil {
			return indent + "<nil GdmChannelContent>"
		}

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
		}

		// Add inception details
		if inception := content.GdmChannelContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId": hex.EncodeToString(inception.GetStreamId()),
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			if inception.ChannelProperties != nil {
				inceptionData["ChannelProperties"] = inception.ChannelProperties.ToMap()
			}
			data["Inception"] = inceptionData
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<GdmChannelContent format error>"
		}
		return "[GdmChannelContent] " + string(bytes)

	case *Snapshot_UserContent:
		if content.UserContent == nil {
			return indent + "<nil UserContent>"
		}

		membershipCount := 0
		if content.UserContent.Memberships != nil {
			membershipCount = len(content.UserContent.Memberships)
		}

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
			"MembershipCount": membershipCount,
		}

		// Add inception details
		if inception := content.UserContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId": hex.EncodeToString(inception.GetStreamId()),
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			if len(inception.AppAddress) > 0 {
				inceptionData["AppAddress"] = hex.EncodeToString(inception.AppAddress)
			}
			data["Inception"] = inceptionData
		}

		// Add membership details
		if len(content.UserContent.Memberships) > 0 {
			membershipList := make([]map[string]any, 0, len(content.UserContent.Memberships))
			for _, membership := range content.UserContent.Memberships {
				membershipInfo := map[string]any{
					"StreamId": hex.EncodeToString(membership.StreamId),
					"Op":       membership.Op.String(),
				}
				membershipList = append(membershipList, membershipInfo)
			}
			data["Memberships"] = membershipList
		}

		// Add tips metadata
		if len(content.UserContent.TipsSent) > 0 {
			data["TipsSent"] = content.UserContent.TipsSent
		}
		if len(content.UserContent.TipsReceived) > 0 {
			data["TipsReceived"] = content.UserContent.TipsReceived
		}
		if len(content.UserContent.TipsSentCount) > 0 {
			data["TipsSentCount"] = content.UserContent.TipsSentCount
		}
		if len(content.UserContent.TipsReceivedCount) > 0 {
			data["TipsReceivedCount"] = content.UserContent.TipsReceivedCount
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<UserContent format error>"
		}
		return "[UserContent] " + string(bytes)

	case *Snapshot_UserSettingsContent:
		if content.UserSettingsContent == nil {
			return indent + "<nil UserSettingsContent>"
		}

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
		}

		// Add inception details
		if inception := content.UserSettingsContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId": hex.EncodeToString(inception.GetStreamId()),
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			if len(inception.AppAddress) > 0 {
				inceptionData["AppAddress"] = hex.EncodeToString(inception.AppAddress)
			}
			data["Inception"] = inceptionData
		}

		// Add fully read markers
		if len(content.UserSettingsContent.FullyReadMarkers) > 0 {
			markersList := make([]map[string]any, 0, len(content.UserSettingsContent.FullyReadMarkers))
			for _, marker := range content.UserSettingsContent.FullyReadMarkers {
				markerInfo := map[string]any{
					"StreamId": hex.EncodeToString(marker.StreamId),
				}
				if marker.Content != nil && marker.Content.Data != "" {
					// Unmarshal the stringified JSON to remove escaped quotes
					var contentData any
					if err := json.Unmarshal([]byte(marker.Content.Data), &contentData); err == nil {
						markerInfo["Content"] = contentData
					} else {
						// If unmarshal fails, use the raw string
						markerInfo["Content"] = marker.Content.Data
					}
				}
				markersList = append(markersList, markerInfo)
			}
			data["FullyReadMarkers"] = markersList
		}

		// Add user blocks
		if len(content.UserSettingsContent.UserBlocksList) > 0 {
			blocksList := make([]map[string]any, 0, len(content.UserSettingsContent.UserBlocksList))
			for _, userBlock := range content.UserSettingsContent.UserBlocksList {
				userBlockInfo := map[string]any{
					"UserId": hex.EncodeToString(userBlock.UserId),
				}
				if len(userBlock.Blocks) > 0 {
					blocks := make([]map[string]any, 0, len(userBlock.Blocks))
					for _, block := range userBlock.Blocks {
						blockInfo := map[string]any{
							"IsBlocked": block.GetIsBlocked(),
							"EventNum":  block.GetEventNum(),
						}
						blocks = append(blocks, blockInfo)
					}
					userBlockInfo["Blocks"] = blocks
				}
				blocksList = append(blocksList, userBlockInfo)
			}
			data["UserBlocks"] = blocksList
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<UserSettingsContent format error>"
		}
		return "[UserSettingsContent] " + string(bytes)

	case *Snapshot_UserMetadataContent:
		if content.UserMetadataContent == nil {
			return indent + "<nil UserMetadataContent>"
		}

		deviceCount := 0
		if content.UserMetadataContent.EncryptionDevices != nil {
			deviceCount = len(content.UserMetadataContent.EncryptionDevices)
		}

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
			"DeviceCount":     deviceCount,
		}

		// Add inception details
		if inception := content.UserMetadataContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId": hex.EncodeToString(inception.GetStreamId()),
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			if len(inception.AppAddress) > 0 {
				inceptionData["AppAddress"] = hex.EncodeToString(inception.AppAddress)
			}
			data["Inception"] = inceptionData
		}

		// Add encryption devices
		if len(content.UserMetadataContent.EncryptionDevices) > 0 {
			devicesList := make([]map[string]any, 0, len(content.UserMetadataContent.EncryptionDevices))
			for _, device := range content.UserMetadataContent.EncryptionDevices {
				deviceInfo := map[string]any{
					"DeviceKey":   device.DeviceKey,
					"FallbackKey": device.FallbackKey,
				}
				devicesList = append(devicesList, deviceInfo)
			}
			data["EncryptionDevices"] = devicesList
		}

		// Add profile and bio info if present
		if content.UserMetadataContent.ProfileImage != nil {
			profileData := content.UserMetadataContent.ProfileImage.ToMap()
			if len(profileData) > 0 {
				data["ProfileImage"] = profileData
			}
		}
		if content.UserMetadataContent.Bio != nil {
			bioData := content.UserMetadataContent.Bio.ToMap()
			if len(bioData) > 0 {
				data["Bio"] = bioData
			}
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<UserMetadataContent format error>"
		}
		return "[UserMetadataContent] " + string(bytes)

	case *Snapshot_UserInboxContent:
		if content.UserInboxContent == nil {
			return indent + "<nil UserInboxContent>"
		}

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
		}

		// Add inception details
		if inception := content.UserInboxContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId": hex.EncodeToString(inception.GetStreamId()),
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			if len(inception.AppAddress) > 0 {
				inceptionData["AppAddress"] = hex.EncodeToString(inception.AppAddress)
			}
			data["Inception"] = inceptionData
		}

		// Add device summary
		if len(content.UserInboxContent.DeviceSummary) > 0 {
			deviceSummaryList := make([]map[string]any, 0, len(content.UserInboxContent.DeviceSummary))
			for deviceKey, summary := range content.UserInboxContent.DeviceSummary {
				summaryInfo := map[string]any{
					"DeviceKey":  deviceKey,
					"LowerBound": summary.LowerBound,
					"UpperBound": summary.UpperBound,
				}
				deviceSummaryList = append(deviceSummaryList, summaryInfo)
			}
			data["DeviceSummary"] = deviceSummaryList
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<UserInboxContent format error>"
		}
		return "[UserInboxContent] " + string(bytes)

	case *Snapshot_MediaContent:
		if content.MediaContent == nil {
			return indent + "<nil MediaContent>"
		}

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
		}

		// Add inception details
		if inception := content.MediaContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId":   hex.EncodeToString(inception.GetStreamId()),
				"ChunkCount": inception.GetChunkCount(),
			}
			if inception.ChannelId != nil {
				inceptionData["ChannelId"] = hex.EncodeToString(inception.ChannelId)
			}
			if inception.SpaceId != nil {
				inceptionData["SpaceId"] = hex.EncodeToString(inception.SpaceId)
			}
			if inception.UserId != nil {
				inceptionData["UserId"] = hex.EncodeToString(inception.UserId)
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			data["Inception"] = inceptionData
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<MediaContent format error>"
		}
		return "[MediaContent] " + string(bytes)

	case *Snapshot_MetadataContent:
		if content.MetadataContent == nil {
			return indent + "<nil MetadataContent>"
		}

		streamCount := 0
		if content.MetadataContent.Streams != nil {
			streamCount = len(content.MetadataContent.Streams)
		}

		data := map[string]any{
			"SnapshotVersion": s.SnapshotVersion,
			"MemberCount":     memberCount,
			"StreamCount":     streamCount,
		}

		// Add inception details
		if inception := content.MetadataContent.GetInception(); inception != nil {
			inceptionData := map[string]any{
				"StreamId": hex.EncodeToString(inception.GetStreamId()),
			}
			if settingsMap := inception.GetSettings().ToMap(); len(settingsMap) > 0 {
				inceptionData["StreamSettings"] = settingsMap
			}
			data["Inception"] = inceptionData
		}

		// Add stream details
		if len(content.MetadataContent.Streams) > 0 {
			streamsList := make([]map[string]any, 0, len(content.MetadataContent.Streams))
			for _, stream := range content.MetadataContent.Streams {
				streamInfo := map[string]any{
					"StreamId":          hex.EncodeToString(stream.StreamId),
					"LastMiniblockHash": hex.EncodeToString(stream.LastMiniblockHash),
					"LastMiniblockNum":  stream.LastMiniblockNum,
					"ReplicationFactor": stream.ReplicationFactor,
				}
				if len(stream.Nodes) > 0 {
					nodes := make([]string, len(stream.Nodes))
					for i, node := range stream.Nodes {
						nodes[i] = hex.EncodeToString(node)
					}
					streamInfo["Nodes"] = nodes
				}
				streamsList = append(streamsList, streamInfo)
			}
			data["Streams"] = streamsList
		}

		bytes, err := json.MarshalIndent(data, indent, "  ")
		if err != nil {
			return indent + "<MetadataContent format error>"
		}
		return "[MetadataContent] " + string(bytes)

	default:
		return indent + "<unknown snapshot type>"
	}
}
