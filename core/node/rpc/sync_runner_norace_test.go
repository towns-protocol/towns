//go:build !race

// This file contains tests that are skipped when the race detector is enabled
// because they are too resource-intensive.

package rpc

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
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

func startEventCollector(
	ctx context.Context,
	streamEvents <-chan eventRecord,
	eventTrackerMu *sync.Mutex,
	updateTracker func(record eventRecord, ciphertext string),
) (context.CancelFunc, <-chan struct{}) {
	eventCollectorCtx, cancelCollector := context.WithCancel(ctx)
	eventCollectorDone := make(chan struct{})

	go func() {
		defer close(eventCollectorDone)
		for {
			select {
			case <-eventCollectorCtx.Done():
				return
			case record := <-streamEvents:
				if payload, ok := record.event.Event.Payload.(*StreamEvent_ChannelPayload); ok {
					if message, ok := payload.ChannelPayload.GetContent().(*ChannelPayload_Message); ok {
						eventTrackerMu.Lock()
						updateTracker(record, message.Message.Ciphertext)
						eventTrackerMu.Unlock()
					}
				}
			}
		}
	}()
	return cancelCollector, eventCollectorDone
}

func verifyMessagesReceivedExactlyOnce(
	require *require.Assertions,
	channelIds []StreamId,
	expectedMessages map[StreamId][]string,   // Value is a slice of expected message strings
	eventTracker map[StreamId]map[string]int, // Value is a map of received message string to its count
) {
	for i, channelId := range channelIds {
		messageCounts, trackerHasChannel := eventTracker[channelId]
		expectedMsgsForChannel := expectedMessages[channelId]

		if len(expectedMsgsForChannel) == 0 {
			if trackerHasChannel && len(messageCounts) > 0 {
				require.Failf(
					"Received unexpected messages for channel",
					"Channel %d (ID: %s) expected no messages, but received some. Received (msg:count): %v",
					i,
					channelId.String(),
					messageCounts,
				)
			}
			continue // No messages expected for this channel
		}

		require.True(
			trackerHasChannel,
			"Channel %d (ID: %s) was expected to have messages, but its entry is missing in eventTracker.",
			i,
			channelId.String(),
		)

		// Check that the number of unique messages received matches the number of unique messages expected.
		require.Equal(
			len(expectedMsgsForChannel),
			len(messageCounts),
			"Channel %d (ID: %s): Expected %d unique messages, but received %d unique messages. Expected list: %v, Received (msg:count): %v",
			i,
			channelId.String(),
			len(expectedMsgsForChannel),
			len(messageCounts),
			expectedMsgsForChannel,
			messageCounts,
		)

		// Check that each expected message was received exactly once.
		for _, expectedMsg := range expectedMsgsForChannel {
			count, found := messageCounts[expectedMsg]
			require.True(
				found,
				"Channel %d (ID: %s): Expected message '%s' not found in received messages. Received (msg:count): %v",
				i,
				channelId.String(),
				expectedMsg,
				messageCounts,
			)
			require.Equal(
				1,
				count,
				"Channel %d (ID: %s): For expected message '%s', count was %d, expected 1. Received (msg:count): %v",
				i,
				channelId.String(),
				expectedMsg,
				count,
				messageCounts,
			)
		}
	}
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

type multiSyncerTestConfig struct {
	numNodes              int
	replFactor            int
	numChannels           int
	numMessagesPerChannel int
	streamsPerSyncSession int
	numWorkers            int
	maxConcurrentRequests int
}

func runMultiSyncerTest(t *testing.T, testCfg multiSyncerTestConfig) {
	tt := newServiceTester(
		t,
		serviceTesterOpts{
			numNodes:          testCfg.numNodes,
			replicationFactor: testCfg.replFactor,
			start:             true,
		},
	)
	ctx := tt.ctx
	require := tt.require

	streamEvents := make(chan eventRecord, 2048)
	eventTracker := make(map[StreamId]map[string]int, testCfg.numChannels)
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
		tt.httpClientWithCert(0),
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
			StreamsPerSyncSession:     testCfg.streamsPerSyncSession,
			NumWorkers:                testCfg.numWorkers,
			MaxConcurrentNodeRequests: testCfg.maxConcurrentRequests,
		},
		nil,
	)
	msrCtx := ctx
	go msr.Run(msrCtx)

	client0 := tt.newTestClient(0, testClientOpts{}).client

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	resuser, _, err := createUser(ctx, wallet, client0, nil)
	require.NoError(err)
	require.NotNil(resuser)

	// Create space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, _, err = createSpace(ctx, wallet, client0, spaceId, nil)
	require.NoError(err)

	// Create multiple channels
	channelIds := make([]StreamId, testCfg.numChannels)
	channelHashes := make([]*MiniblockRef, testCfg.numChannels)

	for i := range testCfg.numChannels {
		chId, chHash, err := setupTestChannelAndAddToSyncer(
			ctx,
			wallet,
			client0,
			spaceId,
			msr,
			testCfg.replFactor,
			tt,
		)
		require.NoError(err, "setupTestChannelAndAddToSyncer failed for channel %d", i)

		channelIds[i] = chId
		channelHashes[i] = chHash
		eventTracker[chId] = make(map[string]int)
	}

	// Start goroutine to collect events
	updateTrackerForCountsInRunTest := func(record eventRecord, ciphertext string) {
		if _, streamExists := eventTracker[record.streamId]; !streamExists {
			eventTracker[record.streamId] = make(map[string]int)
		}
		eventTracker[record.streamId][ciphertext]++
	}
	cancelCollector, eventCollectorDone := startEventCollector(
		ctx,
		streamEvents,
		&eventTrackerMu,
		updateTrackerForCountsInRunTest,
	)
	defer cancelCollector()

	// Send messages to each channel
	expectedMessages := make(map[StreamId][]string)
	for i, channelId := range channelIds {
		for j := 0; j < testCfg.numMessagesPerChannel; j++ {
			msg := fmt.Sprintf("msg%d-channel%d", j, i)
			addMessageToChannel(ctx, client0, wallet, msg, channelId, channelHashes[i], require)
			expectedMessages[channelId] = append(expectedMessages[channelId], msg)
		}
	}

	// Wait until all messages are received
	require.Eventually(func() bool {
		eventTrackerMu.Lock()
		defer eventTrackerMu.Unlock()

		// Check if all channels have received all their messages
		for channelId, expectedMsgsSlice := range expectedMessages {
			messageCounts, ok := eventTracker[channelId]
			if !ok {
				return false // Channel not yet in tracker
			}
			for _, expectedMsg := range expectedMsgsSlice {
				if count, found := messageCounts[expectedMsg]; !found || count == 0 {
					return false // Expected message not found or count is zero
				}
			}
		}
		return true
	}, 30*time.Second, 100*time.Millisecond, "Not all messages were received by event tracker")

	// Shutdown cleanly
	cancelCollector()
	<-eventCollectorDone

	// Final verification of messages
	eventTrackerMu.Lock()
	defer eventTrackerMu.Unlock()

	verifyMessagesReceivedExactlyOnce(require, channelIds, expectedMessages, eventTracker)
}

