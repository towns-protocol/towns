package rpc

import (
	"bytes"
	"casablanca/node/auth"
	"casablanca/node/common"
	"casablanca/node/dlog"
	. "casablanca/node/events"
	"casablanca/node/infra"
	. "casablanca/node/protocol"
	"context"
	"fmt"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	. "casablanca/node/base"
	. "casablanca/node/common"
)

var (
	createStreamRequests = infra.NewSuccessMetrics("create_stream_requests", serviceRequests)
)

func (s *Service) localCreateStream(ctx context.Context, req *connect_go.Request[CreateStreamRequest]) (*connect_go.Response[CreateStreamResponse], error) {
	resMsg, err := s.createStream(ctx, req.Msg)
	if err != nil {
		createStreamRequests.Fail()
		return nil, AsRiverError(err).Func("localCreateStream")
	}
	createStreamRequests.Pass()
	return connect_go.NewResponse(resMsg), nil
}

func (s *Service) createStream(ctx context.Context, req *CreateStreamRequest) (*CreateStreamResponse, error) {
	log := dlog.CtxLog(ctx)

	if len(req.Events) == 0 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "no events")
	}

	parsedEvents, err := ParseEvents(req.Events)
	if err != nil {
		return nil, err
	}

	log.Debug("localCreateStream", "parsedEvents", parsedEvents)

	if !s.skipDelegateCheck {
		err = s.checkStaleDelegate(ctx, parsedEvents)
		if err != nil {
			return nil, err
		}
	}

	inceptionEvent := parsedEvents[0]
	inceptionPayload := inceptionEvent.Event.GetInceptionPayload()

	if inceptionPayload == nil {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "first event is not an inception event")
	}

	if inceptionPayload.GetStreamId() != req.StreamId {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "stream id in request does not match stream id in inception event")
	}

	if err := validateHashes(parsedEvents); err != nil {
		return nil, err
	}

	var streamView StreamView
	switch inception := inceptionPayload.(type) {
	case *ChannelPayload_Inception:
		streamView, err = s.createStream_Channel(ctx, log, parsedEvents, inception)

	case *SpacePayload_Inception:
		streamView, err = s.createStream_Space(ctx, log, parsedEvents, inception)

	case *UserPayload_Inception:
		streamView, err = s.createStream_User(ctx, log, parsedEvents, inception)

	case *UserDeviceKeyPayload_Inception:
		streamView, err = s.createStream_UserDeviceKey(ctx, log, parsedEvents, inception)

	case *UserSettingsPayload_Inception:
		streamView, err = s.createStream_UserSettings(ctx, log, parsedEvents, inception)

	case *MediaPayload_Inception:
		streamView, err = s.createStream_Media(ctx, log, parsedEvents, inception)

	default:
		err = RiverError(Err_BAD_STREAM_CREATION_PARAMS, "invalid stream kind")
	}

	if err != nil {
		return nil, err
	}

	if streamView == nil {
		return nil, RiverError(Err_INTERNAL, "stream not created, but there is no error")
	}

	return &CreateStreamResponse{
		Stream: &StreamAndCookie{
			Events:         streamView.MinipoolEnvelopes(),
			StreamId:       streamView.StreamId(),
			NextSyncCookie: streamView.SyncCookie(),
		},
		Miniblocks: streamView.MiniblocksFromLastSnapshot(),
	}, nil
}

