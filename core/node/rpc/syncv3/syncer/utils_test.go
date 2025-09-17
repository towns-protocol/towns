package syncer

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"reflect"
	"sync"
	"testing"
	"time"
	"unsafe"

	"connectrpc.com/connect"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"
)

func newTestStream(
	t *testing.T,
	ctx context.Context,
) (*events.Stream, *crypto.Wallet, shared.StreamId, *events.StreamView) {
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(t, err)

	streamID := testutils.FakeStreamId(shared.STREAM_SPACE_BIN)
	genesis := makeGenesisDescriptor(t, wallet, streamID)
	view := makeStreamView(t, genesis)

	params := &events.StreamCacheParams{
		ServerCtx: ctx,
		Wallet:    wallet,
		ChainConfig: &mocks.MockOnChainCfg{Settings: &crypto.OnChainSettings{
			RecencyConstraintsGen: 1,
		}},
		Config:  &config.Config{},
		Metrics: infra.NewMetricsFactory(prometheus.NewRegistry(), "", ""),
	}

	stream := events.NewStream(streamID, 0, params)
	stream.TestOnlyHelper_SetView(view)

	return stream, wallet, streamID, view
}

func makeGenesisDescriptor(t *testing.T, wallet *crypto.Wallet, streamID shared.StreamId) *storage.MiniblockDescriptor {
	inception := events.Make_MetadataPayload_Inception(streamID, nil)
	parsed, err := events.MakeParsedEventWithPayload(wallet, inception, &shared.MiniblockRef{})
	require.NoError(t, err)

	mb, err := events.MakeGenesisMiniblock(wallet, []*events.ParsedEvent{parsed})
	require.NoError(t, err)

	info, err := events.NewMiniblockInfoFromProto(
		mb,
		nil,
		events.NewParsedMiniblockInfoOpts().
			WithExpectedBlockNumber(0).
			WithDoNotParseEvents(true),
	)
	require.NoError(t, err)

	descriptor, err := info.AsStorageMb()
	require.NoError(t, err)
	descriptor.Number = 0
	return descriptor
}

func makeStreamView(t *testing.T, genesis *storage.MiniblockDescriptor) *events.StreamView {
	data := &storage.ReadStreamFromLastSnapshotResult{
		SnapshotMiniblockOffset: 0,
		Miniblocks:              []*storage.MiniblockDescriptor{genesis},
	}
	view, err := events.MakeStreamView(data)
	require.NoError(t, err)
	return view
}

type fakeStreamSubscriber struct {
	mu sync.Mutex
	ch chan subscriberMsg
}

type subscriberMsg struct {
	resp    *protocol.SyncStreamsResponse
	version int
}

func newFakeStreamSubscriber() *fakeStreamSubscriber {
	return &fakeStreamSubscriber{ch: make(chan subscriberMsg, 8)}
}

func (f *fakeStreamSubscriber) OnStreamEvent(
	streamID shared.StreamId,
	update *protocol.SyncStreamsResponse,
	version int,
) {
	cloned := proto.Clone(update).(*protocol.SyncStreamsResponse)
	select {
	case f.ch <- subscriberMsg{resp: cloned, version: version}:
	default:
	}
}

func (f *fakeStreamSubscriber) waitForUpdate(t *testing.T) *protocol.SyncStreamsResponse {
	msg := f.waitForMessage(t)
	return msg.resp
}

func (f *fakeStreamSubscriber) waitForMessage(t *testing.T) subscriberMsg {
	select {
	case msg := <-f.ch:
		return msg
	case <-time.After(3 * time.Second):
		t.Fatalf("timed out waiting for update")
		return subscriberMsg{}
	}
}

func waitForOp(t *testing.T, sub *fakeStreamSubscriber, op protocol.SyncOp) *protocol.SyncStreamsResponse {
	for {
		msg := sub.waitForUpdate(t)
		if msg.GetSyncOp() == op {
			return msg
		}
	}
}

