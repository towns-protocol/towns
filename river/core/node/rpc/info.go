package rpc

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"

	"connectrpc.com/connect"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/node/version"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/shared"
)

func (s *Service) Info(
	ctx context.Context,
	req *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)

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
		}

		if s.config.EnableTestAPIs {
			if debug == "panic" {
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
			}
		}
	}

	return connect.NewResponse(&InfoResponse{
		Graffiti:  s.config.GetGraffiti(),
		StartTime: timestamppb.New(s.startTime),
		Version:   version.GetFullVersion(),
	}), nil
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

	nodes, err := s.streamRegistry.GetStreamInfo(ctx, streamId)
	if err != nil {
		return nil, err
	}
	if nodes.IsLocal() {
		stream, err := s.cache.GetSyncStream(ctx, streamId)
		if err != nil {
			return nil, err
		}
		hash, num, err := stream.TestMakeMiniblock(ctx, forceSnapshot, lastKnownMiniblockNum)
		if err != nil {
			return nil, err
		}
		g := ""
		if (hash != common.Hash{}) {
			g = hash.Hex()
		}
		v := ""
		if num > -1 {
			v = strconv.FormatInt(num, 10)
		}
		return connect.NewResponse(&InfoResponse{
			Graffiti: g,
			Version:  v,
		}), nil
	} else {
		return peerNodeRequestWithRetries(
			ctx,
			nodes,
			s,
			func(ctx context.Context, stub StreamServiceClient) (*connect.Response[InfoResponse], error) {
				return stub.Info(ctx, request)
			},
			-1,
		)
	}
}
