package rpc

import (
	"context"
	"errors"

	"log/slog"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/encoding/protojson"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/shared"
)

var infoRequests = infra.NewSuccessMetrics("info_requests", serviceRequests)

func (s *Service) Info(ctx context.Context, req *connect.Request[InfoRequest]) (*connect.Response[InfoResponse], error) {
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
	request *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	// TODO: flag to disable debug requests
	if len(request.Msg.Debug) > 0 {
		debug := request.Msg.Debug[0]
		if debug == "error" {
			return nil, RiverError(Err_DEBUG_ERROR, "Error requested through Info request")
		} else if debug == "error_untyped" {
			return nil, errors.New("error requested through Info request")
		} else if debug == "panic" {
			log.Error("panic requested through Info request")
			panic("panic requested through Info request")
		} else if debug == "flush_cache" {
			log.Info("FLUSHING CACHE")
			s.cache.ForceFlushAll(ctx)
			return connect.NewResponse(&InfoResponse{
				Graffiti: "cache flushed",
			}), nil
		} else if debug == "exit" {
			log.Info("GOT REQUEST TO EXIT NODE")
			s.exitSignal <- errors.New("info_debug_exit")
			return connect.NewResponse(&InfoResponse{
				Graffiti: "exiting...",
			}), nil
		} else if debug == "make_miniblock" {
			if len(request.Msg.Debug) < 2 {
				return nil, RiverError(Err_DEBUG_ERROR, "make_miniblock requires a stream id and bool")
			}
			streamId, err := shared.StreamIdFromString(request.Msg.Debug[1])
			if err != nil {
				return nil, err
			}
			forceSnapshot := "false"
			if len(request.Msg.Debug) > 2 {
				forceSnapshot = request.Msg.Debug[2]
			}
			log.Info("Info Debug request to make miniblock", "stream_id", streamId)
			retryCount := 0
			// the miniblock creation can clash with the scheduled miniblock creation, so we retry a few times
			for {
				err := s.debugMakeMiniblock(ctx, streamId, forceSnapshot)
				if err != nil {
					if retryCount < 3 {
						log.Warn("Failed to make miniblock, retrying", "error", err)
						retryCount++
						continue
					}
					return nil, err
				}
				break
			}
			return connect.NewResponse(&InfoResponse{}), nil
		} else if debug == "add_event" {
			if len(request.Msg.Debug) < 3 {
				return nil, RiverError(Err_DEBUG_ERROR, "add_event requires a stream id and event")
			}
			streamId, err := shared.StreamIdFromString(request.Msg.Debug[1])
			if err != nil {
				return nil, err
			}
			log.Info("Info Debug request to add event", "stream_id", streamId)
			stub, _, err := s.getStubForStream(ctx, streamId)
			if err != nil {
				return nil, err
			}
			if stub != nil {
				_, err := stub.Info(ctx, connect.NewRequest(&InfoRequest{
					Debug: []string{"add_event", streamId.String()},
				}))
				return nil, err
			}
			stream, _, err := s.cache.GetStream(ctx, streamId.String())
			if err != nil {
				return nil, err
			}
			eventStr := request.Msg.Debug[2]
			envelope := &Envelope{}
			err = protojson.Unmarshal([]byte(eventStr), envelope)
			if err != nil {
				return nil, err
			}
			parsedEvent, err := events.ParseEvent(envelope)
			if err != nil {
				return nil, err
			}
			err = stream.AddEvent(ctx, parsedEvent)
			return nil, err
		}
	}

	// TODO: set graffiti in config
	// TODO: return version
	return connect.NewResponse(&InfoResponse{
		Graffiti: "River Node welcomes you!",
	}), nil
}

func (s *Service) debugMakeMiniblock(ctx context.Context, streamId shared.StreamId, forceSnapshot string) error {
	stub, _, err := s.getStubForStream(ctx, streamId)
	if err != nil {
		return err
	}

	if stub != nil {
		_, err := stub.Info(ctx, connect.NewRequest(&InfoRequest{
			Debug: []string{"make_miniblock", streamId.String(), forceSnapshot},
		}))
		return err
	} else {
		stream, _, err := s.cache.GetStream(ctx, streamId.String())
		if err != nil {
			return err
		}
		_, err = stream.MakeMiniblock(ctx, forceSnapshot == "true")
		return err
	}
}
