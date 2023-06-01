package rpc

import (
	"bytes"
	"casablanca/node/auth"
	"casablanca/node/common"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"context"

	connect_go "github.com/bufbuild/connect-go"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"

	. "casablanca/node/base"
)

var (
	createStreamRequests = infra.NewSuccessMetrics("create_stream_requests", serviceRequests)
)

func (s *Service) CreateStream(ctx context.Context, req *connect_go.Request[protocol.CreateStreamRequest]) (*connect_go.Response[protocol.CreateStreamResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	parsedEvent := events.FormatEventsToJson(req.Msg.Events)

	log.Debugf("CreateStream: request %s events: %s", protojson.Format((req.Msg)), parsedEvent)

	res, err := s.createStream(ctx, req)
	if err != nil {
		log.Errorf("CreateStream error: %v", err)
		createStreamRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}
	log.Debugf("CreateStream: response %s", protojson.Format((res.Msg)))
	createStreamRequests.Pass()
	return res, nil
}

func (s *Service) createStream(ctx context.Context, req *connect_go.Request[protocol.CreateStreamRequest]) (*connect_go.Response[protocol.CreateStreamResponse], error) {
	log := infra.GetLogger(ctx)
	if len(req.Msg.Events) == 0 {
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: no events")
	}

	parsedEvents, err := events.ParseEvents(req.Msg.Events)
	if err != nil {
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: error parsing events: %v", err)
	}

	inceptionEvent := parsedEvents[0]
	inceptionPayload := inceptionEvent.Event.GetInceptionPayload()
	if inceptionPayload == nil {
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: first event is not an inception event")
	}

	if err := validateHashes(parsedEvents); err != nil {
		return nil, err
	}

	var spaceView events.StreamView

	// Validation of creation params.
	switch inception := inceptionPayload.(type) {
	case *protocol.ChannelPayload_Inception:
		if !common.ValidChannelStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid channel stream id '%s'", inception.StreamId)
		}
		if inception.SpaceId == "" {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: space id must not be empty for channel stream")
		}
		if len(parsedEvents) != 2 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: channel stream must have exactly two events")
		}
		if err := validateChannelJoinEvent(parsedEvents[1]); err != nil {
			return nil, err
		}

		// Load space. Check if it exists. Used later for auth and to add the channel to the space.
		spaceView, err = s.loadStream(ctx, inception.SpaceId)
		if err != nil {
			return nil, err
		}
	case *protocol.SpacePayload_Inception:
		if !common.ValidSpaceStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid space stream id '%s'", inception.StreamId)
		}
		if len(parsedEvents) != 2 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: space stream must have exactly two events")
		}
		if err := validateSpaceJoinEvent(parsedEvents[1]); err != nil {
			return nil, err
		}
	case *protocol.UserPayload_Inception:
		if !common.ValidUserStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid user stream id '%s'", inception.StreamId)
		}
		if len(parsedEvents) != 1 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: user stream must have only one event")
		}
	case *protocol.UserDeviceKeyPayload_Inception:
		if !common.ValidUserDeviceKeyStreamId(inception.StreamId) {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_ID, "CreateStream: invalid user device key stream id '%s'", inception.StreamId)
		}
		if len(parsedEvents) != 1 {
			return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: user device key stream must have only one event")
		}
	case *protocol.UserSettingsPayload_Inception:
	default:
		return nil, RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: invalid stream kind %T", inception)
	}

	// Authorization.
	switch inception := inceptionPayload.(type) {
	case *protocol.ChannelPayload_Inception:
		user, err := common.UserIdFromAddress(inceptionEvent.Event.CreatorAddress)
		if err != nil {
			return nil, err
		}
		spaceInfo, err := events.RoomInfoFromInceptionEvent(spaceView.InceptionEvent(), inception.SpaceId, user)
		if err != nil {
			return nil, err
		}

		// check permissions
		allowed, err := s.Authorization.IsAllowed(
			ctx,
			auth.AuthorizationArgs{
				RoomId:     inception.SpaceId,
				UserId:     user,
				Permission: auth.PermissionAddRemoveChannels,
			},
			spaceInfo,
		)
		if err != nil {
			return nil, err
		}
		if !allowed {
			return nil, status.Errorf(codes.PermissionDenied, "CreateStream: user %s is not allowed to create channels in space %s", user, inception.SpaceId)
		}

	default:
		// No auth for other stream types yet.
		break
	}

	// TODO(HNT-1355): this needs to be fixed: there is no need to load stream back and append second event through separate call
	// Storage.CreateStream should work fine with two events (although side-effects need to be processed separately in this case).
	streamId := inceptionPayload.GetStreamId()
	log.Infof("CreateStream: calling storage %s", streamId)
	cookie, err := s.Storage.CreateStream(ctx, streamId, req.Msg.Events[0:1])
	if err != nil {
		return nil, err
	}
	for _, event := range parsedEvents[1:] {
		cookie, err = s.addParsedEvent(ctx, streamId, event)
		if err != nil {
			// TODO: s.Storage.DeleteStream(ctx, streamId)
			return nil, err
		}
	}

	// side effects
	switch inception := inceptionPayload.(type) {
	case *protocol.ChannelPayload_Inception:
		envelope, err := s.makeEnvelopeWithPayload(
			events.Make_SpacePayload_Channel(
				protocol.ChannelOp_CO_CREATED,
				inception.StreamId,
				&protocol.EventRef{
					StreamId:  streamId,
					Hash:      inceptionEvent.Envelope.Hash,
					Signature: inceptionEvent.Envelope.Signature,
				},
			),
			spaceView.LeafEventHashes(),
		)
		if err != nil {
			return nil, err
		}

		_, err = s.Storage.AddEvent(ctx, inception.SpaceId, envelope)
		if err != nil {
			return nil, err
		}
	default:
		break
	}

	return connect_go.NewResponse(&protocol.CreateStreamResponse{
		SyncCookie: cookie,
	}), nil
}

