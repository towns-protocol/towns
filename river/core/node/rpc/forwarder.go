package rpc

import (
	"context"
	"errors"
	"net"
	"time"

	"connectrpc.com/connect"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/utils"
)

const (
	RiverNoForwardHeader = "X-River-No-Forward"
	RiverNoForwardValue  = "true"
	RiverFromNodeHeader  = "X-River-From-Node"
	RiverToNodeHeader    = "X-River-To-Node"
)

// peerNodeRequestWithRetries makes a request to as many as each of the remote nodes, returning the first response
// that is not a network unavailability error.
func peerNodeRequestWithRetries[T any](
	ctx context.Context,
	nodes StreamNodes,
	s *Service,
	makeStubRequest func(ctx context.Context, stub StreamServiceClient) (*connect.Response[T], error),
	numRetries int,
) (*connect.Response[T], error) {
	remotes, _ := nodes.GetRemotesAndIsLocal()
	if len(remotes) <= 0 {
		return nil, RiverError(Err_INTERNAL, "Cannot make peer node requests: no nodes available").
			Func("peerNodeRequestWithRetries")
	}

	var stub StreamServiceClient
	var resp *connect.Response[T]
	var err error

	if numRetries <= 0 {
		numRetries = max(s.config.Network.NumRetries, 1)
	}

	// Do not make more than one request to a single node
	numRetries = min(numRetries, len(remotes))

	for retry := 0; retry < numRetries; retry++ {
		peer := nodes.GetStickyPeer()
		stub, err = s.nodeRegistry.GetStreamServiceClientForAddress(peer)
		if err != nil {
			return nil, AsRiverError(err).
				Func("peerNodeRequestWithRetries").
				Message("Could not get stream service client for address").
				Tag("address", peer)
		}

		resp, err = makeStubRequest(ctx, stub)

		if err == nil {
			return resp, nil
		}

		retry := false
		// TODO: move to a helper function.
		if connectErr := new(connect.Error); errors.As(err, &connectErr) {
			if connect.IsWireError(connectErr) {
				// Error is received from another node. TODO: classify into retryable and non-retryable.
				retry = true
			} else {
				// Error is produced locally.
				// Check if it's a network error and retry in this case.
				if networkError := new(net.OpError); errors.As(connectErr, &networkError) {
					retry = true
				}
			}
		}

		if retry {
			// Mark peer as unavailable.
			nodes.AdvanceStickyPeer(peer)
		} else {
			return nil, AsRiverError(err).
				Func("peerNodeRequestWithRetries").
				Message("makeStubRequest failed").
				Tag("retry", retry).
				Tag("numRetries", numRetries)
		}
	}
	// If all requests fail, return the last error.
	return nil, AsRiverError(err).
		Func("peerNodeRequestWithRetries").
		Message("All retries failed").
		Tag("numRetries", numRetries)
}

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
	log.Debug("Handler ENTER", "method", methodName)

	startTime := time.Now()
	resp, e := handler(ctx, req)
	elapsed := time.Since(startTime)
	if e != nil {
		err := AsRiverError(e).
			Tags(
				"nodeAddress", service.wallet.Address.Hex(),
				"nodeUrl", service.config.Address,
				"elapsed", elapsed,
			).
			Func(methodName)
		if withStreamId, ok := req.Any().(streamIdProvider); ok {
			err = err.Tag("streamId", withStreamId.GetStreamId())
		}
		_ = err.LogWarn(log)
		return nil, err.AsConnectError()
	}
	log.Debug("Handler LEAVE", "method", methodName, "response", resp.Msg, "elapsed", elapsed)
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
	log.Debug("GetStreamEx ENTER")
	e := s.getStreamExImpl(ctx, req, resp)
	if e != nil {
		return s.asAnnotatedRiverError(e).
			Func("GetStreamEx").
			Tag("req.Msg.StreamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("GetStreamEx LEAVE")
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
		return s.localGetStream(ctx, stream, view)
	} else {
		return peerNodeRequestWithRetries(
			ctx,
			stream,
			s,
			func(ctx context.Context, stub StreamServiceClient) (*connect.Response[GetStreamResponse], error) {
				ret, err := stub.GetStream(ctx, req)
				if err != nil {
					return nil, err
				}
				return connect.NewResponse(ret.Msg), nil
			},
			-1,
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

	return peerNodeRequestWithRetries(
		ctx,
		stream,
		s,
		func(ctx context.Context, stub StreamServiceClient) (*connect.Response[GetMiniblocksResponse], error) {
			ret, err := stub.GetMiniblocks(ctx, req)
			if err != nil {
				return nil, err
			}
			return connect.NewResponse(ret.Msg), nil
		},
		-1,
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
		return s.localGetLastMiniblockHash(ctx, view)
	}

	return peerNodeRequestWithRetries(
		ctx,
		stream,
		s,
		func(ctx context.Context, stub StreamServiceClient) (*connect.Response[GetLastMiniblockHashResponse], error) {
			ret, err := stub.GetLastMiniblockHash(ctx, req)
			if err != nil {
				return nil, err
			}
			return connect.NewResponse(ret.Msg), nil
		},
		-1,
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
		return s.localAddEvent(ctx, req, stream, view)
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
	dlog.FromCtx(ctx).Debug("Forwarding request", "nodeAddress", firstRemote)
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
