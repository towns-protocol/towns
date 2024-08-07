package rpc

import (
	"context"

	"connectrpc.com/connect"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/utils"
)

func (s *Service) SyncStreams(
	ctx context.Context,
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
) error {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	syncId, err := s.syncHandler.SyncStreams(ctx, req, res)
	if err != nil {
		err = AsRiverError(err).Func("SyncStreams").Tag("syncId", syncId).LogWarn(log).AsConnectError()
	}
	return err
}

func (s *Service) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[AddStreamToSyncRequest],
) (*connect.Response[AddStreamToSyncResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	res, err := s.syncHandler.AddStreamToSync(ctx, req)
	if err != nil {
		err = AsRiverError(
			err,
		).Func("AddStreamToSync").
			Tags("syncId", req.Msg.GetSyncId(), "streamId", req.Msg.GetSyncPos().GetStreamId()).
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
	res, err := s.syncHandler.RemoveStreamFromSync(ctx, req)
	if err != nil {
		err = AsRiverError(
			err,
		).Func("RemoveStreamFromSync").
			Tags("syncId", req.Msg.GetSyncId(), "streamId", req.Msg.GetStreamId()).
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
	res, err := s.syncHandler.CancelSync(ctx, req)
	if err != nil {
		err = AsRiverError(
			err,
		).Func("CancelSync").
			Tag("syncId", req.Msg.GetSyncId()).
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
	res, err := s.syncHandler.PingSync(ctx, req)
	if err != nil {
		err = AsRiverError(
			err,
		).Func("PingSync").
			Tag("syncId", req.Msg.GetSyncId()).
			LogWarn(log).
			AsConnectError()
	}
	return res, err
}
