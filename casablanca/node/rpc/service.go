package rpc

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/http"

	connect_go "github.com/bufbuild/connect-go"
	log "github.com/sirupsen/logrus"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"

	"casablanca/node/crypto"
	. "casablanca/node/events"
	"casablanca/node/protocol"
	"casablanca/node/protocol/protocolconnect"
	"casablanca/node/storage"
)

type LoggingService struct {
	Service *Service
}

func (s *LoggingService) CreateStream(ctx context.Context, req *connect_go.Request[protocol.CreateStreamRequest]) (*connect_go.Response[protocol.CreateStreamResponse], error) {
	res, err := s.Service.CreateStream(ctx, req)
	if err != nil {
		log.Errorf("CreateStream error: %v", err)
		return nil, err
	}
	return res, nil
}

func (s *LoggingService) GetStream(ctx context.Context, req *connect_go.Request[protocol.GetStreamRequest]) (*connect_go.Response[protocol.GetStreamResponse], error) {
	res, err := s.Service.GetStream(ctx, req)
	if err != nil {
		log.Errorf("GetStream error: %v", err)
		return nil, err
	}
	return res, nil
}

func (s *LoggingService) AddEvent(ctx context.Context, req *connect_go.Request[protocol.AddEventRequest]) (*connect_go.Response[protocol.AddEventResponse], error) {
	res, err := s.Service.AddEvent(ctx, req)
	if err != nil {
		log.Errorf("AddEvent error: %v", err)
		return nil, err
	}
	return res, nil
}

func (s *LoggingService) SyncStreams(ctx context.Context, req *connect_go.Request[protocol.SyncStreamsRequest]) (*connect_go.Response[protocol.SyncStreamsResponse], error) {
	res, err := s.Service.SyncStreams(ctx, req)
	if err != nil {
		log.Errorf("SyncStreams error: %v", err)
		return nil, err
	}
	return res, nil
}

func (s *LoggingService) Info(ctx context.Context, req *connect_go.Request[protocol.InfoRequest]) (*connect_go.Response[protocol.InfoResponse], error) {
	res, err := s.Service.Info(ctx, req)
	if err != nil {
		log.Errorf("Info error: %v", err)
		return nil, err
	}
	return res, nil
}

type Service struct {
	Storage storage.Storage
	Rollup  *Rollup
	wallet  *crypto.Wallet
}

func (s *Service) GetStream(ctx context.Context, req *connect_go.Request[protocol.GetStreamRequest]) (*connect_go.Response[protocol.GetStreamResponse], error) {

	streamId := req.Msg.StreamId
	log.Info("GetStream: ", streamId)
	pos, events, err := s.Storage.GetStream(ctx, streamId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "GetStream: error getting stream: %v", err)
	}
	log.Debugf("GetStream: %s, %d events", streamId, len(events))
	return connect_go.NewResponse(&protocol.GetStreamResponse{
		Stream: &protocol.StreamAndCookie{
			Events:         events,
			StreamId:       pos.StreamId,
			NextSyncCookie: pos.SyncCookie,
		},
	}), nil
}

func (s *Service) checkPrevEvents(streamId string, prevEvents [][]byte) error {
	allEvents, err := s.Rollup.Get(streamId)
	if err != nil {
		return err
	}
	hashes := make(map[string]struct{})
	for _, event := range allEvents {
		hashes[string(event.Hash)] = struct{}{}
	}
	for _, prevEvent := range prevEvents {
		if _, ok := hashes[string(prevEvent)]; !ok {
			return fmt.Errorf("prev event %s not found in stream %s", hex.EncodeToString(prevEvent), streamId)
		}
	}
	return nil
}

func (s *Service) AddEvent(ctx context.Context, req *connect_go.Request[protocol.AddEventRequest]) (*connect_go.Response[protocol.AddEventResponse], error) {
	log.Infof("AddEvent: %s %s", string(req.Msg.StreamId), hex.EncodeToString(req.Msg.Event.Hash))
	_, err := s.addEvent(ctx, req.Msg.StreamId, req.Msg.Event)
	if err != nil {
		return nil, err
	}
	return connect_go.NewResponse(&protocol.AddEventResponse{}), nil
}

