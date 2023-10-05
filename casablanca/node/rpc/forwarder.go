package rpc

import (
	. "casablanca/node/base"
	"casablanca/node/dlog"
	. "casablanca/node/nodes"
	. "casablanca/node/protocol"
	"context"

	connect_go "github.com/bufbuild/connect-go"
)

// Implements StreamServiceHandler
type forwarderImpl struct {
	nodeRegistry   NodeRegistry
	streamRegistry StreamRegistry
}

func NewForwarder(nodeRegistry NodeRegistry, streamRegistry StreamRegistry) *forwarderImpl {
	return &forwarderImpl{
		nodeRegistry:   nodeRegistry,
		streamRegistry: streamRegistry,
	}
}

func (f *forwarderImpl) getStubForStream(ctx context.Context, streamId string) (StreamService, error) {
	nodeAddress, err := f.streamRegistry.GetNodeAddressesForStream(ctx, streamId)
	if err != nil {
		return nil, err
	}

	// TODO: right now streams are not replicated, so there is only one node that is responsible for a stream.
	// In the future, some smarter selection logic will be needed.
	stub, err := f.nodeRegistry.GetStubForAddress(nodeAddress[0])
	if err != nil {
		return nil, err
	}

	return stub, nil
}

func (f *forwarderImpl) CreateStream(ctx context.Context, req *connect_go.Request[CreateStreamRequest]) (*connect_go.Response[CreateStreamResponse], error) {
	log := dlog.CtxLog(ctx) // TODO: use ctxAndLogForRequest
	log.Debug("fwd.CreateStream ENTER", "streamId", req.Msg.StreamId)
	r, e := f.createStreamImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("fwd.CreateStream").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("fwd.CreateStream LEAVE", "response", r.Msg)
	return r, nil
}

func (f *forwarderImpl) createStreamImpl(ctx context.Context, req *connect_go.Request[CreateStreamRequest]) (*connect_go.Response[CreateStreamResponse], error) {
	stub, err := f.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	return stub.CreateStream(ctx, req)
}

func (f *forwarderImpl) GetStream(ctx context.Context, req *connect_go.Request[GetStreamRequest]) (*connect_go.Response[GetStreamResponse], error) {
	log := dlog.CtxLog(ctx) // TODO: use ctxAndLogForRequest
	log.Debug("fwd.GetStream ENTER", "streamId", req.Msg.StreamId)
	r, e := f.getStreamImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("fwd.GetStream").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("fwd.GetStream LEAVE", "response", r.Msg)
	return r, nil
}

func (f *forwarderImpl) getStreamImpl(ctx context.Context, req *connect_go.Request[GetStreamRequest]) (*connect_go.Response[GetStreamResponse], error) {
	stub, err := f.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	return stub.GetStream(ctx, req)
}

func (f *forwarderImpl) GetMiniblocks(ctx context.Context, req *connect_go.Request[GetMiniblocksRequest]) (*connect_go.Response[GetMiniblocksResponse], error) {
	log := dlog.CtxLog(ctx) // TODO: use ctxAndLogForRequest
	log.Debug("fwd.GetMiniblocks ENTER", "req", req.Msg)
	r, e := f.getMiniblocksImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("fwd.GetMiniblocks").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("fwd.GetMiniblocks LEAVE", "response", r.Msg)
	return r, nil
}

func (f *forwarderImpl) getMiniblocksImpl(ctx context.Context, req *connect_go.Request[GetMiniblocksRequest]) (*connect_go.Response[GetMiniblocksResponse], error) {
	stub, err := f.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	return stub.GetMiniblocks(ctx, req)
}

func (f *forwarderImpl) AddEvent(ctx context.Context, req *connect_go.Request[AddEventRequest]) (*connect_go.Response[AddEventResponse], error) {
	log := dlog.CtxLog(ctx) // TODO: use ctxAndLogForRequest
	log.Debug("fwd.AddEvent ENTER", "req", req.Msg)
	r, e := f.addEventImpl(ctx, req)
	if e != nil {
		return nil, AsRiverError(e).Func("fwd.AddEvent").Tag("streamId", req.Msg.StreamId).LogWarn(log).AsConnectError()
	}
	log.Debug("fwd.AddEvent LEAVE", "streamId", req.Msg.StreamId)
	return r, nil
}

func (f *forwarderImpl) addEventImpl(ctx context.Context, req *connect_go.Request[AddEventRequest]) (*connect_go.Response[AddEventResponse], error) {
	stub, err := f.getStubForStream(ctx, req.Msg.StreamId)
	if err != nil {
		return nil, err
	}

	return stub.AddEvent(ctx, req)
}

func (f *forwarderImpl) GetLinkWalletNonce(ctx context.Context, req *connect_go.Request[GetLinkWalletNonceRequest]) (*connect_go.Response[GetLinkWalletNonceResponse], error) {
	return f.nodeRegistry.GetLocalNode().Stub.GetLinkWalletNonce(ctx, req)
}

func (f *forwarderImpl) LinkWallet(ctx context.Context, req *connect_go.Request[LinkWalletRequest]) (*connect_go.Response[LinkWalletResponse], error) {
	return f.nodeRegistry.GetLocalNode().Stub.LinkWallet(ctx, req)
}

func (f *forwarderImpl) GetLinkedWallets(ctx context.Context, req *connect_go.Request[GetLinkedWalletsRequest]) (*connect_go.Response[GetLinkedWalletsResponse], error) {
	return f.nodeRegistry.GetLocalNode().Stub.GetLinkedWallets(ctx, req)
}

func (f *forwarderImpl) Info(ctx context.Context, req *connect_go.Request[InfoRequest]) (*connect_go.Response[InfoResponse], error) {
	return f.nodeRegistry.GetLocalNode().Stub.Info(ctx, req)
}
