package track_streams

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gammazero/workerpool"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/trace"
	"golang.org/x/sync/semaphore"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/sync/client"
	"github.com/towns-protocol/towns/core/node/rpc/sync/dynmsgbuf"
	"github.com/towns-protocol/towns/core/node/shared"
)

type RemoteStreamSyncer interface {
	client.StreamsSyncer
	GetSyncId() string
}

type streamSyncInitRecord struct {
	trackedView events.TrackedStreamView
	streamId    shared.StreamId

	// Set applyHistoricalStreamContents to true when we wish to send all stream events since inception.
	// Set to false if we wish to send only events starting from the current sync position. This should
	// be true, as we will restart the sync with the latest sync position.
	applyHistoricalStreamContents bool

	// These are tracked to determine where to restart streams. If the stream is initially
	// being added and a sync reset is desired, set minipoolGen to MaxInt64 and prevMiniblockHash
	// to a zero hash.
	minipoolGen       int64
	prevMiniblockHash []byte
	remotes           nodes.StreamNodes
}

// Run a sync session, including parsing out the streaming sync response and multiplexing to the
// correct tracked stream view. The syncSessionRunner is responsible for validating that a stream
// in it's care is syncing, and for putting the stream up for relocation if it fails to sync on
// this node.
type syncSessionRunner struct {
	// This context is used to watch for cancellations that indicate the caller's desire to shut
	// down the multi-sync runner and all created components.
	rootCtx context.Context

	// syncCtx is the context passed to the remote syncer. If we cancel this context it will cancel the
	// sync.
	syncCtx context.Context
	// cancelSync is passed to the syncer and allows the remote syncer to signal a cancellation.
	// We can also signal a cancellation to the remote syncer here.
	cancelSync               context.CancelCauseFunc
	node                     common.Address
	nodeRegistry             nodes.NodeRegistry
	metrics                  *TrackStreamsSyncMetrics
	maxStreamsPerSyncSession int
	otelTracer               trace.Tracer

	trackedViewForStream TrackedViewForStream

	syncer RemoteStreamSyncer

	messages *dynmsgbuf.DynamicBuffer[*protocol.SyncStreamsResponse]

	// relocateStreams accepts streams that failed to sync in this session, for the purpose
	// of relocating the stream to another node.
	relocateStreams chan<- *streamSyncInitRecord

	syncStarted sync.WaitGroup

	// the syncSessionRunner is locked when streams are being added or relocated, or the runner is being closed.
	// All fields below the mutex are synchronized.
	mu sync.Mutex

	// Map of stream -> *streamSyncInitRecord. We use this to save the trackedView
	// sync cookie info and remotes for moving streams to new syncs in the event that
	// this sync session goes down.
	// Any added streams must be added to this map on the first received update.
	streamRecords sync.Map

	// streamCount tracks the number of streams added to the syncRunner.
	streamCount int

	// closeErr is assigned when the sync has encountered an error state, is re-assigning all
	// of it's streams, and is no longer assignable.
	closeErr error
}

func (ssr *syncSessionRunner) AddStream(
	ctx context.Context,
	record streamSyncInitRecord,
) error {
	// Wait for the sync to start. This waitgroup should be decremented even if the initial sync from the remote syncer fails.
	ssr.syncStarted.Wait()
	ssr.mu.Lock()
	if ssr.streamCount >= ssr.maxStreamsPerSyncSession-1 || ssr.closeErr != nil {
		ssr.mu.Unlock()
		return base.RiverError(protocol.Err_SYNC_SESSION_RUNNER_UNASSIGNABLE, "Sync runner session is not assignable")
	}
	ssr.streamCount = ssr.streamCount + 1
	ssr.streamRecords.Store(record.streamId, &record)
	ssr.mu.Unlock()

	logging.FromCtx(ctx).
		Debugw("Adding stream with cookie",
			"stream", record.streamId,
			"minipoolGen", record.minipoolGen,
			"prevMiniblockHash", record.prevMiniblockHash,
			"syncId", ssr.GetSyncId(),
			"targetNode", ssr.node,
		)
	if resp, _, err := ssr.syncer.Modify(ctx, &protocol.ModifySyncRequest{
		AddStreams: []*protocol.SyncCookie{{
			StreamId:          record.streamId[:],
			MinipoolGen:       record.minipoolGen,
			PrevMiniblockHash: record.prevMiniblockHash,
		}},
	}); err != nil || len(resp.Adds) > 0 {
		// We failed to add this stream to the sync, return an error.
		ssr.mu.Lock()
		ssr.streamCount = ssr.streamCount - 1
		ssr.streamRecords.Delete(record.streamId)
		ssr.mu.Unlock()

		if err != nil {
			return err
		} else {
			return base.AsRiverError(fmt.Errorf("failed to add stream to existing sync")).
				Tag("syncId", ssr.syncer.GetSyncId()).
				Tag("node", ssr.node).
				Tag("stream", record.streamId).
				Tag("size", ssr.streamCount).
				LogError(logging.FromCtx(ctx))
		}
	}

	return nil
}

