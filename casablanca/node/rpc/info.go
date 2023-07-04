package rpc

import (
	"context"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"

	. "casablanca/node/base"
	"casablanca/node/infra"
	"casablanca/node/protocol"
)

var (
	infoRequests = infra.NewSuccessMetrics("info_requests", serviceRequests)
)

func (s *Service) Info(ctx context.Context, req *connect_go.Request[protocol.InfoRequest]) (*connect_go.Response[protocol.InfoResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)

	log.Debug("Info ENTER", "request", req.Msg)

	res, err := s.info(ctx, log, req)
	if err != nil {
		log.Warn("Info ERROR", "error", err)
		infoRequests.Fail()
		return nil, err
	}

	log.Debug("Info LEAVE", "response", res.Msg)
	infoRequests.Pass()
	return res, nil
}

func (s *Service) info(ctx context.Context, log *slog.Logger, request *connect_go.Request[protocol.InfoRequest]) (*connect_go.Response[protocol.InfoResponse], error) {
	if request.Msg.Debug == "error" {
		// TODO: flag
		return nil, RpcError(protocol.Err_DEBUG_ERROR, "Error requested through Info request")
	} else if request.Msg.Debug == "panic" {
		// TODO: flag
		log.Error("panic requested through Info request")
		panic("panic requested through Info request")
	} else if request.Msg.Debug == "flush_cache" {
		log.Info("FLUSHING CACHE")
		s.cache.ForceFlushAll(ctx)
		return connect_go.NewResponse(&protocol.InfoResponse{
			Graffiti: "cache flushed",
		}), nil
	} else {
		// TODO: set graffiti in config
		// TODO: return version
		return connect_go.NewResponse(&protocol.InfoResponse{
			Graffiti: "Towns.com node welcomes you!",
		}), nil
	}
}
