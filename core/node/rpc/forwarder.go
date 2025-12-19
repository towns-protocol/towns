package rpc

import (
	"context"
	"math"
	"slices"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/rpc/headers"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/utils"
)

func checkNoForward[T any](req *connect.Request[T], baseErr error) error {
	if req.Header().Get(RiverNoForwardHeader) == RiverHeaderTrueValue {
		return RiverErrorWithBase(Err_UNAVAILABLE, "Forwarding disabled by request header", baseErr)
	}
	return nil
}

func copyRequestForForwarding[T any](s *Service, req *connect.Request[T]) *connect.Request[T] {
	newReq := connect.NewRequest(req.Msg)
	newReq.Header().Set(RiverNoForwardHeader, RiverHeaderTrueValue)
	newReq.Header().Set(RiverFromNodeHeader, s.wallet.Address.Hex())
	if allowNoQuorum(req) {
		newReq.Header().Set(RiverAllowNoQuorumHeader, RiverHeaderTrueValue)
	}
	// Forward test bypass header if present so downstream node can honor it.
	if v := req.Header().Get(RiverTestBypassHeaderName); v != "" {
		newReq.Header().Set(RiverTestBypassHeaderName, v)
	}
	return newReq
}

func allowNoQuorum[T any](req *connect.Request[T]) bool {
	return req.Header().Get(RiverAllowNoQuorumHeader) == RiverHeaderTrueValue
}

func (s *Service) asAnnotatedRiverError(err error) *RiverErrorImpl {
	return AsRiverError(err).
		Tag("nodeAddress", s.wallet.Address).
		Tag("nodeUrl", s.config.Address)
}

type connectHandler[Req, Res any] func(context.Context, *connect.Request[Req]) (*connect.Response[Res], error)

func executeConnectHandler[Req, Res any](
	ctx context.Context,
	req *connect.Request[Req],
	service *Service,
	handler connectHandler[Req, Res],
	methodName string,
) (*connect.Response[Res], error) {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	log.Debugw("Handler ENTER", "method", methodName)

	startTime := time.Now()
	resp, e := handler(ctx, req)
	elapsed := time.Since(startTime)
	if e != nil {
		err := AsRiverError(e).
			Tags(
				"nodeAddress", service.wallet.Address.Hex(),
				"nodeUrl", service.config.Address,
				"handler", methodName,
				"elapsed", elapsed,
			).
			Func(methodName)
		if withStreamId, ok := req.Any().(streamIdProvider); ok {
			err = err.Tag("streamId", withStreamId.GetStreamId())
		}
		_ = err.LogWarn(log)
		return nil, err.AsConnectError()
	}
	log.Debugw("Handler LEAVE", "method", methodName, "response", resp.Msg, "elapsed", elapsed)
	return resp, nil
}

func (s *Service) CreateStream(
	ctx context.Context,
	req *connect.Request[CreateStreamRequest],
) (*connect.Response[CreateStreamResponse], error) {
	ctx, cancel := utils.UncancelContext(ctx, 20*time.Second, 40*time.Second)
	defer cancel()
	return executeConnectHandler(ctx, req, s, s.createStreamImpl, "CreateStream")
}

func (s *Service) CreateMediaStream(
	ctx context.Context,
	req *connect.Request[CreateMediaStreamRequest],
) (*connect.Response[CreateMediaStreamResponse], error) {
	ctx, cancel := utils.UncancelContext(ctx, 20*time.Second, 40*time.Second)
	defer cancel()
	return executeConnectHandler(ctx, req, s, s.createMediaStreamImpl, "CreateMediaStream")
}

func (s *Service) GetStream(
	ctx context.Context,
	req *connect.Request[GetStreamRequest],
) (*connect.Response[GetStreamResponse], error) {
	return executeConnectHandler(ctx, req, s, s.getStreamImpl, "GetStream")
}