func (ssr *syncSessionRunner) applyUpdateToStream(
	streamAndCookie *protocol.StreamAndCookie,
	record *streamSyncInitRecord,
) {
	var (
		reset    = streamAndCookie.GetSyncReset()
		streamId = record.streamId
		log      = logging.FromCtx(ssr.syncCtx)
		labels   = prometheus.Labels{"type": shared.StreamTypeToString(streamId.Type())}
	)

	resetLabelValue := "false"
	if reset {
		resetLabelValue = "true"
	}
	ssr.metrics.SyncUpdate.With(prometheus.Labels{"reset": resetLabelValue}).Inc()

	if reset {
		trackedView, err := ssr.trackedViewForStream(streamId, streamAndCookie)
		if err != nil {
			log.Errorw(
				"Error constructing tracked view for stream; relocating stream",
				"streamId", streamId,
				"error", err,
			)
			ssr.cancelSync(
				base.AsRiverError(fmt.Errorf("error constructing tracked view for stream: %w", err)).
					Tag("streamId", streamId).
					Tag("syncId", ssr.syncer.GetSyncId()).
					Func("syncSessionRunner.applyUpdateToStream"),
			)
			return
		}
		// Assuming each stream experiences a reset when it is first added to tracking, we would
		// expect the reset to be the first event we see for each stream when tracking it.
		ssr.metrics.TrackedStreams.With(labels).Inc()
		record.trackedView = trackedView
	}

	trackedView := record.trackedView
	if trackedView == nil {
		ssr.cancelSync(
			base.AsRiverError(fmt.Errorf("expected reset for stream record's first update")).
				Tag("streamId", streamId).
				Tag("syncId", ssr.syncer.GetSyncId()).
				Func("syncSessionRunner.applyUpdateToStream"),
		)
		return
	}

	for _, block := range streamAndCookie.GetMiniblocks() {
		if !reset {
			if err := trackedView.ApplyBlock(
				block,
				streamAndCookie.Snapshot,
			); err != nil {
				log.Errorw("Unable to apply block", "error", err)
			}
		}
		// If the stream was just allocated, process the miniblocks and events for notifications.
		// If not, ignore them because there were already notifications sent for the stream, and possibly
		// for these miniblocks and events.
		if record.applyHistoricalStreamContents {
			// Send notifications for all events in all blocks.
			for _, event := range block.GetEvents() {
				if parsedEvent, err := events.ParseEvent(event); err == nil {
					if err := trackedView.SendEventNotification(ssr.syncCtx, parsedEvent); err != nil {
						log.Errorw(
							"Error sending event notification",
							"error",
							err,
							"streamId",
							streamId,
							"eventHash",
							event.Hash,
						)
					}
				}
			}
		}
	}

	for _, event := range streamAndCookie.GetEvents() {
		// These events are already applied to the tracked stream view's internal state, so let's
		// notify on them because they were not added via ApplyEvent. If added below, the events
		// will be silently skipped because they are already a part of the minipool.
		if record.applyHistoricalStreamContents {
			if parsedEvent, err := events.ParseEvent(event); err == nil {
				if err := record.trackedView.SendEventNotification(ssr.syncCtx, parsedEvent); err != nil {
					log.Errorw(
						"Error sending notification for historical event",
						"hash",
						parsedEvent.Hash,
						"error",
						err,
					)
				}
			}
		} else {
			if err := trackedView.ApplyEvent(ssr.syncCtx, event); err != nil {
				log.Errorw("Unable to apply event", "error", err)
			}
		}
	}

	record.applyHistoricalStreamContents = false

	// Update record cookie for restarting sync from the correct position after relocation
	record.minipoolGen = streamAndCookie.NextSyncCookie.MinipoolGen
	record.prevMiniblockHash = streamAndCookie.NextSyncCookie.PrevMiniblockHash
}