func TestMultiSyncer(t *testing.T) {
	t.Parallel()
	t.Run("Parallelism check: low concurrency", func(t *testing.T) {
		runMultiSyncerTest(t, multiSyncerTestConfig{
			numNodes:              10,
			replFactor:            5,
			numChannels:           50,
			numMessagesPerChannel: 10,
			streamsPerSyncSession: 3,
			numWorkers:            1,
			maxConcurrentRequests: 1,
		})
	})

	t.Run("Medium test - many sync sessions", func(t *testing.T) {
		runMultiSyncerTest(t, multiSyncerTestConfig{
			numNodes:              10,
			replFactor:            5,
			numChannels:           50,
			numMessagesPerChannel: 10,
			streamsPerSyncSession: 3,
			numWorkers:            2,
			maxConcurrentRequests: 2,
		})
	})

	t.Run("Long test - larger syncs", func(t *testing.T) {
		runMultiSyncerTest(t, multiSyncerTestConfig{
			numNodes:              5,
			replFactor:            3,
			numChannels:           200,
			numMessagesPerChannel: 10,
			streamsPerSyncSession: 10,
			numWorkers:            2,
			maxConcurrentRequests: 2,
		})
	})
}

func setupTestChannelAndAddToSyncer(
	ctx context.Context,
	wallet *crypto.Wallet,
	client0 protocolconnect.StreamServiceClient,
	spaceId StreamId,
	msr *track_streams.MultiSyncRunner,
	replFactor int,
	tt *serviceTester,
) (StreamId, *MiniblockRef, error) {
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel, channelHash, err := createChannel(
		ctx,
		wallet,
		client0,
		spaceId,
		channelId,
		&StreamSettings{DisableMiniblockCreation: true},
	)
	if err != nil {
		return StreamId{}, nil, fmt.Errorf("createChannel failed for %s: %w", channelId.String(), err)
	}
	tt.require.NotNil(channel, "channel should not be nil after creation for %s", channelId.String())

	b0ref, err := makeMiniblock(ctx, client0, channelId, false, -1)
	if err != nil {
		return StreamId{}, nil, fmt.Errorf("makeMiniblock failed for %s: %w", channelId.String(), err)
	}
	tt.require.Equal(int64(0), b0ref.Num, "miniblock number should be 0 for %s", channelId.String())

	streamOnChain, err := tt.nodes[0].service.registryContract.GetStreamOnLatestBlock(
		ctx,
		channelId,
	)
	if err != nil {
		return StreamId{}, nil, fmt.Errorf("GetStreamOnLatestBlock failed for %s: %w", channelId.String(), err)
	}

	msr.AddStream(
		&river.StreamWithId{
			Id: channelId,
			Stream: river.Stream{
				Nodes:     streamOnChain.Nodes(),
				Reserved0: uint64(replFactor),
			},
		},
		track_streams.ApplyHistoricalContent{Enabled: true},
	)

	return channelId, channelHash, nil
}

