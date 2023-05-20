package rpc

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"

	connect_go "github.com/bufbuild/connect-go"
	log "github.com/sirupsen/logrus"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"

	"casablanca/node/auth"
	. "casablanca/node/base"
	"casablanca/node/common"
	"casablanca/node/config"
	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/storage"
)

var (
	serviceRequests      = infra.NewSuccessMetrics("service_requests", nil)
	getStreamRequests    = infra.NewSuccessMetrics("get_stream_requests", serviceRequests)
	addEventRequests     = infra.NewSuccessMetrics("add_event_requests", serviceRequests)
)

// TODO-auth-check
// Add missing authentification checks based on Dendrite's implementation

func (s *Service) GetStream(ctx context.Context, req *connect_go.Request[protocol.GetStreamRequest]) (*connect_go.Response[protocol.GetStreamResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	log.Debugf("GetStream: request %s", protojson.Format((req.Msg)))

	res, err := s.getStream(ctx, req)
	if err != nil {
		log.Errorf("GetStream error: %v", err)
		getStreamRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}

	parsedEvents := events.FormatEventsToJson(res.Msg.Stream.Events)
	log.Debugf("GetStream: response %s %s", protojson.Format((res.Msg)), parsedEvents)
	getStreamRequests.Pass()

	return res, nil
}

func (s *Service) AddEvent(ctx context.Context, req *connect_go.Request[protocol.AddEventRequest]) (*connect_go.Response[protocol.AddEventResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)

	parsedEvent := events.FormatEventsToJson([]*protocol.Envelope{req.Msg.Event})
	log.Debugf("AddEvent: request streamId: %s %s", req.Msg.StreamId, parsedEvent)

	res, err := s.addEventImpl(ctx, req)
	if err != nil {
		log.Errorf("AddEvent error: %v", err)
		addEventRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}
	addEventRequests.Pass()
	return res, nil
}

func (s *Service) SyncStreams(ctx context.Context, req *connect_go.Request[protocol.SyncStreamsRequest], stream *connect_go.ServerStream[protocol.SyncStreamsResponse]) error {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	log.Debugf("SyncStreams: CALL timeout: %d req: %s", req.Msg.TimeoutMs, protojson.Format((req.Msg)))
	err := s.syncStreams(ctx, req, stream)

	if err != nil {
		log.Errorf("SyncStreams error: %v", err)
		syncStreamsRequests.Fail()
		return RpcAddRequestId(err, requestId)
	}
	syncStreamsRequests.Pass()
	return err
}

func (s *Service) Info(ctx context.Context, req *connect_go.Request[protocol.InfoRequest]) (*connect_go.Response[protocol.InfoResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	log.Debugf("Info: request %s", protojson.Format((req.Msg)))

	res, err := s.info(ctx, req)
	if err != nil {
		log.Errorf("Info error: %v", err)
		serviceRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}
	log.Debugf("Info: response %s", protojson.Format((res.Msg)))
	serviceRequests.Pass()
	return res, nil
}

type Service struct {
	Storage       storage.Storage
	Authorization auth.Authorization
	wallet        *crypto.Wallet
}

func (s *Service) getStream(ctx context.Context, req *connect_go.Request[protocol.GetStreamRequest]) (*connect_go.Response[protocol.GetStreamResponse], error) {
	streamId := req.Msg.StreamId
	pos, events, err := s.Storage.GetStream(ctx, streamId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "GetStream: error getting stream: %v", err)
	}
	resp := &protocol.GetStreamResponse{
		Stream: &protocol.StreamAndCookie{
			Events:         events,
			StreamId:       pos.StreamId,
			NextSyncCookie: pos.SyncCookie,
		},
	}

	return connect_go.NewResponse(resp), nil
}

func (s *Service) checkPrevEvents(view storage.StreamView, prevEvents [][]byte) error {
	allEvents, err := view.Get()
	if err != nil {
		return err
	}
	hashes := make(map[string]struct{})
	for _, event := range allEvents {
		hashes[string(event.Hash)] = struct{}{}
	}
	for _, prevEvent := range prevEvents {
		if _, ok := hashes[string(prevEvent)]; !ok {
			return fmt.Errorf("prev event %s not found", hex.EncodeToString(prevEvent))
		}
	}
	return nil
}

func (s *Service) addEventImpl(ctx context.Context, req *connect_go.Request[protocol.AddEventRequest]) (*connect_go.Response[protocol.AddEventResponse], error) {
	view := storage.NewViewFromStreamId(ctx, s.Storage, req.Msg.StreamId)
	_, err := s.addEvent(ctx, req.Msg.StreamId, view, req.Msg.Event)
	if err != nil {
		return nil, err
	}
	return connect_go.NewResponse(&protocol.AddEventResponse{}), nil
}

func (s *Service) addEvent(ctx context.Context, streamId string, view storage.StreamView, envelope *protocol.Envelope) ([]byte, error) {
	parsedEvent, err := events.ParseEvent(envelope, true)
	if err != nil {
		return nil, err
	}

	if len(parsedEvent.Event.PrevEvents) == 0 {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event has no prev events")
	}

	// check if previous event's hashes match
	err = s.checkPrevEvents(view, parsedEvent.Event.PrevEvents)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: %v", err)
	}

	// check event type
	streamEvent := parsedEvent.Event

	// get the streams inception
	inceptionPayload, err := view.InceptionPayload(streamId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error getting inception payload: %v", err)
	}
	// make sure the stream event is of the same type as the inception event
	err = streamEvent.VerifyPayloadTypeMatchesStreamType(inceptionPayload)
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
			return addMembershipEvent(membership, s, ctx, streamId, view, parsedEvent)
		case *protocol.ChannelPayload_Message_:
			return addChannelMessage(streamEvent, s, ctx, streamId, view, envelope)
		default:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: Channel event has no valid payload for type %T", payload.ChannelPayload.Content)
		}
	case *protocol.StreamEvent_SpacePayload:
		switch spacePayload := payload.SpacePayload.Content.(type) {
		case *protocol.SpacePayload_Inception_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *protocol.SpacePayload_Membership:
			membership := spacePayload.Membership
			return addMembershipEvent(membership, s, ctx, streamId, view, parsedEvent)
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
			return addEventToStorage(s, ctx, streamId, envelope)
		default:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: User event has no valid payload for type %T", payload.UserPayload.Content)
		}
	case *protocol.StreamEvent_UserDeviceKeyPayload:
		switch payload.UserDeviceKeyPayload.Content.(type) {
		case *protocol.UserDeviceKeyPayload_Inception_:
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")
		case *protocol.UserDeviceKeyPayload_UserDeviceKey_:
			return addEventToStorage(s, ctx, streamId, envelope)
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

func addChannelMessage(streamEvent *protocol.StreamEvent, s *Service, ctx context.Context, streamId string, view storage.StreamView, envelope *protocol.Envelope) ([]byte, error) {
	user := common.UserIdFromAddress(streamEvent.CreatorAddress)

	allowed, err := s.Authorization.IsAllowed(
		ctx,
		auth.AuthorizationArgs{
			RoomId:     streamId,
			UserId:     user,
			Permission: auth.PermissionWrite,
		},
		view,
	)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: failed to get permissions: %v", err)
	}
	if !allowed {
		return nil, status.Errorf(codes.PermissionDenied, "AddEvent: user %s is not allowed to write to channel %s", user, streamId)
	}

	// check if user is a member of the channel
	members, err := view.JoinedUsers(streamId)
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

func addMembershipEvent(membership *protocol.Membership, s *Service, ctx context.Context, streamId string, view storage.StreamView, parsedEvent *events.ParsedEvent) ([]byte, error) {
	userId := membership.UserId
	userStreamId := common.UserStreamIdFromId(userId)

	permission := auth.PermissionUndefined
	switch membership.Op {
	case protocol.MembershipOp_SO_INVITE:
		permission = auth.PermissionInvite
	case protocol.MembershipOp_SO_JOIN:
		permission = auth.PermissionWrite
	case protocol.MembershipOp_SO_LEAVE:
		permission = auth.PermissionWrite
	case protocol.MembershipOp_SO_UNSPECIFIED:
		permission = auth.PermissionUndefined
	}

	if permission != auth.PermissionUndefined {
		allowed, err := s.Authorization.IsAllowed(
			ctx,
			auth.AuthorizationArgs{
				RoomId:     streamId,
				UserId:     userId,
				Permission: permission,
			},
			view,
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

	err = view.AddEvent(parsedEvent.Envelope)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error adding event to view: %v", err)
	}

	leaves, err := view.GetAllLeafEvents(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error getting all leaf events: %v", err)
	}

	log.Debug("AddEvent: ", membership.Op)
	envelope, err := s.makeEnvelopeWithPayload(
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
		leaves,
	)
	if err != nil {
		return nil, err
	}

	_, err = s.Storage.AddEvent(ctx, userStreamId, envelope)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error adding event to storage: %v", err)
	}

	return cookie, nil
}

func (s *Service) info(_ context.Context, request *connect_go.Request[protocol.InfoRequest]) (*connect_go.Response[protocol.InfoResponse], error) {
	log.Trace("Info request: ", request)
	if request.Msg.Debug == "error" {
		// TODO: flag
		return nil, RpcError(protocol.Err_DEBUG_ERROR, "Error requested through Info request")
	} else if request.Msg.Debug == "panic" {
		// TODO: flag
		log.Panic("panic requested through Info request")
		return nil, errors.New("panic")
	} else {
		// TODO: set graffiti in config
		// TODO: return version
		return connect_go.NewResponse(&protocol.InfoResponse{
			Graffiti: "Towns.com node welcomes you!",
		}), nil
	}
}

func MakeServiceHandler(ctx context.Context, dbUrl string, chainConfig *config.ChainConfig, opts ...connect_go.HandlerOption) (string, http.Handler) {
	store, err := storage.NewPGEventStore(ctx, dbUrl, false)
	if err != nil {
		log.Fatalf("failed to create storage: %v", err)
	}

	wallet, err := crypto.NewWallet()
	if err != nil {
		log.Fatalf("failed to create wallet: %v", err)
	}

	var authorization auth.Authorization
	if chainConfig == nil {
		log.Infof("Using passthrough auth")
		authorization = auth.NewPassthroughAuth()
	} else {
		log.Infof("Using casablanca auth with chain config: %v", chainConfig)
		authorization, err = auth.NewChainAuth(chainConfig)
		if err != nil {
			log.Fatalf("failed to create auth: %v", err)
		}
	}

	return protocolconnect.NewStreamServiceHandler(
		&Service{
			Storage:       store,
			Authorization: authorization,
			wallet:        wallet,
		},
		opts...,
	)
}

func (s *Service) makeEnvelopeWithPayload(payload protocol.IsStreamEvent_Payload, prevHashes [][]byte) (*protocol.Envelope, error) {
	return events.MakeEnvelopeWithPayload(s.wallet, payload, prevHashes)
}

func makeView(ctx context.Context, store storage.Storage, streamId string) storage.StreamView {
	view := storage.NewView(func() ([]*protocol.Envelope, error) {
		_, events, err := store.GetStream(ctx, streamId)
		if err != nil {
			return nil, err
		}
		return events, nil
	})
	return view
}
