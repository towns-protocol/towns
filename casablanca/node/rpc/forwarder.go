package rpc

import (
	"context"

	"connectrpc.com/connect"
	. "github.com/river-build/river/base"
	"github.com/river-build/river/dlog"
	. "github.com/river-build/river/events"
	. "github.com/river-build/river/protocol"
	. "github.com/river-build/river/protocol/protocolconnect"
)

func (s *Service) getNodesForStream(ctx context.Context, streamId string) (*StreamNodes, error) {
	nodes, _, err := s.streamRegistry.GetStreamInfo(ctx, streamId)
	if err != nil {
		return nil, err
	}

	return NewStreamNodes(nodes, s.wallet.AddressStr), nil
}

func (s *Service) getStubForStream(ctx context.Context, streamId string) (StreamServiceClient, *StreamNodes, error) {
	nodes, err := s.getNodesForStream(ctx, streamId)
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
		return nil, AsRiverError(e).Func("CreateStream").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
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
		return nil, AsRiverError(e).Func("GetStream").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("GetStream LEAVE", "response", r.Msg)
	return r, nil
}

func (s *Service) getStreamImpl(
	ctx context.Context,
	req *connect.Request[GetStreamRequest],
) (*connect.Response[GetStreamResponse], error) {
	stub, nodes, err := s.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	if stub != nil {
		ret, err := stub.GetStream(ctx, req)
		if err != nil {
			return nil, err
		}
		return connect.NewResponse(ret.Msg), nil
	} else {
		return s.localGetStream(ctx, req, nodes)
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
		return nil, AsRiverError(e).Func("GetMiniblocks").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("GetMiniblocks LEAVE", "response", r.Msg)
	return r, nil
}

func (s *Service) getMiniblocksImpl(
	ctx context.Context,
	req *connect.Request[GetMiniblocksRequest],
) (*connect.Response[GetMiniblocksResponse], error) {
	stub, nodes, err := s.getStubForStream(ctx, req.Msg.StreamId)
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
		return s.localGetMiniblocks(ctx, req, nodes)
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
		return nil, AsRiverError(e).Func("GetLastMiniblockHash").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("GetLastMiniblockHash LEAVE", "response", r.Msg)
	return r, nil
}

func (s *Service) getLastMiniblockHashImpl(
	ctx context.Context,
	req *connect.Request[GetLastMiniblockHashRequest],
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	stub, nodes, err := s.getStubForStream(ctx, req.Msg.StreamId)
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
		return s.localGetLastMiniblockHash(ctx, req, nodes)
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
		return nil, AsRiverError(e).Func("AddEvent").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("AddEvent LEAVE", "streamId", req.Msg.StreamId)
	return r, nil
}

func (s *Service) addEventImpl(
	ctx context.Context,
	req *connect.Request[AddEventRequest],
) (*connect.Response[AddEventResponse], error) {
	streamId := req.Msg.StreamId

	nodes, err := s.getNodesForStream(ctx, streamId)
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
