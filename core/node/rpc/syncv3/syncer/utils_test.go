package syncer

import (
	"context"
	"sync"
	"testing"
	"time"

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