func validateHashes(events []*events.ParsedEvent) error {
	for i, event := range events {
		if i == 0 {
			continue
		}
		if len(event.Event.PrevEvents) != 1 || !bytes.Equal(event.Event.PrevEvents[0], events[i-1].Hash) {
			return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: bad hash on event index: %d", i)
		}
	}
	return nil
}

func validateChannelJoinEvent(event *events.ParsedEvent) error {
	payload, ok := event.Event.GetPayload().(*protocol.StreamEvent_ChannelPayload)
	if !ok {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: second event is not a channel payload")
	}
	membershipPayload, ok := payload.ChannelPayload.GetContent().(*protocol.ChannelPayload_Membership)
	if !ok {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: second event is not a channel join event")
	}
	return validateJoinEventPayload(event, membershipPayload.Membership)
}

func validateSpaceJoinEvent(event *events.ParsedEvent) error {
	payload, ok := event.Event.GetPayload().(*protocol.StreamEvent_SpacePayload)
	if !ok {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: second event is not a channel payload")
	}
	membershipPayload, ok := payload.SpacePayload.GetContent().(*protocol.SpacePayload_Membership)
	if !ok {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: second event is not a channel join event")
	}
	return validateJoinEventPayload(event, membershipPayload.Membership)

}

func validateJoinEventPayload(event *events.ParsedEvent, membership *protocol.Membership) error {
	creatorUserId, err := common.UserIdFromAddress(event.Event.GetCreatorAddress())
	if err != nil {
		return err
	}
	if membership.GetOp() != protocol.MembershipOp_SO_JOIN {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: bad join op %d", membership.GetOp())
	}
	if membership.UserId != creatorUserId {
		return RpcErrorf(protocol.Err_BAD_STREAM_CREATION_PARAMS, "CreateStream: bad join user id '%s', created by '%s'", membership.UserId, creatorUserId)
	}
	return nil
}