func (s *Service) addEvent(ctx context.Context, streamId string, envelope *protocol.Envelope) ([]byte, error) {
	log.Info("addEvent: ", hex.EncodeToString(envelope.Hash))
	parsedEvent, err := ParseEvent(streamId, envelope)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is not a valid payload")
	}

	if len(parsedEvent.Event.PrevEvents) == 0 {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event has no prev events")
	}

	_, err = s.Storage.StreamInfo(ctx, streamId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "AddEvent: error getting stream: %v", err)
	}

	// check if previous event's hashes match
	err = s.checkPrevEvents(streamId, parsedEvent.Event.PrevEvents)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: %v", err)
	}

	// check event type
	streamEvent := parsedEvent.Event
	switch streamEvent.Payload.Payload.(type) {
	case *protocol.Payload_Inception_:
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is an inception event")

	case *protocol.Payload_UserStreamOp_, *protocol.Payload_Channel_:
		return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is a user stream op event")

	case *protocol.Payload_JoinableStream_:
		// check is stream kind is channel or space
		kind, err := s.Rollup.StreamKind(streamId)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "AddEvent: error getting stream kind: %v", err)
		}
		if kind != protocol.StreamKind_SK_CHANNEL && kind != protocol.StreamKind_SK_SPACE {
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is a joinable stream event, but stream is not a channel or space")
		}
		joinableStream := streamEvent.Payload.GetJoinableStream()
		userId := joinableStream.UserId
		userStreamId := UserStreamIdFromId(userId)

		_, err = s.Storage.AddEvent(ctx, streamId, parsedEvent.Envelope)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "AddEvent: error adding event to storage: %v", err)
		}

		// move getAllLeafEvents to rollup
		allEvents, err := s.Rollup.Get(streamId)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "AddEvent: error getting stream: %v", err)
		}

		//var envelope *protocol.Envelope
		log.Debug("AddEvent: ", joinableStream.Op)
		envelope := s.sign(makePayload_UserStreamOp(
			&protocol.Payload_UserStreamOp{
				Op:        joinableStream.Op,
				StreamId:  streamId,
				InviterId: UserIdFromAddress(parsedEvent.Event.CreatorAddress),
				OriginEvent: &protocol.EventRef{
					StreamId:  streamId,
					Hash:      parsedEvent.Envelope.Hash,
					Signature: parsedEvent.Envelope.Signature,
				},
			},
		), getAllLeafEvents(allEvents))

		cookie, err := s.Storage.AddEvent(ctx, userStreamId, envelope)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "AddEvent: error adding event to storage: %v", err)
		}

		return cookie, nil

	case *protocol.Payload_Message_:
		kind, err := s.Rollup.StreamKind(streamId)
		if err != nil {
			return nil, status.Errorf(codes.Internal, "AddEvent: error getting stream kind: %v", err)
		}
		if kind != protocol.StreamKind_SK_CHANNEL {
			return nil, status.Errorf(codes.InvalidArgument, "AddEvent: event is a message event, but stream is not a channel")
		}
		user := UserIdFromAddress(streamEvent.CreatorAddress)
		// check if user is a member of the channel
		members, err := s.Rollup.JoinedUsers(streamId)
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
	if request.Msg.Debug == "error" {
		// TODO: flag
		return nil, RpcError(protocol.Err_DEBUG_ERROR, "Error requested through Info request")
	} else if request.Msg.Debug == "panic" {
		// TODO: flag
		log.Panic("panic requested through Info request")
		return nil, errors.New("panic")
	} else {
		return connect_go.NewResponse(&protocol.InfoResponse{
			Graffiti: "TBD Project Name node welcomes you!",
		}), nil
	}
}

func MakeServiceHandler(ctx context.Context, dbUrl string, opts ...connect_go.HandlerOption) (string, http.Handler) {
	store, err := storage.NewPGEventStore(ctx, dbUrl)
	if err != nil {
		log.Fatalf("failed to create storage: %v", err)
	}
	rollup := NewRollup(func(s string) ([]*protocol.Envelope, error) {
		pos := protocol.SyncPos{
			StreamId:   s,
			SyncCookie: storage.SeqNumToBytes(0),
		}
		val, err := store.SyncStreams(ctx,
			[]*protocol.SyncPos{&pos}, 1000)
		if err != nil {
			return nil, err
		}
		events := val[string(s)].Events
		return events, nil

	})

	wallet, err := crypto.NewWallet()
	if err != nil {
		log.Fatalf("failed to create wallet: %v", err)
	}

	pattern, handler := protocolconnect.NewStreamServiceHandler(&LoggingService{
		Service: &Service{
			Storage: store,
			Rollup:  rollup,
			wallet:  wallet,
		},
	}, opts...)
	return pattern, handler
}

func MakeServer(ctx context.Context, dbUrl string) (protocolconnect.StreamServiceClient, func()) {
	mux := http.NewServeMux()
	pattern, handler := MakeServiceHandler(ctx, dbUrl)
	mux.Handle(pattern, handler)

	address := ":0"
	httpListener, err := net.Listen("tcp", address)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	srv := &http.Server{Handler: h2c.NewHandler(mux, &http2.Server{})}

	go func() {
		err := srv.Serve(httpListener)
		if err != http.ErrServerClosed {
			log.Fatalf("listen failed: %v", err)
		}
	}()

	closer := func() {
		log.Info("closing server")
		err := srv.Shutdown(ctx)
		if err != nil {
			log.Fatalf("failed to shutdown server: %v", err)
		}
	}

	port := httpListener.Addr().(*net.TCPAddr).Port

	client := protocolconnect.NewStreamServiceClient(
		http.DefaultClient,
		fmt.Sprintf("http://localhost:%d", port),
	)

	return client, closer
}

func getAllLeafEvents(events []*ParsedEvent) [][]byte {
	if len(events) == 0 {
		panic("no events")
	}
	leafEventHashes := make(map[string]struct{})
	for _, event := range events {
		leafEventHashes[string(event.Hash)] = struct{}{}
		for _, prev := range event.Event.PrevEvents {
			delete(leafEventHashes, string(prev))
		}
	}
	if len(leafEventHashes) == 0 {
		panic("no leaf events")
	}
	hashes := make([][]byte, 0, len(leafEventHashes))
	for hash := range leafEventHashes {
		hashes = append(hashes, []byte(hash))
	}
	return hashes
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

func makePayload_UserStreamOp(op *protocol.Payload_UserStreamOp) *protocol.Payload {
	return &protocol.Payload{
		Payload: &protocol.Payload_UserStreamOp_{UserStreamOp: op},
	}
}
