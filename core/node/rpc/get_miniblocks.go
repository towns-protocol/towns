package rpc

import (
	"context"
	"strings"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
)

func (s *Service) localGetMiniblocks(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
	stream *Stream,
) (*connect.Response[GetMiniblocksResponse], error) {
	toExclusive := req.Msg.ToExclusive

	if toExclusive <= req.Msg.FromInclusive {
		return nil, RiverError(Err_INVALID_ARGUMENT, "invalid range")
	}

	limit := int64(s.chainConfig.Get().GetMiniblocksMaxPageSize)
	if limit > 0 && toExclusive-req.Msg.FromInclusive > limit {
		toExclusive = req.Msg.FromInclusive + limit
	}

	mbsInfo, terminus, err := stream.GetMiniblocks(ctx, req.Msg.FromInclusive, toExclusive, req.Msg.GetOmitSnapshots())
	if err != nil {
		return nil, err
	}

	// Apply exclusion filtering if filters are provided
	if len(req.Msg.GetExclusionFilter()) > 0 {
		filteredMbsInfo := make([]*MiniblockInfo, 0, len(mbsInfo))
		for _, info := range mbsInfo {
			filteredInfo, err := s.applyExclusionFilter(info, req.Msg.GetExclusionFilter())
			if err != nil {
				return nil, err
			}
			filteredMbsInfo = append(filteredMbsInfo, filteredInfo)
		}
		mbsInfo = filteredMbsInfo
	}

	miniblocks := make([]*Miniblock, len(mbsInfo))
	snapshots := make(map[int64]*Envelope)
	for i, info := range mbsInfo {
		miniblocks[i] = info.Proto
		if !req.Msg.GetOmitSnapshots() && info.Snapshot != nil {
			snapshots[info.Ref.Num] = info.Snapshot
		}
	}

	fromInclusive := req.Msg.FromInclusive
	if len(miniblocks) > 0 {
		header, err := ParseEvent(miniblocks[0].GetHeader())
		if err != nil {
			return nil, err
		}

		fromInclusive = header.Event.GetMiniblockHeader().GetMiniblockNum()
	}

	resp := &GetMiniblocksResponse{
		Miniblocks:    miniblocks,
		Terminus:      terminus,
		FromInclusive: fromInclusive,
		Limit:         limit,
		OmitSnapshots: req.Msg.GetOmitSnapshots(),
	}

	if !req.Msg.GetOmitSnapshots() {
		resp.Snapshots = snapshots
	}

	return connect.NewResponse(resp), nil
}

// applyExclusionFilter applies exclusion filters to a miniblock, returning a new MiniblockInfo
// with filtered events and partial flag set if any events were excluded
func (s *Service) applyExclusionFilter(info *MiniblockInfo, exclusionFilter []string) (*MiniblockInfo, error) {
	// Parse the miniblock data into proto
	var miniblock Miniblock
	if err := proto.Unmarshal(info.Proto.Events[0].Event, &miniblock); err != nil {
		// Try parsing the full miniblock proto instead
		miniblock = *info.Proto
	}

	// Track if any events were filtered
	originalEventCount := len(miniblock.Events)
	filteredEvents := make([]*Envelope, 0, len(miniblock.Events))

	// Filter events based on exclusion patterns
	for _, envelope := range miniblock.Events {
		if !s.shouldExcludeEvent(envelope, exclusionFilter) {
			filteredEvents = append(filteredEvents, envelope)
		}
	}

	// If no events were filtered, return original miniblock info
	if len(filteredEvents) == originalEventCount {
		return info, nil
	}

	// Create new miniblock with filtered events and partial flag
	filteredMiniblock := &Miniblock{
		Events:  filteredEvents,
		Header:  miniblock.Header,
		Partial: true, // Set partial flag since events were excluded
	}

	// Return new MiniblockInfo with filtered proto
	return &MiniblockInfo{
		Proto:    filteredMiniblock,
		Ref:      info.Ref,
		Snapshot: info.Snapshot,
	}, nil
}

// shouldExcludeEvent determines if an event should be excluded based on exclusion filters
func (s *Service) shouldExcludeEvent(envelope *Envelope, exclusionFilter []string) bool {
	// Parse the event to get the payload
	var streamEvent StreamEvent
	if err := proto.Unmarshal(envelope.Event, &streamEvent); err != nil {
		// If we can't parse the event, don't exclude it
		return false
	}

	// Extract payload type and content type
	payloadType, contentType := s.extractEventTypeInfo(&streamEvent)
	
	// Check if any filter matches this event
	for _, filter := range exclusionFilter {
		if s.matchesFilter(payloadType, contentType, filter) {
			return true
		}
	}

	return false
}

