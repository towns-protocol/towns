//go:build !race

// This file contains tests that are skipped when the race detector is enabled
// because they are too resource-intensive.

package rpc

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5/pgxpool"
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
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
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
	return makeTrackedStreamConstructorWithPersistence(eventChannel, false)
}

func makeTrackedStreamConstructorWithPersistence(
	eventChannel chan<- eventRecord,
	enablePersistence bool,
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
		var shouldPersist func(context.Context, *StreamView) bool
		if enablePersistence {
			shouldPersist = func(ctx context.Context, view *StreamView) bool {
				return true
			}
		}
		_, err := tracker.TrackedStreamViewImpl.Init(streamId, cfg, stream, tracker.onNewEvent, shouldPersist)
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
		infra.NewMetricsFactory(nil, "", ""),
		tt.btc.OnChainConfig,
		[]nodes.NodeRegistry{nodeRegistry},
		makeTrackedStreamConstructor(streamEvents),
		config.StreamTrackingConfig{
			StreamsPerSyncSession:     testCfg.streamsPerSyncSession,
			NumWorkers:                testCfg.numWorkers,
			MaxConcurrentNodeRequests: testCfg.maxConcurrentRequests,
		},
		nil, // otelTracer
		nil, // cookieStore
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
	channelId := testutils.MakeChannelId(spaceId)
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

	streamOnChain, err := tt.nodes[0].service.registryContract.StreamRegistry.GetStreamOnLatestBlock(
		ctx,
		channelId,
	)
	if err != nil {
		return StreamId{}, nil, fmt.Errorf("GetStreamOnLatestBlock failed for %s: %w", channelId.String(), err)
	}

	msr.AddStream(
		ctx,
		&river.StreamWithId{
			Id: channelId,
			Stream: river.Stream{
				Nodes:     streamOnChain.Nodes,
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
	}, 30*time.Second, 100*time.Millisecond, failMessage)
}

// TestMultiSyncerWithNodeFailures stops nodes one at a time after streams have already started syncing. This
// tests that the MultiSyncer correctly detects when streams are not syncing and rotates them to new
// nodes, verifying message delivery after each node failure.
func TestMultiSyncerWithNodeFailures(t *testing.T) {
	numNodes := 5
	replFactor := 4
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
		infra.NewMetricsFactory(nil, "", ""),
		tt.btc.OnChainConfig,
		[]nodes.NodeRegistry{nodeRegistry},
		makeTrackedStreamConstructor(streamEvents),
		config.StreamTrackingConfig{
			StreamsPerSyncSession:     3, // Small number to force multiple sync sessions per target node
			NumWorkers:                4,
			MaxConcurrentNodeRequests: 2,
		},
		nil, // otelTracer
		nil, // cookieStore
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
		"Not all messages from first batch were received",
	)

	// Stop first 2 nodes to force stream relocation
	tt.CloseNode(1)
	tt.CloseNode(2)

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
		"Not all messages were received after first node failure",
	)

	// Stop third node to force another stream relocation
	tt.CloseNode(3)

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

// addStreamToSyncer adds a stream to the syncer with optional historical content
func (tc *coldStreamsTestContext) addStreamToSyncer(streamId StreamId, enabled bool, fromMiniblockNum int64) {
	streamOnChain, err := tc.tt.nodes[0].service.registryContract.StreamRegistry.GetStreamOnLatestBlock(
		tc.ctx,
		streamId,
	)
	tc.require.NoError(err)
	tc.msr.AddStream(
		tc.ctx,
		&river.StreamWithId{
			Id: streamId,
			Stream: river.Stream{
				Nodes:     streamOnChain.Nodes,
				Reserved0: uint64(tc.tt.opts.replicationFactor),
			},
		},
		track_streams.ApplyHistoricalContent{
			Enabled:          enabled,
			FromMiniblockNum: fromMiniblockNum,
		},
	)
}