// fakeStreamingClientConn is a StreamingClientConn that delivers a predefined
// sequence of responses to the consumer.
type fakeStreamingClientConn struct {
	mu       sync.Mutex
	msgs     []*protocol.SyncStreamsResponse
	idx      int
	recvErr  error
	closeErr error
}

func newFakeStreamingClientConn(msgs []*protocol.SyncStreamsResponse, terminalErr error) *fakeStreamingClientConn {
	if terminalErr == nil {
		terminalErr = io.EOF
	}
	return &fakeStreamingClientConn{msgs: msgs, recvErr: terminalErr}
}

func (f *fakeStreamingClientConn) Spec() connect.Spec { return connect.Spec{} }
func (f *fakeStreamingClientConn) Peer() connect.Peer { return connect.Peer{} }
func (f *fakeStreamingClientConn) Send(any) error     { return nil }
func (f *fakeStreamingClientConn) RequestHeader() http.Header {
	return http.Header{}
}
func (f *fakeStreamingClientConn) CloseRequest() error { return nil }
func (f *fakeStreamingClientConn) Receive(msg any) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	dst, ok := msg.(*protocol.SyncStreamsResponse)
	if !ok {
		return fmt.Errorf("unexpected message type %T", msg)
	}

	if f.idx < len(f.msgs) {
		clone := proto.Clone(f.msgs[f.idx]).(*protocol.SyncStreamsResponse)
		*dst = *clone
		f.idx++
		return nil
	}
	return f.recvErr
}

func (f *fakeStreamingClientConn) ResponseHeader() http.Header {
	return http.Header{}
}

func (f *fakeStreamingClientConn) ResponseTrailer() http.Header {
	return http.Header{}
}

func (f *fakeStreamingClientConn) CloseResponse() error {
	return f.closeErr
}

// newServerStreamForClient constructs a connect.ServerStreamForClient backed by the
// provided fake connection.
func newServerStreamForClient(t require.TestingT, conn connect.StreamingClientConn) *connect.ServerStreamForClient[protocol.SyncStreamsResponse] {
	stream := &connect.ServerStreamForClient[protocol.SyncStreamsResponse]{}
	setServerStreamField(t, stream, "conn", conn)
	return stream
}

func setServerStreamField(t require.TestingT, stream *connect.ServerStreamForClient[protocol.SyncStreamsResponse], field string, value any) {
	v := reflect.ValueOf(stream).Elem()
	f := v.FieldByName(field)
	require.True(t, f.IsValid(), "field %s not found", field)
	reflect.NewAt(f.Type(), unsafe.Pointer(f.UnsafeAddr())).Elem().Set(reflect.ValueOf(value))
}

func newMockStreamServiceClient(t *testing.T) *mocks.MockStreamServiceClient {
	client := &mocks.MockStreamServiceClient{}
	t.Cleanup(func() {
		client.AssertExpectations(t)
	})
	return client
}

func newMockNodeRegistry(t *testing.T) *mocks.MockNodeRegistry {
	registry := &mocks.MockNodeRegistry{}
	t.Cleanup(func() {
		registry.AssertExpectations(t)
	})
	return registry
}

func waitForMessage(t *testing.T, ch <-chan subscriberMsg) subscriberMsg {
	select {
	case msg := <-ch:
		return msg
	case <-time.After(3 * time.Second):
		t.Fatalf("timed out waiting for subscriber message")
		return subscriberMsg{}
	}
}

type stubStreamCache struct {
	stream *events.Stream
	err    error
}

func (s *stubStreamCache) GetStreamNoWait(ctx context.Context, _ shared.StreamId) (*events.Stream, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.stream, nil
}

type collectingSubscriber struct {
	ch chan subscriberMsg
}

func newCollectingSubscriber() *collectingSubscriber {
	return &collectingSubscriber{ch: make(chan subscriberMsg, 8)}
}

func (c *collectingSubscriber) OnStreamEvent(streamID shared.StreamId, update *protocol.SyncStreamsResponse, version int) {
	c.ch <- subscriberMsg{resp: update, version: version}
}
