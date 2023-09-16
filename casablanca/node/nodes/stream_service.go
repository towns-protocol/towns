package nodes

import (
	. "casablanca/node/protocol"
	"context"

	connect_go "github.com/bufbuild/connect-go"
)

// StreamService contains common methods for
// StreamServiceClient (client RPC stub) and StreamServiceHandler (server RPC handler).
// They are exactly the same with the exception of SyncStreams, which is a streaming method and has different
// signatures for client stub and local handler.
type StreamService interface {
	CreateStream(context.Context, *connect_go.Request[CreateStreamRequest]) (*connect_go.Response[CreateStreamResponse], error)
	GetStream(context.Context, *connect_go.Request[GetStreamRequest]) (*connect_go.Response[GetStreamResponse], error)
	GetMiniblocks(context.Context, *connect_go.Request[GetMiniblocksRequest]) (*connect_go.Response[GetMiniblocksResponse], error)
	AddEvent(context.Context, *connect_go.Request[AddEventRequest]) (*connect_go.Response[AddEventResponse], error)
	LinkWallet(context.Context, *connect_go.Request[LinkWalletRequest]) (*connect_go.Response[LinkWalletResponse], error)
	GetLinkedWallets(context.Context, *connect_go.Request[GetLinkedWalletsRequest]) (*connect_go.Response[GetLinkedWalletsResponse], error)
	Info(context.Context, *connect_go.Request[InfoRequest]) (*connect_go.Response[InfoResponse], error)
}

// StreamServiceClientOnly contains SyncStream method which is different in client/handler interfaces.
type StreamServiceClientOnly interface {
	SyncStreams(
		context.Context,
		*connect_go.Request[SyncStreamsRequest],
	) (
		*connect_go.ServerStreamForClient[SyncStreamsResponse],
		error,
	)
}

// LocalStreamSyncer contains SyncLocalStreams which is used for local stream syncing.
type LocalStreamSyncer interface {
	SyncLocalStreams(ctx context.Context, syncPos []*SyncCookie, sendUpdate func(*StreamAndCookie) error) error
}
