package rpc

import (
	"context"
	"errors"

	connect_go "github.com/bufbuild/connect-go"
	"golang.org/x/exp/slog"

	. "github.com/river-build/river/base"
	"github.com/river-build/river/infra"
	. "github.com/river-build/river/protocol"
)

var infoRequests = infra.NewSuccessMetrics("info_requests", serviceRequests)

func (s *Service) Info(ctx context.Context, req *connect_go.Request[InfoRequest]) (*connect_go.Response[InfoResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)

	log.Debug("Info ENTER", "request", req.Msg)

	res, err := s.info(ctx, log, req)
	if err != nil {
		log.Warn("Info ERROR", "error", err)
		infoRequests.FailInc()
		return nil, err
	}

	log.Debug("Info LEAVE", "response", res.Msg)
	infoRequests.PassInc()
	return res, nil
}

func (s *Service) info(
	ctx context.Context,
	log *slog.Logger,
	request *connect_go.Request[InfoRequest],
) (*connect_go.Response[InfoResponse], error) {
	// TODO: flag to disable debug requests
	if len(request.Msg.Debug) > 0 {
		debug := request.Msg.Debug[0]
		if debug == "error" {
			return nil, RiverError(Err_DEBUG_ERROR, "Error requested through Info request")
		} else if debug == "error_untyped" {
			return nil, errors.New("Error requested through Info request")
		} else if debug == "panic" {
			log.Error("panic requested through Info request")
			panic("panic requested through Info request")
		} else if debug == "flush_cache" {
			log.Info("FLUSHING CACHE")
			s.cache.ForceFlushAll(ctx)
			return connect_go.NewResponse(&InfoResponse{
				Graffiti: "cache flushed",
			}), nil
		} else if debug == "exit" {
			log.Info("GOT REQUEST TO EXIT NODE")
			s.exitSignal <- errors.New("info_debug_exit")
			return connect_go.NewResponse(&InfoResponse{
				Graffiti: "exiting...",
			}), nil
		} else if debug == "make_miniblock" {
			if len(request.Msg.Debug) < 2 {
				return nil, RiverError(Err_DEBUG_ERROR, "make_miniblock requires a stream id")
			}
			streamId := request.Msg.Debug[1]
			log.Info("Info Debug request to make miniblock", "stream_id", streamId)
			err := s.debugMakeMiniblock(ctx, streamId)
			if err != nil {
				return nil, err
			}
			return connect_go.NewResponse(&InfoResponse{}), nil
		}
	}

	// TODO: set graffiti in config
	// TODO: return version
	return connect_go.NewResponse(&InfoResponse{
		Graffiti: "Towns.com node welcomes you!",
	}), nil
}

func (s *Service) debugMakeMiniblock(ctx context.Context, streamId string) error {
	stub, nodes, err := s.getStubForStream(ctx, streamId)
	if err != nil {
		return err
	}

	if stub != nil {
		_, err := stub.Info(ctx, connect_go.NewRequest(
			&InfoRequest{
				Debug: []string{"make_miniblock", streamId},
			},
		))
		return err
	} else {
		stream, _, err := s.cache.GetStream(ctx, streamId, nodes)
		if err != nil {
			return err
		}
		_, err = stream.MakeMiniblock(ctx)
		return err
	}
}