func (s *Service) createStream_Channel(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *ChannelPayload_Inception,
) (StreamView, error) {
	if len(parsedEvents) != 2 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "channel stream must have exactly two events")
	}
	inceptionEvent := parsedEvents[0]
	joinEvent := parsedEvents[1]

	creatorUserStreamId, err := UserStreamIdFromAddress(inceptionEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	// Validation of creation params.
	if !ValidChannelStreamId(inception.StreamId) {
		return nil, RiverError(Err_BAD_STREAM_ID, "invalid channel stream id")
	}
	if inception.SpaceId == "" {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space id must not be empty for channel stream")
	}
	if err := validateChannelJoinEvent(joinEvent); err != nil {
		return nil, err
	}

	// Load space. Check if it exists. Used later for auth and to add the channel to the space.
	spaceStream, spaceView, err := s.loadStream(ctx, inception.SpaceId)
	if err != nil {
		return nil, err
	}

	// Load user.
	userStream, userView, err := s.loadStream(ctx, creatorUserStreamId)
	if err != nil {
		return nil, err
	}

	// Authorization.
	err = s.authAddRemoveChannelsInSpace(ctx, inceptionEvent.Event.CreatorAddress, inception.SpaceId)
	if err != nil {
		return nil, err
	}

	streamId := inception.GetStreamId()
	_, streamView, err := s.cache.CreateStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	// side effects
	prevHashes := [][]byte{spaceView.LastEvent().Hash}
	spaceStreamEvent, err := MakeParsedEventWithPayload(
		s.wallet,
		Make_SpacePayload_Channel(
			ChannelOp_CO_CREATED,
			inception.StreamId,
			inception.ChannelProperties,
			&EventRef{
				StreamId:  streamId,
				Hash:      inceptionEvent.Envelope.Hash,
				Signature: inceptionEvent.Envelope.Signature,
			},
		),
		prevHashes,
	)
	if err != nil {
		return nil, err
	}

	err = spaceStream.AddEvent(ctx, spaceStreamEvent)
	if err != nil {
		return nil, err
	}

	err = s.addDerivedMembershipEventToUserStream(ctx, userStream, userView, streamId, joinEvent, MembershipOp_SO_JOIN)
	if err != nil {
		return nil, err
	}

	return streamView, nil
}

func (s *Service) createStream_Space(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *SpacePayload_Inception,
) (StreamView, error) {
	if len(parsedEvents) != 2 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space stream must have exactly two events")
	}
	inceptionEvent := parsedEvents[0]
	joinEvent := parsedEvents[1]

	creatorUserId, err := UserStreamIdFromAddress(inceptionEvent.Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	var userStream Stream
	var userView StreamView

	// Validation of creation params.
	if !ValidSpaceStreamId(inception.StreamId) {
		return nil, RiverError(Err_BAD_STREAM_ID, "invalid space stream id")
	}
	if err := validateSpaceJoinEvent(joinEvent); err != nil {
		return nil, err
	}

	// Load user.
	userStream, userView, err = s.loadStream(ctx, creatorUserId)
	if err != nil {
		return nil, err
	}

	// Authorization.
	// TODO: this is wrong check. Real check should be "Space exists in contract and user is owner of space".
	err = s.authAddRemoveChannelsInSpace(ctx, inceptionEvent.Event.CreatorAddress, inception.StreamId)
	if err != nil {
		return nil, err
	}

	// Create stream.
	streamId := inception.GetStreamId()
	_, streamView, err := s.cache.CreateStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	// Side effects.
	err = s.addDerivedMembershipEventToUserStream(ctx, userStream, userView, streamId, joinEvent, MembershipOp_SO_JOIN)
	if err != nil {
		return nil, err
	}

	return streamView, nil
}

func (s *Service) createStream_User(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *UserPayload_Inception,
) (StreamView, error) {
	if len(parsedEvents) != 1 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user stream must have only one event")
	}

	// Validation of creation params.
	err := CheckUserStreamId(inception.StreamId, parsedEvents[0].Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	// TODO: Authorization.

	streamId := inception.GetStreamId()
	_, streamView, err := s.cache.CreateStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	return streamView, nil
}

func (s *Service) createStream_UserDeviceKey(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *UserDeviceKeyPayload_Inception,
) (StreamView, error) {
	if len(parsedEvents) != 1 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user device key stream must have only one event")
	}

	// Validation of creation params.
	err := CheckUserDeviceKeyStreamId(inception.StreamId, parsedEvents[0].Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	// TODO: Authorization.

	streamId := inception.GetStreamId()
	_, streamView, err := s.cache.CreateStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	return streamView, nil
}

func (s *Service) createStream_UserSettings(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *UserSettingsPayload_Inception,
) (StreamView, error) {
	if len(parsedEvents) != 1 {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "user settings stream must have only one event")
	}

	// Validation of creation params.
	err := CheckUserSettingsStreamId(inception.StreamId, parsedEvents[0].Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	// TODO: Authorization.

	streamId := inception.GetStreamId()
	_, streamView, err := s.cache.CreateStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	return streamView, nil
}

