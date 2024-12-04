package rpc

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/river-build/river/core/node/rpc/sync"
	"github.com/river-build/river/core/node/utils"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/river_node/version"
)

func (s *Service) Info(
	ctx context.Context,
	req *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)

	log.Debug("Info ENTER", "request", req.Msg)

	res, err := s.info(ctx, log, req)
	if err != nil {
		log.Warn("Info ERROR", "error", err)
		return nil, err
	}

	log.Debug("Info LEAVE", "response", res.Msg)
	return res, nil
}

func (s *Service) info(
	ctx context.Context,
	log *slog.Logger,
	request *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	if len(request.Msg.Debug) > 0 {
		debug := request.Msg.Debug[0]

		if debug == "error" {
			return nil, RiverError(Err_DEBUG_ERROR, "Error requested through Info request")
		} else if debug == "network_error" {
			connectErr := connect.NewError(connect.CodeUnavailable, fmt.Errorf("node unavailable"))
			return nil, AsRiverError(connectErr).AsConnectError()
		} else if debug == "error_untyped" {
			return nil, errors.New("error requested through Info request")
		} else if debug == "make_miniblock" {
			return s.debugInfoMakeMiniblock(ctx, request)
		} else if debug == "drop_stream" {
			return s.debugDropStream(ctx, request)
		}

		if s.config.EnableTestAPIs {
			if debug == "ping" {
				log.Info("PINGED")
				return connect.NewResponse(&InfoResponse{
					Graffiti: "pong",
				}), nil
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
			} else if debug == "sleep" {
				sleepDuration := 30 * time.Second
				log.Info("SLEEPING FOR", "sleepDuration", sleepDuration)
				select {
				case <-time.After(sleepDuration):
					// Sleep completed
					log.Info("Sleep completed")
					return connect.NewResponse(&InfoResponse{
						Graffiti: fmt.Sprintf("slept for %v", sleepDuration),
					}), nil
				case <-ctx.Done():
					// Context was canceled
					log.Info("Sleep canceled due to context cancellation")
					return connect.NewResponse(&InfoResponse{
						Graffiti: "Context canceled",
					}), nil
				}
			}
		}
	}

	return connect.NewResponse(&InfoResponse{
		Graffiti:  s.config.GetGraffiti(),
		StartTime: timestamppb.New(s.startTime),
		Version:   version.GetFullVersion(),
	}), nil
}

func (s *Service) debugDropStream(
	ctx context.Context,
	request *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	if len(request.Msg.GetDebug()) < 3 {
		return nil, RiverError(Err_DEBUG_ERROR, "drop_stream requires a sync id and stream id")
	}

	syncID := request.Msg.Debug[1]
	streamID, err := shared.StreamIdFromString(request.Msg.Debug[2])
	if err != nil {
		return nil, err
	}

	dbgHandler, ok := s.syncHandler.(sync.DebugHandler)
	if !ok {
		return nil, RiverError(Err_UNAVAILABLE, "Drop stream not supported")
	}

	if err = dbgHandler.DebugDropStream(ctx, syncID, streamID); err != nil {
		return nil, err
	}

	return connect.NewResponse(&InfoResponse{}), nil
}

func (s *Service) debugInfoMakeMiniblock(
	ctx context.Context,
	request *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	log := dlog.FromCtx(ctx)

	if len(request.Msg.Debug) < 2 {
		return nil, RiverError(Err_DEBUG_ERROR, "make_miniblock requires a stream id and bool")
	}
	streamId, err := shared.StreamIdFromString(request.Msg.Debug[1])
	if err != nil {
		return nil, err
	}
	forceSnapshot := false
	if len(request.Msg.Debug) > 2 && request.Msg.Debug[2] == "true" {
		forceSnapshot, err = strconv.ParseBool(request.Msg.Debug[2])
		if err != nil {
			return nil, err
		}
	}
	lastKnownMiniblockNum := int64(-1)
	if len(request.Msg.Debug) > 3 {
		lastKnownMiniblockNum, err = strconv.ParseInt(request.Msg.Debug[3], 10, 64)
		if err != nil {
			return nil, err
		}
	}
	log.Info(
		"Info Debug request to make miniblock",
		"stream_id",
		streamId,
		"force_snapshot",
		forceSnapshot,
		"last_known_miniblock_num",
		lastKnownMiniblockNum,
	)

	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		return nil, err
	}
	if stream.IsLocal() {
		ref, err := s.mbProducer.TestMakeMiniblock(ctx, streamId, forceSnapshot)
		if err != nil {
			return nil, err
		}
		if lastKnownMiniblockNum >= 0 && ref.Num <= lastKnownMiniblockNum {
			return nil, RiverError(Err_DEBUG_ERROR, "miniblock not created")
		}
		g := ""
		if ref.Hash != (common.Hash{}) {
			g = ref.Hash.Hex()
		}
		v := ""
		if ref.Num > -1 {
			v = strconv.FormatInt(ref.Num, 10)
		}
		return connect.NewResponse(&InfoResponse{
			Graffiti: g,
			Version:  v,
		}), nil
	} else {
		return peerNodeRequestWithRetries(
			ctx,
			stream,
			s,
			func(ctx context.Context, stub StreamServiceClient) (*connect.Response[InfoResponse], error) {
				return stub.Info(ctx, request)
			},
			-1,
		)
	}
}
