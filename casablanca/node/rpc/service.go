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
	"google.golang.org/protobuf/proto"

	"casablanca/node/crypto"
	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/storage"
)

type LoggingService struct {
	Service *Service
}

var (
	serviceRequests      = infra.NewSuccessMetrics("service_requests", nil)
	createStreamRequests = infra.NewSuccessMetrics("create_stream_requests", serviceRequests)
	getStreamRequests    = infra.NewSuccessMetrics("get_stream_requests", serviceRequests)
	addEventRequests     = infra.NewSuccessMetrics("add_event_requests", serviceRequests)
	syncStreamsRequests  = infra.NewSuccessMetrics("sync_streams_requests", serviceRequests)
)

func (s *LoggingService) CreateStream(ctx context.Context, req *connect_go.Request[protocol.CreateStreamRequest]) (*connect_go.Response[protocol.CreateStreamResponse], error) {

	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	parsedEvent := events.FormatEventsToJson(req.Msg.Events)

	log.Debugf("CreateStream: request %s events: %s", protojson.Format((req.Msg)), parsedEvent)

	res, err := s.Service.CreateStream(ctx, req)
	if err != nil {
		log.Errorf("CreateStream error: %v", err)
		createStreamRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}
	log.Debugf("CreateStream: response %s", protojson.Format((res.Msg)))
	createStreamRequests.Pass()
	return res, nil
}

func (s *LoggingService) GetStream(ctx context.Context, req *connect_go.Request[protocol.GetStreamRequest]) (*connect_go.Response[protocol.GetStreamResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	log.Debugf("GetStream: request %s", protojson.Format((req.Msg)))

	res, err := s.Service.GetStream(ctx, req)
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

func (s *LoggingService) AddEvent(ctx context.Context, req *connect_go.Request[protocol.AddEventRequest]) (*connect_go.Response[protocol.AddEventResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)

	parsedEvent := events.FormatEventsToJson([]*protocol.Envelope{req.Msg.Event})
	log.Debugf("AddEvent: request streamId: %s %s", req.Msg.StreamId, parsedEvent)

	res, err := s.Service.AddEvent(ctx, req)
	if err != nil {
		log.Errorf("AddEvent error: %v", err)
		addEventRequests.Fail()
		return nil, RpcAddRequestId(err, requestId)
	}
	addEventRequests.Pass()
	return res, nil
}

func (s *LoggingService) SyncStreams(ctx context.Context, req *connect_go.Request[protocol.SyncStreamsRequest], stream *connect_go.ServerStream[protocol.SyncStreamsResponse]) error {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	log.Debugf("SyncStreams: CALL timeout: %d req: %s", req.Msg.TimeoutMs, protojson.Format((req.Msg)))
	err := s.Service.SyncStreams(ctx, req, stream)

	if err != nil {
		log.Errorf("SyncStreams error: %v", err)
		syncStreamsRequests.Fail()
		return RpcAddRequestId(err, requestId)
	}
	syncStreamsRequests.Pass()
	return err
}

func (s *LoggingService) Info(ctx context.Context, req *connect_go.Request[protocol.InfoRequest]) (*connect_go.Response[protocol.InfoResponse], error) {
	ctx, log, requestId := infra.SetLoggerWithRequestId(ctx)
	log.Debugf("Info: request %s", protojson.Format((req.Msg)))

	res, err := s.Service.Info(ctx, req)
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
	Storage storage.Storage
	wallet  *crypto.Wallet
}

func (s *Service) GetStream(ctx context.Context, req *connect_go.Request[protocol.GetStreamRequest]) (*connect_go.Response[protocol.GetStreamResponse], error) {
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

func (s *Service) checkPrevEvents(view *StreamView, prevEvents [][]byte) error {
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

func (s *Service) AddEvent(ctx context.Context, req *connect_go.Request[protocol.AddEventRequest]) (*connect_go.Response[protocol.AddEventResponse], error) {
	view := makeView(ctx, s.Storage, req.Msg.StreamId)
	_, err := s.addEvent(ctx, req.Msg.StreamId, view, req.Msg.Event)
	if err != nil {
		return nil, err
	}
	return connect_go.NewResponse(&protocol.AddEventResponse{}), nil
}

func (s *Service) addEvent(ctx context.Context, streamId string, view *StreamView, envelope *protocol.Envelope) ([]byte, error) {
	parsedEvent, err := events.ParseEvent(envelope)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is not a valid payload")
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
	switch streamEvent.Payload.Payload.(type) {
	case *protocol.Payload_Inception_:
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")

	case *protocol.Payload_UserMembershipOp_, *protocol.Payload_Channel_:
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is a user stream op event or channel event")

	case *protocol.Payload_JoinableStream_:
		// check is stream kind is channel or space
		kind, err := view.StreamKind(streamId)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "AddEvent: error getting stream kind: %v", err)
		}
		if kind != protocol.StreamKind_SK_CHANNEL && kind != protocol.StreamKind_SK_SPACE {
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is a joinable stream event, but stream is not a channel or space")
		}
		joinableStream := streamEvent.Payload.GetJoinableStream()
		userId := joinableStream.UserId
		userStreamId := UserStreamIdFromId(userId)

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

		log.Debug("AddEvent: ", joinableStream.Op)
		envelope := s.sign(makePayload_UserMembershipOp(
			&protocol.Payload_UserMembershipOp{
				Op:        joinableStream.Op,
				StreamId:  streamId,
				InviterId: UserIdFromAddress(parsedEvent.Event.CreatorAddress),
				OriginEvent: &protocol.EventRef{
					StreamId:  streamId,
					Hash:      parsedEvent.Envelope.Hash,
					Signature: parsedEvent.Envelope.Signature,
				},
			},
		), leaves)

		_, err = s.Storage.AddEvent(ctx, userStreamId, envelope)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "AddEvent: error adding event to storage: %v", err)
		}

		return cookie, nil

	case *protocol.Payload_Message_:
		kind, err := view.StreamKind(streamId)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "AddEvent: error getting stream kind: %v", err)
		}
		if kind != protocol.StreamKind_SK_CHANNEL {
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is a message event, but stream is not a channel")
		}
		user := UserIdFromAddress(streamEvent.CreatorAddress)
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

	default:
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event has no valid payload")
	}
}

