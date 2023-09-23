package rpc

import (
	"context"
	"errors"

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
	// TODO: flag to disable debug requests
	if request.Msg.Debug == "error" {
		return nil, RiverError(protocol.Err_DEBUG_ERROR, "Error requested through Info request")
	} else if request.Msg.Debug == "error_untyped" {
		return nil, errors.New("Error requested through Info request")
	} else if request.Msg.Debug == "panic" {
		log.Error("panic requested through Info request")
		panic("panic requested through Info request")
	} else if request.Msg.Debug == "flush_cache" {
		log.Info("FLUSHING CACHE")
		s.cache.ForceFlushAll(ctx)
		return connect_go.NewResponse(&protocol.InfoResponse{
			Graffiti: "cache flushed",
		}), nil
	} else if request.Msg.Debug == "exit" {
		log.Info("GOT REQUEST TO EXIT NODE")
		s.exitSignal <- errors.New("info_debug_exit")
		return connect_go.NewResponse(&protocol.InfoResponse{
			Graffiti: "exiting...",
		}), nil
	} else {
		// TODO: set graffiti in config
		// TODO: return version
		return connect_go.NewResponse(&protocol.InfoResponse{
			Graffiti: "Towns.com node welcomes you!",
		}), nil
	}
}