func (s *Service) GetStreamEx(
	ctx context.Context,
	req *connect.Request[GetStreamExRequest],
	resp *connect.ServerStream[GetStreamExResponse],
) error {
	ctx, log := utils.CtxAndLogForRequest(ctx, req)
	log.Debugw("GetStreamEx ENTER")
	e := s.getStreamExImpl(ctx, req, resp)
	if e != nil {
		return s.asAnnotatedRiverError(e).
			Func("GetStreamEx").
			Tag("req.Msg.StreamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debugw("GetStreamEx LEAVE")
	return nil
}

func (s *Service) getStreamImpl(
	ctx context.Context,
	req *connect.Request[GetStreamRequest],
) (*connect.Response[GetStreamResponse], error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		if req.Msg.Optional && AsRiverError(err).Code == Err_NOT_FOUND {
			return connect.NewResponse(&GetStreamResponse{}), nil
		} else {
			return nil, err
		}
	}

	// Check that stream is marked as accessed in this case (i.e. timestamp is set)
	view, err := stream.GetViewIfLocalEx(ctx, allowNoQuorum(req))
	if err != nil {
		return nil, err
	}

	if view == nil {
		if err = checkNoForward(req, err); err != nil {
			return nil, err
		}
	}

	// TODO: FIX: should handle the case when node in the sync cookie is not reponsible for the stream anymore
	// if the user passed a sync cookie, we need to forward the request to the node that issued the cookie
	if req.Msg.SyncCookie != nil {
		nodeAddress := common.BytesToAddress(req.Msg.SyncCookie.GetNodeAddress())
		if nodeAddress == s.wallet.Address {
			if view != nil {
				return s.localGetStream(ctx, view, req.Msg.SyncCookie, req.Msg.NumberOfPrecedingMiniblocks)
			} else {
				return nil, RiverError(Err_BAD_SYNC_COOKIE, "Stream not found").
					Func("service.getStreamImpl").
					Tag("streamId", streamId)
			}
		} else {
			stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(nodeAddress)
			if err == nil {
				ret, err := stub.GetStream(ctx, copyRequestForForwarding(s, req))
				if err != nil {
					return nil, err
				}
				return connect.NewResponse(ret.Msg), nil
			}
			// in the case were we couldn't get a stub for this node, fall through and try to get the stream from
			// scratch
			// when nodes can exit the network this is a legitimate code path, for now it's an error
			logging.FromCtx(ctx).Errorw("Node in sync cookie not found", "nodeAddress", nodeAddress, "streamId", streamId)
		}
	}

	if view != nil {
		if resp, err := s.localGetStream(ctx, view, req.Msg.SyncCookie, req.Msg.NumberOfPrecedingMiniblocks); err == nil {
			return resp, nil
		} else if IsOperationRetriableOnRemotes(err) {
			logging.FromCtx(ctx).Errorw("Failed to get stream from local node, falling back to remotes",
				"error", err, "nodeAddress", s.wallet.Address, "streamId", streamId)
		} else {
			return nil, err
		}
	}

	return utils.PeerNodeRequestWithRetries(
		ctx,
		stream,
		func(ctx context.Context, stub StreamServiceClient, addr common.Address) (*connect.Response[GetStreamResponse], error) {
			newReq := copyRequestForForwarding(s, req)
			newReq.Header().Set(RiverToNodeHeader, addr.Hex())

			ret, err := stub.GetStream(ctx, newReq)
			if err != nil {
				return nil, err
			}
			return connect.NewResponse(ret.Msg), nil
		},
		s.config.Network.NumRetries,
		s.nodeRegistry,
	)
}

func (s *Service) getStreamExImpl(
	ctx context.Context,
	req *connect.Request[GetStreamExRequest],
	resp *connect.ServerStream[GetStreamExResponse],
) (err error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return err
	}

	nodes, err := s.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		return err
	}

	allowNoQuorum := allowNoQuorum(req)
	if !allowNoQuorum && nodes.IsLocalInQuorum() || allowNoQuorum && nodes.IsLocal() {
		if err = s.localGetStreamEx(ctx, req, resp); err == nil {
			return nil
		} else if IsOperationRetriableOnRemotes(err) {
			logging.FromCtx(ctx).Errorw("Failed to stream the stream from local node, falling back to remotes",
				"error", err, "nodeAddress", s.wallet.Address, "streamId", streamId)
		} else {
			return err
		}
	}

	if err = checkNoForward(req, err); err != nil {
		return err
	}

	return utils.PeerNodeStreamingResponseWithRetries(
		ctx,
		nodes,
		func(ctx context.Context, stub StreamServiceClient) (hasStreamed bool, err error) {
			// Get the raw stream from another client and forward packets.
			clientStream, err := stub.GetStreamEx(ctx, copyRequestForForwarding(s, req))
			if err != nil {
				return hasStreamed, err
			}
			defer clientStream.Close()

			// Forward the stream
			sawLastPacket := false
			for clientStream.Receive() {
				packet := clientStream.Msg()
				hasStreamed = true

				// We expect the last packet in the stream to be empty.
				if packet.GetData() == nil {
					sawLastPacket = true
				}

				err = resp.Send(clientStream.Msg())
				if err != nil {
					return hasStreamed, err
				}
			}
			if err = clientStream.Err(); err != nil {
				return hasStreamed, err
			}

			// If we did not see the last packet, assume the node became unavailable.
			if !sawLastPacket {
				return hasStreamed, RiverError(
					Err_UNAVAILABLE,
					"Stream did not send all packets (expected empty packet)",
				).Func("service.getStreamExImpl").Tag("streamId", streamId)
			}

			return hasStreamed, nil
		},
		s.config.Network.NumRetries,
		s.nodeRegistry,
	)
}