func (ssr *syncSessionRunner) processSyncUpdate(update *protocol.SyncStreamsResponse) {
	log := logging.FromCtx(ssr.syncCtx)
	switch update.SyncOp {
	case protocol.SyncOp_SYNC_UPDATE:
		{
			streamID, err := shared.StreamIdFromBytes(update.GetStream().GetNextSyncCookie().GetStreamId())
			if err != nil {
				log.Errorw("Received corrupt update, invalid stream ID", "error", err)
				ssr.cancelSync(fmt.Errorf("invalid SYNC_UPDATE, missing stream id"))
			}

			rawRecord, ok := ssr.streamRecords.Load(streamID)
			if !ok {
				log.Errorw(
					"Expected stream id for sync to be in the syncSessionRunner records",
					"streamId", streamID,
					"syncId", ssr.syncer.GetSyncId(),
				)
				return
			}
			record, ok := rawRecord.(*streamSyncInitRecord)
			if !ok {
				log.Errorw(
					"Expected stream sync init record in sync runner map",
					"value", rawRecord,
					"streamId", streamID,
					"syncId", ssr.syncer.GetSyncId(),
				)
				return
			}
			ssr.applyUpdateToStream(update.GetStream(), record)
		}
	case protocol.SyncOp_SYNC_DOWN:
		// Stream relocation is invoked by the remote syncer whenever a SYNC_DOWN is received, via a callback.
		// We can count sync downs to get a sense of how often streams are relocated due to node unavailability.
		ssr.metrics.SyncDown.With(prometheus.Labels{"target_node": ssr.node.Hex()}).Inc()
		return
	case protocol.SyncOp_SYNC_CLOSE:
		fallthrough
	case protocol.SyncOp_SYNC_PONG:
		fallthrough
	case protocol.SyncOp_SYNC_UNSPECIFIED:
		fallthrough
	case protocol.SyncOp_SYNC_NEW:
		ssr.cancelSync(
			base.AsRiverError(
				fmt.Errorf("syncSessionRunner: Unexpected sync operation"),
			).
				Tag("syncOp", update.SyncOp).
				Tag("streamId", update.GetStreamId()).
				Tag("syncId", ssr.syncer.GetSyncId()).
				Func("syncSessionRunner.processSyncUpdates"),
		)
	}
}

func (ssr *syncSessionRunner) WaitUntilStarted() {
	ssr.syncStarted.Wait()
}

