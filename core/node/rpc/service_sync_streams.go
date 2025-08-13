package rpc

import (
	"context"
	"errors"
	"runtime/pprof"
	"time"

	"connectrpc.com/connect"
	"go.uber.org/zap"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/headers"
	"github.com/towns-protocol/towns/core/node/utils"
)

func runWithLabels(
	ctx context.Context,
	syncId string,
	f func(context.Context),
) {
	pprof.Do(
		ctx,
		pprof.Labels("SYNC_ID", syncId, "START_TIME", time.Now().UTC().Format(time.RFC3339)),
		f,
	)
}

func (s *Service) SyncStreams(
	ctx context.Context,
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
) error {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	startTime := time.Now()
	syncId := GenNanoid()
	log.Debugw("SyncStreams START", "syncId", syncId)

	var err error
	runWithLabels(ctx, syncId, func(ctx context.Context) {
		if req.Header().Get(headers.RiverUseSharedSyncHeaderName) == "true" {
			s.v3Syncs.Store(syncId, struct{}{})
			err = s.syncv3.SyncStreams(ctx, syncId, req.Msg.GetSyncPos(), res)
			s.v3Syncs.Delete(syncId)
		} else {
			err = s.sync.SyncStreams(ctx, syncId, req, res)
		}
	})
	if err != nil {
		level := zap.WarnLevel
		if errors.Is(err, context.Canceled) {
			level = zap.DebugLevel
		}
		err = AsRiverError(err).Func("SyncStreams").
			Tags("syncId", syncId, "duration", time.Since(startTime)).
			LogLevel(log, level).
			AsConnectError()
	} else {
		log.Debugw("SyncStreams DONE", "syncId", syncId, "duration", time.Since(startTime))
	}
	return err
}

func (s *Service) AddStreamToSync(
	ctx context.Context,
	req *connect.Request[AddStreamToSyncRequest],
) (*connect.Response[AddStreamToSyncResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	var res *connect.Response[AddStreamToSyncResponse]
	var err error
	runWithLabels(ctx, req.Msg.GetSyncId(), func(ctx context.Context) {
		if _, ok := s.v3Syncs.Load(req.Msg.GetSyncId()); ok {
			err = RiverError(Err_UNIMPLEMENTED, "AddStreamToSync is not supported in V3")
		} else {
			res, err = s.sync.AddStreamToSync(ctx, req)
		}
	})
	if err != nil {
		err = AsRiverError(err).Func("AddStreamToSync").
			Tags("syncId", req.Msg.GetSyncId(), "streamId", req.Msg.GetSyncPos().GetStreamId()).
			LogWarn(log).
			AsConnectError()
	}
	return res, err
}

func (s *Service) ModifySync(
	ctx context.Context,
	req *connect.Request[ModifySyncRequest],
) (*connect.Response[ModifySyncResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	res := connect.NewResponse(&ModifySyncResponse{})
	var err error
	runWithLabels(ctx, req.Msg.GetSyncId(), func(ctx context.Context) {
		if _, ok := s.v3Syncs.Load(req.Msg.GetSyncId()); ok {
			res.Msg, err = s.syncv3.ModifySync(ctx, req.Msg)
		} else {
			res, err = s.sync.ModifySync(ctx, req)
		}
	})
	if err != nil {
		err = AsRiverError(err).Func("ModifySync").
			Tags("syncId", req.Msg.GetSyncId()).
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
	var res *connect.Response[RemoveStreamFromSyncResponse]
	var err error
	runWithLabels(ctx, req.Msg.GetSyncId(), func(ctx context.Context) {
		if _, ok := s.v3Syncs.Load(req.Msg.GetSyncId()); ok {
			err = RiverError(Err_UNIMPLEMENTED, "RemoveStreamFromSync is not supported in V3")
		} else {
			res, err = s.sync.RemoveStreamFromSync(ctx, req)
		}
	})
	if err != nil {
		err = AsRiverError(err).Func("RemoveStreamFromSync").
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
	res := connect.NewResponse(&CancelSyncResponse{})
	var err error
	runWithLabels(ctx, req.Msg.GetSyncId(), func(ctx context.Context) {
		if _, ok := s.v3Syncs.Load(req.Msg.GetSyncId()); ok {
			err = s.syncv3.CancelSync(ctx, req.Msg.GetSyncId())
		} else {
			res, err = s.sync.CancelSync(ctx, req)
		}
	})
	if err != nil {
		err = AsRiverError(err).Func("CancelSync").
			Tags("syncId", req.Msg.GetSyncId()).
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
	res := connect.NewResponse(&PingSyncResponse{})
	var err error
	runWithLabels(ctx, req.Msg.GetSyncId(), func(ctx context.Context) {
		if _, ok := s.v3Syncs.Load(req.Msg.GetSyncId()); ok {
			s.syncv3.PingSync(ctx, req.Msg.GetSyncId(), req.Msg.GetNonce())
		} else {
			res, err = s.sync.PingSync(ctx, req)
		}
	})
	if err != nil {
		err = AsRiverError(err).Func("PingSync").
			Tags("syncId", req.Msg.GetSyncId()).
			LogWarn(log).
			AsConnectError()
	}
	return res, err
}
