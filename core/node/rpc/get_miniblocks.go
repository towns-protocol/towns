package rpc

import (
	"context"

	"connectrpc.com/connect"

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
		for i := range mbsInfo {
			mbsInfo[i] = s.applyExclusionFilter(mbsInfo[i], req.Msg.GetExclusionFilter())
		}
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
	if len(mbsInfo) > 0 {
		fromInclusive = mbsInfo[0].Ref.Num
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
func (s *Service) applyExclusionFilter(info *MiniblockInfo, exclusionFilter []*EventFilter) *MiniblockInfo {
	// Use the existing miniblock proto directly (no need to unmarshal)
	miniblock := info.Proto

	// Track if any events were filtered
	originalEventCount := len(miniblock.Events)
	filteredEvents := make([]*Envelope, 0, len(miniblock.Events))

	// Filter events based on exclusion patterns
	for _, event := range info.Events() {
		if !s.shouldExcludeEvent(event, exclusionFilter) {
			filteredEvents = append(filteredEvents, event.Envelope)
		}
	}

	// If no events were filtered, return original miniblock info
	if len(filteredEvents) == originalEventCount {
		return info
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
	}
}

// shouldExcludeEvent determines if an event should be excluded based on exclusion filters
func (s *Service) shouldExcludeEvent(event *ParsedEvent, exclusionFilter []*EventFilter) bool {
	// Extract payload type and content type
	payloadType, contentType := s.extractEventTypeInfo(event.Event)

	// Check if any filter matches this event
	for _, filter := range exclusionFilter {
		if s.matchesEventFilter(payloadType, contentType, filter) {
			return true
		}
	}

	return false
}

// extractEventTypeInfo extracts payload type and content type from a StreamEvent using protobuf reflection
func (s *Service) extractEventTypeInfo(event *StreamEvent) (string, string) {
	msg := event.ProtoReflect()

	// Get the payload oneof field descriptor
	payloadOneofDesc := msg.Descriptor().Oneofs().ByName("payload")
	if payloadOneofDesc == nil {
		return "unknown", "unknown"
	}

	// Check which payload field is currently set
	whichPayload := msg.WhichOneof(payloadOneofDesc)
	if whichPayload == nil {
		return "unknown", "unknown"
	}

	// Get payload type name (protobuf field names are already in snake_case)
	payloadTypeName := string(whichPayload.Name()) // e.g., "member_payload"

	// Get the payload message
	payloadValue := msg.Get(whichPayload)
	if !payloadValue.IsValid() {
		return payloadTypeName, "unknown"
	}

	payloadMsg := payloadValue.Message()

	// Find the content oneof in the payload
	contentOneofDesc := payloadMsg.Descriptor().Oneofs().ByName("content")
	if contentOneofDesc == nil {
		// Some payloads might not have content oneof (like miniblock_header)
		return payloadTypeName, "none"
	}

	// Check which content field is currently set
	whichContent := payloadMsg.WhichOneof(contentOneofDesc)
	if whichContent == nil {
		return payloadTypeName, "unknown"
	}

	// Get content type name (protobuf field names are already in snake_case)
	contentTypeName := string(whichContent.Name()) // e.g., "key_solicitation"

	return payloadTypeName, contentTypeName
}

// matchesEventFilter checks if the payload/content types match the EventFilter
func (s *Service) matchesEventFilter(payloadType, contentType string, filter *EventFilter) bool {
	// Check payload type match
	if filter.Payload != "*" && filter.Payload != payloadType {
		return false
	}

	// Check content type match (wildcard or exact match)
	if filter.Content == "*" {
		return true
	}

	return filter.Content == contentType
}