// To be launched via a go routine.
func (ssr *syncSessionRunner) Run() {
	streamClient, err := ssr.nodeRegistry.GetStreamServiceClientForAddress(ssr.node)
	if err != nil {
		ssr.Close(base.AsRiverError(err, protocol.Err_INTERNAL).
			Message("Unable to create a StreamServiceClient for node, closing sync session runner").
			Tag("node", ssr.node).
			LogWarn(logging.FromCtx(ssr.syncCtx)))

		ssr.syncStarted.Done()
		return
	}
	syncer, err := client.NewRemoteSyncer(
		ssr.syncCtx,
		ssr.node,
		streamClient,
		ssr.relocateStream,
		ssr.messages,
		ssr.otelTracer,
	)
	if err != nil {
		ssr.Close(base.AsRiverError(err, protocol.Err_INTERNAL).
			Message("Unable to create a remote syncer for node, closing sync session runner").
			Tag("targetNode", ssr.node).
			LogWarn(logging.FromCtx(ssr.syncCtx)))
		ssr.syncStarted.Done()
		return
	}
	ssr.syncer = syncer

	go ssr.syncer.Run()

	// Track active syncs spawned by the multi sync runner.
	// There will be a bit of dlay between when the sync is cancelled and it is decremented, but on average these
	// should be fairly accurate.
	ssr.metrics.ActiveStreamSyncSessions.Inc()
	defer ssr.metrics.ActiveStreamSyncSessions.Dec()

	// This runner is now ready for streams to be added
	ssr.syncStarted.Done()

	var batch []*protocol.SyncStreamsResponse
	metricsTicker := time.Tick(1 * time.Second)

	for {
		select {
		case <-metricsTicker:
			ssr.mu.Lock()
			ssr.metrics.StreamsPerSyncSession.Observe(float64(ssr.streamCount))
			ssr.mu.Unlock()

		// Root context cancelled - this should propogate to the sync context and cause it to stop itself.
		// We do not re-assign streams in this case because we infer the intent was to close the application.
		case <-ssr.rootCtx.Done():
			return

		// Remote syncer cancelled the sync context because it encountered a sync error. In this case,
		// let's close the runner. If the sessionSyncRunner is closed, all of it's streams are
		// re-assigned and it will become unassignable.
		case <-ssr.syncCtx.Done():
			ssr.Close(ssr.syncCtx.Err())
			return

		// Process the current batch of messages.
		case <-ssr.messages.Wait():
			batch = ssr.messages.GetBatch(batch)
			for _, update := range batch {
				ssr.processSyncUpdate(update)
			}
		}
	}
}

// relocateStream puts the stream up for reassignment by the multisync runner. It will advance the stream's sticky
// peer so that the next assignment occurs on a different node if the stream is replicated.
func (ssr *syncSessionRunner) relocateStream(streamID shared.StreamId) {
	ssr.mu.Lock()
	rawRecordPtr, ok := ssr.streamRecords.LoadAndDelete(streamID)
	if ok {
		ssr.streamCount--
	}

	// Cancel the remote sync session if all streams have been relocated.
	if ssr.streamCount <= 0 {
		ssr.cancelSync(
			base.RiverError(protocol.Err_SYNC_SESSION_RUNNER_EMPTY, "Sync session runner has no streams remaining"),
		)
	}

	ssr.mu.Unlock()

	log := logging.FromCtx(ssr.syncCtx).With("syncId", ssr.GetSyncId()).With("streamId", streamID)
	if !ok {
		log.Errorw("Expected stream to exist in the stream records for this sync session runner")
		return
	}

	record, ok := rawRecordPtr.(*streamSyncInitRecord)
	if !ok {
		log.Errorw(
			"Value in syncSessionRunner map was not a *streamSyncInitRecord",
			"streamId", streamID,
			"value", rawRecordPtr,
		)
		return
	}

	newTarget := record.remotes.AdvanceStickyPeer(ssr.node)
	log.Debugw("Relocating stream", "oldNode", ssr.node, "newTarget", newTarget)
	ssr.relocateStreams <- record
}

func (ssr *syncSessionRunner) GetSyncId() string {
	if ssr.syncer != nil {
		return ssr.syncer.GetSyncId()
	}

	return ""
}

// Close shuts down the runner and relocates all streams.
func (ssr *syncSessionRunner) Close(err error) {
	log := logging.FromCtx(ssr.rootCtx)

	ssr.mu.Lock()
	if ssr.closeErr != nil {
		defer ssr.mu.Unlock()
		log.Debugw("syncSessionRunner.Close already called", "existingError", ssr.closeErr, "newError", err)
		return
	}
	ssr.closeErr = err
	ssr.mu.Unlock()

	if !errors.Is(err, context.Canceled) {
		log.Errorw(
			"Sync session was closed due to error",
			"error",
			err,
			"syncId",
			ssr.GetSyncId(),
			"node",
			ssr.node,
		)
	}

	// If the user's intent was to close the runner, no need to relocate or to cancel the
	// sync. It's already running from a derived context.
	if errors.Is(err, context.Canceled) {
		return
	}

	// Kill the sync session if it is still running
	if ssr.syncCtx.Err() == nil {
		ssr.cancelSync(err)
	}

	// Relocate all streams on this runner.
	ssr.streamRecords.Range(func(key any, _ any) bool {
		streamId, ok := key.(shared.StreamId)
		if ok {
			ssr.relocateStream(streamId)
		} else {
			log.Errorw("Unexpected key value in syncSessionRunner stream records; expected StreamId", "key", key)
		}

		return true
	})
}

