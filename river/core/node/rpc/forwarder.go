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

func (s *Service) getStubForStream(ctx context.Context, streamId shared.StreamId) (StreamServiceClient, *StreamNodes, error) {
	nodes, err := s.streamRegistry.GetStreamInfo(ctx, streamId)
	if err != nil {
		return nil, nil, err
	}
	if nodes.IsLocal() {
		return nil, nodes, nil
	}

	firstRemote := nodes.GetRemotes()[0]
	dlog.FromCtx(ctx).Debug("Forwarding request", "nodeAddress", firstRemote)
	stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(firstRemote)
	if err != nil {
		return nil, nil, err
	}
	return stub, nodes, nil
}

func (s *Service) CreateStream(
	ctx context.Context,
	req *connect.Request[CreateStreamRequest],
) (*connect.Response[CreateStreamResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("CreateStream ENTER")
	r, e := s.createStreamImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("CreateStream").Tag("req.Msg.StreamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("CreateStream LEAVE", "response", r.Msg)
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
		return nil, AsRiverError(e).Func("GetStream").Tag("req.Msg.StreamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
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
		return AsRiverError(e).Func("GetStreamEx").Tag("req.Msg.StreamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
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

	stub, _, err := s.getStubForStream(ctx, streamId)

	if err != nil && req.Msg.Optional && AsRiverError(err).Code == Err_NOT_FOUND {
		return connect.NewResponse(&GetStreamResponse{}), nil
	} else if err != nil {
		return nil, err
	}

	if stub != nil {
		ret, err := stub.GetStream(ctx, req)
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(ret.Msg), nil
	} else {
		return s.localGetStream(ctx, req)
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

	stub, _, err := s.getStubForStream(ctx, streamId)
	if err != nil {
		return err
	}

	if stub != nil {
		// Get the raw stream from another client and forward packets.
		clientStream, err := stub.GetStreamEx(ctx, req)

		// Capture close stream error at method return
		defer func() {
			err = clientStream.Close()
		}()

		if err != nil {
			return err
		}

		// Forward the stream
		for clientStream.Receive() {
			err = resp.Send(clientStream.Msg())
			if err != nil {
				return err
			}
		}
		if err = clientStream.Err(); err != nil {
			return err
		}
		return nil
	} else {
		return s.localGetStreamEx(ctx, req, resp)
	}
}

func (s *Service) GetMiniblocks(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
) (*connect.Response[GetMiniblocksResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("GetMiniblocks ENTER", "req", req.Msg)
	r, e := s.getMiniblocksImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("GetMiniblocks").Tag("req.Msg.StreamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
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

	stub, _, err := s.getStubForStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	if stub != nil {
		ret, err := stub.GetMiniblocks(ctx, req)
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(ret.Msg), nil
	} else {
		return s.localGetMiniblocks(ctx, req)
	}
}

func (s *Service) GetLastMiniblockHash(
	ctx context.Context,
	req *connect.Request[GetLastMiniblockHashRequest],
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("GetLastMiniblockHash ENTER", "req", req.Msg)
	r, e := s.getLastMiniblockHashImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("GetLastMiniblockHash").Tag("req.Msg.StreamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
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

	stub, _, err := s.getStubForStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	if stub != nil {
		ret, err := stub.GetLastMiniblockHash(ctx, req)
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(ret.Msg), nil
	} else {
		return s.localGetLastMiniblockHash(ctx, req)
	}
}

func (s *Service) AddEvent(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
) (*connect.Response[AddEventResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("AddEvent ENTER", "req", req.Msg)
	r, e := s.addEventImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("AddEvent").Tag("req.Msg.StreamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
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
	firstRemote := nodes.GetRemotes()[0]
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
