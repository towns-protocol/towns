package rpc

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/protocol"
	. "casablanca/node/protocol/protocolconnect"
	"context"

	connect_go "github.com/bufbuild/connect-go"
)

func (s *Service) getStubForStream(ctx context.Context, streamId string) (StreamServiceClient, error) {
	nodeAddress, err := s.streamRegistry.GetNodeAddressesForStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	dlog.CtxLog(ctx).Debug("Forwarding request", "streamId", streamId, "nodeAddress", nodeAddress)
	// TODO: right now streams are not replicated, so there is only one node that is responsible for a stream.
	// In the future, some smarter selection logic will be needed.
	return s.nodeRegistry.GetRemoteStubForAddress(nodeAddress[0])
}

func (s *Service) CreateStream(ctx context.Context, req *connect_go.Request[CreateStreamRequest]) (*connect_go.Response[CreateStreamResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("CreateStream ENTER")
	r, e := s.createStreamImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("CreateStream").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("CreateStream LEAVE", "response", r.Msg)
	return r, nil
}

func (s *Service) createStreamImpl(ctx context.Context, req *connect_go.Request[CreateStreamRequest]) (*connect_go.Response[CreateStreamResponse], error) {
	stub, err := s.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	if stub != nil {
		return stub.CreateStream(ctx, req)
	} else {
		return s.localCreateStream(ctx, req)
	}
}

func (s *Service) GetStream(ctx context.Context, req *connect_go.Request[GetStreamRequest]) (*connect_go.Response[GetStreamResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("GetStream ENTER")
	r, e := s.getStreamImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("GetStream").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("GetStream LEAVE", "response", r.Msg)
	return r, nil
}

func (s *Service) getStreamImpl(ctx context.Context, req *connect_go.Request[GetStreamRequest]) (*connect_go.Response[GetStreamResponse], error) {
	stub, err := s.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	if stub != nil {
		return stub.GetStream(ctx, req)
	} else {
		return s.localGetStream(ctx, req)
	}
}

func (s *Service) GetMiniblocks(ctx context.Context, req *connect_go.Request[GetMiniblocksRequest]) (*connect_go.Response[GetMiniblocksResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("GetMiniblocks ENTER", "req", req.Msg)
	r, e := s.getMiniblocksImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("GetMiniblocks").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("GetMiniblocks LEAVE", "response", r.Msg)
	return r, nil
}

func (s *Service) getMiniblocksImpl(ctx context.Context, req *connect_go.Request[GetMiniblocksRequest]) (*connect_go.Response[GetMiniblocksResponse], error) {
	stub, err := s.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	if stub != nil {
		return stub.GetMiniblocks(ctx, req)
	} else {
		return s.localGetMiniblocks(ctx, req)
	}
}

func (s *Service) AddEvent(ctx context.Context, req *connect_go.Request[AddEventRequest]) (*connect_go.Response[AddEventResponse], error) {
	ctx, log := ctxAndLogForRequest(ctx, req)
	log.Debug("AddEvent ENTER", "req", req.Msg)
	r, e := s.addEventImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("AddEvent").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("AddEvent LEAVE", "streamId", req.Msg.StreamId)
	return r, nil
}

func (s *Service) addEventImpl(ctx context.Context, req *connect_go.Request[AddEventRequest]) (*connect_go.Response[AddEventResponse], error) {
	stub, err := s.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	if stub != nil {
		return stub.AddEvent(ctx, req)
	} else {
		return s.localAddEvent(ctx, req)
	}
}