func (s *Service) createStream_Media(
	ctx context.Context,
	log *slog.Logger,
	parsedEvents []*ParsedEvent,
	inception *MediaPayload_Inception,
) (StreamView, error) {
	if !CheckMediaStreamId(inception.StreamId) {
		return nil, RiverError(Err_BAD_STREAM_ID, "CreateStream: invalid media stream id '%s'", inception.StreamId)
	}

	if inception.SpaceId == "" {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space id must not be empty for media stream")
	}

	if inception.ChannelId == "" {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "channel id must not be empty for media stream")
	}

	if inception.ChunkCount > int32(s.streamConfig.Media.MaxChunkCount) {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, fmt.Sprintf("chunk count must be less than or equal to %d", s.streamConfig.Media.MaxChunkCount))
	}

	// TODO: replace with stream registry stream existence check
	// Make sure that the space exists
	_, _, err := s.loadStream(ctx, inception.SpaceId)
	if err != nil {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "space does not exist")
	}

	// Make sure that the channel exists, get channelStreamView for auth
	_, channelStreamView, err := s.loadStream(ctx, inception.ChannelId)
	if err != nil {
		return nil, RiverError(Err_BAD_STREAM_CREATION_PARAMS, "channel does not exist")
	}

	user, err := common.AddressHex(parsedEvents[0].Event.CreatorAddress)
	if err != nil {
		return nil, err
	}

	info, err := StreamInfoFromInceptionPayload(channelStreamView.InceptionPayload(), inception.ChannelId, user)
	if err != nil {
		return nil, err
	}

	allowed, err := s.townsContract.IsAllowed(
		ctx,
		auth.AuthorizationArgs{
			StreamId:   inception.ChannelId,
			UserId:     user,
			Permission: auth.PermissionWrite,
		},
		info,
	)

	if err != nil {
		return nil, err
	}

	if !allowed {
		return nil, RiverError(Err_PERMISSION_DENIED, "user is not allowed to write to stream", "user", user)
	}

	// check if user is a member of the channel
	member, err := s.checkMembership(ctx, channelStreamView, user)
	if err != nil {
		return nil, err
	}
	if !member {
		return nil, RiverError(Err_PERMISSION_DENIED, "user is not a member of channel", "user", user)
	}

	streamId := inception.GetStreamId()
	_, streamView, err := s.cache.CreateStream(ctx, streamId, parsedEvents)
	if err != nil {
		return nil, err
	}

	return streamView, nil
}

func (s *Service) authAddRemoveChannelsInSpace(
	ctx context.Context,
	creatorUserAddress []byte,
	spaceId string,
) error {
	userId, err := AddressHex(creatorUserAddress)
	if err != nil {
		return err
	}

	allowed, err := s.townsContract.IsAllowed(
		ctx,
		auth.AuthorizationArgs{
			StreamId:   spaceId,
			UserId:     userId,
			Permission: auth.PermissionAddRemoveChannels,
		},
		&StreamInfo{
			SpaceId:    spaceId,
			StreamType: Space,
		},
	)
	if err != nil {
		return err
	}
	if !allowed {
		return status.Errorf(codes.PermissionDenied, "user %s is not allowed to create channels in space %s", userId, spaceId)
	}
	return nil
}

func validateHashes(events []*ParsedEvent) error {
	for i, event := range events {
		if i == 0 {
			continue
		}
		if len(event.Event.PrevEvents) != 1 || !bytes.Equal(event.Event.PrevEvents[0], events[i-1].Hash) {
			return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "bad hash on event", "event_index", i)
		}
	}
	return nil
}

func validateChannelJoinEvent(event *ParsedEvent) error {
	payload, ok := event.Event.GetPayload().(*StreamEvent_ChannelPayload)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel payload")
	}
	membershipPayload, ok := payload.ChannelPayload.GetContent().(*ChannelPayload_Membership)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel join event")
	}
	return validateJoinEventPayload(event, membershipPayload.Membership)
}

func validateSpaceJoinEvent(event *ParsedEvent) error {
	payload, ok := event.Event.GetPayload().(*StreamEvent_SpacePayload)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel payload")
	}
	membershipPayload, ok := payload.SpacePayload.GetContent().(*SpacePayload_Membership)
	if !ok {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "second event is not a channel join event")
	}
	return validateJoinEventPayload(event, membershipPayload.Membership)

}

func validateJoinEventPayload(event *ParsedEvent, membership *Membership) error {
	creatorUserId, err := AddressHex(event.Event.GetCreatorAddress())
	if err != nil {
		return err
	}
	if membership.GetOp() != MembershipOp_SO_JOIN {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "bad join op", "op", membership.GetOp())
	}
	if membership.UserId != creatorUserId {
		return RiverError(Err_BAD_STREAM_CREATION_PARAMS, "bad join user", "id", membership.UserId, "created_by", creatorUserId)
	}
	return nil
}
