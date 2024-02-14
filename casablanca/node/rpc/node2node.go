package rpc

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/river-build/river/base"
	. "github.com/river-build/river/events"
	. "github.com/river-build/river/protocol"
)

func (s *Service) AllocateStream(
	ctx context.Context,
	req *connect.Request[AllocateStreamRequest],
) (*connect.Response[AllocateStreamResponse], error) {
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
	nodes, _, err := s.streamRegistry.GetStreamInfo(ctx, req.StreamId)
	if err != nil {
		return nil, err
	}

	if !nodes.IsLocal() {
		return nil, RiverError(
			Err_BAD_STREAM_CREATION_PARAMS,
			"AllocateStream received for stream that is not local",
			"streamId", req.StreamId,
			"nodes", nodes.GetNodes(),
			"localNode", s.wallet.AddressStr)
	}

	// TODO: check request is signed by correct node
	// TODO: all checks that should be done on create?
	_, view, err := s.cache.CreateStream(ctx, req.StreamId, req.Miniblock)
	if err != nil {
		return nil, err
	}
	return &AllocateStreamResponse{
		SyncCookie: view.SyncCookie(s.wallet.AddressStr),
	}, nil
}

func (s *Service) NewEventReceived(
	ctx context.Context,
	req *connect.Request[NewEventReceivedRequest],
) (*connect.Response[NewEventReceivedResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("NewEventReceived ENTER")
	r, e := s.newEventReceived(ctx, req.Msg)
	if e != nil {
		return nil, AsRiverError(e).Func("NewEventReceived").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
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

func (s *Service) NewEventInPool(
	context.Context,
	*connect.Request[NewEventInPoolRequest],
) (*connect.Response[NewEventInPoolResponse], error) {
	return nil, nil
}