func (s *Service) Info(_ context.Context, request *connect_go.Request[protocol.InfoRequest]) (*connect_go.Response[protocol.InfoResponse], error) {
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

func MakeServiceHandler(ctx context.Context, dbUrl string, opts ...connect_go.HandlerOption) (string, http.Handler) {
	store, err := storage.NewPGEventStore(ctx, dbUrl, false)
	if err != nil {
		log.Fatalf("failed to create storage: %v", err)
	}

	wallet, err := crypto.NewWallet()
	if err != nil {
		log.Fatalf("failed to create wallet: %v", err)
	}

	pattern, handler := protocolconnect.NewStreamServiceHandler(&LoggingService{
		Service: &Service{
			Storage: store,
			wallet:  wallet,
		},
	}, opts...)
	return pattern, handler
}

func (s *Service) sign(payload *protocol.Payload, prevHashes [][]byte) *protocol.Envelope {
	streamEvent := &protocol.StreamEvent{
		CreatorAddress: s.wallet.Address,
		DelegageSig:    s.wallet.DelegateSignature,
		Salt:           []byte("salt"),
		PrevEvents:     prevHashes,
		Payload:        payload,
	}

	eventBytes, err := proto.Marshal(streamEvent)
	if err != nil {
		panic(err)
	}

	hash := crypto.HashPersonalMessage(eventBytes)
	signature, err := s.wallet.Sign(eventBytes)
	if err != nil {
		panic(err)
	}

	return &protocol.Envelope{
		Event:     eventBytes,
		Signature: signature,
		Hash:      hash,
	}
}

/*
func makeInceptionEvent(streamId string, streamKind protocol.StreamKind, spaceId string) *protocol.Payload {
	return &protocol.Payload{
		Payload: &protocol.Payload_Inception_{
			Inception: &protocol.Payload_Inception{
				StreamId:   streamId,
				StreamKind: streamKind,
				SpaceId:    spaceId,
			},
		},
	}
}
*/

func makePayload_UserMembershipOp(op *protocol.Payload_UserMembershipOp) *protocol.Payload {
	return &protocol.Payload{
		Payload: &protocol.Payload_UserMembershipOp_{UserMembershipOp: op},
	}
}

func makeView(ctx context.Context, store storage.Storage, streamId string) *StreamView {
	view := NewView(func() ([]*protocol.Envelope, error) {
		_, events, err := store.GetStream(ctx, streamId)
		if err != nil {
			return nil, err
		}
		return events, nil
	})
	return view
}