// Helper function to wait for message delivery across channels
func waitForMessagesDelivery(
	require *require.Assertions,
	eventTrackerMu *sync.Mutex,
	eventTracker map[StreamId]map[string]int,
	expectedMessages map[StreamId][]string,
	timeout time.Duration,
	pollInterval time.Duration,
	failMessage string,
) {
	require.EventuallyWithT(func(t *assert.CollectT) {
		eventTrackerMu.Lock()
		defer eventTrackerMu.Unlock()

		// Check if all channels have received all expected messages
		for channelId, expectedMsgsSlice := range expectedMessages {
			messageCounts, ok := eventTracker[channelId]
			if !ok {
				t.Errorf("Channel %v not seen yet in tracker", channelId)
			}
			for _, expectedMsg := range expectedMsgsSlice {
				if count, found := messageCounts[expectedMsg]; !found || count == 0 {
					t.Errorf("Channel %v missing message: '%v'", channelId, expectedMsg)
				}
			}
		}
	}, timeout, pollInterval, failMessage)
}

// TestMultiSyncerWithNodeFailures stops nodes one at a time after streams have already started syncing. This
// tests that the MultiSyncer correctly detects when streams are not syncing and rotates them to new
// nodes, verifying message delivery after each node failure.
func TestMultiSyncerWithNodeFailures(t *testing.T) {
	numNodes := 10
	replFactor := 5
	tt := newServiceTester(
		t,
		serviceTesterOpts{numNodes: numNodes, replicationFactor: replFactor, start: true},
	)
	ctx := tt.ctx
	require := tt.require

	streamEvents := make(chan eventRecord, 2048)
	eventTracker := make(map[StreamId]map[string]int)
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
		tt.httpClientWithCert(0),
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
			NumWorkers:                4,
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
	numChannels := 100
	channelIds := make([]StreamId, numChannels)
	channelHashes := make([]*MiniblockRef, numChannels)

	for i := 0; i < numChannels; i++ {
		chId, chHash, err := setupTestChannelAndAddToSyncer(
			ctx,
			wallet,
			client0,
			spaceId,
			msr,
			replFactor,
			tt,
		)
		require.NoError(err, "setupTestChannelAndAddToSyncer failed for channel %d", i)

		channelIds[i] = chId
		channelHashes[i] = chHash
		eventTracker[chId] = make(map[string]int)
	}

	// Start goroutine to collect events
	updateTrackerForCounts := func(record eventRecord, ciphertext string) {
		if _, streamExists := eventTracker[record.streamId]; !streamExists {
			eventTracker[record.streamId] = make(map[string]int)
		}
		eventTracker[record.streamId][ciphertext]++
	}
	cancelCollector, eventCollectorDone := startEventCollector(
		ctx,
		streamEvents,
		&eventTrackerMu,
		updateTrackerForCounts,
	)
	defer cancelCollector()

	// Send first batch of messages to all channels
	expectedMessages := make(map[StreamId][]string)
	for i, channelId := range channelIds {
		msg := fmt.Sprintf("msg1-channel%d", i)
		addMessageToChannel(ctx, client0, wallet, msg, channelId, channelHashes[i], require)
		expectedMessages[channelId] = append(expectedMessages[channelId], msg)
	}

	// Wait until all first batch messages are received
	waitForMessagesDelivery(
		require,
		&eventTrackerMu,
		eventTracker,
		expectedMessages,
		30*time.Second,
		100*time.Millisecond,
		"Not all messages from first batch were received",
	)

	// Stop first node to force stream relocation
	tt.CloseNode(1)

	// Send second batch of messages after first node failure
	for i, channelId := range channelIds {
		for j := range 5 {
			msg := fmt.Sprintf("msg2-round%d-channel%d", j, i)
			addMessageToChannelWithRetries(ctx, client0, wallet, msg, channelId, channelHashes[i], require, replFactor)
			expectedMessages[channelId] = append(expectedMessages[channelId], msg)
		}
	}

	// Wait until all second batch messages are received
	waitForMessagesDelivery(
		require,
		&eventTrackerMu,
		eventTracker,
		expectedMessages,
		30*time.Second,
		100*time.Millisecond,
		"Not all messages were received after first node failure",
	)

	// Stop second node to force another stream relocation
	tt.CloseNode(2)

	// Send third batch of messages after second node failure
	for i, channelId := range channelIds {
		for j := range 5 {
			msg := fmt.Sprintf("msg3-round%d-channel%d", j, i)
			addMessageToChannelWithRetries(ctx, client0, wallet, msg, channelId, channelHashes[i], require, replFactor)
			expectedMessages[channelId] = append(expectedMessages[channelId], msg)
		}
	}

	// Wait until all third batch messages are received
	waitForMessagesDelivery(
		require,
		&eventTrackerMu,
		eventTracker,
		expectedMessages,
		30*time.Second,
		100*time.Millisecond,
		"Not all messages were received after second node failure",
	)

	// Shutdown cleanly
	cancelCollector()
	<-eventCollectorDone

	// Final verification of messages
	eventTrackerMu.Lock()
	defer eventTrackerMu.Unlock()

	verifyMessagesReceivedExactlyOnce(require, channelIds, expectedMessages, eventTracker)
}

