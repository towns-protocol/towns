package rpc

import (
	"context"
	"time"

	"connectrpc.com/connect"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils"
)

const (
	RiverNoForwardHeader = "X-River-No-Forward"
	RiverNoForwardValue  = "true"
	RiverFromNodeHeader  = "X-River-From-Node"
	RiverToNodeHeader    = "X-River-To-Node"
)

// peerNodeStreamingResponseWithRetries makes a request with a streaming server response to remote nodes, retrying
// in the event of unavailable nodes.
func peerNodeStreamingResponseWithRetries(
	ctx context.Context,
	nodes StreamNodes,
	s *Service,
	makeStubRequest func(ctx context.Context, stub StreamServiceClient) (hasStreamed bool, err error),
	numRetries int,
) error {
	remotes, _ := nodes.GetRemotesAndIsLocal()
	if len(remotes) <= 0 {
		return RiverError(Err_INTERNAL, "Cannot make peer node requests: no nodes available").
			Func("peerNodeStreamingResponseWithRetries")
	}

	var stub StreamServiceClient
	var err error
	var hasStreamed bool

	if numRetries <= 0 {
		numRetries = max(s.config.Network.NumRetries, 1)
	}

	// Do not make more than one request to a single node
	numRetries = min(numRetries, len(remotes))

	for retry := 0; retry < numRetries; retry++ {
		peer := nodes.GetStickyPeer()
		stub, err = s.nodeRegistry.GetStreamServiceClientForAddress(peer)
		if err != nil {
			return AsRiverError(err).
				Func("peerNodeStreamingResponseWithRetries").
				Message("Could not get stream service client for address").
				Tag("address", peer)
		}

		// The stub request handles streaming the entire response.
		hasStreamed, err = makeStubRequest(ctx, stub)

		if err == nil {
			return nil
		}

		// TODO: fix to same logic as peerNodeRequestWithRetries.
		if IsConnectNetworkError(err) && !hasStreamed {
			// Mark peer as unavailable.
			nodes.AdvanceStickyPeer(peer)
		} else {
			return AsRiverError(err).
				Message("makeStubRequest failed").
				Func("peerNodeStreamingResponseWithRetries").
				Tag("hasStreamed", hasStreamed).
				Tag("retry", retry).
				Tag("numRetries", numRetries)
		}
	}
	// If all requests fail, return the last error.
	if err != nil {
		return AsRiverError(err).
			Func("peerNodeStreamingResponseWithRetries").
			Message("All retries failed").
			Tag("numRetries", numRetries)
	}

	return nil
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
	view, err := stream.GetViewIfLocal(ctx)
	if err != nil {
		return nil, err
	}

	if view != nil {
		return s.localGetStream(view)
	} else {
		return utils.PeerNodeRequestWithRetries(
			ctx,
			stream,
			func(ctx context.Context, stub StreamServiceClient) (*connect.Response[GetStreamResponse], error) {
				ret, err := stub.GetStream(ctx, req)
				if err != nil {
					return nil, err
				}
				return connect.NewResponse(ret.Msg), nil
			},
			s.config.Network.NumRetries,
			s.nodeRegistry,
		)
	}
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

	if nodes.IsLocal() {
		return s.localGetStreamEx(ctx, req, resp)
	}

	err = peerNodeStreamingResponseWithRetries(
		ctx,
		nodes,
		s,
		func(ctx context.Context, stub StreamServiceClient) (hasStreamed bool, err error) {
			// Get the raw stream from another client and forward packets.
			clientStream, err := stub.GetStreamEx(ctx, req)
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
				).Func("service.getStreamExImpl").Tag("streamId", req.Msg.StreamId)
			}

			return hasStreamed, nil
		},
		-1,
	)
	return err
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
) (*connect.Response[GetMiniblocksResponse], error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		return nil, err
	}

	if stream.IsLocal() {
		return s.localGetMiniblocks(ctx, req, stream)
	}

	return utils.PeerNodeRequestWithRetries(
		ctx,
		stream,
		func(ctx context.Context, stub StreamServiceClient) (*connect.Response[GetMiniblocksResponse], error) {
			ret, err := stub.GetMiniblocks(ctx, req)
			if err != nil {
				return nil, err
			}
			return connect.NewResponse(ret.Msg), nil
		},
		s.config.Network.NumRetries,
		s.nodeRegistry,
	)
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
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	stream, err := s.cache.GetStreamNoWait(ctx, streamId)
	if err != nil {
		return nil, err
	}

	view, err := stream.GetViewIfLocal(ctx)
	if err != nil {
		return nil, err
	}

	if view != nil {
		return s.localGetLastMiniblockHash(view)
	}

	return utils.PeerNodeRequestWithRetries(
		ctx,
		stream,
		func(ctx context.Context, stub StreamServiceClient) (*connect.Response[GetLastMiniblockHashResponse], error) {
			ret, err := stub.GetLastMiniblockHash(ctx, req)
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

	view, err := stream.GetViewIfLocal(ctx)
	if err != nil {
		return nil, err
	}

	if view != nil {
		return s.localAddEvent(ctx, req, streamId, stream, view)
	}

	if req.Header().Get(RiverNoForwardHeader) == RiverNoForwardValue {
		return nil, RiverError(Err_UNAVAILABLE, "Forwarding disabled by request header").
			Func("service.addEventImpl").
			Tags("streamId", req.Msg.StreamId,
				RiverFromNodeHeader, req.Header().Get(RiverFromNodeHeader),
				RiverToNodeHeader, req.Header().Get(RiverToNodeHeader),
			)
	}

	// TODO: smarter remote select? random?
	// TODO: retry?
	firstRemote := stream.GetStickyPeer()
	logging.FromCtx(ctx).Debugw("Forwarding request", "nodeAddress", firstRemote)
	stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(firstRemote)
	if err != nil {
		return nil, err
	}

	newReq := connect.NewRequest(req.Msg)
	newReq.Header().Set(RiverNoForwardHeader, RiverNoForwardValue)
	newReq.Header().Set(RiverFromNodeHeader, s.wallet.Address.Hex())
	newReq.Header().Set(RiverToNodeHeader, firstRemote.Hex())
	ret, err := stub.AddEvent(ctx, newReq)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(ret.Msg), nil
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

		return s.localAddMediaEvent(ctx, req)
	}

	// Forward the request to the first sticky node otherwise
	if req.Header().Get(RiverNoForwardHeader) == RiverNoForwardValue {
		return nil, RiverError(Err_UNAVAILABLE, "Forwarding disabled by request header").
			Func("service.addEventImpl").
			Tags("streamId", cc.GetStreamId(),
				RiverFromNodeHeader, req.Header().Get(RiverFromNodeHeader),
				RiverToNodeHeader, req.Header().Get(RiverToNodeHeader),
			)
	}

	// TODO: smarter remote select? random?
	// TODO: retry?
	firstRemote := NewStreamNodesWithLock(cc.NodeAddresses(), s.wallet.Address).GetStickyPeer()
	logging.FromCtx(ctx).Debug("Forwarding request", "nodeAddress", firstRemote)
	stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(firstRemote)
	if err != nil {
		return nil, err
	}

	newReq := connect.NewRequest(req.Msg)
	newReq.Header().Set(RiverNoForwardHeader, RiverNoForwardValue)
	newReq.Header().Set(RiverFromNodeHeader, s.wallet.Address.Hex())
	newReq.Header().Set(RiverToNodeHeader, firstRemote.Hex())
	ret, err := stub.AddMediaEvent(ctx, newReq)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(ret.Msg), nil
}