// extractEventTypeInfo extracts payload type and content type from a StreamEvent
func (s *Service) extractEventTypeInfo(event *StreamEvent) (string, string) {
	switch payload := event.Payload.(type) {
	case *StreamEvent_MemberPayload:
		return "member_payload", s.getMemberPayloadContentType(payload.MemberPayload)
	case *StreamEvent_SpacePayload:
		return "space_payload", s.getSpacePayloadContentType(payload.SpacePayload)
	case *StreamEvent_ChannelPayload:
		return "channel_payload", s.getChannelPayloadContentType(payload.ChannelPayload)
	case *StreamEvent_UserPayload:
		return "user_payload", s.getUserPayloadContentType(payload.UserPayload)
	case *StreamEvent_UserSettingsPayload:
		return "user_settings_payload", s.getUserSettingsPayloadContentType(payload.UserSettingsPayload)
	case *StreamEvent_UserMetadataPayload:
		return "user_metadata_payload", s.getUserMetadataPayloadContentType(payload.UserMetadataPayload)
	case *StreamEvent_UserInboxPayload:
		return "user_inbox_payload", s.getUserInboxPayloadContentType(payload.UserInboxPayload)
	case *StreamEvent_MediaPayload:
		return "media_payload", s.getMediaPayloadContentType(payload.MediaPayload)
	case *StreamEvent_DmChannelPayload:
		return "dm_channel_payload", s.getDmChannelPayloadContentType(payload.DmChannelPayload)
	case *StreamEvent_GdmChannelPayload:
		return "gdm_channel_payload", s.getGdmChannelPayloadContentType(payload.GdmChannelPayload)
	case *StreamEvent_MetadataPayload:
		return "metadata_payload", s.getMetadataPayloadContentType(payload.MetadataPayload)
	case *StreamEvent_MiniblockHeader:
		return "miniblock_header", "none"
	default:
		return "unknown", "unknown"
	}
}

// Helper methods to extract content types for each payload type
func (s *Service) getMemberPayloadContentType(payload *MemberPayload) string {
	if payload.GetMembership() != nil {
		return "membership"
	}
	if payload.GetKeySolicitation() != nil {
		return "key_solicitation"
	}
	if payload.GetKeyFulfillment() != nil {
		return "key_fulfillment"
	}
	if payload.GetUsername() != nil {
		return "username"
	}
	if payload.GetDisplayName() != nil {
		return "display_name"
	}
	if payload.GetEnsAddress() != nil {
		return "ens_address"
	}
	if payload.GetNft() != nil {
		return "nft"
	}
	if payload.GetPin() != nil {
		return "pin"
	}
	if payload.GetUnpin() != nil {
		return "unpin"
	}
	if payload.GetMemberBlockchainTransaction() != nil {
		return "member_blockchain_transaction"
	}
	if payload.GetEncryptionAlgorithm() != nil {
		return "encryption_algorithm"
	}
	return "unknown"
}

func (s *Service) getSpacePayloadContentType(payload *SpacePayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetChannel() != nil {
		return "channel"
	}
	if payload.GetSpaceImage() != nil {
		return "space_image"
	}
	if payload.GetUpdateChannelAutojoin() != nil {
		return "update_channel_autojoin"
	}
	if payload.GetUpdateChannelHideUserJoinLeaveEvents() != nil {
		return "update_channel_hide_user_join_leave_events"
	}
	return "unknown"
}

func (s *Service) getChannelPayloadContentType(payload *ChannelPayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetMessage() != nil {
		return "message"
	}
	if payload.GetRedaction() != nil {
		return "redaction"
	}
	return "unknown"
}

func (s *Service) getUserPayloadContentType(payload *UserPayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetUserMembership() != nil {
		return "user_membership"
	}
	if payload.GetUserMembershipAction() != nil {
		return "user_membership_action"
	}
	if payload.GetBlockchainTransaction() != nil {
		return "blockchain_transaction"
	}
	if payload.GetReceivedBlockchainTransaction() != nil {
		return "received_blockchain_transaction"
	}
	return "unknown"
}

func (s *Service) getUserSettingsPayloadContentType(payload *UserSettingsPayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetFullyReadMarkers() != nil {
		return "fully_read_markers"
	}
	if payload.GetUserBlock() != nil {
		return "user_block"
	}
	return "unknown"
}

func (s *Service) getUserMetadataPayloadContentType(payload *UserMetadataPayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetEncryptionDevice() != nil {
		return "encryption_device"
	}
	if payload.GetProfileImage() != nil {
		return "profile_image"
	}
	if payload.GetBio() != nil {
		return "bio"
	}
	return "unknown"
}

func (s *Service) getUserInboxPayloadContentType(payload *UserInboxPayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetAck() != nil {
		return "ack"
	}
	if payload.GetGroupEncryptionSessions() != nil {
		return "group_encryption_sessions"
	}
	return "unknown"
}

func (s *Service) getMediaPayloadContentType(payload *MediaPayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetChunk() != nil {
		return "chunk"
	}
	return "unknown"
}

func (s *Service) getDmChannelPayloadContentType(payload *DmChannelPayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetMessage() != nil {
		return "message"
	}
	return "unknown"
}

func (s *Service) getGdmChannelPayloadContentType(payload *GdmChannelPayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetMessage() != nil {
		return "message"
	}
	if payload.GetChannelProperties() != nil {
		return "channel_properties"
	}
	return "unknown"
}

func (s *Service) getMetadataPayloadContentType(payload *MetadataPayload) string {
	if payload.GetInception() != nil {
		return "inception"
	}
	if payload.GetNewStream() != nil {
		return "new_stream"
	}
	if payload.GetLastMiniblockUpdate() != nil {
		return "last_miniblock_update"
	}
	if payload.GetPlacementUpdate() != nil {
		return "placement_update"
	}
	return "unknown"
}

// matchesFilter checks if the payload/content types match the filter pattern
func (s *Service) matchesFilter(payloadType, contentType, filter string) bool {
	// Filter format: "payload_type.content_type" or "payload_type.*"
	parts := strings.Split(filter, ".")
	if len(parts) != 2 {
		return false
	}

	filterPayloadType := parts[0]
	filterContentType := parts[1]

	// Check payload type match
	if filterPayloadType != "*" && filterPayloadType != payloadType {
		return false
	}

	// Check content type match (wildcard or exact match)
	if filterContentType == "*" {
		return true
	}

	return filterContentType == contentType
}
