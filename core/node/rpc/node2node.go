package rpc

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/proto"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/utils"
	"github.com/towns-protocol/towns/core/node/utils/timing"
)

func (s *Service) AllocateStream(
	ctx context.Context,
	req *connect.Request[AllocateStreamRequest],
) (_ *connect.Response[AllocateStreamResponse], err error) {
	timer := timing.NewTimer("rpc.Service.AllocateStream")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 20*time.Second || err != nil {
			logging.FromCtx(ctx).
				Warnw("AllocateStream slow", "timing", report, "streamId", fmt.Sprintf("%x", req.Msg.StreamId), "err", err)
		}
	}()
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 10*time.Second, 20*time.Second)
	defer cancel()
	log.Debugw("AllocateStream ENTER")
	r, e := s.allocateStream(ctx, req.Msg)
	if e != nil {
		err = AsRiverError(
			e,
		).Func("AllocateStream").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
		return nil, err
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
) (_ *connect.Response[NewEventReceivedResponse], err error) {
	timer := timing.NewTimer("rpc.Service.NewEventReceived")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 20*time.Second || err != nil {
			logging.FromCtx(ctx).
				Warnw("NewEventReceived slow", "timing", report, "streamId", fmt.Sprintf("%x", req.Msg.StreamId), "err", err)
		}
	}()
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
	defer cancel()
	log.Debugw("NewEventReceived ENTER")
	r, e := s.newEventReceived(ctx, req.Msg)
	if e != nil {
		err = AsRiverError(
			e,
		).Func("NewEventReceived").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
		return nil, err
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

	view, err := stream.GetViewIfLocal(ctx)
	if err != nil {
		return nil, err
	}

	if parsedEvent.MiniblockRef.Num >= 0 {
		_, err = s.ensureStreamIsUpToDate(ctx, view, parsedEvent, stream)
		if err != nil {
			return nil, err
		}
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
) (_ *connect.Response[ProposeMiniblockResponse], err error) {
	timer := timing.NewTimer("rpc.Service.ProposeMiniblock")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 20*time.Second || err != nil {
			logging.FromCtx(ctx).
				Warnw("ProposeMiniblock slow", "timing", report, "streamId", fmt.Sprintf("%x", req.Msg.StreamId), "err", err)
		}
	}()
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	log.Debugw("ProposeMiniblock ENTER")
	r, e := s.proposeMiniblock(ctx, req.Msg)
	if e != nil {
		err = AsRiverError(
			e,
		).Func("ProposeMiniblock").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
		return nil, err
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
		// Err_MINIBLOCK_TOO_NEW indicates that the local node is behind the stream head.
		if IsRiverErrorCode(err, Err_MINIBLOCK_TOO_NEW) {
			s.cache.SubmitReconcileStreamTask(stream, nil)
		}
		return nil, err
	}

	return resp, nil
}

func (s *Service) SaveMiniblockCandidate(
	ctx context.Context,
	req *connect.Request[SaveMiniblockCandidateRequest],
) (_ *connect.Response[SaveMiniblockCandidateResponse], err error) {
	timer := timing.NewTimer("rpc.Service.SaveMiniblockCandidate")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 20*time.Second || err != nil {
			logging.FromCtx(ctx).
				Warnw("SaveMiniblockCandidate slow", "timing", report, "streamId", fmt.Sprintf("%x", req.Msg.StreamId), "err", err)
		}
	}()
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
	defer cancel()
	log.Debugw("SaveMiniblockCandidate ENTER")
	r, e := s.saveMiniblockCandidate(ctx, req.Msg)
	if e != nil {
		err = AsRiverError(
			e,
		).Func("SaveMiniblockCandidate").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
		return nil, err
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

	mbInfo, err := NewMiniblockInfoFromProto(
		req.GetMiniblock(), req.GetSnapshot(),
		NewParsedMiniblockInfoOpts(),
	)
	if err != nil {
		return nil, err
	}

	err = stream.SaveMiniblockCandidate(ctx, mbInfo)
	if err != nil {
		return nil, err
	}

	return &SaveMiniblockCandidateResponse{}, nil
}

func (s *Service) GetMiniblocksByIds(
	ctx context.Context,
	req *connect.Request[GetMiniblocksByIdsRequest],
	resp *connect.ServerStream[GetMiniblockResponse],
) (err error) {
	timer := timing.NewTimer("rpc.Service.GetMiniblocksByIds")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 20*time.Second || err != nil {
			logging.FromCtx(ctx).
				Warnw("GetMiniblocksByIds slow", "timing", report, "streamId", fmt.Sprintf("%x", req.Msg.StreamId), "err", err)
		}
	}()
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	log.Debugw("GetMiniblocksByIds ENTER")
	if e := s.streamMiniblocksByIds(ctx, req.Msg, resp); e != nil {
		err = AsRiverError(e).Func("GetMiniblocksByIds").
			Tag("streamId", req.Msg.StreamId).
			Tag("mbIds", req.Msg.MiniblockIds).
			LogWarn(log).
			AsConnectError()
		return err
	}
	log.Debugw("GetMiniblocksByIds LEAVE")
	return nil
}

func (s *Service) streamMiniblocksByIds(
	ctx context.Context,
	req *GetMiniblocksByIdsRequest,
	resp *connect.ServerStream[GetMiniblockResponse],
) error {
	streamId, err := StreamIdFromBytes(req.GetStreamId())
	if err != nil {
		return err
	}

	// Convert miniblock IDs to ranges with a max range size of 10
	miniblockRanges := storage.MiniblockIdsToRanges(req.GetMiniblockIds(), 10)

	for _, mbRange := range miniblockRanges {
		miniblocks, err := s.storage.ReadMiniblocks(
			ctx,
			streamId,
			mbRange.StartInclusive,
			mbRange.EndInclusive+1, // +1 because ReadMiniblocks expects toExclusive
			req.GetOmitSnapshots(),
		)
		if err != nil {
			return err
		}

		for _, mbDesc := range miniblocks {
			var mb Miniblock
			if err = proto.Unmarshal(mbDesc.Data, &mb); err != nil {
				return WrapRiverError(Err_BAD_BLOCK, err).Message("Unable to unmarshal miniblock")
			}

			var snapshot *Envelope
			if len(mbDesc.Snapshot) > 0 && !req.GetOmitSnapshots() {
				snapshot = &Envelope{}
				if err = proto.Unmarshal(mbDesc.Snapshot, snapshot); err != nil {
					return WrapRiverError(Err_BAD_BLOCK, err).Message("Unable to unmarshal snapshot")
				}
			}

			if err = resp.Send(&GetMiniblockResponse{
				Num:       mbDesc.Number,
				Miniblock: &mb,
				Snapshot:  snapshot,
			}); err != nil {
				return err
			}
		}
	}

	// Send back an empty response to signal the end of the stream.
	return resp.Send(&GetMiniblockResponse{})
}
