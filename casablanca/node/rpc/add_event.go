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
	. "casablanca/node/events"
	"casablanca/node/infra"
	. "casablanca/node/protocol"
)

var (
	addEventRequests = infra.NewSuccessMetrics("add_event_requests", serviceRequests)
)

func logAddEvent(l *log.Entry, message string, streamId string, event *ParsedEvent, envelope *Envelope, requestId string, err error) {
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
			FormatEventToJsonSB(&sb, event)
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

func (s *Service) AddEvent(ctx context.Context, req *connect_go.Request[AddEventRequest]) (*connect_go.Response[AddEventResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)

	parsedEvent, err := ParseEvent(req.Msg.Event)
	if err != nil {
		logAddEvent(log, "ERROR parsing event", req.Msg.StreamId, nil, req.Msg.Event, requestId, err)
		return nil, err
	}

	logAddEvent(log, "ENTER", req.Msg.StreamId, parsedEvent, nil, requestId, nil)

	err = s.addParsedEvent(ctx, req.Msg.StreamId, parsedEvent)
	if err == nil {
		logAddEvent(log, "LEAVE", req.Msg.StreamId, parsedEvent, nil, requestId, nil)
		addEventRequests.Pass()
		return connect_go.NewResponse(&AddEventResponse{}), nil
	} else {
		logAddEvent(log, "ERROR", req.Msg.StreamId, parsedEvent, nil, requestId, err)
		addEventRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}
}

func (s *Service) addParsedEvent(ctx context.Context, streamId string, parsedEvent *ParsedEvent) error {
	if len(parsedEvent.Event.PrevEvents) == 0 {
		return status.Errorf(codes.InvalidArgument, "AddEvent: event has no prev events")
	}

	stream, err := s.cache.GetStream(ctx, streamId)
	if err != nil {
		return err
	}
	streamView := stream.GetView()

	// check if previous event's hashes match
	for _, prevEvent := range parsedEvent.PrevEventStrs {
		if !streamView.HasEvent(prevEvent) {
			return status.Errorf(codes.InvalidArgument, "AddEvent: prev event not found")
		}
	}

	// check event type
	streamEvent := parsedEvent.Event

	// make sure the stream event is of the same type as the inception event
	err = streamEvent.VerifyPayloadTypeMatchesStreamType(streamView.InceptionPayload())
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "AddEvent: %v", err)
	}

	// custom business logic...
	switch payload := streamEvent.Payload.(type) {
	case *StreamEvent_ChannelPayload:
		switch channelPayload := payload.ChannelPayload.Content.(type) {
		case *ChannelPayload_Inception_:
			return status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *ChannelPayload_Membership:
			membership := channelPayload.Membership
			return s.addMembershipEvent(ctx, stream, streamView, parsedEvent, membership)
		case *ChannelPayload_Message_:
			return s.addChannelMessage(ctx, stream, streamView, parsedEvent)
		default:
			return status.Errorf(codes.InvalidArgument, "AddEvent: Channel event has no valid payload for type %T", payload.ChannelPayload.Content)
		}
	case *StreamEvent_SpacePayload:
		switch spacePayload := payload.SpacePayload.Content.(type) {
		case *SpacePayload_Inception_:
			return status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *SpacePayload_Membership:
			membership := spacePayload.Membership
			return s.addMembershipEvent(ctx, stream, streamView, parsedEvent, membership)
		case *SpacePayload_Channel_:
			return status.Errorf(codes.InvalidArgument, "AddEvent: adding channels is unimplemented")
		default:
			return status.Errorf(codes.InvalidArgument, "AddEvent: Space event has no valid payload for type %T", payload.SpacePayload.Content)
		}
	case *StreamEvent_UserPayload:
		switch payload.UserPayload.Content.(type) {
		case *UserPayload_Inception_:
			return status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *UserPayload_UserMembership_:
			return status.Errorf(codes.InvalidArgument, "AddEvent: adding UserMembership is unimplemented")
		case *UserPayload_ToDevice_:
			_, err = stream.AddEvent(ctx, parsedEvent)
			return err
		default:
			return status.Errorf(codes.InvalidArgument, "AddEvent: User event has no valid payload for type %T", payload.UserPayload.Content)
		}
	case *StreamEvent_UserDeviceKeyPayload:
		switch payload.UserDeviceKeyPayload.Content.(type) {
		case *UserDeviceKeyPayload_Inception_:
			return status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *UserDeviceKeyPayload_UserDeviceKey_:
			_, err = stream.AddEvent(ctx, parsedEvent)
			return err
		default:
			return status.Errorf(codes.InvalidArgument, "AddEvent: UserDeviceKey event has no valid payload for type %T", payload.UserDeviceKeyPayload.Content)
		}
	case *StreamEvent_UserSettingsPayload:
		switch payload.UserSettingsPayload.Content.(type) {
		case *UserSettingsPayload_Inception_:
			return status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *UserSettingsPayload_UserSetting_:
			return status.Errorf(codes.InvalidArgument, "AddEvent: adding UserSetting is unimplemented")
		default:
			return status.Errorf(codes.InvalidArgument, "AddEvent: UserSettings event has no valid payload for type %T", payload.UserSettingsPayload.Content)
		}
	default:
		return status.Errorf(codes.InvalidArgument, "AddEvent: event has no valid payload for type %T", streamEvent.Payload)
	}
}

