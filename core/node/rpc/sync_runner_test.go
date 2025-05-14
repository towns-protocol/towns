package rpc

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	. "github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/nodes"
	. "github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/protocol/protocolconnect"
	"github.com/towns-protocol/towns/core/node/registries"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

func addMessageToChannelWithRetries(
	ctx context.Context,
	client protocolconnect.StreamServiceClient,
	wallet *crypto.Wallet,
	text string,
	channelId StreamId,
	channelHash *MiniblockRef,
	require *require.Assertions,
	numRetries int,
) {
	message, err := MakeEnvelopeWithPayload(
		wallet,
		Make_ChannelPayload_Message(text),
		channelHash,
	)
	require.NoError(err)

	request := connect.NewRequest(
		&AddEventRequest{
			StreamId: channelId[:],
			Event:    message,
		},
	)

	var lastErr error
	for attempt := 0; attempt <= numRetries; attempt++ {
		_, err = client.AddEvent(ctx, request)
		if err == nil {
			return
		}
		lastErr = err
		if attempt < numRetries {
			// Small delay before retrying
			time.Sleep(100 * time.Millisecond)
		}
	}

	require.NoError(lastErr, "Failed to add event after %d retries", numRetries)
}

type eventRecord struct {
	streamId StreamId
	event    *ParsedEvent
}

type MockTrackedStream struct {
	TrackedStreamViewImpl
	streamId StreamId
	events   chan<- eventRecord
}

func (m *MockTrackedStream) onNewEvent(ctx context.Context, view *StreamView, event *ParsedEvent) error {
	m.events <- eventRecord{
		streamId: m.streamId,
		event:    event,
	}
	return nil
}

func makeTrackedStreamConstructor(
	eventChannel chan<- eventRecord,
) func(context.Context, StreamId, crypto.OnChainConfiguration, *StreamAndCookie) (TrackedStreamView, error) {
	return func(
		ctx context.Context,
		streamId StreamId,
		cfg crypto.OnChainConfiguration,
		stream *StreamAndCookie,
	) (TrackedStreamView, error) {
		tracker := &MockTrackedStream{
			streamId: streamId,
			events:   eventChannel,
		}
		_, err := tracker.TrackedStreamViewImpl.Init(ctx, streamId, cfg, stream, tracker.onNewEvent)
		if err != nil {
			return nil, err
		}
		return tracker, nil
	}
}