type TrackedViewForStream func(streamId shared.StreamId, stream *protocol.StreamAndCookie) (events.TrackedStreamView, error)

func NewSyncSessionRunner(
	rootCtx context.Context,
	relocateStreams chan<- *streamSyncInitRecord,
	nodeRegistry nodes.NodeRegistry,
	trackedViewForStream TrackedViewForStream,
	maxStreamsPerSyncSession int,
	targetNode common.Address,
	metrics *TrackStreamsSyncMetrics,
	otelTracer trace.Tracer,
) *syncSessionRunner {
	ctx, cancel := context.WithCancelCause(rootCtx)
	runner := syncSessionRunner{
		rootCtx:                  rootCtx,
		syncCtx:                  logging.CtxWithLog(ctx, logging.FromCtx(rootCtx).With("targetNode", targetNode)),
		cancelSync:               cancel,
		maxStreamsPerSyncSession: maxStreamsPerSyncSession,
		trackedViewForStream:     trackedViewForStream,
		relocateStreams:          relocateStreams,
		node:                     targetNode,
		nodeRegistry:             nodeRegistry,
		messages:                 dynmsgbuf.NewDynamicBuffer[*protocol.SyncStreamsResponse](),
		metrics:                  metrics,
		otelTracer:               otelTracer,
	}
	runner.syncStarted.Add(1)
	return &runner
}

type TrackedViewConstructorFn func(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *protocol.StreamAndCookie,
) (events.TrackedStreamView, error)

// The MultiSyncRunner implements the logic for setting up a collection of stream syncs across nodes, and creating and
// continuously updating TrackedStreamViews with updates for each stream from streaming sync responses. The TrackedStreamView
// is responsible for firing any callbacks needed by a service that is tracking the contents of remotely hosted streams.
type MultiSyncRunner struct {
	// Keep track of all streams that need to be added (or re-added) to a sync session
	streamsToSync chan (*streamSyncInitRecord)

	metrics *TrackStreamsSyncMetrics

	// constructor for creating the tracked stream view for each added stream, which is responsible
	// for executing callbacks in response to stream events.
	trackedViewConstructor TrackedViewConstructorFn

	config config.StreamTrackingConfig

	onChainConfig crypto.OnChainConfiguration

	// workerPool tracks workers that empty the queue of streams to relocate and place them in
	// new or existing syncs
	workerPool *workerpool.WorkerPool

	otelTracer trace.Tracer

	// concurrentNodeRequests keeps track of a set of weighted semaphors, one per node address.
	// These are used to rate limit concurrent requests to each remote node from this service.
	concurrentNodeRequests sync.Map // map[commonAddress]*semaphore.Weighted

	// unfilledSyncs tracks sync sessions that have not yet been filled to maximum capacity for each
	// node. Once a sync session unassignable, we remove the reference here. The sync session continues
	// to be accessed via it's go routine, but it will be garbage collected if the routine exits.
	// In such cases the sync session runner will first relocate all of its streams.
	unfilledSyncs sync.Map // map[commonAddress]*syncStreamRunner

	// TODO: use a single node registry and modify http client settings for better performance.
	nodeRegistries []nodes.NodeRegistry
}

// getNodeRequestPool returns the node-specific semaphore used to rate limit requests to each node
// on the network.
func (msr *MultiSyncRunner) getNodeRequestPool(addr common.Address) *semaphore.Weighted {
	if workerPool, ok := msr.concurrentNodeRequests.Load(addr); ok {
		return workerPool.(*semaphore.Weighted)
	}

	workerPool, _ := msr.concurrentNodeRequests.LoadOrStore(
		addr,
		semaphore.NewWeighted(int64(msr.config.MaxConcurrentNodeRequests)),
	)
	return workerPool.(*semaphore.Weighted)
}