func (s *Service) addChannelMessage(ctx context.Context, stream *Stream, view StreamView, parsedEvent *ParsedEvent) error {
	streamId := view.StreamId()
	user, err := common.UserIdFromAddress(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	info, err := RoomInfoFromInceptionEvent(view.InceptionEvent(), streamId, user)
	if err != nil {
		return status.Errorf(codes.Internal, "AddEvent: error getting room info: %v", err)
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
		return status.Errorf(codes.InvalidArgument, "AddEvent: failed to get permissions: %v", err)
	}
	if !allowed {
		return status.Errorf(codes.PermissionDenied, "AddEvent: user %s is not allowed to write to channel %s", user, streamId)
	}

	// check if user is a member of the channel
	members, err := view.JoinedUsers()
	if err != nil {
		return status.Errorf(codes.Internal, "AddEvent: error getting joined users: %v", err)
	}
	if _, ok := members[user]; !ok {
		return status.Errorf(codes.InvalidArgument, "AddEvent: user %s is not a member of channel %s", user, streamId)
	}

	_, err = stream.AddEvent(ctx, parsedEvent)
	return err
}

func (s *Service) addMembershipEvent(ctx context.Context, stream *Stream, view StreamView, parsedEvent *ParsedEvent, membership *Membership) error {
	streamId := view.StreamId()
	creator, err := common.UserIdFromAddress(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "AddEvent: invalid user id: %v", err)
	}
	userId := membership.UserId
	userStreamId, err := common.UserStreamIdFromId(userId)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "AddEvent: invalid user id %s", userId)
	}

	// Check if user stream exists
	userStream, err := s.cache.GetStream(ctx, userStreamId)
	if err != nil {
		return err
	}
	userStreamView := userStream.GetView()
	// TODO: check here if user already a member?

	permission := auth.PermissionUndefined
	switch membership.Op {
	case MembershipOp_SO_INVITE:
		userId = creator
		permission = auth.PermissionInvite
	case MembershipOp_SO_JOIN:
		// join event should be allowed for read only users
		permission = auth.PermissionRead
	case MembershipOp_SO_LEAVE:
		permission = auth.PermissionWrite
	case MembershipOp_SO_UNSPECIFIED:
		permission = auth.PermissionUndefined
	}

	if permission != auth.PermissionUndefined {
		info, err := RoomInfoFromInceptionEvent(view.InceptionEvent(), streamId, userId)
		if err != nil {
			return status.Errorf(codes.Internal, "AddEvent: error getting room info: %v", err)
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
			return status.Errorf(codes.InvalidArgument, "AddEvent: failed to get permissions: %v", err)
		}
		if !allowed {
			return status.Errorf(codes.PermissionDenied, "AddEvent: user %s is not allowed to write to stream %s", userId, streamId)
		}
	}

	_, err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return status.Errorf(codes.Internal, "AddEvent: error adding event to storage: %v", err)
	}

	return s.addDerivedMembershipEventToUserStream(ctx, userStream, userStreamView, streamId, parsedEvent, membership.Op)
}

func (s *Service) addDerivedMembershipEventToUserStream(ctx context.Context, userStream *Stream, userStreamView StreamView, originStreamId string, originEvent *ParsedEvent, op MembershipOp) error {
	inviterId, err := common.UserIdFromAddress(originEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	userStreamEvent, err := MakeParsedEventWithPayload(
		s.wallet,
		Make_UserPayload_Membership(
			op,
			inviterId,
			originStreamId,
			&EventRef{
				StreamId:  originStreamId,
				Hash:      originEvent.Envelope.Hash,
				Signature: originEvent.Envelope.Signature,
			},
		),
		userStreamView.LeafEventHashes(),
	)
	if err != nil {
		return err
	}
	_, err = userStream.AddEvent(ctx, userStreamEvent)
	return err
}
