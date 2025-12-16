package rpc

import (
	"context"
	"fmt"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils"
	"github.com/towns-protocol/towns/core/node/utils/timing"
)

func (s *Service) AllocateEphemeralStream(
	ctx context.Context,
	req *connect.Request[AllocateEphemeralStreamRequest],
) (*connect.Response[AllocateEphemeralStreamResponse], error) {
	timer := timing.NewTimer("rpc.Service.AllocateEphemeralStream")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 20*time.Second {
			logging.FromCtx(ctx).
				Warnw("AllocateEphemeralStream slow", "timing", report, "streamId", fmt.Sprintf("%x", req.Msg.StreamId))
		}
	}()
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 10*time.Second, 20*time.Second)
	defer cancel()
	log.Debug("AllocateEphemeralStream ENTER")
	r, e := s.allocateEphemeralStream(ctx, req.Msg)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("AllocateEphemeralStream").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("AllocateEphemeralStream LEAVE", "response", r)
	return connect.NewResponse(r), nil
}

func (s *Service) allocateEphemeralStream(
	ctx context.Context,
	req *AllocateEphemeralStreamRequest,
) (*AllocateEphemeralStreamResponse, error) {
	streamId, err := StreamIdFromBytes(req.StreamId)
	if err != nil {
		return nil, err
	}

	mbInfo, err := NewMiniblockInfoFromProto(
		req.GetMiniblock(),
		req.GetSnapshot(),
		NewParsedMiniblockInfoOpts().WithExpectedBlockNumber(0),
	)
	if err != nil {
		return nil, err
	}

	storageMb, err := mbInfo.AsStorageMb()
	if err != nil {
		return nil, err
	}

	if err = s.storage.CreateEphemeralStreamStorage(ctx, streamId, storageMb); err != nil {
		return nil, err
	}

	return &AllocateEphemeralStreamResponse{}, nil
}

func (s *Service) SaveEphemeralMiniblock(
	ctx context.Context,
	req *connect.Request[SaveEphemeralMiniblockRequest],
) (*connect.Response[SaveEphemeralMiniblockResponse], error) {
	timer := timing.NewTimer("rpc.Service.SaveEphemeralMiniblock")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 20*time.Second {
			logging.FromCtx(ctx).
				Warnw("SaveEphemeralMiniblock slow", "timing", report, "streamId", fmt.Sprintf("%x", req.Msg.StreamId))
		}
	}()
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 5*time.Second, 10*time.Second)
	defer cancel()
	log.Debug("SaveEphemeralMiniblock ENTER")
	if err := s.saveEphemeralMiniblock(ctx, req.Msg); err != nil {
		return nil, AsRiverError(err).Func("SaveEphemeralMiniblock").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("SaveEphemeralMiniblock LEAVE")
	return connect.NewResponse(&SaveEphemeralMiniblockResponse{}), nil
}

func (s *Service) saveEphemeralMiniblock(ctx context.Context, req *SaveEphemeralMiniblockRequest) error {
	streamId, err := StreamIdFromBytes(req.GetStreamId())
	if err != nil {
		return err
	}

	mbInfo, err := NewMiniblockInfoFromProto(
		req.GetMiniblock(),
		req.GetSnapshot(),
		NewParsedMiniblockInfoOpts(),
	)
	if err != nil {
		return err
	}

	storageMb, err := mbInfo.AsStorageMb()
	if err != nil {
		return err
	}

	// Save the ephemeral miniblock.
	// Here we are sure that the record of the stream exists in the storage.
	err = s.storage.WriteEphemeralMiniblock(ctx, streamId, storageMb)
	if err != nil {
		return err
	}

	return nil
}

func (s *Service) SealEphemeralStream(
	ctx context.Context,
	req *connect.Request[SealEphemeralStreamRequest],
) (*connect.Response[SealEphemeralStreamResponse], error) {
	timer := timing.NewTimer("rpc.Service.SealEphemeralStream")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 20*time.Second {
			logging.FromCtx(ctx).
				Warnw("SealEphemeralStream slow", "timing", report, "streamId", fmt.Sprintf("%x", req.Msg.StreamId))
		}
	}()
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	ctx, cancel := utils.UncancelContext(ctx, 10*time.Second, 20*time.Second)
	defer cancel()
	log.Debug("SealEphemeralStream ENTER")

	genesisMiniblockHash, err := s.sealEphemeralStream(ctx, req.Msg)
	if err != nil {
		return nil, AsRiverError(err).Func("SealEphemeralStream").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("SealEphemeralStream LEAVE")

	return connect.NewResponse(&SealEphemeralStreamResponse{
		GenesisMiniblockHash: genesisMiniblockHash[:],
	}), nil
}

func (s *Service) sealEphemeralStream(
	ctx context.Context,
	req *SealEphemeralStreamRequest,
) (common.Hash, error) {
	streamId, err := StreamIdFromBytes(req.GetStreamId())
	if err != nil {
		return common.Hash{}, AsRiverError(err).Func("sealEphemeralStream")
	}

	return s.storage.NormalizeEphemeralStream(ctx, streamId)
}