// NewMultiSyncRunner creates a MultiSyncRunner instance.
func NewMultiSyncRunner(
	metrics *TrackStreamsSyncMetrics,
	onChainConfig crypto.OnChainConfiguration,
	nodeRegistries []nodes.NodeRegistry,
	trackedStreamViewConstructor TrackedViewConstructorFn,
	streamTrackingConfig config.StreamTrackingConfig,
	otelTracer trace.Tracer,
) *MultiSyncRunner {
	// Set configuration defaults if needed
	if streamTrackingConfig.NumWorkers < 1 {
		streamTrackingConfig.NumWorkers = 20
	}
	if streamTrackingConfig.StreamsPerSyncSession < 1 {
		streamTrackingConfig.StreamsPerSyncSession = 100
	}
	if streamTrackingConfig.MaxConcurrentNodeRequests < 1 {
		streamTrackingConfig.MaxConcurrentNodeRequests = 50
	}

	return &MultiSyncRunner{
		metrics:                metrics,
		onChainConfig:          onChainConfig,
		nodeRegistries:         nodeRegistries,
		trackedViewConstructor: trackedStreamViewConstructor,
		streamsToSync:          make(chan (*streamSyncInitRecord), 2048),
		config:                 streamTrackingConfig,
		workerPool:             workerpool.New(streamTrackingConfig.NumWorkers),
		otelTracer:             otelTracer,
	}
}

// Run starts the operation of the MultiSyncRunner and continues to add streams to sync sessions until rootCtx is canceled.
func (msr *MultiSyncRunner) Run(
	rootCtx context.Context,
) {
consume_loop:
	for {
		select {
		case <-rootCtx.Done():
			break consume_loop
		case streamRecord := <-msr.streamsToSync:
			msr.workerPool.Submit(func() { msr.addToSync(rootCtx, streamRecord) })
		}
	}

	msr.workerPool.StopWait()
}

func (msr *MultiSyncRunner) getNodeRegistry() nodes.NodeRegistry {
	idx := rand.Int63n(int64(len(msr.nodeRegistries)))
	return msr.nodeRegistries[idx]
}