// Common test setup for cold streams tests
type coldStreamsTestContext struct {
	tt             *serviceTester
	ctx            context.Context
	require        *require.Assertions
	msr            *track_streams.MultiSyncRunner
	client         protocolconnect.StreamServiceClient
	wallet         *crypto.Wallet
	spaceId        StreamId
	streamEvents   chan eventRecord
	eventTracker   map[StreamId]map[string]int
	eventTrackerMu *sync.Mutex
}

// setupColdStreamsTest creates the common test infrastructure for cold streams tests
func setupColdStreamsTest(t *testing.T) *coldStreamsTestContext {
	numNodes := 3
	replFactor := 2
	tt := newServiceTester(
		t,
		serviceTesterOpts{
			numNodes:          numNodes,
			replicationFactor: replFactor,
			start:             true,
		},
	)
	ctx := tt.ctx
	require := tt.require

	streamEvents := make(chan eventRecord, 2048)
	eventTracker := make(map[StreamId]map[string]int)
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
		tt.httpClientWithCert(0),
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
			StreamsPerSyncSession:     10,
			NumWorkers:                5,
			MaxConcurrentNodeRequests: 5,
		},
		nil,
	)
	go msr.Run(ctx)

	client0 := tt.newTestClient(0, testClientOpts{}).client

	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	resuser, _, err := createUser(ctx, wallet, client0, nil)
	require.NoError(err)
	require.NotNil(resuser)

	// Create space
	spaceId := testutils.FakeStreamId(STREAM_SPACE_BIN)
	_, _, err = createSpace(ctx, wallet, client0, spaceId, nil)
	require.NoError(err)

	return &coldStreamsTestContext{
		tt:             tt,
		ctx:            ctx,
		require:        require,
		msr:            msr,
		client:         client0,
		wallet:         wallet,
		spaceId:        spaceId,
		streamEvents:   streamEvents,
		eventTracker:   eventTracker,
		eventTrackerMu: &eventTrackerMu,
	}
}

