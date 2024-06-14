package rpc

import (
	"context"

	"connectrpc.com/connect"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/nodes"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/shared"
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
	if nodes.NumRemotes() <= 0 {
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
	numRetries = min(numRetries, nodes.NumRemotes())

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

		if IsConnectNetworkError(err) {
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
	if nodes.NumRemotes() <= 0 {
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
	numRetries = min(numRetries, nodes.NumRemotes())

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

func (s *Service) CreateStream(
	ctx context.Context,
	req *connect.Request[CreateStreamRequest],
) (*connect.Response[CreateStreamResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("CreateStream REQUEST", "streamId", req.Msg.StreamId)
	r, e := s.createStreamImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("CreateStream").
			Tag("streamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	var numMiniblocks int
	var numEvents int
	var firstMiniblockHash []byte
	if s := r.Msg.GetStream(); s != nil {
		numMiniblocks = len(s.GetMiniblocks())
		numEvents = len(s.GetEvents())
		if numMiniblocks > 0 {
			firstMiniblockHash = s.GetMiniblocks()[0].GetHeader().GetHash()
		}
	}
	log.Debug("CreateStream SUCCESS",
		"streamId", req.Msg.StreamId,
		"numMiniblocks", numMiniblocks,
		"numEvents", numEvents,
		"firstMiniblockHash", firstMiniblockHash)
	return r, nil
}

func (s *Service) GetStream(
	ctx context.Context,
	req *connect.Request[GetStreamRequest],
) (*connect.Response[GetStreamResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("GetStream ENTER")
	r, e := s.getStreamImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("GetStream").
			Tag("req.Msg.StreamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("GetStream LEAVE", "response", r.Msg)
	return r, nil
}

func (s *Service) GetStreamEx(
	ctx context.Context,
	req *connect.Request[GetStreamExRequest],
	resp *connect.ServerStream[GetStreamExResponse],
) error {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("GetStreamEx ENTER")
	e := s.getStreamExImpl(ctx, req, resp)
	if e != nil {
		return AsRiverError(
			e,
		).Func("GetStreamEx").
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

	nodes, err := s.streamRegistry.GetStreamInfo(ctx, streamId)
	if err != nil && req.Msg.Optional && AsRiverError(err).Code == Err_NOT_FOUND {
		return connect.NewResponse(&GetStreamResponse{}), nil
	}

	if err != nil {
		return nil, err
	}

	if nodes.IsLocal() {
		return s.localGetStream(ctx, req)
	}

	return peerNodeRequestWithRetries(
		ctx,
		nodes,
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

func (s *Service) getStreamExImpl(
	ctx context.Context,
	req *connect.Request[GetStreamExRequest],
	resp *connect.ServerStream[GetStreamExResponse],
) (err error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return err
	}

	nodes, err := s.streamRegistry.GetStreamInfo(ctx, streamId)
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
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("GetMiniblocks ENTER", "req", req.Msg)
	r, e := s.getMiniblocksImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("GetMiniblocks").
			Tag("req.Msg.StreamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("GetMiniblocks LEAVE", "response", r.Msg)
	return r, nil
}

func (s *Service) getMiniblocksImpl(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
) (*connect.Response[GetMiniblocksResponse], error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	nodes, err := s.streamRegistry.GetStreamInfo(ctx, streamId)
	if err != nil {
		return nil, err
	}

	if nodes.IsLocal() {
		return s.localGetMiniblocks(ctx, req)
	}

	return peerNodeRequestWithRetries(
		ctx,
		nodes,
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
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("GetLastMiniblockHash ENTER", "req", req.Msg)
	r, e := s.getLastMiniblockHashImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("GetLastMiniblockHash").
			Tag("req.Msg.StreamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("GetLastMiniblockHash LEAVE", "response", r.Msg)
	return r, nil
}

func (s *Service) getLastMiniblockHashImpl(
	ctx context.Context,
	req *connect.Request[GetLastMiniblockHashRequest],
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	nodes, err := s.streamRegistry.GetStreamInfo(ctx, streamId)
	if err != nil {
		return nil, err
	}

	if nodes.IsLocal() {
		return s.localGetLastMiniblockHash(ctx, req)
	}

	return peerNodeRequestWithRetries(
		ctx,
		nodes,
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
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("AddEvent ENTER", "req", req.Msg)
	r, e := s.addEventImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(
			e,
		).Func("AddEvent").
			Tag("req.Msg.StreamId", req.Msg.StreamId).
			LogWarn(log).
			AsConnectError()
	}
	log.Debug("AddEvent LEAVE", "req.Msg.StreamId", req.Msg.StreamId)
	return r, nil
}

func (s *Service) addEventImpl(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
) (*connect.Response[AddEventResponse], error) {
	streamId, err := shared.StreamIdFromBytes(req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	nodes, err := s.streamRegistry.GetStreamInfo(ctx, streamId)
	if err != nil {
		return nil, err
	}

	if nodes.IsLocal() {
		return s.localAddEvent(ctx, req, nodes)
	}

	// TODO: smarter remote select? random?
	firstRemote := nodes.GetStickyPeer()
	dlog.FromCtx(ctx).Debug("Forwarding request", "nodeAddress", firstRemote)
	stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(firstRemote)
	if err != nil {
		return nil, err
	}

	ret, err := stub.AddEvent(ctx, req)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(ret.Msg), nil
}
