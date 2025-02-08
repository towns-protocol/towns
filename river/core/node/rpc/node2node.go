package rpc

import (
	"context"
	"time"

	"github.com/towns-protocol/towns/core/node/utils"

	"connectrpc.com/connect"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

func (s *Service) AllocateStream(
	ctx context.Context,
	req *connect.Request[AllocateStreamRequest],
) (*connect.Response[AllocateStreamResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 10*time.Second, 20*time.Second)
	defer cancel()
	log.Debugw("AllocateStream ENTER")
	r, e := s.allocateStream(ctx, req.Msg)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("AllocateStream").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debugw("AllocateStream LEAVE", "response", r)
	return connect.NewResponse(r), nil
}

func (s *Service) allocateStream(ctx context.Context, req *AllocateStreamRequest) (*AllocateStreamResponse, error) {
	streamId, err := StreamIdFromBytes(req.StreamId)
	if err != nil {
		return nil, err
	}

	// TODO: check request is signed by correct node
	// TODO: all checks that should be done on create?
	stream, err := s.cache.GetStreamWaitForLocal(ctx, streamId)
	if err != nil {
		return nil, err
	}

	view, err := stream.GetView(ctx)
	if err != nil {
		return nil, err
	}

	return &AllocateStreamResponse{
		SyncCookie: view.SyncCookie(s.wallet.Address),
	}, nil
}

func (s *Service) NewEventReceived(
	ctx context.Context,
	req *connect.Request[NewEventReceivedRequest],
) (*connect.Response[NewEventReceivedResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
	defer cancel()
	log.Debugw("NewEventReceived ENTER")
	r, e := s.newEventReceived(ctx, req.Msg)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("NewEventReceived").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debugw("NewEventReceived LEAVE", "response", r)
	return connect.NewResponse(r), nil
}

func (s *Service) newEventReceived(
	ctx context.Context,
	req *NewEventReceivedRequest,
) (*NewEventReceivedResponse, error) {
	streamId, err := StreamIdFromBytes(req.StreamId)
	if err != nil {
		return nil, err
	}

	// TODO: check request is signed by correct node
	parsedEvent, err := ParseEvent(req.Event)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStreamWaitForLocal(ctx, streamId)
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

func (s *Service) ProposeMiniblock(
	ctx context.Context,
	req *connect.Request[ProposeMiniblockRequest],
) (*connect.Response[ProposeMiniblockResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	log.Debugw("ProposeMiniblock ENTER")
	r, e := s.proposeMiniblock(ctx, req.Msg)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("ProposeMiniblock").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debugw("ProposeMiniblock LEAVE", "response", r)
	return connect.NewResponse(r), nil
}

func (s *Service) proposeMiniblock(
	ctx context.Context,
	req *ProposeMiniblockRequest,
) (*ProposeMiniblockResponse, error) {
	streamId, err := StreamIdFromBytes(req.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStreamWaitForLocal(ctx, streamId)
	if err != nil {
		return nil, err
	}

	view, err := stream.GetView(ctx)
	if err != nil {
		return nil, err
	}

	resp, err := view.ProposeNextMiniblock(ctx, s.chainConfig.Get(), req)
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Service) SaveMiniblockCandidate(
	ctx context.Context,
	req *connect.Request[SaveMiniblockCandidateRequest],
) (*connect.Response[SaveMiniblockCandidateResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
	defer cancel()
	log.Debugw("SaveMiniblockCandidate ENTER")
	r, e := s.saveMiniblockCandidate(ctx, req.Msg)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("SaveMiniblockCandidate").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debugw("SaveMiniblockCandidate LEAVE", "response", r)
	return connect.NewResponse(r), nil
}

func (s *Service) saveMiniblockCandidate(
	ctx context.Context,
	req *SaveMiniblockCandidateRequest,
) (*SaveMiniblockCandidateResponse, error) {
	streamId, err := StreamIdFromBytes(req.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStreamWaitForLocal(ctx, streamId)
	if err != nil {
		return nil, err
	}

	err = stream.SaveMiniblockCandidate(ctx, req.Miniblock)
	if err != nil {
		return nil, err
	}

	return &SaveMiniblockCandidateResponse{}, nil
}
