package rpc

import (
	"context"
	"strings"

	connect_go "github.com/bufbuild/connect-go"
	log "github.com/sirupsen/logrus"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"casablanca/node/auth"
	. "casablanca/node/base"
	"casablanca/node/common"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
)

var (
	addEventRequests = infra.NewSuccessMetrics("add_event_requests", serviceRequests)
)

func logAddEvent(l *log.Entry, message string, streamId string, event *events.ParsedEvent, envelope *protocol.Envelope, requestId string, err error) {
	if err == nil && log.GetLevel() < log.DebugLevel {
		return
	}
	var sb strings.Builder
	sb.Grow(160)
	sb.WriteString("AddEvent: ")
	sb.WriteString(message)
	sb.WriteString(" streamId=")
	sb.WriteString(streamId)
	if event != nil {
		sb.WriteString(" event=")
		sb.WriteString(event.ShortDebugStr())
		if log.GetLevel() == log.TraceLevel {
			sb.WriteString(" event_details=\n")
			events.FormatEventToJsonSB(&sb, event)
			sb.WriteString("\n")
		}
	} else {
		sb.WriteString(" envelope_hash=")
		FormatHashFromBytesToSB(&sb, envelope.Hash)
	}
	sb.WriteString(" request_id=")
	sb.WriteString(requestId)

	if err != nil {
		sb.WriteString(" error=")
		sb.WriteString(err.Error())
		l.Error(sb.String())
	} else {
		l.Debug(sb.String())
	}
}

func (s *Service) AddEvent(ctx context.Context, req *connect_go.Request[protocol.AddEventRequest]) (*connect_go.Response[protocol.AddEventResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)

	parsedEvent, err := events.ParseEvent(req.Msg.Event)
	if err != nil {
		logAddEvent(log, "ERROR parsing event", req.Msg.StreamId, nil, req.Msg.Event, requestId, err)
		return nil, err
	}

	logAddEvent(log, "ENTER", req.Msg.StreamId, parsedEvent, nil, requestId, nil)

	_, err = s.addParsedEvent(ctx, req.Msg.StreamId, parsedEvent)
	if err == nil {
		logAddEvent(log, "LEAVE", req.Msg.StreamId, parsedEvent, nil, requestId, nil)
		addEventRequests.Pass()
		return connect_go.NewResponse(&protocol.AddEventResponse{}), nil
	} else {
		logAddEvent(log, "ERROR", req.Msg.StreamId, parsedEvent, nil, requestId, err)
		addEventRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}
}

func (s *Service) addParsedEvent(ctx context.Context, streamId string, parsedEvent *events.ParsedEvent) ([]byte, error) {
	if len(parsedEvent.Event.PrevEvents) == 0 {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event has no prev events")
	}

	streamView, err := s.loadStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	// check if previous event's hashes match
	for _, prevEvent := range parsedEvent.PrevEventStrs {
		if !streamView.HasEvent(prevEvent) {
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: prev event not found")
		}
	}

	// check event type
	streamEvent := parsedEvent.Event

	// make sure the stream event is of the same type as the inception event
	err = streamEvent.VerifyPayloadTypeMatchesStreamType(streamView.InceptionPayload())
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: %v", err)
	}

	// custom business logic...
	switch payload := streamEvent.Payload.(type) {
	case *protocol.StreamEvent_ChannelPayload:
		switch channelPayload := payload.ChannelPayload.Content.(type) {
		case *protocol.ChannelPayload_Inception_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *protocol.ChannelPayload_Membership:
			membership := channelPayload.Membership
			return addMembershipEvent(membership, s, ctx, streamId, streamView, parsedEvent)
		case *protocol.ChannelPayload_Message_:
			return addChannelMessage(streamEvent, s, ctx, streamId, streamView, parsedEvent.Envelope)
		default:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: Channel event has no valid payload for type %T", payload.ChannelPayload.Content)
		}
	case *protocol.StreamEvent_SpacePayload:
		switch spacePayload := payload.SpacePayload.Content.(type) {
		case *protocol.SpacePayload_Inception_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *protocol.SpacePayload_Membership:
			membership := spacePayload.Membership
			return addMembershipEvent(membership, s, ctx, streamId, streamView, parsedEvent)
		case *protocol.SpacePayload_Channel_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: adding channels is unimplemented")
		default:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: Space event has no valid payload for type %T", payload.SpacePayload.Content)
		}
	case *protocol.StreamEvent_UserPayload:
		switch payload.UserPayload.Content.(type) {
		case *protocol.UserPayload_Inception_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *protocol.UserPayload_UserMembership_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: adding UserMembership is unimplemented")
		case *protocol.UserPayload_ToDevice_:
			return addEventToStorage(s, ctx, streamId, parsedEvent.Envelope)
		default:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: User event has no valid payload for type %T", payload.UserPayload.Content)
		}
	case *protocol.StreamEvent_UserDeviceKeyPayload:
		switch payload.UserDeviceKeyPayload.Content.(type) {
		case *protocol.UserDeviceKeyPayload_Inception_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *protocol.UserDeviceKeyPayload_UserDeviceKey_:
			return addEventToStorage(s, ctx, streamId, parsedEvent.Envelope)
		default:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: UserDeviceKey event has no valid payload for type %T", payload.UserDeviceKeyPayload.Content)
		}
	case *protocol.StreamEvent_UserSettingsPayload:
		switch payload.UserSettingsPayload.Content.(type) {
		case *protocol.UserSettingsPayload_Inception_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *protocol.UserSettingsPayload_UserSetting_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: adding UserSetting is unimplemented")
		default:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: UserSettings event has no valid payload for type %T", payload.UserSettingsPayload.Content)
		}
	default:
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event has no valid payload for type %T", streamEvent.Payload)
	}
}