// addToSync adds a stream to a sync session for the stream's current sticky peer. We advance through the
// node's peers if any attempt to add the stream to a sync session fails.
func (msr *MultiSyncRunner) addToSync(
	rootCtx context.Context,
	record *streamSyncInitRecord,
) {
	targetNode := record.remotes.GetStickyPeer()
	pool := msr.getNodeRequestPool(targetNode)
	log := logging.FromCtx(rootCtx)

	sessionRunner, ok := msr.unfilledSyncs.Load(targetNode)
	var runner *syncSessionRunner
	if !ok {
		runner = NewSyncSessionRunner(
			rootCtx,
			msr.streamsToSync,
			msr.getNodeRegistry(),
			func(streamId shared.StreamId, streamAndCookie *protocol.StreamAndCookie) (events.TrackedStreamView, error) {
				return msr.trackedViewConstructor(rootCtx, streamId, msr.onChainConfig, streamAndCookie)
			},
			msr.config.StreamsPerSyncSession,
			targetNode,
			msr.metrics,
			msr.otelTracer,
		)
		var loaded bool

		// Running the runner involves a request to the node to establish the sync. We use the
		// workerpool for the node to rate limit these.

		// Pre-emptively acquire a connection for the newly created runner above so that if the
		// store is successful, we are guaranteed to call it's 'Run' method. This will keep
		// other workers from becoming indefinitely blocked on stream insertion to this runner.
		if err := pool.Acquire(rootCtx, 1); err != nil {
			if !errors.Is(err, context.Canceled) {
				log.Errorw(
					"unable to acquire worker pool task for node; closing runner and re-assigning stream",
					"error",
					err,
					"node",
					targetNode,
					"streamId",
					record.streamId,
				)
				msr.streamsToSync <- record
			}
			runner.Close(fmt.Errorf("unable to acquire worker pool task for node: %w", err))
			return
		}

		if sessionRunner, loaded = msr.unfilledSyncs.LoadOrStore(targetNode, runner); !loaded {
			// If our new runner won the race to be stored for this node, kick off the runner. Streams
			// are not assignable until the sync session starts.
			msr.metrics.SyncSessionsInFlight.With(prometheus.Labels{"target_node": targetNode.Hex()}).Inc()
			go runner.Run()
			runner.WaitUntilStarted()
			msr.metrics.SyncSessionsInFlight.With(prometheus.Labels{"target_node": targetNode.Hex()}).Dec()
		}
		pool.Release(1)
	}
	runner = sessionRunner.(*syncSessionRunner)

	// Prepare for another rpc call by acquiring another connection from the pool.
	if err := pool.Acquire(rootCtx, 1); err != nil {
		if errors.Is(err, context.Canceled) {
			return
		}

		log.Errorw(
			"unable to acquire worker pool task for node; re-assigning stream",
			"error",
			err,
			"node",
			targetNode,
			"streamId",
			record.streamId,
		)
		msr.streamsToSync <- record
		return
	}

	// If we fail to add a stream to a sync session runner, relocate the stream and replace the runner.
	// This failure could occur if the session is full or due to an underlying sync error.
	// The runner will continue to stay in memory until its go routine stops running, which will occur
	// if the underlying sync fails or the root context is canceled.
	// AddStream involves an rpc request to the node, so we use the node's worker pool to rate limit.
	if err := runner.AddStream(rootCtx, *record); err != nil {
		// Aggressively release the lock on target node resources to maximize request throughput.
		pool.Release(1)

		// Create a new runner and replace this one
		newRunner := NewSyncSessionRunner(
			rootCtx,
			msr.streamsToSync,
			msr.getNodeRegistry(),
			func(streamId shared.StreamId, streamAndCookie *protocol.StreamAndCookie) (events.TrackedStreamView, error) {
				return msr.trackedViewConstructor(rootCtx, streamId, msr.onChainConfig, streamAndCookie)
			},
			msr.config.StreamsPerSyncSession,
			targetNode,
			msr.metrics,
			msr.otelTracer,
		)

		if acquireErr := pool.Acquire(rootCtx, 1); acquireErr != nil {
			if errors.Is(acquireErr, context.Canceled) {
				return
			}

			log.Errorw(
				"unable to acquire worker pool task for node; re-assigning stream",
				"error",
				acquireErr,
				"node",
				targetNode,
				"streamId",
				record.streamId,
			)
			msr.streamsToSync <- record
			return

		}
		if swapped := msr.unfilledSyncs.CompareAndSwap(
			targetNode,
			runner,
			newRunner,
		); swapped {
			go newRunner.Run()
			newRunner.WaitUntilStarted()
		}
		pool.Release(1)

		log := logging.FromCtx(rootCtx)

		// Relocate this stream's target node and re-insert into the pool of unassigned streams
		newRemote := record.remotes.AdvanceStickyPeer(targetNode)

		if base.IsRiverErrorCode(err, protocol.Err_SYNC_SESSION_RUNNER_UNASSIGNABLE) {
			log.Debugw(
				"Could not assign stream to existing session, cycling to new session",
				"streamId", record.streamId,
				"syncId", runner.GetSyncId(),
				"failedRemote", targetNode,
				"newRemote", newRemote,
			)
		} else {
			log.Errorw(
				"Error adding stream to sync on node, cycling to new session",
				"streamId", record.streamId,
				"node", targetNode,
				"syncId", runner.GetSyncId(),
				"error", err,
			)
		}
		msr.streamsToSync <- record
	} else {
		pool.Release(1)
	}
}

// AddStream adds a stream to the queue to be added to a sync session for event tracking.
// This method may block if the queue fills.
func (msr *MultiSyncRunner) AddStream(
	stream *river.StreamWithId,
	applyHistoricalStreamContents bool,
) {
	promLabels := prometheus.Labels{"type": shared.StreamTypeToString(stream.StreamId().Type())}
	msr.metrics.TotalStreams.With(promLabels).Inc()

	msr.streamsToSync <- &streamSyncInitRecord{
		streamId:                      stream.StreamId(),
		applyHistoricalStreamContents: applyHistoricalStreamContents,
		minipoolGen:                   math.MaxInt64,
		prevMiniblockHash:             common.Hash{}.Bytes(),
		remotes: nodes.NewStreamNodesWithLock(
			stream.ReplicationFactor(),
			stream.Nodes(),
			common.Address{},
		),
	}
}
