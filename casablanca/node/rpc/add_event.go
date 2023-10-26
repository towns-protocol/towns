package rpc

import (
	"bytes"
	"context"
	"encoding/hex"
	"fmt"

	"github.com/bufbuild/connect-go"

	"casablanca/node/auth"
	. "casablanca/node/base"
	"casablanca/node/common"
	"casablanca/node/crypto"
	"casablanca/node/dlog"
	. "casablanca/node/events"
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"casablanca/node/storage"
)

var (
	addEventRequests = infra.NewSuccessMetrics("add_event_requests", serviceRequests)
)

func (s *Service) localAddEvent(ctx context.Context, req *connect.Request[AddEventRequest]) (*connect.Response[AddEventResponse], error) {
	log := dlog.CtxLog(ctx)

	parsedEvent, err := ParseEvent(req.Msg.Event)
	if err != nil {
		addEventRequests.Fail()
		return nil, AsRiverError(err).Func("localAddEvent")
	}

	log.Debug("localAddEvent", "parsedEvent", parsedEvent)

	err = s.addParsedEvent(ctx, req.Msg.StreamId, parsedEvent)
	if err == nil {
		addEventRequests.Pass()
		return connect.NewResponse(&AddEventResponse{}), nil
	} else {
		addEventRequests.Fail()
		return nil, AsRiverError(err).Func("localAddEvent")
	}
}

func (s *Service) addParsedEvent(ctx context.Context, streamId string, parsedEvent *ParsedEvent) error {
	var err error
	if !s.skipDelegateCheck {
		err = s.checkStaleDelegate(ctx, []*ParsedEvent{parsedEvent})
		if err != nil {
			return err
		}
	}

	if len(parsedEvent.Event.PrevEvents) == 0 {
		return RiverError(Err_INVALID_ARGUMENT, "event has no prev events")
	}

	stream, streamView, err := s.loadStream(ctx, streamId)
	if err != nil {
		return err
	}

	// TODO: fix this check to take blocks into account
	// check if previous event's hashes match
	// for _, prevEvent := range parsedEvent.PrevEventStrs {
	// 	if !streamView.HasEvent(prevEvent) {
	// 		return status.Errorf(codes.InvalidArgument, "prev event not found")
	// 	}
	// }

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

	case *StreamEvent_SpacePayload:
		return s.addSpacePayload(ctx, payload, stream, streamView, parsedEvent)

	case *StreamEvent_UserPayload:
		return s.addUserPayload(ctx, payload, stream, parsedEvent)

	case *StreamEvent_UserDeviceKeyPayload:
		return s.addUserDeviceKeyPayload(ctx, payload, parsedEvent, stream, streamView)

	case *StreamEvent_UserSettingsPayload:
		return s.addUserSettingsPayload(ctx, payload, stream, parsedEvent)

	case *StreamEvent_MediaPayload:
		return s.addMediaPayload(ctx, payload, stream, streamView, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown payload type")
	}
}