func (s *Service) GetMiniblocks(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
) (*connect.Response[GetMiniblocksResponse], error) {
	return executeConnectHandler(ctx, req, s, s.getMiniblocksImpl, "GetMiniblocks")
}

func (s *Service) getMiniblocksImpl(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
) (resp *connect.Response[GetMiniblocksResponse], err error) {
	if req.Msg.FromInclusive < 0 || req.Msg.ToExclusive <= req.Msg.FromInclusive {
		return nil, RiverError(
			Err_INVALID_ARGUMENT,
			"Index can't be negative, and there should be at least one miniblock in the requested range",
			"fromInclusive",
			req.Msg.FromInclusive,
			"toExclusive",
			req.Msg.ToExclusive,
			"streamId",
			req.Msg.StreamId,
		)
	}

	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		return nil, err
	}

	allowNoQuorum := allowNoQuorum(req)
	if !allowNoQuorum && stream.IsLocalInQuorum() || allowNoQuorum && stream.IsLocal() {
		resp, err = s.localGetMiniblocks(ctx, req, stream)
		if err != nil {
			if IsOperationRetriableOnRemotes(err) {
				logging.FromCtx(ctx).
					Errorw("Failed to get miniblocks from local node, falling back to remotes (if request is not \"no-forward\")",
						"error", err, "nodeAddress", s.wallet.Address, "streamId", streamId, RiverNoForwardHeader, req.Header().Get(RiverNoForwardHeader))
			} else {
				return nil, err
			}
		} else {
			// Check if we need to forward to remotes due to missing miniblocks
			shouldForward := false

			if len(resp.Msg.Miniblocks) == 0 {
				// Empty response when we requested miniblocks - data might be missing locally
				// Try remotes to see if they have the data
				// TODO: Optimize this to not query remotes if we know the data is not available
				shouldForward = true
				logging.FromCtx(ctx).Warnw("Empty miniblocks response, should query remotes",
					"streamId", streamId,
					"requestedFrom", req.Msg.FromInclusive,
					"requestedTo", req.Msg.ToExclusive)
			} else if resp.Msg.Terminus && resp.Msg.FromInclusive > req.Msg.FromInclusive {
				// Check if the response indicates trimmed miniblocks
				// The range stored in the DB is not full - some miniblocks were trimmed or deleted.
				// Calculate the expected trim point to determine if this is acceptable.
				var trimAcceptable bool
				trimAcceptable, err = s.isTrimmedRangeAcceptable(ctx, streamId, resp.Msg.FromInclusive)
				if err != nil {
					logging.FromCtx(ctx).Errorw("Failed to check if trimmed range is acceptable",
						"error", err, "streamId", streamId, "fromInclusive", resp.Msg.FromInclusive)
					shouldForward = true
				} else if !trimAcceptable {
					// The trimmed range is not acceptable - query remotes for missing miniblocks
					logging.FromCtx(ctx).Warnw("Trimmed range not acceptable, should query remotes",
						"streamId", streamId,
						"requestedFrom", req.Msg.FromInclusive,
						"actualFrom", resp.Msg.FromInclusive)
					shouldForward = true
				}
			}

			if !shouldForward {
				return resp, nil
			}
			// Fall through to remote forwarding
		}
	}

	if err = checkNoForward(req, err); err != nil {
		return nil, err
	}

	return utils.PeerNodeRequestWithRetries(
		ctx,
		stream,
		func(ctx context.Context, stub StreamServiceClient, addr common.Address) (*connect.Response[GetMiniblocksResponse], error) {
			newReq := copyRequestForForwarding(s, req)
			newReq.Header().Set(RiverToNodeHeader, addr.Hex())

			ret, err := stub.GetMiniblocks(ctx, newReq)
			if err != nil {
				return nil, err
			}
			return connect.NewResponse(ret.Msg), nil
		},
		s.config.Network.NumRetries,
		s.nodeRegistry,
	)
}

