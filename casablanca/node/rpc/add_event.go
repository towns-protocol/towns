package rpc

import (
	"bytes"
	"context"
	"fmt"
	"strings"

	"connectrpc.com/connect"

	"github.com/river-build/river/auth"
	. "github.com/river-build/river/base"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/shared"
)

var addEventRequests = infra.NewSuccessMetrics("add_event_requests", serviceRequests)

func (s *Service) localAddEvent(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
	nodes *StreamNodes,
) (*connect.Response[AddEventResponse], error) {
	log := dlog.CtxLog(ctx)

	parsedEvent, err := ParseEvent(req.Msg.Event)
	if err != nil {
		addEventRequests.FailInc()
		return nil, AsRiverError(err).Func("localAddEvent")
	}

	log.Debug("localAddEvent", "parsedEvent", parsedEvent)

	err = s.addParsedEvent(ctx, req.Msg.StreamId, parsedEvent, nodes)
	if err == nil {
		addEventRequests.PassInc()
		return connect.NewResponse(&AddEventResponse{}), nil
	} else {
		addEventRequests.FailInc()
		return nil, AsRiverError(err).Func("localAddEvent")
	}
}

func (s *Service) addParsedEvent(ctx context.Context, streamId string, parsedEvent *ParsedEvent, nodes *StreamNodes) error {
	if parsedEvent.Event.PrevMiniblockHash == nil {
		return RiverError(Err_INVALID_ARGUMENT, "event has no prevMiniblockHash")
	}

	localStream, streamView, err := s.cache.GetStream(ctx, streamId, nodes)
	if err != nil {
		return err
	}

	// check preceding miniblock hash
	err = streamView.ValidateNextEvent(parsedEvent, &s.streamConfig.RecencyConstraints)
	if err != nil {
		return err
	}

	stream := &replicatedStream{
		streamId:    streamId,
		localStream: localStream,
		nodes:       nodes,
		service:     s,
	}

	// check event type
	streamEvent := parsedEvent.Event

	// make sure the stream event is of the same type as the inception event
	err = streamEvent.VerifyPayloadTypeMatchesStreamType(streamView.InceptionPayload())
	if err != nil {
		return err
	}

	// custom business logic...
	switch payload := streamEvent.Payload.(type) {
	case *StreamEvent_ChannelPayload:
		return s.addChannelPayload(ctx, payload, stream, streamView, parsedEvent)

	case *StreamEvent_DmChannelPayload:
		return s.addDmChannelPayload(ctx, payload, stream, streamView, parsedEvent)

	case *StreamEvent_GdmChannelPayload:
		return s.addGdmChannelPayload(ctx, payload, stream, streamView, parsedEvent)

	case *StreamEvent_SpacePayload:
		return s.addSpacePayload(ctx, payload, stream, streamView, parsedEvent)

	case *StreamEvent_UserPayload:
		return s.addUserPayload(ctx, payload, stream, parsedEvent)

	case *StreamEvent_UserDeviceKeyPayload:
		return s.addUserDeviceKeyPayload(ctx, payload, parsedEvent, stream, streamView)

	case *StreamEvent_UserSettingsPayload:
		return s.addUserSettingsPayload(ctx, payload, stream, parsedEvent)

	case *StreamEvent_UserToDevicePayload:
		return s.addUserToDevicePayload(ctx, payload, stream, streamView, parsedEvent)

	case *StreamEvent_MediaPayload:
		return s.addMediaPayload(ctx, payload, stream, streamView, parsedEvent)

	case *StreamEvent_CommonPayload:
		return s.addCommonPayload(ctx, payload, stream, streamView, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown payload type")
	}
}

func (s *Service) addChannelPayload(
	ctx context.Context,
	payload *StreamEvent_ChannelPayload,
	stream AddableStream,
	streamView StreamView,
	parsedEvent *ParsedEvent,
) error {
	switch content := payload.ChannelPayload.Content.(type) {
	case *ChannelPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *ChannelPayload_Membership:
		return s.addMembershipEvent(ctx, stream, streamView, parsedEvent, content.Membership)

	case *ChannelPayload_Message:
		return s.addChannelMessage(ctx, stream, streamView, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addDmChannelPayload(
	ctx context.Context,
	payload *StreamEvent_DmChannelPayload,
	stream AddableStream,
	streamView StreamView,
	parsedEvent *ParsedEvent,
) error {
	switch content := payload.DmChannelPayload.Content.(type) {
	case *DmChannelPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *DmChannelPayload_Membership:
		return s.addDMMembershipEvent(ctx, stream, streamView, parsedEvent, content.Membership)

	case *DmChannelPayload_Message:
		return s.addDMChannelMessage(ctx, stream, streamView, parsedEvent)

	case *DmChannelPayload_DisplayName:
		return s.addDisplayNameEvent(ctx, stream, streamView, parsedEvent)

	case *DmChannelPayload_Username:
		return s.addUsernameEvent(ctx, stream, streamView, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addGdmChannelPayload(
	ctx context.Context,
	payload *StreamEvent_GdmChannelPayload,
	stream AddableStream,
	streamView StreamView,
	parsedEvent *ParsedEvent,
) error {
	switch content := payload.GdmChannelPayload.Content.(type) {
	case *GdmChannelPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *GdmChannelPayload_Membership:
		return s.addGDMMembershipEvent(ctx, stream, streamView, parsedEvent, content.Membership)

	case *GdmChannelPayload_Message:
		return s.addGDMChannelMessage(ctx, stream, streamView, parsedEvent)

	case *GdmChannelPayload_DisplayName:
		return s.addDisplayNameEvent(ctx, stream, streamView, parsedEvent)

	case *GdmChannelPayload_Username:
		return s.addUsernameEvent(ctx, stream, streamView, parsedEvent)

	case *GdmChannelPayload_ChannelProperties:
		return s.addGDMChannelPropertiesEvent(ctx, stream, streamView, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addSpacePayload(
	ctx context.Context,
	payload *StreamEvent_SpacePayload,
	stream AddableStream,
	streamView StreamView,
	parsedEvent *ParsedEvent,
) error {
	switch content := payload.SpacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *SpacePayload_Membership:
		return s.addMembershipEvent(ctx, stream, streamView, parsedEvent, content.Membership)

	case *SpacePayload_Channel_:
		return s.updateChannel(ctx, stream, streamView, parsedEvent)

	case *SpacePayload_Username:
		return s.addUsernameEvent(ctx, stream, streamView, parsedEvent)

	case *SpacePayload_DisplayName:
		return s.addDisplayNameEvent(ctx, stream, streamView, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addUserPayload(
	ctx context.Context,
	payload *StreamEvent_UserPayload,
	stream AddableStream,
	parsedEvent *ParsedEvent,
) error {
	switch payload.UserPayload.Content.(type) {
	case *UserPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *UserPayload_UserMembership_:
		err := s.checkCreatedByValidNode(ctx, parsedEvent)
		if err != nil {
			return err
		}
		return stream.AddEvent(ctx, parsedEvent)
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addUsernameEvent(ctx context.Context, stream AddableStream, view StreamView, parsedEvent *ParsedEvent) error {
	creator, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	// Check if user is a member of the space
	member, err := s.checkMembership(ctx, view, creator)
	if err != nil {
		return err
	}

	if !member {
		return RiverError(Err_PERMISSION_DENIED, "user is not a member of space", "user", creator)
	}

	return stream.AddEvent(ctx, parsedEvent)
}

func (s *Service) addDisplayNameEvent(ctx context.Context, stream AddableStream, view StreamView, parsedEvent *ParsedEvent) error {
	creator, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	// Check if user is a member of the space
	member, err := s.checkMembership(ctx, view, creator)
	if err != nil {
		return err
	}

	if !member {
		return RiverError(Err_PERMISSION_DENIED, "user is not a member of space", "user", creator)
	}

	return stream.AddEvent(ctx, parsedEvent)
}

func (s *Service) addUserDeviceKeyPayload(
	ctx context.Context,
	payload *StreamEvent_UserDeviceKeyPayload,
	parsedEvent *ParsedEvent,
	stream AddableStream,
	streamView StreamView,
) error {
	// RDK registration/revoke has to be done directly by the user
	switch payload.UserDeviceKeyPayload.Content.(type) {
	case *UserDeviceKeyPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *UserDeviceKeyPayload_MegolmDevice_:
		return s.addUserDeviceKeyEvent(ctx, stream, streamView, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addUserToDevicePayload(
	ctx context.Context,
	payload *StreamEvent_UserToDevicePayload,
	stream AddableStream,
	streamView StreamView,
	parsedEvent *ParsedEvent,
) error {
	switch payload.UserToDevicePayload.Content.(type) {
	case *UserToDevicePayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")
	case *UserToDevicePayload_MegolmSessions_:
		return stream.AddEvent(ctx, parsedEvent)
	case *UserToDevicePayload_Ack_:
		err := s.checkIsCreatorOfUserStream(ctx, streamView, parsedEvent)
		if err != nil {
			return err
		}
		return stream.AddEvent(ctx, parsedEvent)
	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (*Service) addUserSettingsPayload(
	ctx context.Context,
	payload *StreamEvent_UserSettingsPayload,
	stream AddableStream,
	parsedEvent *ParsedEvent,
) error {
	switch payload.UserSettingsPayload.Content.(type) {
	case *UserSettingsPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *UserSettingsPayload_FullyReadMarkers_:
		return stream.AddEvent(ctx, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addMediaPayload(
	ctx context.Context,
	payload *StreamEvent_MediaPayload,
	stream AddableStream,
	streamView StreamView,
	parsedEvent *ParsedEvent,
) error {
	switch content := payload.MediaPayload.Content.(type) {
	case *MediaPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *MediaPayload_Chunk_:
		return s.addMediaChunk(ctx, stream, streamView, content.Chunk, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addCommonPayload(
	ctx context.Context,
	payload *StreamEvent_CommonPayload,
	stream AddableStream,
	streamView StreamView,
	parsedEvent *ParsedEvent,
) error {
	creator, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}
	switch streamView.InceptionPayload().(type) {
	case *UserPayload_Inception:
		err := s.checkIsCreatorOfUserStream(ctx, streamView, parsedEvent)
		if err != nil {
			return err
		}
	case *ChannelPayload_Inception:
		err := s.checkJoinedOrInvited(ctx, streamView, creator)
		if err != nil {
			return err
		}
	case *GdmChannelPayload_Inception:
		err := s.checkJoinedOrInvited(ctx, streamView, creator)
		if err != nil {
			return err
		}
	case *DmChannelPayload_Inception:
		err := s.checkJoinedOrInvited(ctx, streamView, creator)
		if err != nil {
			return err
		}
	case *SpacePayload_Inception:
		err := s.checkJoinedOrInvited(ctx, streamView, creator)
		if err != nil {
			return err
		}
	case *UserSettingsPayload_Inception:
		err := s.checkIsCreatorOfUserStream(ctx, streamView, parsedEvent)
		if err != nil {
			return err
		}
	case *UserDeviceKeyPayload_Inception:
		err := s.checkIsCreatorOfUserStream(ctx, streamView, parsedEvent)
		if err != nil {
			return err
		}
	case *UserToDevicePayload_Inception:
		err := s.checkIsCreatorOfUserStream(ctx, streamView, parsedEvent)
		if err != nil {
			return err
		}
	default:
		return RiverError(Err_STREAM_BAD_EVENT, "unimplemented stream type").Func("addCommonPayload")
	}

	return stream.AddEvent(ctx, parsedEvent)
}

func (s *Service) addChannelMessage(ctx context.Context, stream AddableStream, view StreamView, parsedEvent *ParsedEvent) error {
	streamId := view.StreamId()
	user, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	// check if user is a member of the channel
	member, err := s.checkMembership(ctx, view, user)
	if err != nil {
		return err
	}
	if !member {
		return RiverError(Err_PERMISSION_DENIED, "user is not a member of channel", "user", user)
	}

	channelInfo, err := ChannelInceptionFromView(view)
	if err != nil {
		return err
	}

	err = s.authChecker.CheckPermission(
		ctx,
		auth.NewAuthCheckArgsForChannel(
			channelInfo.SpaceId,
			streamId,
			user,
			auth.PermissionWrite,
		),
	)
	if err != nil {
		return err
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}
	// send push notification if it is enabled. fire-and-forget.
	if s.notification != nil {
		// Client connection session may be closed while the node is sending the
		// notification request. It causes random context cancellation. Using
		// context.Background() to avoid this issue.
		s.notification.SendPushNotification(context.Background(), view, user, parsedEvent.Event)
	}
	return nil
}

func (s *Service) addDMChannelMessage(ctx context.Context, stream AddableStream, view StreamView, parsedEvent *ParsedEvent) error {
	streamId := view.StreamId()
	userId, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	inceptionPayload := view.InceptionPayload()
	info, err := DMStreamInfoFromInceptionPayload(inceptionPayload, streamId)
	if err != nil {
		return err
	}

	if userId != info.FirstPartyId && userId != info.SecondPartyId {
		return RiverError(Err_PERMISSION_DENIED, "user is not a member of DM", "user", userId)
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}
	// send push notification if it is enabled. fire-and-forget.
	if s.notification != nil {
		// Client connection session may be closed while the node is sending the
		// notification request. It causes random context cancellation. Using
		// context.Background() to avoid this issue.
		s.notification.SendPushNotification(context.Background(), view, userId, parsedEvent.Event)
	}
	return nil
}

func (s *Service) addGDMChannelMessage(ctx context.Context, stream AddableStream, view StreamView, parsedEvent *ParsedEvent) error {
	userId, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}
	member, err := s.checkMembership(ctx, view, userId)
	if err != nil {
		return err
	}

	if !member {
		return RiverError(Err_PERMISSION_DENIED, "user is not a member of gdm channel", "user", userId)
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}
	// send push notification if it is enabled. fire-and-forget.
	if s.notification != nil {
		// Client connection session may be closed while the node is sending the
		// notification request. It causes random context cancellation. Using
		// context.Background() to avoid this issue.
		s.notification.SendPushNotification(context.Background(), view, userId, parsedEvent.Event)
	}
	return nil
}

func (s *Service) addGDMChannelPropertiesEvent(
	ctx context.Context,
	stream AddableStream,
	view StreamView,
	parsedEvent *ParsedEvent,
) error {
	userId, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}
	member, err := s.checkMembership(ctx, view, userId)
	if err != nil {
		return err
	}

	if !member {
		return RiverError(Err_PERMISSION_DENIED, "user is not a member of gdm channel", "user", userId)
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}
	return nil
}

func (s *Service) checkMembership(ctx context.Context, streamView StreamView, userId string) (bool, error) {
	view := streamView.(JoinableStreamView)
	if view == nil {
		return false, RiverError(Err_INTERNAL, "stream is not joinable")
	}
	return view.IsUserJoined(userId)
}

func (s *Service) checkInvited(ctx context.Context, streamView StreamView, userId string) (bool, error) {
	view := streamView.(JoinableStreamView)
	if view == nil {
		return false, RiverError(Err_INTERNAL, "stream is not joinable")
	}
	return view.IsUserInvited(userId)
}

func (s *Service) checkCreatedByValidNode(ctx context.Context, parsedEvent *ParsedEvent) error {
	creatorAddressStr, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}
	return s.nodeRegistry.CheckNodeIsValid(creatorAddressStr)
}

func (s *Service) updateChannel(ctx context.Context, stream AddableStream, view StreamView, parsedEvent *ParsedEvent) error {
	if (parsedEvent.Event.GetSpacePayload() == nil) || (parsedEvent.Event.GetSpacePayload().GetChannel() == nil) {
		return RiverError(Err_INVALID_ARGUMENT, "invalid channel update event")
	}

	op := parsedEvent.Event.GetSpacePayload().GetChannel().Op
	if op == ChannelOp_CO_CREATED || op == ChannelOp_CO_DELETED {
		err := s.checkCreatedByValidNode(ctx, parsedEvent)
		if err != nil {
			return err
		}
	}

	return stream.AddEvent(ctx, parsedEvent)
}

func (s *Service) addMembershipEvent(
	ctx context.Context,
	stream AddableStream,
	view StreamView,
	parsedEvent *ParsedEvent,
	membership *Membership,
) error {
	streamId := view.StreamId()
	userId := membership.UserId
	userStreamId, err := shared.UserStreamIdFromId(userId)
	if err != nil {
		return err
	}

	// Check if user stream exists
	userStream, userStreamView, err := s.loadStream(ctx, userStreamId)
	if err != nil {
		return err
	}

	// Check if user is a member of the channel
	member, err := s.checkMembership(ctx, view, userId)
	if err != nil {
		return err
	}

	creator, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	var permission auth.Permission
	switch membership.Op {
	case MembershipOp_SO_INVITE:
		if member {
			return RiverError(Err_FAILED_PRECONDITION, "user is already a member of the channel", "user", userId)
		}
		userId = creator
		permission = auth.PermissionInvite

	case MembershipOp_SO_JOIN:
		if userId != creator {
			return RiverError(Err_PERMISSION_DENIED, "user must join themselves", "user", userId)
		}
		if member {
			return RiverError(Err_FAILED_PRECONDITION, "user is already a member of the channel", "user", userId)
		}
		// join event should be allowed for read only users
		permission = auth.PermissionRead

	case MembershipOp_SO_LEAVE:
		// TODO-ENT: add check that the creator is either the user or the admin
		if !member {
			return RiverError(Err_FAILED_PRECONDITION, "user is not a member of the channel", "user", userId)
		}
		permission = auth.PermissionRead

	case MembershipOp_SO_UNSPECIFIED:
		fallthrough

	default:
		return RiverError(Err_BAD_EVENT, "Need valid membership op", "op", membership.Op)
	}

	var args *auth.AuthCheckArgs
	switch i := view.InceptionPayload().(type) {
	case *SpacePayload_Inception:
		args = auth.NewAuthCheckArgsForSpace(
			streamId,
			userId,
			permission,
		)
	case *ChannelPayload_Inception:
		args = auth.NewAuthCheckArgsForChannel(
			i.SpaceId,
			streamId,
			userId,
			permission,
		)
	default:
		return RiverError(Err_INTERNAL, "Must be space or channel")
	}

	err = s.authChecker.CheckPermission(ctx, args)
	if err != nil {
		return err
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}

	return s.addDerivedMembershipEventToUserStream(ctx, userStream, userStreamView, streamId, parsedEvent, membership.Op)
}

func (s *Service) addDMMembershipEvent(
	ctx context.Context,
	stream AddableStream,
	view StreamView,
	parsedEvent *ParsedEvent,
	membership *Membership,
) error {
	streamId := view.StreamId()
	inceptionPayload := view.InceptionPayload()
	info, err := DMStreamInfoFromInceptionPayload(inceptionPayload, streamId)
	if err != nil {
		return err
	}

	if membership.UserId != info.FirstPartyId && membership.UserId != info.SecondPartyId {
		return RiverError(Err_PERMISSION_DENIED, "user is not a member of DM", "user", membership.UserId)
	}

	creator, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	if creator != membership.UserId {
		return RiverError(Err_PERMISSION_DENIED, "user must join/leave themselves", "user", membership.UserId)
	}

	if membership.Op != MembershipOp_SO_LEAVE && membership.Op != MembershipOp_SO_JOIN {
		return RiverError(Err_PERMISSION_DENIED, "only join and leave events are permitted")
	}

	userId := membership.UserId
	userStreamId, err := shared.UserStreamIdFromId(userId)
	if err != nil {
		return err
	}

	// Check if user stream exists
	userStream, userStreamView, err := s.loadStream(ctx, userStreamId)
	if err != nil {
		return err
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}
	return s.addDerivedMembershipEventToUserStream(ctx, userStream, userStreamView, streamId, parsedEvent, membership.Op)
}

func (s *Service) addGDMMembershipEvent(
	ctx context.Context,
	stream AddableStream,
	view StreamView,
	parsedEvent *ParsedEvent,
	membership *Membership,
) error {
	streamId := view.StreamId()
	creatorUserId, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	switch membership.Op {
	case MembershipOp_SO_INVITE, MembershipOp_SO_LEAVE:
		member, err := s.checkMembership(ctx, view, creatorUserId)
		if err != nil {
			return err
		}
		if !member {
			return RiverError(Err_PERMISSION_DENIED, "user is not a member of gdm channel", "user", creatorUserId)
		}

	case MembershipOp_SO_JOIN:
		member, err := s.checkMembership(ctx, view, membership.UserId)
		if err != nil {
			return err
		}
		if member {
			return RiverError(Err_FAILED_PRECONDITION, "user is already a member of the channel", "user", membership.UserId)
		}

		invited, err := s.checkInvited(ctx, view, membership.UserId)
		if err != nil {
			return err
		}
		if !invited {
			return RiverError(Err_FAILED_PRECONDITION, "user is not invited to the channel", "user", membership.UserId)
		}

	case MembershipOp_SO_UNSPECIFIED:
		return RiverError(Err_BAD_EVENT, "invalid membership op")
	}

	userStreamId, err := shared.UserStreamIdFromId(membership.UserId)
	if err != nil {
		return err
	}

	// Check if user stream exists
	userStream, userStreamView, err := s.loadStream(ctx, userStreamId)
	if err != nil {
		return err
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}

	return s.addDerivedMembershipEventToUserStream(ctx, userStream, userStreamView, streamId, parsedEvent, membership.Op)
}

func (s *Service) addDerivedMembershipEventToUserStream(
	ctx context.Context,
	userStream AddableStream,
	userStreamView StreamView,
	originStreamId string,
	originEvent *ParsedEvent,
	op MembershipOp,
) error {
	inviterId, err := shared.AddressHex(originEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	prevHash := userStreamView.LastBlock().Hash
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
		prevHash,
	)
	if err != nil {
		return err
	}

	return userStream.AddEvent(ctx, userStreamEvent)
}

func (s *Service) checkIsCreatorOfUserStream(ctx context.Context, streamView StreamView, parsedEvent *ParsedEvent) error {
	creator, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	parts := strings.Split(streamView.StreamId(), "-")
	if len(parts) != 2 {
		return RiverError(Err_INTERNAL, "invalid stream id")
	}

	userIdPart := parts[1]
	if userIdPart != creator {
		return RiverError(Err_PERMISSION_DENIED, "only creator is allowed to add to user stream")
	}

	return nil
}

func (s *Service) checkUserDeviceKeyEvent(
	ctx context.Context,
	streamView StreamView,
	parsedEvent *ParsedEvent,
) error {
	// only creator is allowed to add to user device key stream
	creator, err := shared.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	deviceStreamId, err := shared.UserDeviceKeyStreamIdFromId(creator)
	if err != nil {
		return err
	}

	if streamView.StreamId() != deviceStreamId {
		return RiverError(Err_PERMISSION_DENIED, "only creator is allowed to add to user device key stream")
	}

	return nil
}

func (s *Service) addUserDeviceKeyEvent(
	ctx context.Context,
	stream AddableStream,
	streamView StreamView,
	parsedEvent *ParsedEvent,
) error {
	err := s.checkUserDeviceKeyEvent(ctx, streamView, parsedEvent)
	if err != nil {
		return err
	}
	return stream.AddEvent(ctx, parsedEvent)
}

func (s *Service) addMediaChunk(
	ctx context.Context,
	stream AddableStream,
	streamView StreamView,
	chunk *MediaPayload_Chunk,
	parsedEvent *ParsedEvent,
) error {
	inceptionPayload := streamView.InceptionPayload()

	lastEventCreatorAddress := streamView.LastEvent().Event.CreatorAddress
	if !bytes.Equal(parsedEvent.Event.CreatorAddress, lastEventCreatorAddress) {
		return RiverError(Err_PERMISSION_DENIED, "only the creator of the stream can add media chunks")
	}

	mediaInfo, err := MediaStreamInfoFromInceptionPayload(inceptionPayload, streamView.StreamId())
	if err != nil {
		return err
	}

	if chunk.ChunkIndex >= mediaInfo.ChunkCount || chunk.ChunkIndex < 0 {
		return RiverError(Err_INVALID_ARGUMENT, "chunk index out of bounds")
	}

	if len(chunk.Data) > s.streamConfig.Media.MaxChunkSize {
		return RiverError(
			Err_INVALID_ARGUMENT,
			fmt.Sprintf("chunk size must be less than or equal to %d", s.streamConfig.Media.MaxChunkSize),
		)
	}

	return stream.AddEvent(ctx, parsedEvent)
}

func (s *Service) checkJoinedOrInvited(ctx context.Context, streamView StreamView, userId string) error {
	view := streamView.(JoinableStreamView)
	if view == nil {
		return RiverError(Err_INTERNAL, "stream is not joinable")
	}

	joined, err := view.IsUserJoined(userId)
	if err != nil {
		return err
	}
	if joined {
		return nil
	}

	invited, err := view.IsUserInvited(userId)
	if err != nil {
		return err
	}
	if invited {
		return nil
	}

	return RiverError(Err_PERMISSION_DENIED, "user is not a joined or invited to stream", "user", userId)
}
