package rpc

import (
	"context"

	connect_go "github.com/bufbuild/connect-go"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"casablanca/node/auth"
	"casablanca/node/common"
	. "casablanca/node/events"
	"casablanca/node/infra"
	. "casablanca/node/protocol"
)

var (
	addEventRequests = infra.NewSuccessMetrics("add_event_requests", serviceRequests)
)

func (s *Service) AddEvent(ctx context.Context, req *connect_go.Request[AddEventRequest]) (*connect_go.Response[AddEventResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)

	parsedEvent, err := ParseEvent(req.Msg.Event)
	if err != nil {
		log.Warn("AddEvent ERROR: failed to parse events", "request", req.Msg, "error", err)
		addEventRequests.Fail()
		return nil, err
	}

	log.Debug("AddEvent ENTER", "streamId", req.Msg.StreamId, "event", parsedEvent)

	err = s.addParsedEvent(ctx, req.Msg.StreamId, parsedEvent)
	if err == nil {
		log.Debug("AddEvent LEAVE", "streamId", req.Msg.StreamId)
		addEventRequests.Pass()
		return connect_go.NewResponse(&AddEventResponse{}), nil
	} else {
		addEventRequests.Fail()
		log.Warn("AddEvent ERROR", "streamId", req.Msg.StreamId, "error", err)
		return nil, err
	}
}

func (s *Service) addParsedEvent(ctx context.Context, streamId string, parsedEvent *ParsedEvent) error {
	if len(parsedEvent.Event.PrevEvents) == 0 {
		return status.Errorf(codes.InvalidArgument, "AddEvent: event has no prev events")
	}

	stream, streamView, err := s.cache.GetStream(ctx, streamId)
	if err != nil {
		return err
	}

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
		case *ChannelPayload_Message:
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
			return s.updateChannel(ctx, stream, streamView, parsedEvent)
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
			_, err = stream.AddEvent(ctx, parsedEvent)
			return err
		case *UserSettingsPayload_FullyReadMarkers_:
			_, err = stream.AddEvent(ctx, parsedEvent)
			return err
		default:
			return status.Errorf(codes.InvalidArgument, "AddEvent: UserSettings event has no valid payload for type %T", payload.UserSettingsPayload.Content)
		}
	default:
		return status.Errorf(codes.InvalidArgument, "AddEvent: event has no valid payload for type %T", streamEvent.Payload)
	}
}

func (s *Service) addChannelMessage(ctx context.Context, stream *Stream, view StreamView, parsedEvent *ParsedEvent) error {
	streamId := view.StreamId()
	user, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	info, err := StreamInfoFromInceptionEvent(view.InceptionEvent(), streamId, user)
	if err != nil {
		return status.Errorf(codes.Internal, "AddEvent: error getting stream info: %v", err)
	}

	allowed, err := s.townsContract.IsAllowed(
		ctx,
		auth.AuthorizationArgs{
			StreamId:   streamId,
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
	member, err := s.checkMembership(ctx, view, user)
	if err != nil {
		return status.Errorf(codes.Internal, "AddEvent: error getting joined users: %v", err)
	}
	if !member {

		return status.Errorf(codes.InvalidArgument, "AddEvent: user %s is not a member of channel %s", user, streamId)
	}

	_, err = stream.AddEvent(ctx, parsedEvent)
	return err
}

func (s *Service) checkMembership(ctx context.Context, view StreamView, userId string) (bool, error) {
	members, err := view.JoinedUsers()
	if err != nil {
		return false, status.Errorf(codes.Internal, "AddEvent: error getting joined users: %v", err)
	}
	_, ok := members[userId]
	return ok, nil
}

func (s *Service) updateChannel(ctx context.Context, stream *Stream, view StreamView, parsedEvent *ParsedEvent) error {
	if (parsedEvent.Event.GetSpacePayload() == nil) || (parsedEvent.Event.GetSpacePayload().GetChannel() == nil) {
		return status.Error(codes.InvalidArgument, "AddEvent: invalid channel update event")
	}
	if parsedEvent.Event.GetSpacePayload().GetChannel().Op != ChannelOp_CO_UPDATED {
		return status.Errorf(codes.InvalidArgument, "AddEvent: only update channel is supported at this point. Received channel op %v", parsedEvent.Event.GetSpacePayload().GetChannel().Op)
	}
	_, err := stream.AddEvent(ctx, parsedEvent)
	return err
}

func (s *Service) addMembershipEvent(ctx context.Context, stream *Stream, view StreamView, parsedEvent *ParsedEvent, membership *Membership) error {
	streamId := view.StreamId()
	userId := membership.UserId
	userStreamId, err := common.UserStreamIdFromId(userId)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "AddEvent: invalid user id %s", userId)
	}

	// Check if user stream exists
	userStream, userStreamView, err := s.cache.GetStream(ctx, userStreamId)
	if err != nil {
		return err
	}
	// Check if user is a member of the channel
	member, err := s.checkMembership(ctx, view, userId)
	if err != nil {
		return status.Errorf(codes.Internal, "AddEvent: error getting joined users: %v", err)
	}
	creator, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return status.Errorf(codes.InvalidArgument, "AddEvent: invalid user id: %v", err)
	}

	permission := auth.PermissionUndefined
	switch membership.Op {
	case MembershipOp_SO_INVITE:
		{
			if member {
				return status.Errorf(codes.InvalidArgument, "AddEvent: user %s is already a member of channel %s", userId, streamId)
			}

			userId = creator
			permission = auth.PermissionInvite
		}
	case MembershipOp_SO_JOIN:
		if userId != creator {
			return status.Errorf(codes.InvalidArgument, "AddEvent: user %s must join themselves, channel %s", userId, streamId)
		}
		if member {
			return status.Errorf(codes.InvalidArgument, "AddEvent: user %s is already a member of channel %s", userId, streamId)
		}
		// join event should be allowed for read only users
		permission = auth.PermissionRead
	case MembershipOp_SO_LEAVE:
		// TODO-ENT: add check that the creator is either the user or the admin
		if !member {
			return status.Errorf(codes.InvalidArgument, "AddEvent: user %s is not a member of channel %s", userId, streamId)
		}
		permission = auth.PermissionRead
	case MembershipOp_SO_UNSPECIFIED:
		permission = auth.PermissionUndefined
	}

	if permission != auth.PermissionUndefined {
		info, err := StreamInfoFromInceptionEvent(view.InceptionEvent(), streamId, userId)
		if err != nil {
			return status.Errorf(codes.Internal, "AddEvent: error getting stream info: %v", err)
		}

		allowed, err := s.townsContract.IsAllowed(
			ctx,
			auth.AuthorizationArgs{
				StreamId:   streamId,
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
	inviterId, err := common.AddressHex(originEvent.Event.CreatorAddress)
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
