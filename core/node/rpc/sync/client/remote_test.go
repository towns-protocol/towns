package client

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

// TestRemoteSyncerTimeoutFirstUpdate ensures that initiating a sync operation
// and receiving the first update happens within a timeout period. If not, an
// UNAVAILABLE error must be raised.
func TestRemoteSyncerTimeoutFirstUpdate(t *testing.T) {
	var (
		require     = require.New(t)
		syncID      = "TestRemoteSyncerTimeoutFirstUpdateSyncID"
		unsubStream = func(streamID StreamId) {}
		messages    = dynmsgbuf.NewDynamicBuffer[*SyncStreamsResponse]()
		remoteAddr  common.Address
	)
	ctx, cancelWithCause := context.WithCancelCause(t.Context())
	defer cancelWithCause(errors.New("something"))

	mux := http.NewServeMux()
	noSendAndWaitForeverContext, noSendAndWaitForeverCancel := context.WithCancel(ctx)
	mux.Handle(protocolconnect.NewStreamServiceHandler(&mockStreamService{
		noSendAndWaitForever: noSendAndWaitForeverContext,
	}))

	server := httptest.NewServer(mux)
	t.Cleanup(func() { server.Close() })

	client := protocolconnect.NewStreamServiceClient(http.DefaultClient, server.URL)
	_, err := NewRemoteSyncer(
		ctx,
		cancelWithCause,
		syncID,
		remoteAddr,
		client,
		unsubStream,
		messages,
		nil,
	)

	var riverErr *RiverErrorImpl
	require.ErrorAs(err, &riverErr)
	require.EqualValues(Err_UNAVAILABLE, riverErr.Code)
	noSendAndWaitForeverCancel()
}

type mockStreamService struct {
	mock.Mock

	noSendAndWaitForever context.Context
}

var _ protocolconnect.StreamServiceHandler = (*mockStreamService)(nil)

func (m *mockStreamService) Info(
	ctx context.Context,
	c *connect.Request[InfoRequest],
) (*connect.Response[InfoResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) CreateStream(
	ctx context.Context,
	c *connect.Request[CreateStreamRequest],
) (*connect.Response[CreateStreamResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) CreateMediaStream(
	ctx context.Context,
	c *connect.Request[CreateMediaStreamRequest],
) (*connect.Response[CreateMediaStreamResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) GetStream(
	ctx context.Context,
	c *connect.Request[GetStreamRequest],
) (*connect.Response[GetStreamResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) GetStreamEx(
	ctx context.Context,
	c *connect.Request[GetStreamExRequest],
	c2 *connect.ServerStream[GetStreamExResponse],
) error {
	panic("implement me")
}

func (m *mockStreamService) GetMiniblocks(
	ctx context.Context,
	c *connect.Request[GetMiniblocksRequest],
) (*connect.Response[GetMiniblocksResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) GetLastMiniblockHash(
	ctx context.Context,
	c *connect.Request[GetLastMiniblockHashRequest],
) (*connect.Response[GetLastMiniblockHashResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) AddEvent(
	ctx context.Context,
	c *connect.Request[AddEventRequest],
) (*connect.Response[AddEventResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) AddMediaEvent(
	ctx context.Context,
	c *connect.Request[AddMediaEventRequest],
) (*connect.Response[AddMediaEventResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) SyncStreams(
	ctx context.Context,
	req *connect.Request[SyncStreamsRequest],
	res *connect.ServerStream[SyncStreamsResponse],
) error {
	if m.noSendAndWaitForever != nil {
		<-m.noSendAndWaitForever.Done()
	}
	<-ctx.Done()
	return ctx.Err()
}

func (m *mockStreamService) AddStreamToSync(
	ctx context.Context,
	c *connect.Request[AddStreamToSyncRequest],
) (*connect.Response[AddStreamToSyncResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) ModifySync(
	ctx context.Context,
	c *connect.Request[ModifySyncRequest],
) (*connect.Response[ModifySyncResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) CancelSync(
	ctx context.Context,
	c *connect.Request[CancelSyncRequest],
) (*connect.Response[CancelSyncResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) RemoveStreamFromSync(
	ctx context.Context,
	c *connect.Request[RemoveStreamFromSyncRequest],
) (*connect.Response[RemoveStreamFromSyncResponse], error) {
	panic("implement me")
}

func (m *mockStreamService) PingSync(
	ctx context.Context,
	c *connect.Request[PingSyncRequest],
) (*connect.Response[PingSyncResponse], error) {
	panic("implement me")
}