// waitForAndVerifyMessages waits for messages to be received and verifies the count
func (tc *coldStreamsTestContext) waitForAndVerifyMessages(
	streamId StreamId,
	expectedCount int,
	timeout time.Duration,
) map[string]int {
	tc.require.Eventually(func() bool {
		tc.eventTrackerMu.Lock()
		defer tc.eventTrackerMu.Unlock()
		return len(tc.eventTracker[streamId]) >= expectedCount
	}, timeout, 100*time.Millisecond, "Not all messages were received")

	tc.eventTrackerMu.Lock()
	defer tc.eventTrackerMu.Unlock()
	return tc.eventTracker[streamId]
}

// verifyNoMessages ensures no messages were received for a stream
func (tc *coldStreamsTestContext) verifyNoMessages(streamId StreamId) {
	tc.eventTrackerMu.Lock()
	defer tc.eventTrackerMu.Unlock()
	tc.require.Equal(0, len(tc.eventTracker[streamId]), "Stream should have no messages")
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
		infra.NewMetricsFactory(nil, "", ""),
		tt.btc.OnChainConfig,
		[]nodes.NodeRegistry{nodeRegistry},
		makeTrackedStreamConstructor(streamEvents),
		config.StreamTrackingConfig{
			StreamsPerSyncSession:     10,
			NumWorkers:                5,
			MaxConcurrentNodeRequests: 5,
		},
		nil, // otelTracer
		nil, // cookieStore
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

func createAndVerifyMiniblockWithRetry(
	ctx context.Context,
	client protocolconnect.StreamServiceClient,
	channelId StreamId,
	miniblockRefs []MiniblockRef,
	require *require.Assertions,
) (*MiniblockRef, []MiniblockRef) {
	maxRetries := 10
	expectedNum := int64(0)
	if len(miniblockRefs) > 0 {
		expectedNum = miniblockRefs[len(miniblockRefs)-1].Num + 1
	}

	var mb *MiniblockRef
	var err error

	for attempt := 0; attempt < maxRetries; attempt++ {
		mb, err = makeMiniblock(ctx, client, channelId, false, -1)
		require.NoError(err, "Failed to create miniblock on attempt %d", attempt+1)

		if mb.Num == expectedNum {
			// Success - got the expected sequential number
			miniblockRefs = append(miniblockRefs, *mb)
			return mb, miniblockRefs
		}

		// Wrong number, wait a bit before retrying
		if attempt < maxRetries-1 {
			time.Sleep(100 * time.Millisecond)
		}
	}

	// Failed after all retries
	require.Failf("Failed to get sequential miniblock number",
		"Expected miniblock num %d but got %d after %d retries",
		expectedNum, mb.Num, maxRetries)
	return nil, miniblockRefs
}

// createChannelWithMessages creates a channel and adds messages with miniblocks
func createChannelWithMessages(
	ctx context.Context,
	tc *coldStreamsTestContext,
	channelIndex int,
	messagesPerChannel int,
) (StreamId, *MiniblockRef, []MiniblockRef) {
	channelId := testutils.MakeChannelId(tc.spaceId)
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

	// Create initial miniblock with retries
	var miniblockRefs []MiniblockRef
	_, miniblockRefs = createAndVerifyMiniblockWithRetry(ctx, tc.client, channelId, miniblockRefs, tc.require)

	// Add messages and create miniblocks
	for j := 0; j < messagesPerChannel; j++ {
		msg := fmt.Sprintf("channel%d-msg%d", channelIndex, j)
		addMessageToChannel(ctx, tc.client, tc.wallet, msg, channelId, channelHash, tc.require)

		_, miniblockRefs = createAndVerifyMiniblockWithRetry(ctx, tc.client, channelId, miniblockRefs, tc.require)
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
	tc.addStreamToSyncer(channelId, false, 0)

	// Wait a bit to ensure no events are received
	time.Sleep(2 * time.Second)

	// Verify no events received
	tc.verifyNoMessages(channelId)

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
	tc.addStreamToSyncer(channelId, true, 0)

	// Wait for and verify messages
	channelMessages := tc.waitForAndVerifyMessages(channelId, messagesPerChannel, 10*time.Second)

	tc.require.Equal(
		messagesPerChannel,
		len(channelMessages),
		"Channel should have all %d messages",
		messagesPerChannel,
	)
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
	tc.addStreamToSyncer(channelId, true, miniblockRefs[2].Num)

	// Wait for and verify messages
	channelMessages := tc.waitForAndVerifyMessages(channelId, 2, 10*time.Second)

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

// gapRecoveryTestContext contains infrastructure for testing gap recovery with cookie persistence
type gapRecoveryTestContext struct {
	tt             *serviceTester
	ctx            context.Context
	require        *require.Assertions
	client         protocolconnect.StreamServiceClient
	wallet         *crypto.Wallet
	spaceId        StreamId
	nodeRegistry   nodes.NodeRegistry
	cookieStore    *track_streams.PostgresStreamCookieStore
	dbPool         *pgxpool.Pool
	dbCloser       func()
	streamEvents   chan eventRecord
	eventTracker   map[StreamId]map[string]int
	eventTrackerMu *sync.Mutex
}

// setupGapRecoveryTest creates test infrastructure for gap recovery tests
func setupGapRecoveryTest(t *testing.T) *gapRecoveryTestContext {
	numNodes := 3
	replFactor := 1
	tt := newServiceTester(
		t,
		serviceTesterOpts{
			numNodes:          numNodes,
			replicationFactor: replFactor,
			start:             false, // Don't start yet - we need to set config first
		},
	)
	ctx := tt.ctx
	require := tt.require

	// Set MinSnapshotEvents to a low value (3) so snapshots are created after few events
	// This is needed to test gap recovery which requires a new snapshot to be created
	tt.btc.SetConfigValue(
		t,
		ctx,
		crypto.StreamDefaultMinEventsPerSnapshotConfigKey,
		crypto.ABIEncodeUint64(3),
	)

	// Now start the nodes
	tt.initNodeRecords(0, numNodes, river.NodeStatus_Operational)
	tt.startNodes(0, numNodes)

	cfg := tt.getConfig()
	riverContract, err := registries.NewRiverRegistryContract(
		ctx,
		tt.btc.DeployerBlockchain,
		&cfg.RegistryContract,
		&cfg.RiverRegistry,
	)
	require.NoError(err, "Error creating river registry contract")

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
	require.NoError(err, "Error creating node registry")

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

	// Setup cookie store with app registry migrations
	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDbWithPrefix(ctx, "gap_")
	require.NoError(err, "Error configuring db for cookie store")

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	poolInfo, err := storage.CreateAndValidatePgxPool(ctx, dbCfg, dbSchemaName, nil)
	require.NoError(err, "Error creating pgx pool")

	// Run app registry migrations to create the stream_sync_cookies table
	_, err = storage.NewPostgresAppRegistryStore(
		ctx,
		poolInfo,
		make(chan error, 1),
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(err, "Error running migrations for cookie store")

	cookieStore := track_streams.NewPostgresStreamCookieStore(poolInfo.Pool, "stream_sync_cookies")

	streamEvents := make(chan eventRecord, 2048)
	eventTracker := make(map[StreamId]map[string]int)
	var eventTrackerMu sync.Mutex

	tc := &gapRecoveryTestContext{
		tt:             tt,
		ctx:            ctx,
		require:        require,
		client:         client0,
		wallet:         wallet,
		spaceId:        spaceId,
		nodeRegistry:   nodeRegistry,
		cookieStore:    cookieStore,
		dbPool:         poolInfo.Pool,
		dbCloser:       dbCloser,
		streamEvents:   streamEvents,
		eventTracker:   eventTracker,
		eventTrackerMu: &eventTrackerMu,
	}

	t.Cleanup(func() {
		poolInfo.Pool.Close()
		dbCloser()
	})

	return tc
}

// createMultiSyncRunner creates a MultiSyncRunner with the given cookie store
func (tc *gapRecoveryTestContext) createMultiSyncRunner() *track_streams.MultiSyncRunner {
	return tc.createMultiSyncRunnerWithPersistence(false)
}

// createMultiSyncRunnerWithPersistence creates a MultiSyncRunner with configurable cookie persistence
func (tc *gapRecoveryTestContext) createMultiSyncRunnerWithPersistence(
	enablePersistence bool,
) *track_streams.MultiSyncRunner {
	return track_streams.NewMultiSyncRunner(
		infra.NewMetricsFactory(nil, "", ""),
		tc.tt.btc.OnChainConfig,
		[]nodes.NodeRegistry{tc.nodeRegistry},
		makeTrackedStreamConstructorWithPersistence(tc.streamEvents, enablePersistence),
		config.StreamTrackingConfig{
			StreamsPerSyncSession:     10,
			NumWorkers:                2,
			MaxConcurrentNodeRequests: 2,
		},
		nil,            // otelTracer
		tc.cookieStore, // cookieStore
	)
}

// createChannelWithMiniblocks creates a channel, adds messages, and creates miniblocks
func (tc *gapRecoveryTestContext) createChannelWithMiniblocks(
	numMessages int,
) (StreamId, *MiniblockRef, []MiniblockRef) {
	channelId := testutils.MakeChannelId(tc.spaceId)
	channel, channelHash, err := createChannel(
		tc.ctx,
		tc.wallet,
		tc.client,
		tc.spaceId,
		channelId,
		&StreamSettings{DisableMiniblockCreation: true},
	)
	tc.require.NoError(err, "createChannel failed")
	tc.require.NotNil(channel)

	tc.eventTrackerMu.Lock()
	tc.eventTracker[channelId] = make(map[string]int)
	tc.eventTrackerMu.Unlock()

	// Create initial miniblock
	var miniblockRefs []MiniblockRef
	_, miniblockRefs = createAndVerifyMiniblockWithRetry(tc.ctx, tc.client, channelId, miniblockRefs, tc.require)

	// Add messages and create miniblocks for each
	for i := 0; i < numMessages; i++ {
		msg := fmt.Sprintf("msg%d", i)
		addMessageToChannel(tc.ctx, tc.client, tc.wallet, msg, channelId, channelHash, tc.require)
		_, miniblockRefs = createAndVerifyMiniblockWithRetry(tc.ctx, tc.client, channelId, miniblockRefs, tc.require)
	}

	return channelId, channelHash, miniblockRefs
}

// addStreamToRunner adds a stream to the MultiSyncRunner
func (tc *gapRecoveryTestContext) addStreamToRunner(
	msr *track_streams.MultiSyncRunner,
	channelId StreamId,
	applyHistory bool,
	fromMiniblockNum int64,
) {
	streamOnChain, err := tc.tt.nodes[0].service.registryContract.StreamRegistry.GetStreamOnLatestBlock(
		tc.ctx,
		channelId,
	)
	tc.require.NoError(err)

	msr.AddStream(
		tc.ctx,
		&river.StreamWithId{
			Id: channelId,
			Stream: river.Stream{
				Nodes:     streamOnChain.Nodes,
				Reserved0: uint64(tc.tt.opts.replicationFactor),
			},
		},
		track_streams.ApplyHistoricalContent{
			Enabled:          applyHistory,
			FromMiniblockNum: fromMiniblockNum,
		},
	)
}

// TestGapRecovery_SameSnapshot tests that no gap recovery occurs when
// persisted state matches the server's snapshot
func TestGapRecovery_SameSnapshot(t *testing.T) {
	tc := setupGapRecoveryTest(t)

	// Create channel with messages
	numMessages := 3
	channelId, _, miniblockRefs := tc.createChannelWithMiniblocks(numMessages)

	// The last miniblock is our current position
	lastMiniblock := miniblockRefs[len(miniblockRefs)-1]

	// Pre-populate cookie store with current position (same as server)
	cookie := &SyncCookie{
		StreamId:          channelId[:],
		MinipoolGen:       lastMiniblock.Num + 1,
		PrevMiniblockHash: lastMiniblock.Hash[:],
	}
	err := tc.cookieStore.PersistSyncCookie(tc.ctx, channelId, cookie)
	tc.require.NoError(err)

	// Start event collector
	updateTracker := func(record eventRecord, ciphertext string) {
		if _, exists := tc.eventTracker[record.streamId]; !exists {
			tc.eventTracker[record.streamId] = make(map[string]int)
		}
		tc.eventTracker[record.streamId][ciphertext]++
	}
	cancelCollector, eventCollectorDone := startEventCollector(
		tc.ctx, tc.streamEvents, tc.eventTrackerMu, updateTracker,
	)
	defer cancelCollector()

	// Create and start MultiSyncRunner with cookie store
	msr := tc.createMultiSyncRunner()
	go msr.Run(tc.ctx)

	// Add stream - cookie store will override applyHistoricalContent with persisted values
	tc.addStreamToRunner(msr, channelId, false, 0)

	// Add a new message to verify sync is working
	newMsg := "new-msg-after-sync"
	addMessageToChannel(tc.ctx, tc.client, tc.wallet, newMsg, channelId, &MiniblockRef{
		Hash: lastMiniblock.Hash, Num: lastMiniblock.Num,
	}, tc.require)

	// Wait for new message
	tc.require.Eventually(func() bool {
		tc.eventTrackerMu.Lock()
		defer tc.eventTrackerMu.Unlock()
		_, found := tc.eventTracker[channelId][newMsg]
		return found
	}, 10*time.Second, 100*time.Millisecond, "New message should be received after sync")

	// Verify we did NOT receive historical messages (msg0, msg1, msg2)
	// since we persisted cookie at the current position (same snapshot)
	tc.eventTrackerMu.Lock()
	channelMessages := tc.eventTracker[channelId]
	tc.eventTrackerMu.Unlock()

	for i := 0; i < numMessages; i++ {
		historicalMsg := fmt.Sprintf("msg%d", i)
		_, found := channelMessages[historicalMsg]
		tc.require.False(
			found,
			"Should NOT receive historical message: %s (persisted cookie is at current position)",
			historicalMsg,
		)
	}

	cancelCollector()
	<-eventCollectorDone
}

// TestGapRecovery_GapDetected tests that gap recovery fetches missing miniblocks
// when there's a gap between persisted state and server snapshot (CASE B).
func TestGapRecovery_GapDetected(t *testing.T) {
	tc := setupGapRecoveryTest(t)

	// Create channel with many messages
	numMessages := 6
	channelId, _, miniblockRefs := tc.createChannelWithMiniblocks(numMessages)

	tc.require.GreaterOrEqual(len(miniblockRefs), 4, "Need at least 4 miniblocks for gap test")

	// Pre-populate cookie store with an OLD position (creates a gap)
	// We processed up to miniblock 2, but server is at miniblock 6+
	oldPosition := miniblockRefs[2]
	cookie := &SyncCookie{
		StreamId:          channelId[:],
		MinipoolGen:       oldPosition.Num + 1,
		PrevMiniblockHash: oldPosition.Hash[:],
	}
	err := tc.cookieStore.PersistSyncCookie(tc.ctx, channelId, cookie)
	tc.require.NoError(err)

	// Start event collector
	updateTracker := func(record eventRecord, ciphertext string) {
		if _, exists := tc.eventTracker[record.streamId]; !exists {
			tc.eventTracker[record.streamId] = make(map[string]int)
		}
		tc.eventTracker[record.streamId][ciphertext]++
	}
	cancelCollector, eventCollectorDone := startEventCollector(
		tc.ctx, tc.streamEvents, tc.eventTrackerMu, updateTracker,
	)
	defer cancelCollector()

	// Create and start MultiSyncRunner
	msr := tc.createMultiSyncRunner()
	go msr.Run(tc.ctx)

	// Add stream - cookie store will override applyHistoricalContent with persisted values
	// Gap recovery should fetch miniblocks 3, 4, 5... up to server snapshot
	tc.addStreamToRunner(msr, channelId, false, 0)

	// Wait for gap messages to be received
	// We should receive messages from miniblocks after our persisted position
	expectedGapMessages := numMessages - 2 // msg2, msg3, msg4, msg5
	tc.require.Eventually(func() bool {
		tc.eventTrackerMu.Lock()
		defer tc.eventTrackerMu.Unlock()
		return len(tc.eventTracker[channelId]) >= expectedGapMessages
	}, 15*time.Second, 200*time.Millisecond, "Should receive gap messages")

	// Verify we received the expected messages
	tc.eventTrackerMu.Lock()
	channelMessages := tc.eventTracker[channelId]
	tc.eventTrackerMu.Unlock()

	for i := 2; i < numMessages; i++ {
		expectedMsg := fmt.Sprintf("msg%d", i)
		_, found := channelMessages[expectedMsg]
		tc.require.True(found, "Should have received gap message: %s", expectedMsg)
	}

	// Add a new message to verify real-time sync works
	// Use the last miniblock ref for adding new messages (channelHash from creation is stale)
	lastMiniblockRef := &miniblockRefs[len(miniblockRefs)-1]
	newMsg := "new-msg-after-gap"
	addMessageToChannel(tc.ctx, tc.client, tc.wallet, newMsg, channelId, lastMiniblockRef, tc.require)

	tc.require.Eventually(func() bool {
		tc.eventTrackerMu.Lock()
		defer tc.eventTrackerMu.Unlock()
		_, found := tc.eventTracker[channelId][newMsg]
		return found
	}, 10*time.Second, 100*time.Millisecond, "New message should be received after gap recovery")

	cancelCollector()
	<-eventCollectorDone
}

// TestGapRecovery_CookiePersistence tests that cookies are persisted during sync
// and can be used to resume from the correct position.
func TestGapRecovery_CookiePersistence(t *testing.T) {
	tc := setupGapRecoveryTest(t)

	// Create channel with messages
	channelId, channelHash, miniblockRefs := tc.createChannelWithMiniblocks(1)

	// Verify no cookie exists initially
	cookie, _, err := tc.cookieStore.GetSyncCookie(tc.ctx, channelId)
	tc.require.NoError(err)
	tc.require.Nil(cookie, "No cookie should exist initially")

	// Create and start MultiSyncRunner with cookie store AND persistence enabled
	msr := tc.createMultiSyncRunnerWithPersistence(true) // Enable persistence
	go msr.Run(tc.ctx)

	// Add stream (no cookie exists yet)
	tc.addStreamToRunner(msr, channelId, false, 0)

	// Give the sync time to establish
	time.Sleep(2 * time.Second)

	// Add a message and create a miniblock - this should trigger cookie persistence
	addMessageToChannel(tc.ctx, tc.client, tc.wallet, "trigger-persist", channelId, channelHash, tc.require)
	_, newRefs := createAndVerifyMiniblockWithRetry(tc.ctx, tc.client, channelId, miniblockRefs, tc.require)
	newLastMiniblock := newRefs[len(newRefs)-1]

	// Wait for cookie to be persisted (happens when miniblock is received via sync)
	tc.require.Eventually(func() bool {
		cookie, _, err := tc.cookieStore.GetSyncCookie(tc.ctx, channelId)
		if err != nil {
			return false
		}
		return cookie != nil && cookie.MinipoolGen == newLastMiniblock.Num+1
	}, 10*time.Second, 500*time.Millisecond, "Cookie should be persisted after miniblock creation")

	// Verify cookie has correct values
	cookie, _, err = tc.cookieStore.GetSyncCookie(tc.ctx, channelId)
	tc.require.NoError(err)
	tc.require.NotNil(cookie, "Cookie should be persisted")
	tc.require.Equal(cookie.MinipoolGen, newLastMiniblock.Num+1, "MinipoolGen should be == lastMiniblock + 1")
}