// isTrimmedRangeAcceptable checks if the actual starting miniblock is within the expected
// trim range based on the stream history window configuration.
// Returns true if the trimmed range is acceptable (stream is just trimmed as expected).
func (s *Service) isTrimmedRangeAcceptable(
	ctx context.Context,
	streamId shared.StreamId,
	actualFromInclusive int64,
) (bool, error) {
	ranges, err := s.storage.GetMiniblockNumberRanges(ctx, streamId)
	if err != nil {
		return false, err
	}

	if len(ranges) == 0 {
		return false, RiverError(Err_MINIBLOCKS_NOT_FOUND, "no miniblocks found for stream")
	}

	// Get the latest range
	latestRange := ranges[len(ranges)-1]

	// At least one snapshot miniblock must exist
	if len(latestRange.SnapshotSeqNums) == 0 {
		return false, RiverError(Err_MINIBLOCKS_NOT_FOUND, "no snapshot miniblocks found for stream")
	}

	historyWindow := s.chainConfig.Get().StreamHistoryMiniblocks.ForType(streamId.Type())
	if historyWindow == 0 {
		// No history window configured, trimming should not happen
		return false, nil
	}

	lastSnapshotMiniblock := slices.Max(latestRange.SnapshotSeqNums)
	start := lastSnapshotMiniblock
	if historyWindow >= math.MaxInt64 {
		start = -1
	} else {
		start -= int64(historyWindow)
	}
	if start < 0 {
		// If the history window is larger than the stream, we can consider it as no trimming
		return false, nil
	}

	// Find the closest snapshot miniblock to trim to
	expectedTrimToMiniblock := storage.FindClosestSnapshotMiniblock(ranges, start)

	// The trimmed range is acceptable if the actual starting miniblock is at or before
	// the expected trim point
	return actualFromInclusive <= expectedTrimToMiniblock, nil
}

func (s *Service) GetLastMiniblockHash(
	ctx context.Context,
	req *connect.Request[GetLastMiniblockHashRequest],
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	return executeConnectHandler(ctx, req, s, s.getLastMiniblockHashImpl, "GetLastMiniblockHash")
}

func (s *Service) getLastMiniblockHashImpl(
	ctx context.Context,
	req *connect.Request[GetLastMiniblockHashRequest],
) (resp *connect.Response[GetLastMiniblockHashResponse], err error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		return nil, err
	}

	view, err := stream.GetViewIfLocalEx(ctx, allowNoQuorum(req))
	if err != nil {
		return nil, err
	}

	if view != nil {
		if resp, err = s.localGetLastMiniblockHash(view); err == nil {
			return resp, nil
		} else if IsOperationRetriableOnRemotes(err) {
			logging.FromCtx(ctx).Errorw("Failed to get last miniblock hash from local node, falling back to remotes",
				"error", err, "nodeAddress", s.wallet.Address, "streamId", streamId)
		} else {
			return nil, err
		}
	}

	if err = checkNoForward(req, err); err != nil {
		return nil, err
	}

	return utils.PeerNodeRequestWithRetries(
		ctx,
		stream,
		func(ctx context.Context, stub StreamServiceClient, addr common.Address) (*connect.Response[GetLastMiniblockHashResponse], error) {
			newReq := copyRequestForForwarding(s, req)
			newReq.Header().Set(RiverToNodeHeader, addr.Hex())

			ret, err := stub.GetLastMiniblockHash(ctx, newReq)
			if err != nil {
				return nil, err
			}
			return connect.NewResponse(ret.Msg), nil
		},
		s.config.Network.NumRetries,
		s.nodeRegistry,
	)
}

