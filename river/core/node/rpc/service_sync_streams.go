package rpc

import (
	"context"
	"encoding/binary"
	"encoding/hex"
	"time"

	"connectrpc.com/connect"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/utils"
)

func magicFromString(s string) (uint64, string) {
	bb := []byte(s)
	if len(bb) < 8 {
		padded := make([]byte, 8)
		copy(padded, bb)
		bb = padded
	}
	return binary.BigEndian.Uint64(bb), hex.EncodeToString(bb)
}

func (s *Service) SyncStreams(
	ctx context.Context,
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
) error {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	startTime := time.Now()
	syncId := GenNanoid()
	magic, hex := magicFromString(syncId)
	log.Info("SyncStreams START", "syncId", syncId, "magic", hex)

	err := s.syncHandler.SyncStreams(magic, ctx, syncId, req, res)
	if err != nil {
		err = AsRiverError(
			err,
		).Func("SyncStreams").
			Tags("syncId", syncId, "duration", time.Since(startTime), "magic", hex).
			LogWarn(log).
			AsConnectError()
	} else {
		log.Info("SyncStreams DONE", "syncId", syncId, "duration", time.Since(startTime), "magic", hex)
	}
	return err
}

func (s *Service) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[AddStreamToSyncRequest],
) (*connect.Response[AddStreamToSyncResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	magic, hex := magicFromString(req.Msg.GetSyncId())
	res, err := s.syncHandler.AddStreamToSync(magic, ctx, req)
	if err != nil {
		err = AsRiverError(
			err,
		).Func("AddStreamToSync").
			Tags("syncId", req.Msg.GetSyncId(), "streamId", req.Msg.GetSyncPos().GetStreamId(), "magic", hex).
			LogWarn(log).
			AsConnectError()
	}
	return res, err
}

func (s *Service) RemoveStreamFromSync(
	ctx context.Context,
	req *connect.Request[RemoveStreamFromSyncRequest],
) (*connect.Response[RemoveStreamFromSyncResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	magic, hex := magicFromString(req.Msg.GetSyncId())
	res, err := s.syncHandler.RemoveStreamFromSync(magic, ctx, req)
	if err != nil {
		err = AsRiverError(
			err,
		).Func("RemoveStreamFromSync").
			Tags("syncId", req.Msg.GetSyncId(), "streamId", req.Msg.GetStreamId(), "magic", hex).
			LogWarn(log).
			AsConnectError()
	}
	return res, err
}

func (s *Service) CancelSync(
	ctx context.Context,
	req *connect.Request[CancelSyncRequest],
) (*connect.Response[CancelSyncResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	magic, hex := magicFromString(req.Msg.GetSyncId())
	res, err := s.syncHandler.CancelSync(magic, ctx, req)
	if err != nil {
		err = AsRiverError(
			err,
		).Func("CancelSync").
			Tags("syncId", req.Msg.GetSyncId(), "magic", hex).
			LogWarn(log).
			AsConnectError()
	}
	return res, err
}

func (s *Service) PingSync(
	ctx context.Context,
	req *connect.Request[PingSyncRequest],
) (*connect.Response[PingSyncResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	magic, hex := magicFromString(req.Msg.GetSyncId())
	res, err := s.syncHandler.PingSync(magic, ctx, req)
	if err != nil {
		err = AsRiverError(
			err,
		).Func("PingSync").
			Tags("syncId", req.Msg.GetSyncId(), "magic", hex).
			LogWarn(log).
			AsConnectError()
	}
	return res, err
}
