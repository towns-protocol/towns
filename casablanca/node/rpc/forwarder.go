package rpc

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/protocol"
	. "casablanca/node/protocol/protocolconnect"
	"context"

	connect_go "github.com/bufbuild/connect-go"
)

// Returns isLocal, remoteNodes
func (s *Service) splitLocalAndRemote(ctx context.Context, nodes []string) (bool, []string) {
	for i, n := range nodes {
		if n == s.wallet.AddressStr {
			return true, append(nodes[:i], nodes[i+1:]...)
		}
	}

	return false, nodes
}

// Returns isLocal, remoteNodes, error
func (s *Service) getNodesForStream(ctx context.Context, streamId string) (bool, []string, error) {
	nodes, err := s.streamRegistry.GetNodeAddressesForStream(ctx, streamId)
	if err != nil {
		return false, nil, err
	}

	isLocal, remotes := s.splitLocalAndRemote(ctx, nodes)
	return isLocal, remotes, nil
}

func (s *Service) getStubForStream(ctx context.Context, streamId string) (StreamServiceClient, error) {
	isLocal, remotes, err := s.getNodesForStream(ctx, streamId)
	if err != nil {
		return nil, err
	}
	if isLocal {
		return nil, nil
	}

	firstRemote := remotes[0]
	dlog.CtxLog(ctx).Debug("Forwarding request", "nodeAddress", firstRemote)
	return s.nodeRegistry.GetStreamServiceClientForAddress(firstRemote)
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
	// TODO: this logic needs to be reworked: checks should happen first, then allocation.
	nodeAddress, err := s.streamRegistry.AllocateStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	isLocal, remotes := s.splitLocalAndRemote(ctx, nodeAddress)

	if isLocal {
		return s.localCreateStream(ctx, req)
	}

	// TODO: right now streams are not replicated, so there is only one node that is responsible for a stream.
	// In the future, some smarter selection logic will be needed.
	stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(remotes[0])
	if err != nil {
		return nil, err
	}

	dlog.CtxLog(ctx).Debug("Forwarding request", "streamId", req.Msg.StreamId, "nodeAddress", nodeAddress[0])
	return stub.CreateStream(ctx, req)
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

func (s *Service) GetLastMiniblockHash(
	ctx context.Context,
	req *connect_go.Request[GetLastMiniblockHashRequest],
) (*connect_go.Response[GetLastMiniblockHashResponse], error) {
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
	req *connect_go.Request[GetLastMiniblockHashRequest],
) (*connect_go.Response[GetLastMiniblockHashResponse], error) {
	stub, err := s.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	if stub != nil {
		return stub.GetLastMiniblockHash(ctx, req)
	} else {
		return s.localGetLastMiniblockHash(ctx, req)
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
	streamId := req.Msg.StreamId

	isLocal, remotes, err := s.getNodesForStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	if isLocal {
		return s.localAddEvent(ctx, req)
	}

	firstRemote := remotes[0]
	dlog.CtxLog(ctx).Debug("Forwarding request", "nodeAddress", firstRemote)
	stub, err := s.nodeRegistry.GetStreamServiceClientForAddress(firstRemote)
	if err != nil {
		return nil, err
	}

	return stub.AddEvent(ctx, req)
}
