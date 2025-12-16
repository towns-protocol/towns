package rpc

import (
	"context"
	"errors"
	"fmt"
	"math"
	"slices"
	"strconv"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"google.golang.org/protobuf/types/known/timestamppb"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/utils"
	"github.com/towns-protocol/towns/core/node/utils/timing"
	"github.com/towns-protocol/towns/core/river_node/version"
)

func (s *Service) Info(
	ctx context.Context,
	req *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	timer := timing.NewTimer("Info")
	ctx = timer.Start(ctx)
	defer func() {
		report := timer.Report()
		if report.Took > 30*time.Second {
			logging.FromCtx(ctx).Warnw("Info slow", "timing", report)
		}
	}()
	ctx, log := utils.CtxAndLogForRequest(ctx, req)

	log.Debugw("Info ENTER", "request", req.Msg)

	res, err := s.info(ctx, log, req)
	if err != nil {
		log.Warnw("Info ERROR", "error", err)
		return nil, err
	}

	log.Debugw("Info LEAVE", "response", res.Msg)
	return res, nil
}

func (s *Service) info(
	ctx context.Context,
	log *logging.Log,
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
		} else if debug == "trim_stream" {
			return s.debugTrimStream(ctx, log, request)
		}

		if s.config.EnableTestAPIs {
			if debug == "ping" {
				log.Infow("PINGED")
				return connect.NewResponse(&InfoResponse{
					Graffiti: "pong",
				}), nil
			} else if debug == "panic" {
				log.Errorw("panic requested through Info request")
				panic("panic requested through Info request")
			} else if debug == "flush_cache" {
				log.Infow("FLUSHING CACHE")
				s.cache.ForceFlushAll(ctx)
				return connect.NewResponse(&InfoResponse{
					Graffiti: "cache flushed",
				}), nil
			} else if debug == "exit" {
				log.Infow("GOT REQUEST TO EXIT NODE")
				s.exitSignal <- errors.New("info_debug_exit")
				return connect.NewResponse(&InfoResponse{
					Graffiti: "exiting...",
				}), nil
			} else if debug == "sleep" {
				sleepDuration := 30 * time.Second
				log.Infow("SLEEPING FOR", "sleepDuration", sleepDuration)
				select {
				case <-time.After(sleepDuration):
					// Sleep completed
					log.Infow("Sleep completed")
					return connect.NewResponse(&InfoResponse{
						Graffiti: fmt.Sprintf("slept for %v", sleepDuration),
					}), nil
				case <-ctx.Done():
					// Context was canceled
					log.Infow("Sleep canceled due to context cancellation")
					return connect.NewResponse(&InfoResponse{
						Graffiti: "Context canceled",
					}), nil
				}
			} else if debug == "force_trim_stream" {
				return s.debugForceTrimStream(ctx, log, request)
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
	req *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	if len(req.Msg.GetDebug()) < 3 {
		return nil, RiverError(Err_DEBUG_ERROR, "drop_stream requires a sync id and stream id")
	}

	syncID := req.Msg.Debug[1]
	streamID, err := shared.StreamIdFromString(req.Msg.Debug[2])
	if err != nil {
		return nil, err
	}

	err = s.syncv3Svc.DebugDropStream(ctx, syncID, streamID)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&InfoResponse{}), nil
}

