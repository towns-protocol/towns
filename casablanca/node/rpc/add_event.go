package rpc

import (
	"context"
	"time"

	"connectrpc.com/connect"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/events"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/protocol"
	"github.com/river-build/river/rules"
)

var addEventRequests = infra.NewSuccessMetrics("add_event_requests", serviceRequests)

func (s *Service) localAddEvent(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
	nodes *StreamNodes,
) (*connect.Response[AddEventResponse], error) {
	log := dlog.FromCtx(ctx)

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

	localStream, streamView, err := s.cache.GetStream(ctx, streamId, nodes)
	if err != nil {
		return err
	}

	canAddEvent, chainAuthArgs, requiredParentEvent, err := rules.CanAddEvent(
		ctx,
		s.streamConfig,
		s.nodeRegistry.GetValidNodeAddresses(),
		time.Now(),
		parsedEvent,
		streamView,
	)

	if !canAddEvent || err != nil {
		return err
	}

	if chainAuthArgs != nil {
		err := s.chainAuth.IsEntitled(ctx, chainAuthArgs)
	if err != nil {
		return err
	}
	}

	if requiredParentEvent != nil {
		err := s.addRequiredParentEvent(ctx, requiredParentEvent)
	if err != nil {
		return err
	}
	}

	stream := &replicatedStream{
		streamId:    streamId,
		localStream: localStream,
		nodes:       nodes,
		service:     s,
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return err
	}

	if s.notification != nil {
		sendsPush, senderId := rules.SendsPushNotification(parsedEvent)
		if sendsPush {
			s.notification.SendPushNotification(s.serverCtx, streamView, senderId, parsedEvent.Event)
	}
	}

	return nil
}

func (s *Service) addRequiredParentEvent(ctx context.Context, requiredParentEvent *rules.RequiredParentEvent) error {
	hashRequest := &GetLastMiniblockHashRequest{
		StreamId: requiredParentEvent.StreamId,
		}
	hashResponse, err := s.GetLastMiniblockHash(ctx, connect.NewRequest(hashRequest))
	if err != nil {
		return err
	}
	envelope, err := MakeEnvelopeWithPayload(s.wallet, requiredParentEvent.Payload, hashResponse.Msg.Hash)
	if err != nil {
		return err
	}

	req := &AddEventRequest{
		StreamId: requiredParentEvent.StreamId,
		Event:    envelope,
	}

	_, err = s.AddEvent(ctx, connect.NewRequest(req))
	if err != nil {
		return err
	}
	return nil
}
