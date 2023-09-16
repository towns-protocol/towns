package nodes

import (
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

func (f *forwarderImpl) getStubForStream(streamId string, newStream bool) (StreamService, error) {
	nodeAddress, err := f.streamRegistry.GetNodeAddressesForStream(streamId, newStream)
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
	stub, err := f.getStubForStream(req.Msg.StreamId, true)
	if err != nil {
		return nil, err
	}

	return stub.CreateStream(ctx, req)
}

func (f *forwarderImpl) GetStream(ctx context.Context, req *connect_go.Request[GetStreamRequest]) (*connect_go.Response[GetStreamResponse], error) {
	stub, err := f.getStubForStream(req.Msg.StreamId, false)
	if err != nil {
		return nil, err
	}

	return stub.GetStream(ctx, req)
}

func (f *forwarderImpl) GetMiniblocks(ctx context.Context, req *connect_go.Request[GetMiniblocksRequest]) (*connect_go.Response[GetMiniblocksResponse], error) {
	stub, err := f.getStubForStream(req.Msg.StreamId, false)
	if err != nil {
		return nil, err
	}

	return stub.GetMiniblocks(ctx, req)
}

func (f *forwarderImpl) AddEvent(ctx context.Context, req *connect_go.Request[AddEventRequest]) (*connect_go.Response[AddEventResponse], error) {
	stub, err := f.getStubForStream(req.Msg.StreamId, false)
	if err != nil {
		return nil, err
	}

	return stub.AddEvent(ctx, req)
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
