package events

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/protocol"
)

// ParsedStringWithIndent prints a parsed, detailed version of the event with nested fields
// indented. It is implemented inefficiently and is intended to be used for debugging purposes
// only. Please do not use this method in a hot path.
func (e *ParsedEvent) ParsedStringWithIndent(indent string) string {
	switch payload := e.Event.Payload.(type) {
	case *StreamEvent_ChannelPayload:
		{
			switch content := payload.ChannelPayload.Content.(type) {
			case *ChannelPayload_Inception_:
				{
					data := map[string]interface{}{
						"SpaceId":  hex.EncodeToString(content.Inception.SpaceId),
						"StreamId": hex.EncodeToString(content.Inception.StreamId),
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					// Add ChannelSettings if present
					if channelSettings := content.Inception.GetChannelSettings(); channelSettings != nil {
						if settingsMap := channelSettings.ToMap(); len(settingsMap) > 0 {
							data["ChannelSettings"] = settingsMap
						}
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<ChannelPayload_Inception>"
					}
					return "[ChannelPayload_Inception] " + string(bytes)
				}
			case *ChannelPayload_Message:
				{
					messageData := content.Message.ToMap()
					if messageData == nil {
						messageData = make(map[string]interface{})
					}
					bytes, err := json.MarshalIndent(messageData, indent, "  ")
					if err != nil {
						return "<ChannelPayload_Message>"
					}
					return "[ChannelPayload_Message] " + string(bytes)
				}
			default:
				return "<ChannelPayload>"
			}
		}
	case *StreamEvent_MemberPayload:
		{
			switch content := payload.MemberPayload.Content.(type) {
			case *MemberPayload_Membership_:
				{
					membershipData := map[string]interface{}{
						"UserAddress":      hex.EncodeToString(content.Membership.UserAddress),
						"InitiatorAddress": hex.EncodeToString(content.Membership.InitiatorAddress),
						"Op":               content.Membership.Op.String(),
					}

					// Add optional fields if present
					if content.Membership.Reason != 0 { // MembershipReason_MR_NONE is 0
						membershipData["Reason"] = content.Membership.Reason.String()
					}
					if len(content.Membership.AppAddress) > 0 && !bytes.Equal(content.Membership.AppAddress, common.Address{}.Bytes()) {
						membershipData["AppAddress"] = hex.EncodeToString(content.Membership.AppAddress)
					}

					bytes, err := json.MarshalIndent(membershipData, indent, "  ")
					if err != nil {
						return "<MemberPayload_Membership>"
					}
					return "[MemberPayload_Membership] " + string(bytes)
				}
			case *MemberPayload_KeySolicitation_:
				{
					data := map[string]interface{}{
						"DeviceKey":   content.KeySolicitation.DeviceKey,
						"FallbackKey": content.KeySolicitation.FallbackKey,
						"IsNewDevice": content.KeySolicitation.IsNewDevice,
					}

					// Add session IDs if present
					if len(content.KeySolicitation.SessionIds) > 0 {
						data["SessionIds"] = content.KeySolicitation.SessionIds
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MemberPayload_KeySolicitation>"
					}
					return "[MemberPayload_KeySolicitation] " + string(bytes)
				}
			case *MemberPayload_KeyFulfillment_:
				{
					data := map[string]interface{}{
						"UserAddress": hex.EncodeToString(content.KeyFulfillment.UserAddress),
						"DeviceKey":   content.KeyFulfillment.DeviceKey,
					}

					// Add session IDs if present
					data["SessionIds"] = content.KeyFulfillment.SessionIds

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MemberPayload_KeyFulfillment>"
					}
					return "[MemberPayload_KeyFulfillment] " + string(bytes)
				}
			case *MemberPayload_Username:
				{
					usernameData := content.Username.ToMap()
					if usernameData == nil {
						usernameData = make(map[string]interface{})
					}
					bytes, err := json.MarshalIndent(usernameData, indent, "  ")
					if err != nil {
						return "<MemberPayload_Username>"
					}
					return "[MemberPayload_Username] " + string(bytes)
				}
			case *MemberPayload_DisplayName:
				{
					displayNameData := content.DisplayName.ToMap()
					if displayNameData == nil {
						displayNameData = make(map[string]interface{})
					}
					data := map[string]interface{}{
						"DisplayName": displayNameData,
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MemberPayload_DisplayName>"
					}
					return "[MemberPayload_DisplayName] " + string(bytes)
				}
			case *MemberPayload_EnsAddress:
				{
					data := map[string]interface{}{
						"EnsAddress": hex.EncodeToString(content.EnsAddress),
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MemberPayload_EnsAddress>"
					}
					return "[MemberPayload_EnsAddress] " + string(bytes)
				}
			case *MemberPayload_Nft_:
				{
					data := map[string]interface{}{
						"ChainId":         content.Nft.ChainId,
						"ContractAddress": hex.EncodeToString(content.Nft.ContractAddress),
						"TokenId":         hex.EncodeToString(content.Nft.TokenId),
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MemberPayload_Nft>"
					}
					return "[MemberPayload_Nft] " + string(bytes)
				}
			case *MemberPayload_Pin_:
				{
					data := map[string]interface{}{
						"EventId": hex.EncodeToString(content.Pin.EventId),
					}

					// Include basic info about the pinned event if present
					if content.Pin.Event != nil {
						pinnedEventInfo := map[string]interface{}{
							"CreatedAtMs": content.Pin.Event.CreatedAtEpochMs,
						}
						// Add the payload type of the pinned event
						if content.Pin.Event.Payload != nil {
							pinnedEventInfo["PayloadType"] = fmt.Sprintf("%T", content.Pin.Event.Payload)
						}
						data["PinnedEvent"] = pinnedEventInfo
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MemberPayload_Pin>"
					}
					return "[MemberPayload_Pin] " + string(bytes)
				}
			case *MemberPayload_Unpin_:
				{
					data := map[string]interface{}{
						"EventId": hex.EncodeToString(content.Unpin.EventId),
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MemberPayload_Unpin>"
					}
					return "[MemberPayload_Unpin] " + string(bytes)
				}
			case *MemberPayload_EncryptionAlgorithm_:
				{
					data := map[string]interface{}{}

					// Add algorithm if present
					if content.EncryptionAlgorithm.Algorithm != nil {
						data["Algorithm"] = *content.EncryptionAlgorithm.Algorithm
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MemberPayload_EncryptionAlgorithm>"
					}
					return "[MemberPayload_EncryptionAlgorithm] " + string(bytes)
				}
			case *MemberPayload_MemberBlockchainTransaction_:
				{
					data := map[string]interface{}{
						"FromUserAddress": hex.EncodeToString(content.MemberBlockchainTransaction.FromUserAddress),
					}

					// Add transaction details if present
					if content.MemberBlockchainTransaction.Transaction != nil {
						txInfo := map[string]interface{}{}
						if content.MemberBlockchainTransaction.Transaction.Receipt != nil {
							txInfo["TransactionHash"] = hex.EncodeToString(content.MemberBlockchainTransaction.Transaction.Receipt.TransactionHash)
							txInfo["BlockNumber"] = content.MemberBlockchainTransaction.Transaction.Receipt.BlockNumber
							txInfo["ChainId"] = content.MemberBlockchainTransaction.Transaction.Receipt.ChainId
							txInfo["To"] = hex.EncodeToString(content.MemberBlockchainTransaction.Transaction.Receipt.To)
							txInfo["From"] = hex.EncodeToString(content.MemberBlockchainTransaction.Transaction.Receipt.From)
							if len(content.MemberBlockchainTransaction.Transaction.Receipt.Logs) > 0 {
								txInfo["LogsCount"] = len(content.MemberBlockchainTransaction.Transaction.Receipt.Logs)
							}
						}
						data["Transaction"] = txInfo
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MemberPayload_MemberBlockchainTransaction>"
					}
					return "[MemberPayload_MemberBlockchainTransaction] " + string(bytes)
				}
			default:
				return "<MemberPayload>"
			}
		}
	case *StreamEvent_UserSettingsPayload:
		{
			switch content := payload.UserSettingsPayload.Content.(type) {
			case *UserSettingsPayload_Inception_:
				{
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.Inception.StreamId),
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					// Add AppAddress if present
					if len(content.Inception.AppAddress) > 0 {
						data["AppAddress"] = hex.EncodeToString(content.Inception.AppAddress)
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserSettingsPayload_Inception>"
					}
					return "[UserSettingsPayload_Inception] " + string(bytes)
				}
			case *UserSettingsPayload_FullyReadMarkers_:
				{
					var contentData map[string]interface{}
					if err := json.Unmarshal([]byte(content.FullyReadMarkers.GetContent().GetData()), &contentData); err != nil {
						return "<UserSettingsPayload_FullyReadMarkers>"
					}
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.FullyReadMarkers.StreamId),
						"Content":  contentData,
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserSettingsPayload_FullyReadMarkers>"
					}
					return "[UserSettingsPayload_FullyReadMarkers] " + string(bytes)
				}
			case *UserSettingsPayload_UserBlock_:
				{
					data := map[string]interface{}{
						"UserId":    hex.EncodeToString(content.UserBlock.UserId),
						"IsBlocked": content.UserBlock.IsBlocked,
						"EventNum":  content.UserBlock.EventNum,
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserSettingsPayload_UserBlock>"
					}
					return "[UserSettingsPayload_UserBlock] " + string(bytes)
				}
			default:
				return "<UserSettingsPayload>"
			}
		}
	case *StreamEvent_UserPayload:
		{
			switch content := payload.UserPayload.Content.(type) {
			case *UserPayload_Inception_:
				{
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.Inception.StreamId),
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					// Add AppAddress if present
					if len(content.Inception.AppAddress) > 0 {
						data["AppAddress"] = hex.EncodeToString(content.Inception.AppAddress)
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserPayload_Inception>"
					}
					return "[UserPayload_Inception] " + string(bytes)
				}
			case *UserPayload_UserMembership_:
				{
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.UserMembership.StreamId),
						"Op":       content.UserMembership.Op.String(),
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserPayload_UserMembership>"
					}
					return "[UserPayload_UserMembership] " + string(bytes)
				}
			case *UserPayload_UserMembershipAction_:
				{
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.UserMembershipAction.StreamId),
						"UserId":   hex.EncodeToString(content.UserMembershipAction.UserId),
						"Op":       content.UserMembershipAction.Op.String(),
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserPayload_UserMembershipAction>"
					}
					return "[UserPayload_UserMembershipAction] " + string(bytes)
				}
			case *UserPayload_BlockchainTransaction:
				{
					data := map[string]interface{}{
						"TransactionHash": hex.EncodeToString(content.BlockchainTransaction.Receipt.TransactionHash),
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserPayload_BlockchainTransaction>"
					}
					return "[UserPayload_BlockchainTransaction] " + string(bytes)
				}
			case *UserPayload_ReceivedBlockchainTransaction_:
				{
					data := map[string]interface{}{
						"TransactionHash": hex.EncodeToString(content.ReceivedBlockchainTransaction.Transaction.Receipt.TransactionHash),
						"FromUserAddress": hex.EncodeToString(content.ReceivedBlockchainTransaction.FromUserAddress),
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserPayload_ReceivedBlockchainTransaction>"
					}
					return "[UserPayload_ReceivedBlockchainTransaction] " + string(bytes)
				}
			default:
				return "<UserPayload>"
			}
		}
	case *StreamEvent_UserMetadataPayload:
		{
			switch content := payload.UserMetadataPayload.Content.(type) {
			case *UserMetadataPayload_Inception_:
				{
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.Inception.StreamId),
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					// Add AppAddress if present
					if len(content.Inception.AppAddress) > 0 {
						data["AppAddress"] = hex.EncodeToString(content.Inception.AppAddress)
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserMetadataPayload_Inception>"
					}
					return "[UserMetadataPayload_Inception] " + string(bytes)
				}
			case *UserMetadataPayload_EncryptionDevice_:
				{
					data := map[string]interface{}{
						"DeviceKey":   content.EncryptionDevice.DeviceKey,
						"FallbackKey": content.EncryptionDevice.FallbackKey,
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserMetadataPayload_EncryptionDevice>"
					}
					return "[UserMetadataPayload_EncryptionDevice] " + string(bytes)
				}
			case *UserMetadataPayload_ProfileImage:
				{
					profileImageData := content.ProfileImage.ToMap()
					if profileImageData == nil {
						profileImageData = make(map[string]interface{})
					}
					bytes, err := json.MarshalIndent(profileImageData, indent, "  ")
					if err != nil {
						return "<UserMetadataPayload_ProfileImage>"
					}
					return "[UserMetadataPayload_ProfileImage] " + string(bytes)
				}
			case *UserMetadataPayload_Bio:
				{
					bioData := content.Bio.ToMap()
					if bioData == nil {
						bioData = make(map[string]interface{})
					}
					bytes, err := json.MarshalIndent(bioData, indent, "  ")
					if err != nil {
						return "<UserMetadataPayload_Bio>"
					}
					return "[UserMetadataPayload_Bio] " + string(bytes)
				}
			default:
				return "<UserMetadataPayload>"
			}
		}
	case *StreamEvent_UserInboxPayload:
		{
			switch content := payload.UserInboxPayload.Content.(type) {
			case *UserInboxPayload_Inception_:
				{
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.Inception.StreamId),
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					// Add AppAddress if present
					if len(content.Inception.AppAddress) > 0 {
						data["AppAddress"] = hex.EncodeToString(content.Inception.AppAddress)
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserInboxPayload_Inception>"
					}
					return "[UserInboxPayload_Inception] " + string(bytes)
				}
			case *UserInboxPayload_Ack_:
				{
					data := map[string]interface{}{
						"DeviceKey":    content.Ack.DeviceKey,
						"MiniblockNum": content.Ack.MiniblockNum,
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserInboxPayload_Ack>"
					}
					return "[UserInboxPayload_Ack] " + string(bytes)
				}
			case *UserInboxPayload_GroupEncryptionSessions_:
				{
					data := map[string]interface{}{
						"StreamId":         hex.EncodeToString(content.GroupEncryptionSessions.StreamId),
						"SenderKey":        content.GroupEncryptionSessions.SenderKey,
						"SessionIds":       content.GroupEncryptionSessions.SessionIds,
						"CiphertextsCount": len(content.GroupEncryptionSessions.Ciphertexts),
						"Algorithm":        content.GroupEncryptionSessions.Algorithm,
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<UserInboxPayload_GroupEncryptionSessions>"
					}
					return "[UserInboxPayload_GroupEncryptionSessions] " + string(bytes)
				}
			default:
				return "<UserInboxPayload>"
			}
		}
	case *StreamEvent_SpacePayload:
		{
			switch content := payload.SpacePayload.Content.(type) {
			case *SpacePayload_Inception_:
				{
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.Inception.StreamId),
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<SpacePayload_Inception>"
					}
					return "[SpacePayload_Inception] " + string(bytes)
				}
			case *SpacePayload_Channel:
				{
					data := map[string]interface{}{
						"ChannelId": hex.EncodeToString(content.Channel.ChannelId),
						"Op":        content.Channel.Op.String(),
					}

					// Add channel settings if present
					if channelSettings := content.Channel.GetSettings(); channelSettings != nil {
						if settingsMap := channelSettings.ToMap(); len(settingsMap) > 0 {
							data["ChannelSettings"] = settingsMap
						}
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<SpacePayload_Channel>"
					}
					return "[SpacePayload_Channel] " + string(bytes)
				}
			case *SpacePayload_SpaceImage:
				{
					imageData := content.SpaceImage.ToMap()
					if imageData == nil {
						imageData = make(map[string]interface{})
					}
					bytes, err := json.MarshalIndent(imageData, indent, "  ")
					if err != nil {
						return "<SpacePayload_SpaceImage>"
					}
					return "[SpacePayload_SpaceImage] " + string(bytes)
				}
			default:
				return "<SpacePayload>"
			}
		}
	case *StreamEvent_DmChannelPayload:
		{
			switch content := payload.DmChannelPayload.Content.(type) {
			case *DmChannelPayload_Inception_:
				{
					data := map[string]interface{}{
						"StreamId":           hex.EncodeToString(content.Inception.StreamId),
						"FirstPartyAddress":  hex.EncodeToString(content.Inception.FirstPartyAddress),
						"SecondPartyAddress": hex.EncodeToString(content.Inception.SecondPartyAddress),
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<DmChannelPayload_Inception>"
					}
					return "[DmChannelPayload_Inception] " + string(bytes)
				}
			case *DmChannelPayload_Message:
				{
					messageData := content.Message.ToMap()
					if messageData == nil {
						messageData = make(map[string]interface{})
					}
					bytes, err := json.MarshalIndent(messageData, indent, "  ")
					if err != nil {
						return "<DmChannelPayload_Message>"
					}
					return "[DmChannelPayload_Message] " + string(bytes)
				}
			default:
				return "<DmChannelPayload>"
			}
		}
	case *StreamEvent_GdmChannelPayload:
		{
			switch content := payload.GdmChannelPayload.Content.(type) {
			case *GdmChannelPayload_Inception_:
				{
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.Inception.StreamId),
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					// Add channel properties if present
					if content.Inception.ChannelProperties != nil {
						data["ChannelProperties"] = content.Inception.ChannelProperties.ToMap()
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<GdmChannelPayload_Inception>"
					}
					return "[GdmChannelPayload_Inception] " + string(bytes)
				}
			case *GdmChannelPayload_Message:
				{
					messageData := content.Message.ToMap()
					if messageData == nil {
						messageData = make(map[string]interface{})
					}
					bytes, err := json.MarshalIndent(messageData, indent, "  ")
					if err != nil {
						return "<GdmChannelPayload_Message>"
					}
					return "[GdmChannelPayload_Message] " + string(bytes)
				}
			case *GdmChannelPayload_ChannelProperties:
				{
					data := make(map[string]interface{})
					if content.ChannelProperties != nil {
						data["ChannelProperties"] = content.ChannelProperties.ToMap()
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<GdmChannelPayload_ChannelProperties>"
					}
					return "[GdmChannelPayload_ChannelProperties] " + string(bytes)
				}
			default:
				return "<GdmChannelPayload>"
			}
		}
	case *StreamEvent_MediaPayload:
		{
			switch content := payload.MediaPayload.Content.(type) {
			case *MediaPayload_Inception_:
				{
					data := map[string]interface{}{
						"StreamId":   hex.EncodeToString(content.Inception.StreamId),
						"ChunkCount": content.Inception.ChunkCount,
					}

					// Add optional fields if present
					if content.Inception.ChannelId != nil {
						data["ChannelId"] = hex.EncodeToString(content.Inception.ChannelId)
					}
					if content.Inception.SpaceId != nil {
						data["SpaceId"] = hex.EncodeToString(content.Inception.SpaceId)
					}
					if content.Inception.UserId != nil {
						data["UserId"] = hex.EncodeToString(content.Inception.UserId)
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MediaPayload_Inception>"
					}
					return "[MediaPayload_Inception] " + string(bytes)
				}
			case *MediaPayload_Chunk_:
				{
					data := map[string]interface{}{
						"ChunkIndex": content.Chunk.ChunkIndex,
						"DataSize":   len(content.Chunk.Data),
					}
					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MediaPayload_Chunk>"
					}
					return "[MediaPayload_Chunk] " + string(bytes)
				}
			default:
				return "<MediaPayload>"
			}
		}
	case *StreamEvent_MetadataPayload:
		{
			switch content := payload.MetadataPayload.Content.(type) {
			case *MetadataPayload_Inception_:
				{
					data := map[string]interface{}{
						"StreamId": hex.EncodeToString(content.Inception.StreamId),
					}

					// Add StreamSettings if present
					if streamSettings := content.Inception.GetSettings().ToMap(); len(streamSettings) > 0 {
						data["StreamSettings"] = streamSettings
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MetadataPayload_Inception>"
					}
					return "[MetadataPayload_Inception] " + string(bytes)
				}
			case *MetadataPayload_NewStream_:
				{
					data := map[string]interface{}{
						"StreamId":             hex.EncodeToString(content.NewStream.StreamId),
						"GenesisMiniblockHash": hex.EncodeToString(content.NewStream.GenesisMiniblockHash),
						"ReplicationFactor":    content.NewStream.ReplicationFactor,
					}

					// Add nodes if present
					if len(content.NewStream.Nodes) > 0 {
						nodes := make([]string, len(content.NewStream.Nodes))
						for i, node := range content.NewStream.Nodes {
							nodes[i] = hex.EncodeToString(node)
						}
						data["Nodes"] = nodes
					}

					bytes, err := json.MarshalIndent(data, indent, "  ")
					if err != nil {
						return "<MetadataPayload_NewStream>"
					}
					return "[MetadataPayload_NewStream] " + string(bytes)
				}
			default:
				return "<MetadataPayload>"
			}
		}
	default:
		return "<StreamEvent>"
	}
}