func (s *Service) addChannelPayload(ctx context.Context, payload *StreamEvent_ChannelPayload, stream Stream, streamView StreamView, parsedEvent *ParsedEvent) error {
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

func (s *Service) addDmChannelPayload(ctx context.Context, payload *StreamEvent_DmChannelPayload, stream Stream, streamView StreamView, parsedEvent *ParsedEvent) error {
	switch content := payload.DmChannelPayload.Content.(type) {
	case *DmChannelPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *DmChannelPayload_Membership:
		return s.addDMMembershipEvent(ctx, stream, streamView, parsedEvent, content.Membership)

	case *DmChannelPayload_Message:
		return s.addDMChannelMessage(ctx, stream, streamView, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addSpacePayload(ctx context.Context, payload *StreamEvent_SpacePayload, stream Stream, streamView StreamView, parsedEvent *ParsedEvent) error {
	switch content := payload.SpacePayload.Content.(type) {
	case *SpacePayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *SpacePayload_Membership:
		return s.addMembershipEvent(ctx, stream, streamView, parsedEvent, content.Membership)

	case *SpacePayload_Channel_:
		return s.updateChannel(ctx, stream, streamView, parsedEvent)

	case *SpacePayload_Username:
		return s.addUsernameEvent(ctx, stream, streamView, parsedEvent, content)

	case *SpacePayload_DisplayName:
		return s.addDisplayNameEvent(ctx, stream, streamView, parsedEvent, content)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addUserPayload(ctx context.Context, payload *StreamEvent_UserPayload, stream Stream, parsedEvent *ParsedEvent) error {
	switch payload.UserPayload.Content.(type) {
	case *UserPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *UserPayload_UserMembership_:
		err := s.checkCreatedByValidNode(ctx, parsedEvent)
		if err != nil {
			return err
		}
		return stream.AddEvent(ctx, parsedEvent)

	case *UserPayload_ToDevice_:
		return stream.AddEvent(ctx, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addUsernameEvent(ctx context.Context, stream Stream, view StreamView, parsedEvent *ParsedEvent, username *SpacePayload_Username) error {
	creator, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
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

func (s *Service) addDisplayNameEvent(ctx context.Context, stream Stream, view StreamView, parsedEvent *ParsedEvent, username *SpacePayload_DisplayName) error {
	creator, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
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

func (s *Service) addUserDeviceKeyPayload(ctx context.Context, payload *StreamEvent_UserDeviceKeyPayload, parsedEvent *ParsedEvent, stream Stream, streamView StreamView) error {
	// RDK registration/revoke has to be done directly by the user
	switch payload := payload.UserDeviceKeyPayload.Content.(type) {
	case *UserDeviceKeyPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *UserDeviceKeyPayload_UserDeviceKey_:
		if payload.UserDeviceKey.RiverKeyOp != nil {
			if len(parsedEvent.Event.DelegateSig) > 0 {
				return RiverError(Err_INVALID_ARGUMENT, "RiverDeviceKey event cannot be delegated")
			}
		}
		return s.addUserDeviceKeyEvent(ctx, stream, streamView, parsedEvent, payload.UserDeviceKey)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (*Service) addUserSettingsPayload(ctx context.Context, payload *StreamEvent_UserSettingsPayload, stream Stream, parsedEvent *ParsedEvent) error {
	switch payload.UserSettingsPayload.Content.(type) {
	case *UserSettingsPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *UserSettingsPayload_FullyReadMarkers_:
		return stream.AddEvent(ctx, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addMediaPayload(ctx context.Context, payload *StreamEvent_MediaPayload, stream Stream, streamView StreamView, parsedEvent *ParsedEvent) error {
	switch content := payload.MediaPayload.Content.(type) {
	case *MediaPayload_Inception_:
		return RiverError(Err_INVALID_ARGUMENT, "can't add inception event")

	case *MediaPayload_Chunk_:
		return s.addMediaChunk(ctx, stream, streamView, content.Chunk, parsedEvent)

	default:
		return RiverError(Err_INVALID_ARGUMENT, "unknown content type")
	}
}

func (s *Service) addChannelMessage(ctx context.Context, stream Stream, view StreamView, parsedEvent *ParsedEvent) error {
	streamId := view.StreamId()
	user, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	info, err := StreamInfoFromInceptionPayload(view.InceptionPayload(), streamId, user)
	if err != nil {
		return err
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
		return err
	}
	if !allowed {
		return RiverError(Err_PERMISSION_DENIED, "user is not allowed to write to stream", "user", user)
	}

	// check if user is a member of the channel
	member, err := s.checkMembership(ctx, view, user)
	if err != nil {
		return err
	}
	if !member {
		return RiverError(Err_PERMISSION_DENIED, "user is not a member of channel", "user", user)
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
		s.notification.SendPushNotification(context.Background(), info, &view, user)
	}
	return nil
}

func (s *Service) addDMChannelMessage(ctx context.Context, stream Stream, view StreamView, parsedEvent *ParsedEvent) error {
	streamId := view.StreamId()
	userId, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
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
		info, err := StreamInfoFromInceptionPayload(view.InceptionPayload(), streamId, userId)
		if err != nil {
			return err
		}
		// Client connection session may be closed while the node is sending the
		// notification request. It causes random context cancellation. Using
		// context.Background() to avoid this issue.
		s.notification.SendPushNotification(context.Background(), info, &view, userId)
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

func (s *Service) checkCreatedByValidNode(ctx context.Context, parsedEvent *ParsedEvent) error {
	creatorAddressStr, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}
	return s.nodeRegistry.CheckNodeIsValid(creatorAddressStr)
}

func (s *Service) updateChannel(ctx context.Context, stream Stream, view StreamView, parsedEvent *ParsedEvent) error {
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

func (s *Service) addMembershipEvent(ctx context.Context, stream Stream, view StreamView, parsedEvent *ParsedEvent, membership *Membership) error {
	streamId := view.StreamId()
	userId := membership.UserId
	userStreamId, err := common.UserStreamIdFromId(userId)
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

	creator, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	permission := auth.PermissionUndefined
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
		permission = auth.PermissionUndefined
	}

	if permission != auth.PermissionUndefined {
		info, err := StreamInfoFromInceptionPayload(view.InceptionPayload(), streamId, userId)
		if err != nil {
			return err
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
			return err
		}
		if !allowed {
			return RiverError(Err_PERMISSION_DENIED, "user is not allowed to write to stream", "user", userId)
		}
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}

	return s.addDerivedMembershipEventToUserStream(ctx, userStream, userStreamView, streamId, parsedEvent, membership.Op)
}

func (s *Service) addDMMembershipEvent(ctx context.Context, stream Stream, view StreamView, parsedEvent *ParsedEvent, membership *Membership) error {

	streamId := view.StreamId()
	inceptionPayload := view.InceptionPayload()
	info, err := DMStreamInfoFromInceptionPayload(inceptionPayload, streamId)
	if err != nil {
		return err
	}

	if membership.UserId != info.FirstPartyId && membership.UserId != info.SecondPartyId {
		return RiverError(Err_PERMISSION_DENIED, "user is not a member of DM", "user", membership.UserId)
	}

	creator, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
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
	userStreamId, err := common.UserStreamIdFromId(userId)
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

func (s *Service) addDerivedMembershipEventToUserStream(ctx context.Context, userStream Stream, userStreamView StreamView, originStreamId string, originEvent *ParsedEvent, op MembershipOp) error {
	inviterId, err := common.AddressHex(originEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	prevHashes := [][]byte{userStreamView.LastEvent().Hash}
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
		prevHashes,
	)
	if err != nil {
		return err
	}

	return userStream.AddEvent(ctx, userStreamEvent)
}

func (s *Service) checkUserDeviceKeyEvent(ctx context.Context,
	stream Stream,
	streamView StreamView,
	parsedEvent *ParsedEvent) error {
	// only creator is allowed to add to user device key stream
	creator, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
	if err != nil {
		return err
	}

	deviceStreamId, err := common.UserDeviceKeyStreamIdFromId(creator)
	if err != nil {
		return err
	}

	if streamView.StreamId() != deviceStreamId {
		return RiverError(Err_PERMISSION_DENIED, "only creator is allowed to add to user device key stream")
	}

	return nil
}

func (s *Service) checkRiverKeyManagementEvent(ctx context.Context, stream Stream, streamView StreamView, parsedEvent *ParsedEvent, payload *UserDeviceKeyPayload_UserDeviceKey) error {
	if payload.RiverKeyOp == nil {
		return nil
	}

	if payload.DeviceKeys == nil {
		return RiverError(Err_INVALID_ARGUMENT, "river key op requires device keys")
	}

	deviceId := payload.GetDeviceKeys().DeviceId
	rdkId, err := hex.DecodeString(deviceId)
	if err != nil {
		return err
	}

	if len(rdkId) != crypto.TOWNS_HASH_SIZE {
		return RiverError(Err_INVALID_ARGUMENT, "invalid river device key id")
	}

	return nil
}

func (s *Service) addUserDeviceKeyEvent(ctx context.Context, stream Stream, streamView StreamView, parsedEvent *ParsedEvent, payload *UserDeviceKeyPayload_UserDeviceKey) error {
	err := s.checkUserDeviceKeyEvent(ctx, stream, streamView, parsedEvent)
	if err != nil {
		return err
	}
	err = s.checkRiverKeyManagementEvent(ctx, stream, streamView, parsedEvent, payload)
	if err != nil {
		return err
	}
	return stream.AddEvent(ctx, parsedEvent)
}

func (s *Service) checkStaleDelegate(ctx context.Context, parsedEvents []*ParsedEvent) error {
	for _, parsedEvent := range parsedEvents {
		if len(parsedEvent.Event.DelegateSig) == 0 {
			continue
		}

		creator, err := common.AddressHex(parsedEvent.Event.CreatorAddress)
		if err != nil {
			return err
		}
		userDeviceStreamId, err := common.UserDeviceKeyStreamIdFromId(creator)
		if err != nil {
			return err
		}
		_, userDeviceKeyStreamView, err := s.loadStream(ctx, userDeviceStreamId)
		if err != nil {
			if _, ok := err.(*storage.ErrNotFound); ok {
				// no stale delegates yet
				return nil
			}
			return err
		}
		view := userDeviceKeyStreamView.(UserDeviceStreamView)

		signerPubKey := parsedEvent.SignerPubKey

		rdkId, err := crypto.RdkIdFromPubKey(signerPubKey)
		if err != nil {
			return err
		}
		isRevoked, err := view.IsDeviceIdRevoked(rdkId)
		if err != nil {
			return err
		}
		if isRevoked {
			return RiverError(Err_STALE_DELEGATE, "stale delegate").Func("AddEvent.checkStaleDelegate")
		}
	}
	return nil
}

func (s *Service) addMediaChunk(ctx context.Context, stream Stream, streamView StreamView, chunk *MediaPayload_Chunk, parsedEvent *ParsedEvent) error {
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
		return RiverError(Err_INVALID_ARGUMENT, fmt.Sprintf("chunk size must be less than or equal to %d", s.streamConfig.Media.MaxChunkSize))
	}

	err = stream.AddEvent(ctx, parsedEvent)
	return err
}
