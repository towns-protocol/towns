package rpc

import (
	"context"

	"github.com/bufbuild/connect-go"

	. "casablanca/node/base"
	. "casablanca/node/events"
	. "casablanca/node/protocol"
)

func (s *Service) AllocateStream(ctx context.Context, req *connect.Request[AllocateStreamRequest]) (*connect.Response[AllocateStreamResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("AllocateStream ENTER")
	r, e := s.allocateStream(ctx, req.Msg)
	if e != nil {
		return nil, AsRiverError(e).Func("AllocateStream").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("AllocateStream LEAVE", "response", r)
	return connect.NewResponse(r), nil
}

func (s *Service) allocateStream(ctx context.Context, req *AllocateStreamRequest) (*AllocateStreamResponse, error) {
	// TODO: check request is signed by correct node
	// TODO: all checks that should be done on create?
	_, _, err := s.cache.CreateStream(ctx, req.StreamId, req.Miniblock)
	if err != nil {
		return nil, err
	}
	return &AllocateStreamResponse{}, nil
}

func (s *Service) NewEventReceived(ctx context.Context, req *connect.Request[NewEventReceivedRequest]) (*connect.Response[NewEventReceivedResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("NewEventReceived ENTER")
	r, e := s.newEventReceived(ctx, req.Msg)
	if e != nil {
		return nil, AsRiverError(e).Func("AllocateStream").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("NewEventReceived LEAVE", "response", r)
	return connect.NewResponse(r), nil
}

func (s *Service) newEventReceived(ctx context.Context, req *NewEventReceivedRequest) (*NewEventReceivedResponse, error) {
	// TODO: check request is signed by correct node
	parsedEvent, err := ParseEvent(req.Event)
	if err != nil {
		return nil, err
	}

	stream, _, err := s.cache.GetStream(ctx, req.StreamId)
	if err != nil {
		return nil, err
	}

	err = stream.AddEvent(ctx, parsedEvent)
	if err != nil {
		return nil, err
	}

	return &NewEventReceivedResponse{}, nil
}

func (s *Service) NewEventInPool(context.Context, *connect.Request[NewEventInPoolRequest]) (*connect.Response[NewEventInPoolResponse], error) {
	return nil, nil
}