func TestMultiSyncerWithNodeFailures(t *testing.T) {
	numNodes := 10
	replFactor := 5
	tt := newServiceTester(
		t,
		serviceTesterOpts{numNodes: numNodes, replicationFactor: replFactor, start: true, printTestLogs: false},
	)
	ctx := tt.ctx
	require := tt.require

	streamEvents := make(chan eventRecord, 2048)
	eventTracker := make(map[StreamId][]string)
	var eventTrackerMu sync.Mutex

	cfg := tt.getConfig()
	riverContract, err := registries.NewRiverRegistryContract(
		ctx,
		tt.btc.DeployerBlockchain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	require.NoError(err, "Error creating river registry contract for multi-sync runner")

	nodeRegistry, err := nodes.LoadNodeRegistry(
		ctx,
		riverContract,
		common.Address{},
		0,
		tt.btc.DeployerBlockchain.ChainMonitor,
		tt.btc.OnChainConfig,
		tt.httpClient(),
		nil,
	)
	require.NoError(err, "Error creating node registry for multi-sync runner")

	// Create MultiSyncRunner
	msr := track_streams.NewMultiSyncRunner(
		track_streams.NewTrackStreamsSyncMetrics(infra.NewMetricsFactory(nil, "", "")),
		tt.btc.OnChainConfig,
		[]nodes.NodeRegistry{nodeRegistry},
		makeTrackedStreamConstructor(streamEvents),
		config.StreamTrackingConfig{
			StreamsPerSyncSession:     3, // Small number to force multiple sync sessions per target node
			NumWorkers:                2,
			MaxConcurrentNodeRequests: 2,
		},
		nil,
	)
	msrCtx := ctx
	// Use this line to enable logs only for the multisync runner
	// msrCtx := logging.CtxWithLog(ctx, logging.DefaultLogger(zapcore.DebugLevel))
	go msr.Run(msrCtx)

	client0 := tt.newTestClient(0, testClientOpts{}).client

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	resuser, _, err := createUser(ctx, wallet, client0, nil)
	require.NoError(err)
	require.NotNil(resuser)

	// Create space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, _, err = createSpace(ctx, wallet, client0, spaceId, &StreamSettings{})
	require.NoError(err)

	// Create multiple channels
	numChannels := 50
	channelIds := make([]StreamId, numChannels)
	channelHashes := make([]*MiniblockRef, numChannels)

	for i := 0; i < numChannels; i++ {
		channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
		channel, channelHash, err := createChannel(
			ctx,
			wallet,
			client0,
			spaceId,
			channelId,
			&StreamSettings{DisableMiniblockCreation: true},
		)
		require.NoError(err)
		require.NotNil(channel)

		b0ref, err := makeMiniblock(ctx, client0, channelId, false, -1)
		require.NoError(err)
		require.Equal(int64(0), b0ref.Num)

		channelIds[i] = StreamId(channel.StreamId)
		channelHashes[i] = channelHash

		// Add to sync runner
		stream, err := tt.nodes[0].service.registryContract.GetStreamOnLatestBlock(
			ctx,
			channelIds[i],
		)
		require.NoError(err)

		msr.AddStream(
			&river.StreamWithId{
				Id: [32]byte(channelIds[i]),
				Stream: river.Stream{
					Nodes:     stream.Nodes(),
					Reserved0: uint64(replFactor),
				},
			},
			true,
		)

		eventTracker[channelIds[i]] = []string{}
	}

	// Start goroutine to collect events
	eventCollectorCtx, cancelCollector := context.WithCancel(ctx)
	defer cancelCollector()

	eventCollectorDone := make(chan struct{})
	go func() {
		defer close(eventCollectorDone)

		for {
			select {
			case <-eventCollectorCtx.Done():
				return

			case record := <-streamEvents:
				// tt.t.Logf("Saw event: %v\n", record.event.ParsedString())
				if payload, ok := record.event.Event.Payload.(*StreamEvent_ChannelPayload); ok {
					if message, ok := payload.ChannelPayload.GetContent().(*ChannelPayload_Message); ok {
						eventTrackerMu.Lock()
						eventTracker[record.streamId] = append(
							eventTracker[record.streamId],
							message.Message.Ciphertext,
						)
						eventTrackerMu.Unlock()
					}
				}
			}
		}
	}()

	// Send first batch of messages to all channels
	expectedMessages := make(map[StreamId][]string)
	for i, channelId := range channelIds {
		msg := fmt.Sprintf("msg1-channel%d", i)
		addMessageToChannel(ctx, client0, wallet, msg, channelId, channelHashes[i], require)
		expectedMessages[channelId] = append(expectedMessages[channelId], msg)
	}

	// Wait until all first batch messages are received
	require.Eventually(func() bool {
		eventTrackerMu.Lock()
		defer eventTrackerMu.Unlock()

		// Check if all channels have received their first message
		for channelId, expectedMsgs := range expectedMessages {
			messages := eventTracker[channelId]
			for _, expectedMsg := range expectedMsgs {
				found := false
				for _, msg := range messages {
					if msg == expectedMsg {
						found = true
						break
					}
				}
				if !found {
					return false
				}
			}
		}
		return true
	}, 30*time.Second, 100*time.Millisecond, "Not all messages from first batch were received")

	// Stop two nodes to force stream relocation
	tt.CloseNode(1)
	tt.CloseNode(2)

	// Send second batch of messages - we don't need to wait for relocation explicitly
	// as our assertion will verify that messages are eventually delivered
	for i, channelId := range channelIds {
		msg := fmt.Sprintf("msg2-channel%d", i)
		addMessageToChannelWithRetries(ctx, client0, wallet, msg, channelId, channelHashes[i], require, replFactor)
		expectedMessages[channelId] = append(expectedMessages[channelId], msg)
	}

	// Wait until all second batch messages are received
	require.Eventually(func() bool {
		eventTrackerMu.Lock()
		defer eventTrackerMu.Unlock()

		// Check if all channels have received all expected messages
		for channelId, expectedMsgs := range expectedMessages {
			messages := eventTracker[channelId]
			for _, expectedMsg := range expectedMsgs {
				found := false
				for _, msg := range messages {
					if msg == expectedMsg {
						found = true
						break
					}
				}
				if !found {
					// t.Logf("Missing message %s for channel %s", expectedMsg, channelId)
					return false
				}
			}
		}
		return true
	}, 15*time.Second, 100*time.Millisecond, "Not all messages were received after node failures")

	// Shutdown cleanly
	cancelCollector()
	<-eventCollectorDone

	// Final verification of messages
	eventTrackerMu.Lock()
	defer eventTrackerMu.Unlock()

	for i, channelId := range channelIds {
		messages := eventTracker[channelId]
		// t.Logf("Channel %d received %d messages: %v", i, len(messages), messages)

		// Check that both our specific messages are present
		msg1 := fmt.Sprintf("msg1-channel%d", i)
		msg2 := fmt.Sprintf("msg2-channel%d", i)

		found1, found2 := false, false
		for _, msg := range messages {
			if msg == msg1 {
				found1 = true
			}
			if msg == msg2 {
				found2 = true
			}
		}

		require.True(found1, "First message not found for channel %d", i)
		require.True(found2, "Second message not found for channel %d", i)
	}
}