func addEventToStorage(s *Service, ctx context.Context, streamId string, envelope *protocol.Envelope) ([]byte, error) {
	cookie, err := s.Storage.AddEvent(ctx, streamId, envelope)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error adding event to storage: %v", err)
	}
	return cookie, nil
}

func addChannelMessage(streamEvent *protocol.StreamEvent, s *Service, ctx context.Context, streamId string, view events.StreamView, envelope *protocol.Envelope) ([]byte, error) {
	user := common.UserIdFromAddress(streamEvent.CreatorAddress)

	info, err := events.RoomInfoFromInceptionEvent(view.InceptionEvent(), streamId, user)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error getting room info: %v", err)
	}

	allowed, err := s.Authorization.IsAllowed(
		ctx,
		auth.AuthorizationArgs{
			RoomId:     streamId,
			UserId:     user,
			Permission: auth.PermissionWrite,
		},
		info,
	)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: failed to get permissions: %v", err)
	}
	if !allowed {
		return nil, status.Errorf(codes.PermissionDenied, "AddEvent: user %s is not allowed to write to channel %s", user, streamId)
	}

	// check if user is a member of the channel
	members, err := view.JoinedUsers()
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error getting joined users: %v", err)
	}
	if _, ok := members[user]; !ok {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: user %s is not a member of channel %s", user, streamId)
	}

	cookie, err := s.Storage.AddEvent(ctx, streamId, envelope)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error adding event to storage: %v", err)
	}
	return cookie, nil
}

func addMembershipEvent(membership *protocol.Membership, s *Service, ctx context.Context, streamId string, view events.StreamView, parsedEvent *events.ParsedEvent) ([]byte, error) {
	creator := common.UserIdFromAddress(parsedEvent.Event.CreatorAddress)
	userId := membership.UserId
	userStreamId := common.UserStreamIdFromId(userId)

	// Check if user stream exists
	userStreamView, err := s.loadStream(ctx, userStreamId)
	if err != nil {
		return nil, err
	}

	permission := auth.PermissionUndefined
	switch membership.Op {
	case protocol.MembershipOp_SO_INVITE:
		userId = creator
		permission = auth.PermissionInvite
	case protocol.MembershipOp_SO_JOIN:
		permission = auth.PermissionWrite
	case protocol.MembershipOp_SO_LEAVE:
		permission = auth.PermissionWrite
	case protocol.MembershipOp_SO_UNSPECIFIED:
		permission = auth.PermissionUndefined
	}

	if permission != auth.PermissionUndefined {
		info, err := events.RoomInfoFromInceptionEvent(view.InceptionEvent(), streamId, userId)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "AddEvent: error getting room info: %v", err)
		}

		allowed, err := s.Authorization.IsAllowed(
			ctx,
			auth.AuthorizationArgs{
				RoomId:     streamId,
				UserId:     userId,
				Permission: permission,
			},
			info,
		)
		if err != nil {
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: failed to get permissions: %v", err)
		}
		if !allowed {
			return nil, status.Errorf(codes.PermissionDenied, "AddEvent: user %s is not allowed to write to stream %s", userId, streamId)
		}
	}

	cookie, err := s.Storage.AddEvent(ctx, streamId, parsedEvent.Envelope)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error adding event to storage: %v", err)
	}

	log.Debug("AddEvent: ", membership.Op)
	userStreamEvent, err := s.makeEnvelopeWithPayload(
		events.Make_UserPayload_Membership(
			membership.Op,
			common.UserIdFromAddress(parsedEvent.Event.CreatorAddress),
			streamId,
			&protocol.EventRef{
				StreamId:  streamId,
				Hash:      parsedEvent.Envelope.Hash,
				Signature: parsedEvent.Envelope.Signature,
			},
		),
		userStreamView.LeafEventHashes(),
	)
	if err != nil {
		return nil, err
	}
	_, err = s.Storage.AddEvent(ctx, userStreamId, userStreamEvent)
	if err != nil {
		return nil, err
	}

	return cookie, nil
}