func (s *Service) AddEvent(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
) (*connect.Response[AddEventResponse], error) {
	ctx, cancel := utils.UncancelContext(ctx, 10*time.Second, 20*time.Second)
	defer cancel()
	return executeConnectHandler(ctx, req, s, s.addEventImpl, "AddEvent")
}

func (s *Service) addEventImpl(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
) (*connect.Response[AddEventResponse], error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		return nil, err
	}

	view, err := stream.GetViewIfLocalEx(ctx, allowNoQuorum(req))
	if err != nil {
		return nil, err
	}

	if view != nil {
		if resp, err := s.localAddEvent(ctx, req, streamId, stream, view); err == nil {
			return resp, nil
		} else if IsOperationRetriableOnRemotes(err) && checkNoForward(req, err) == nil {
			logging.FromCtx(ctx).Errorw("Failed to add event with local node, falling back to remotes",
				"error", err, "nodeAddress", s.wallet.Address, "streamId", streamId)
		} else {
			return nil, err
		}
	}

	if err = checkNoForward(req, err); err != nil {
		return nil, err
	}

	return utils.PeerNodeRequestWithRetries(
		ctx,
		stream,
		func(ctx context.Context, stub StreamServiceClient, addr common.Address) (*connect.Response[AddEventResponse], error) {
			logging.FromCtx(ctx).Debugw("Forwarding request", "nodeAddress", addr)

			newReq := copyRequestForForwarding(s, req)
			newReq.Header().Set(RiverToNodeHeader, addr.Hex())

			ret, err := stub.AddEvent(ctx, newReq)
			if err != nil {
				return nil, err
			}
			return connect.NewResponse(ret.Msg), nil
		},
		s.config.Network.NumRetries,
		s.nodeRegistry,
	)
}

func (s *Service) AddMediaEvent(
	ctx context.Context,
	req *connect.Request[AddMediaEventRequest],
) (*connect.Response[AddMediaEventResponse], error) {
	ctx, cancel := utils.UncancelContext(ctx, 10*time.Second, 20*time.Second)
	defer cancel()
	return executeConnectHandler(ctx, req, s, s.addMediaEventImpl, "AddMediaEvent")
}

func (s *Service) addMediaEventImpl(
	ctx context.Context,
	req *connect.Request[AddMediaEventRequest],
) (*connect.Response[AddMediaEventResponse], error) {
	cc := req.Msg.GetCreationCookie()

	var err error
	// Check if the current node is in the replica nodes list for the given stream.
	if cc.IsLocal(s.wallet.Address) {
		streamId, err := shared.StreamIdFromBytes(cc.GetStreamId())
		if err != nil {
			return nil, err
		}

		// Check if the given stream exists in the correct node.
		if _, err = s.storage.GetLastMiniblockNumber(ctx, streamId); err != nil {
			return nil, err
		}

		if resp, err := s.localAddMediaEvent(ctx, req); err == nil {
			return resp, nil
		} else if IsOperationRetriableOnRemotes(err) {
			logging.FromCtx(ctx).Errorw("Failed to add media event with local node, falling back to remotes",
				"error", err, "nodeAddress", s.wallet.Address, "streamId", streamId)
		} else {
			return nil, err
		}
	}

	// Forward the request to the first sticky node otherwise
	if err := checkNoForward(req, err); err != nil {
		return nil, err
	}

	return utils.PeerNodeRequestWithRetries(
		ctx,
		NewStreamNodesWithLock(len(cc.NodeAddresses()), cc.NodeAddresses(), s.wallet.Address),
		func(ctx context.Context, stub StreamServiceClient, addr common.Address) (*connect.Response[AddMediaEventResponse], error) {
			logging.FromCtx(ctx).Debugw("Forwarding request", "nodeAddress", addr)

			newReq := copyRequestForForwarding(s, req)
			newReq.Header().Set(RiverToNodeHeader, addr.Hex())

			ret, err := stub.AddMediaEvent(ctx, newReq)
			if err != nil {
				return nil, err
			}
			return connect.NewResponse(ret.Msg), nil
		},
		s.config.Network.NumRetries,
		s.nodeRegistry,
	)
}