// createChannelWithMessages creates a channel and adds messages with miniblocks
func createChannelWithMessages(
	ctx context.Context,
	tc *coldStreamsTestContext,
	channelIndex int,
	messagesPerChannel int,
) (StreamId, *MiniblockRef, []MiniblockRef) {
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	channel, channelHash, err := createChannel(
		ctx,
		tc.wallet,
		tc.client,
		tc.spaceId,
		channelId,
		&StreamSettings{DisableMiniblockCreation: true},
	)
	tc.require.NoError(err, "createChannel failed for channel %d", channelIndex)
	tc.require.NotNil(channel)

	tc.eventTrackerMu.Lock()
	tc.eventTracker[channelId] = make(map[string]int)
	tc.eventTrackerMu.Unlock()

	// Create initial miniblock
	mb0, err := makeMiniblock(ctx, tc.client, channelId, false, -1)
	tc.require.NoError(err)
	tc.require.Equal(int64(0), mb0.Num)
	miniblockRefs := []MiniblockRef{*mb0}

	// Add messages and create miniblocks
	for j := 0; j < messagesPerChannel; j++ {
		msg := fmt.Sprintf("channel%d-msg%d", channelIndex, j)
		addMessageToChannel(ctx, tc.client, tc.wallet, msg, channelId, channelHash, tc.require)

		// Create miniblock after each message
		mb, err := makeMiniblock(ctx, tc.client, channelId, false, -1)
		// if I add this, the miniblock num is always sequential
		//time.Sleep(100 * time.Millisecond)

		tc.require.NoError(err)
		miniblockRefs = append(miniblockRefs, *mb)
	}

	return channelId, channelHash, miniblockRefs
}

// startColdStreamsEventCollector starts the event collector for tracking messages
func startColdStreamsEventCollector(tc *coldStreamsTestContext) (context.CancelFunc, <-chan struct{}) {
	updateTrackerForCounts := func(record eventRecord, ciphertext string) {
		if _, streamExists := tc.eventTracker[record.streamId]; !streamExists {
			tc.eventTracker[record.streamId] = make(map[string]int)
		}
		tc.eventTracker[record.streamId][ciphertext]++
	}
	return startEventCollector(
		tc.ctx,
		tc.streamEvents,
		tc.eventTrackerMu,
		updateTrackerForCounts,
	)
}

// TestColdStreamsNoHistory tests cold streams with no historical content
func TestColdStreamsNoHistory(t *testing.T) {
	tc := setupColdStreamsTest(t)

	// Create a channel with messages
	channelId, _, _ := createChannelWithMessages(tc.ctx, tc, 0, 3)

	// Start event collector
	cancelCollector, eventCollectorDone := startColdStreamsEventCollector(tc)
	defer cancelCollector()

	// Add stream to syncer with no historical content
	streamOnChain, err := tc.tt.nodes[0].service.registryContract.GetStreamOnLatestBlock(tc.ctx, channelId)
	tc.require.NoError(err)
	tc.msr.AddStream(
		&river.StreamWithId{
			Id: channelId,
			Stream: river.Stream{
				Nodes:     streamOnChain.Nodes(),
				Reserved0: uint64(tc.tt.opts.replicationFactor),
			},
		},
		track_streams.ApplyHistoricalContent{
			Enabled: false,
		},
	)

	// Wait a bit to ensure no events are received
	time.Sleep(2 * time.Second)

	// Verify no events received
	tc.eventTrackerMu.Lock()
	channelMessages := tc.eventTracker[channelId]
	tc.eventTrackerMu.Unlock()
	tc.require.Equal(0, len(channelMessages), "Channel should have no messages when historical content is disabled")

	// Cleanup
	cancelCollector()
	<-eventCollectorDone
}