func (s *Service) debugTrimStream(
	ctx context.Context,
	log *logging.Log,
	req *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	if len(req.Msg.GetDebug()) != 2 {
		return nil, RiverError(Err_DEBUG_ERROR, "trim_stream requires a stream id")
	}

	streamID, err := shared.StreamIdFromString(req.Msg.Debug[1])
	if err != nil {
		return nil, err
	}

	ranges, err := s.storage.GetMiniblockNumberRanges(ctx, streamID)
	if err != nil {
		return nil, err
	}

	if len(ranges) == 0 {
		return nil, RiverError(Err_DEBUG_ERROR, "no miniblocks found for stream")
	}

	// Get the latest range
	latestRange := ranges[len(ranges)-1]

	// At least one snapshot miniblock must exist
	if len(latestRange.SnapshotSeqNums) == 0 {
		return nil, RiverError(Err_DEBUG_ERROR, "no snapshot miniblocks found for stream")
	}

	historyWindow := s.chainConfig.Get().StreamHistoryMiniblocks.ForType(streamID.Type())
	if historyWindow == 0 {
		return nil, RiverError(Err_DEBUG_ERROR, "no stream history miniblocks setting set for stream")
	}

	lastSnapshotMiniblock := slices.Max(latestRange.SnapshotSeqNums)
	start := lastSnapshotMiniblock
	if historyWindow >= math.MaxInt64 {
		start -= math.MaxInt64
	} else {
		start -= int64(historyWindow)
	}
	if start < 0 {
		return nil, RiverError(Err_DEBUG_ERROR, "history window is larger than stream size")
	}

	// Find the closest snapshot miniblock to trim to
	trimToMiniblock := storage.FindClosestSnapshotMiniblock(ranges, start)

	var retentionIntervalMbs int64
	if interval := int64(s.chainConfig.Get().StreamSnapshotIntervalInMiniblocks); interval > 0 {
		retentionIntervalMbs = max(interval, storage.MinRetentionIntervalMiniblocks)
	}

	var nullifySnapshotMbs []int64
	if len(latestRange.SnapshotSeqNums) > 0 {
		nullifySnapshotMbs = storage.DetermineStreamSnapshotsToNullify(
			latestRange.StartInclusive, lastSnapshotMiniblock-1, latestRange.SnapshotSeqNums,
			retentionIntervalMbs, storage.MinKeepMiniblocks,
		)
	}

	log.Infow(
		"Debug trim stream",
		"streamId", streamID,
		"trimToMiniblock", trimToMiniblock,
		"nullifySnapshotMbs", nullifySnapshotMbs,
		"latestRange.start", latestRange.StartInclusive,
		"latestRange.end", latestRange.EndInclusive,
	)

	if err = s.storage.TrimStream(ctx, streamID, trimToMiniblock, nullifySnapshotMbs); err != nil {
		return nil, AsRiverError(err, Err_DEBUG_ERROR).
			Tags("streamId", streamID).
			Message("failed to trim stream")
	}

	return connect.NewResponse(&InfoResponse{}), nil
}

func (s *Service) debugForceTrimStream(
	ctx context.Context,
	log *logging.Log,
	req *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	if len(req.Msg.GetDebug()) != 3 {
		return nil, RiverError(Err_DEBUG_ERROR, "force_trim_stream requires a stream id")
	}

	streamID, err := shared.StreamIdFromString(req.Msg.Debug[1])
	if err != nil {
		return nil, err
	}

	trimToMiniblock, err := strconv.Atoi(req.Msg.Debug[2])
	if err != nil {
		return nil, RiverError(Err_DEBUG_ERROR, "invalid trimToMiniblock value")
	}

	log.Infow(
		"Debug trim stream",
		"streamId", streamID,
		"trimToMiniblock", trimToMiniblock,
	)

	if err = s.storage.TrimStream(ctx, streamID, int64(trimToMiniblock), nil); err != nil {
		return nil, AsRiverError(err, Err_DEBUG_ERROR).
			Tags("streamId", streamID).
			Message("failed to trim stream")
	}

	return connect.NewResponse(&InfoResponse{}), nil
}

func (s *Service) debugInfoMakeMiniblock(
	ctx context.Context,
	request *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	log := logging.FromCtx(ctx)

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
	log.Infow(
		"Info Debug request to make miniblock",
		"stream_id",
		streamId,
		"force_snapshot",
		forceSnapshot,
		"last_known_miniblock_num",
		lastKnownMiniblockNum,
	)

	ctx = timing.StartSpan(ctx, "GetStreamNoWait")
	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	ctx = timing.End(ctx, err)
	_ = ctx
	if err != nil {
		return nil, err
	}
	if stream.IsLocal() {
		ref, err := s.cache.TestMakeMiniblock(ctx, streamId, forceSnapshot)
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
	}

	return utils.PeerNodeRequestWithRetries(
		ctx,
		stream,
		func(ctx context.Context, stub StreamServiceClient, _ common.Address) (*connect.Response[InfoResponse], error) {
			return stub.Info(ctx, request)
		},
		s.config.Network.NumRetries,
		s.nodeRegistry,
	)
}