// TestColdStreamsFullHistory tests cold streams with full historical content
func TestColdStreamsFullHistory(t *testing.T) {
	tc := setupColdStreamsTest(t)

	// Create channel with messages
	messagesPerChannel := 3
	channelId, _, _ := createChannelWithMessages(tc.ctx, tc, 1, messagesPerChannel)

	// Start event collector
	cancelCollector, eventCollectorDone := startColdStreamsEventCollector(tc)
	defer cancelCollector()

	// Add stream to syncer with full historical content
	streamOnChain, err := tc.tt.nodes[0].service.registryContract.GetStreamOnLatestBlock(tc.ctx, channelId)
	tc.require.NoError(err)
	tc.msr.AddStream(
		&river.StreamWithId{
			Id: channelId,
			Stream: river.Stream{
				Nodes:     streamOnChain.Nodes(),
				Reserved0: uint64(tc.tt.opts.replicationFactor),
			},
		},
		track_streams.ApplyHistoricalContent{
			Enabled:           true,
			FromMiniblockHash: nil,
		},
	)

	// Wait for events to be processed
	tc.require.Eventually(func() bool {
		tc.eventTrackerMu.Lock()
		defer tc.eventTrackerMu.Unlock()
		return len(tc.eventTracker[channelId]) >= messagesPerChannel
	}, 10*time.Second, 100*time.Millisecond, "Not all messages were received")

	// Verify all messages received
	tc.eventTrackerMu.Lock()
	channelMessages := tc.eventTracker[channelId]
	tc.eventTrackerMu.Unlock()

	tc.require.Equal(messagesPerChannel, len(channelMessages), "Channel should have all %d messages", messagesPerChannel)
	for i := 0; i < messagesPerChannel; i++ {
		expectedMsg := fmt.Sprintf("channel1-msg%d", i)
		count, found := channelMessages[expectedMsg]
		tc.require.True(found, "Channel should have message: %s", expectedMsg)
		tc.require.Equal(1, count, "Message %s should be received exactly once", expectedMsg)
	}

	// Cleanup
	cancelCollector()
	<-eventCollectorDone
}

// TestColdStreamsFromSpecificHash tests cold streams with historical content from a specific miniblock
func TestColdStreamsFromSpecificHash(t *testing.T) {
	tc := setupColdStreamsTest(t)

	// Create channel with messages
	messagesPerChannel := 3
	channelId, _, miniblockRefs := createChannelWithMessages(tc.ctx, tc, 2, messagesPerChannel)

	// Start event collector
	cancelCollector, eventCollectorDone := startColdStreamsEventCollector(tc)
	defer cancelCollector()

	// Add stream to syncer with historical content from specific miniblock
	// Start from miniblock 2 (which contains events after msg0)
	streamOnChain, err := tc.tt.nodes[0].service.registryContract.GetStreamOnLatestBlock(tc.ctx, channelId)
	tc.require.NoError(err)
	tc.msr.AddStream(
		&river.StreamWithId{
			Id: channelId,
			Stream: river.Stream{
				Nodes:     streamOnChain.Nodes(),
				Reserved0: uint64(tc.tt.opts.replicationFactor),
			},
		},
		track_streams.ApplyHistoricalContent{
			Enabled:           true,
			FromMiniblockHash: miniblockRefs[2].Hash[:], // Start from miniblock 2
		},
	)

	// Wait for events to be processed
	tc.require.Eventually(func() bool {
		tc.eventTrackerMu.Lock()
		defer tc.eventTrackerMu.Unlock()
		return len(tc.eventTracker[channelId]) >= 2
	}, 1000*time.Second, 100*time.Millisecond, "Expected messages were not received")

	// Verify correct messages received
	tc.eventTrackerMu.Lock()
	channelMessages := tc.eventTracker[channelId]
	tc.eventTrackerMu.Unlock()

	// When starting from miniblock 2, we should get all events from that miniblock onwards
	// Since miniblock 2 was created after msg0, we should get msg1 and msg2
	tc.require.Equal(2, len(channelMessages), "Channel should have 2 messages (from miniblock 2 onwards)")

	// Verify msg0 is NOT present
	_, found := channelMessages["channel2-msg0"]
	tc.require.False(found, "Channel should not have msg0 (before miniblock 2)")

	// Verify msg1 and msg2 are present
	for i := 1; i < messagesPerChannel; i++ {
		expectedMsg := fmt.Sprintf("channel2-msg%d", i)
		count, found := channelMessages[expectedMsg]
		tc.require.True(found, "Channel should have message: %s", expectedMsg)
		tc.require.Equal(1, count, "Message %s should be received exactly once", expectedMsg)
	}

	// Cleanup
	cancelCollector()
	<-eventCollectorDone
}

// TestColdStreams runs all cold streams tests in parallel
func TestColdStreams(t *testing.T) {
	t.Run("NoHistory", func(t *testing.T) {
		TestColdStreamsNoHistory(t)
	})

	t.Run("FullHistory", func(t *testing.T) {
		TestColdStreamsFullHistory(t)
	})

	t.Run("FromSpecificHash", func(t *testing.T) {
		TestColdStreamsFromSpecificHash(t)
	})
}
