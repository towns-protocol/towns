package track_streams

import (
	"context"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gammazero/workerpool"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
	"golang.org/x/sync/semaphore"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

const (
	modifySyncRequestTimeout = 10 * time.Second
)

type RemoteStreamSyncer interface {
	Run()
	Modify(ctx context.Context, request *protocol.ModifySyncRequest) (*protocol.ModifySyncResponse, bool, error)
	GetSyncId() string
}

// ApplyHistoricalContent describes how historical content should be applied during sync
type ApplyHistoricalContent struct {
	// If false, only sync from current position. If true, apply historical content
	// since inception/last snapshot, unless FromMiniblockNum is set, in which case
	// only events from that miniblock number onwards will be applied.
	Enabled bool
	// If > 0, start applying from this miniblock number onwards.
	// Enabled must be set to true.
	FromMiniblockNum int64
}

type streamSyncInitRecord struct {
	trackedView events.TrackedStreamView
	streamId    shared.StreamId

	// Describes if and how historical content should be applied
	applyHistoricalContent ApplyHistoricalContent

	// These are tracked to determine where to restart streams. If the stream is initially
	// being added and a sync reset is desired, set minipoolGen to MaxInt64 and prevMiniblockHash
	// to a zero hash.
	minipoolGen       int64
	prevMiniblockHash []byte
	remotes           nodes.StreamNodes

	// Persisted minipoolGen to avoid redundant DB writes.
	// Loaded from the cookie store when adding a stream.
	// We only persist when minipoolGen changes (new miniblock created).
	persistedMinipoolGen int64
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
	streamRecords *xsync.Map[shared.StreamId, *streamSyncInitRecord]

	// closeErr is assigned when the sync has encountered an error state, is re-assigning all
	// of it's streams, and is no longer assignable.
	closeErr error

	// cookieStore is an optional store for persisting sync cookies for stream resumption.
	cookieStore SyncCookieStore
}

func (ssr *syncSessionRunner) AddStream(
	ctx context.Context,
	record streamSyncInitRecord,
) error {
	ctx, end := ssr.startSpan(ctx, attribute.String("streamId", record.streamId.String()))
	defer end()

	// Wait for the sync to start. This waitgroup should be decremented even if the initial sync from the remote syncer
	// fails.
	ssr.syncStarted.Wait()
	ssr.mu.Lock()
	if ssr.streamRecords.Size() >= ssr.maxStreamsPerSyncSession-1 || ssr.closeErr != nil {
		ssr.mu.Unlock()
		return base.RiverError(protocol.Err_SYNC_SESSION_RUNNER_UNASSIGNABLE, "Sync runner session is not assignable")
	}
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

	modifyCtx, cancel := context.WithTimeout(ctx, modifySyncRequestTimeout)
	defer cancel()

	if resp, _, err := ssr.syncer.Modify(modifyCtx, &protocol.ModifySyncRequest{
		AddStreams: []*protocol.SyncCookie{{
			StreamId:          record.streamId[:],
			MinipoolGen:       record.minipoolGen,
			PrevMiniblockHash: record.prevMiniblockHash,
		}},
	}); err != nil || len(resp.Adds) > 0 {
		// We failed to add this stream to the sync, return an error.
		ssr.streamRecords.Delete(record.streamId)

		if err != nil {
			return err
		} else {
			return base.AsRiverError(fmt.Errorf("failed to add stream to existing sync")).
				Tag("syncId", ssr.syncer.GetSyncId()).
				Tag("node", ssr.node).
				Tag("stream", record.streamId).
				Tag("size", ssr.streamRecords.Size()).
				Tag("error", resp.Adds[0].GetMessage()).
				Tag("code", protocol.Err(resp.Adds[0].GetCode())).
				LogError(logging.FromCtx(ctx))
		}
	}

	return nil
}

// handleHistoricalContent processes historical miniblocks on sync reset.
// if applyHistoricalContent.Enabled is true, apply the events from the
// specified miniblock till the latest event in the minipool.
func (ssr *syncSessionRunner) handleHistoricalContent(
	record *streamSyncInitRecord,
	trackedView events.TrackedStreamView,
	streamAndCookie *protocol.StreamAndCookie,
) {
	log := logging.FromCtx(ssr.syncCtx)
	streamId := record.streamId
	fromMiniblockNum := record.applyHistoricalContent.FromMiniblockNum

	miniblocks := streamAndCookie.GetMiniblocks()
	if len(miniblocks) == 0 || !record.applyHistoricalContent.Enabled {
		return
	}

	serverSnapshotMb, err := getFirstMiniblockNumber(miniblocks)
	if err != nil {
		// Log but continue - don't block sync for parse errors
		log.Errorw("handleHistoricalContent: Failed to parse first miniblock", "error", err, "streamId", streamId)
		return
	}

	// FromMiniblockNum is before our first miniblock num, we need to fetch miniblocks from the remote
	if fromMiniblockNum < serverSnapshotMb {
		log.Infow("handleHistoricalContent: fetching missing miniblocks",
			"streamId", streamId,
			"FromMiniblockNum", fromMiniblockNum,
			"serverSnapshotMb", serverSnapshotMb,
			"gapSize", serverSnapshotMb-fromMiniblockNum,
		)

		missingMiniblocks, err := fetchMiniblocks(
			ssr.syncCtx,
			ssr.nodeRegistry,
			ssr.node, // Try the node we're syncing from first
			record.remotes,
			streamId,
			fromMiniblockNum,
			serverSnapshotMb,
		)
		if err != nil {
			log.Errorw("handleHistoricalContent: failed to fetch missing miniblocks",
				"streamId", streamId,
				"fromInclusive", fromMiniblockNum,
				"toExclusive", serverSnapshotMb,
				"error", err,
			)
			// continue to handle miniblocks we have from the reset
		}

		if len(missingMiniblocks) > 0 {
			log.Infow("Gap recovery: fetched missing miniblocks, sending notifications",
				"streamId", streamId,
				"numMiniblocks", len(missingMiniblocks),
			)
			ssr.notifyEventsFromMiniblocks(streamId, trackedView, missingMiniblocks)
		}
	}

	startIdx := record.applyHistoricalContent.FromMiniblockNum - serverSnapshotMb
	if startIdx < 0 {
		startIdx = 0
	}
	if startIdx < int64(len(miniblocks)) {
		ssr.notifyEventsFromMiniblocks(streamId, trackedView, miniblocks[int(startIdx):])
	}
}

// notifyEventsFromMiniblocks sends notifications for all events in the given miniblocks.
// This is used for historical recovery to process events from miniblocks that were missed during downtime.
func (ssr *syncSessionRunner) notifyEventsFromMiniblocks(
	streamId shared.StreamId,
	trackedView events.TrackedStreamView,
	miniblocks []*protocol.Miniblock,
) {
	log := logging.FromCtx(ssr.syncCtx)

	for _, block := range miniblocks {
		for _, event := range block.GetEvents() {
			parsedEvent, err := events.ParseEvent(event)
			if err != nil {
				log.Errorw("Failed to parse event from historic miniblock",
					"streamId", streamId,
					"eventHash", event.Hash,
					"error", err,
				)
				continue
			}
			if err := trackedView.SendEventNotification(ssr.syncCtx, parsedEvent); err != nil {
				log.Errorw("Error sending notification for historic event",
					"streamId", streamId,
					"eventHash", parsedEvent.Hash,
					"error", err,
				)
			}
		}
	}
}

// maybePersistCookie persists the sync cookie if configured and the minipoolGen has changed.
func (ssr *syncSessionRunner) maybePersistCookie(
	streamId shared.StreamId,
	trackedView events.TrackedStreamView,
	record *streamSyncInitRecord,
	cookie *protocol.SyncCookie,
) {
	if ssr.cookieStore == nil ||
		cookie.MinipoolGen == record.persistedMinipoolGen ||
		!trackedView.ShouldPersistCookie(ssr.syncCtx) {
		return
	}

	if err := ssr.cookieStore.WriteSyncCookie(ssr.rootCtx, streamId, cookie); err != nil {
		logging.FromCtx(ssr.syncCtx).Errorw("Failed to persist sync cookie", "streamId", streamId, "error", err)
		return
	}
	record.persistedMinipoolGen = cookie.MinipoolGen
}

// handleReset processes a sync reset response for a stream.
// it will init the trackedView, and will notify historical events if needed
func (ssr *syncSessionRunner) handleReset(
	streamAndCookie *protocol.StreamAndCookie,
	record *streamSyncInitRecord,
) error {
	streamId := record.streamId
	log := logging.FromCtx(ssr.syncCtx)
	labels := prometheus.Labels{"type": shared.StreamTypeToString(streamId.Type())}

	trackedView, err := ssr.trackedViewForStream(streamId, streamAndCookie)
	if err != nil {
		log.Errorw(
			"Error constructing tracked view for stream; relocating stream",
			"streamId", streamId,
			"error", err,
		)
		return err
	}

	// Assuming each stream experiences a reset when it is first added to tracking, we would
	// expect the reset to be the first event we see for each stream when tracking it.
	ssr.metrics.TrackedStreams.With(labels).Inc()
	record.trackedView = trackedView

	ssr.handleHistoricalContent(record, trackedView, streamAndCookie)

	return nil
}

func (ssr *syncSessionRunner) applyUpdateToStream(
	streamAndCookie *protocol.StreamAndCookie,
	record *streamSyncInitRecord,
) {
	_, end := ssr.startSpan(ssr.syncCtx, attribute.String("streamId", record.streamId.String()))
	defer end()

	var (
		reset    = streamAndCookie.GetSyncReset()
		streamId = record.streamId
		log      = logging.FromCtx(ssr.syncCtx)
	)

	ssr.metrics.SyncUpdate.With(prometheus.Labels{"reset": fmt.Sprintf("%t", reset)}).Inc()

	if reset {
		if err := ssr.handleReset(streamAndCookie, record); err != nil {
			ssr.cancelSync(
				base.AsRiverError(fmt.Errorf("error constructing tracked view for stream: %w", err)).
					Tag("streamId", streamId).
					Tag("syncId", ssr.syncer.GetSyncId()).
					Func("syncSessionRunner.handleReset"),
			)
			return
		}
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

	for _, event := range streamAndCookie.GetEvents() {
		// These events are already applied to the tracked stream view's internal state, so let's
		// notify on them because they were not added via ApplyEvent. If added below, the events
		// will be silently skipped because they are already a part of the minipool.
		if record.applyHistoricalContent.Enabled {
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

	record.applyHistoricalContent.Enabled = false

	// Update record cookie for restarting sync from the correct position after relocation
	record.minipoolGen = streamAndCookie.NextSyncCookie.MinipoolGen
	record.prevMiniblockHash = streamAndCookie.NextSyncCookie.PrevMiniblockHash

	ssr.maybePersistCookie(streamId, trackedView, record, streamAndCookie.NextSyncCookie)
}

func (ssr *syncSessionRunner) processSyncUpdate(update *protocol.SyncStreamsResponse) {
	log := logging.FromCtx(ssr.syncCtx)
	switch update.SyncOp {
	case protocol.SyncOp_SYNC_UPDATE:
		streamID, err := shared.StreamIdFromBytes(update.GetStream().GetNextSyncCookie().GetStreamId())
		if err != nil {
			log.Errorw("Received corrupt update, invalid stream ID", "error", err)
			ssr.cancelSync(fmt.Errorf("invalid SYNC_UPDATE, missing stream id"))
			return
		}

		record, ok := ssr.streamRecords.Load(streamID)
		if !ok {
			log.Errorw(
				"Expected stream id for sync to be in the syncSessionRunner records",
				"streamId", streamID,
				"syncId", ssr.syncer.GetSyncId(),
			)
			return
		}

		ssr.applyUpdateToStream(update.GetStream(), record)
	case protocol.SyncOp_SYNC_DOWN:
		// Stream relocation is invoked by the remote syncer whenever a SYNC_DOWN is received, via a callback.
		// We can count sync downs to get a sense of how often streams are relocated due to node unavailability.
		ssr.metrics.SyncDown.With(prometheus.Labels{"target_node": ssr.node.Hex()}).Inc()
		streamID, _ := shared.StreamIdFromBytes(update.GetStreamId())
		log.Infow(
			"Received SYNC_DOWN from remote, stream will be relocated",
			"streamId", streamID,
			"syncId", ssr.syncer.GetSyncId(),
			"targetNode", ssr.node,
		)
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

	syncer, err := newRemoteSyncer(
		ssr.syncCtx,
		ssr.cancelSync,
		"SyncSessionRunner",
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

	// Track open sync sessions per node
	ssr.metrics.OpenSyncSessions.With(prometheus.Labels{"node": ssr.node.Hex()}).Inc()
	defer ssr.metrics.OpenSyncSessions.With(prometheus.Labels{"node": ssr.node.Hex()}).Dec()

	// Track active syncs spawned by the multi sync runner.
	// There will be a bit of delay between when the sync is cancelled and it is decremented, but on average these
	// should be fairly accurate.
	ssr.metrics.ActiveStreamSyncSessions.Inc()
	defer ssr.metrics.ActiveStreamSyncSessions.Dec()

	// This runner is now ready for streams to be added
	ssr.syncStarted.Done()

	var batch []*protocol.SyncStreamsResponse
	for {
		select {
		case <-time.Tick(time.Second):
			ssr.metrics.StreamsPerSyncSession.Observe(float64(ssr.streamRecords.Size()))

		// Root context cancelled - this should propogate to the sync context and cause it to stop itself.
		// We do not re-assign streams in this case because we infer the intent was to close the application.
		case <-ssr.rootCtx.Done():
			return

		// Remote syncer cancelled the sync context because it encountered a sync error. In this case,
		// let's close the runner. If the sessionSyncRunner is closed, all of it's streams are
		// re-assigned and it will become unassignable.
		case <-ssr.syncCtx.Done():
			ssr.Close(context.Cause(ssr.syncCtx))
			return

		// Process the current batch of messages.
		case <-ssr.messages.Wait():
			batch = ssr.messages.GetBatch(batch)

			// If the batch is nil, it means the messages channel was closed.
			if batch == nil {
				ssr.Close(
					base.RiverError(
						protocol.Err_BUFFER_FULL,
						"Sync session runner messages buffer is full, closing sync session runner",
					),
				)
				return
			}

			for _, update := range batch {
				ssr.processSyncUpdate(update)
			}
		}
	}
}

// relocateStream puts the stream up for reassignment by the multisync runner. It will advance the stream's sticky
// peer so that the next assignment occurs on a different node if the stream is replicated.
func (ssr *syncSessionRunner) relocateStream(streamID shared.StreamId) {
	record, ok := ssr.streamRecords.LoadAndDelete(streamID)

	remainingStreams := ssr.streamRecords.Size()
	log := logging.FromCtx(ssr.syncCtx).With("syncId", ssr.GetSyncId()).With("streamId", streamID)

	// Cancel the remote sync session if all streams have been relocated.
	if remainingStreams <= 0 {
		log.Infow(
			"Sync session runner has no streams remaining after relocation, cancelling session",
			"targetNode", ssr.node,
		)
		ssr.cancelSync(
			base.RiverError(protocol.Err_SYNC_SESSION_RUNNER_EMPTY, "Sync session runner has no streams remaining"),
		)
	}

	if !ok {
		log.Errorw("Expected stream to exist in the stream records for this sync session runner")
		return
	}

	newTarget := record.remotes.AdvanceStickyPeer(ssr.node)
	log.Infow(
		"Relocating stream to new target",
		"oldNode", ssr.node,
		"newTarget", newTarget,
		"remainingStreamsInSession", remainingStreams,
		"syncCause", context.Cause(ssr.syncCtx),
	)
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
		ssr.mu.Unlock()
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
	ssr.streamRecords.Range(func(streamId shared.StreamId, record *streamSyncInitRecord) bool {
		if base.AsRiverError(err).IsCodeWithBases(protocol.Err_UNAVAILABLE) {
			// Advance sticky peer if the current one is not available anymore.
			record.remotes.AdvanceStickyPeer(ssr.node)
		}
		ssr.relocateStream(streamId)
		return true
	})
}

// startSpan starts a new OpenTelemetry span for the syncSessionRunner, using the provided attributes.
func (ssr *syncSessionRunner) startSpan(ctx context.Context, attrs ...attribute.KeyValue) (context.Context, func()) {
	if ssr.otelTracer == nil {
		return ctx, func() {}
	}

	// Determine the span name based on the caller's function name.
	spanName := "N/A"
	if pc, _, _, ok := runtime.Caller(1); ok {
		if f := runtime.FuncForPC(pc); f != nil && len(f.Name()) > 0 {
			names := strings.Split(f.Name(), ".")
			spanName = names[len(names)-1]
		}
	}

	ctx, span := ssr.otelTracer.Start(ctx, "syncSessionRunner::"+spanName, trace.WithAttributes(
		append(attrs, attribute.String("syncId", ssr.GetSyncId()))...,
	))

	return ctx, func() { span.End() }
}

type TrackedViewForStream func(streamId shared.StreamId, stream *protocol.StreamAndCookie) (events.TrackedStreamView, error)

func newSyncSessionRunner(
	rootCtx context.Context,
	relocateStreams chan<- *streamSyncInitRecord,
	nodeRegistry nodes.NodeRegistry,
	trackedViewForStream TrackedViewForStream,
	maxStreamsPerSyncSession int,
	targetNode common.Address,
	metrics *TrackStreamsSyncMetrics,
	otelTracer trace.Tracer,
	cookieStore SyncCookieStore,
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
		streamRecords:            xsync.NewMap[shared.StreamId, *streamSyncInitRecord](),
		metrics:                  metrics,
		otelTracer:               otelTracer,
		cookieStore:              cookieStore,
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
// continuously updating TrackedStreamViews with updates for each stream from streaming sync responses. The
// TrackedStreamView
// is responsible for firing any callbacks needed by a service that is tracking the contents of remotely hosted streams.
type MultiSyncRunner struct {
	// Keep track of all streams that need to be added (or re-added) to a sync session
	streamsToSync chan *streamSyncInitRecord

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
	concurrentNodeRequests *xsync.Map[common.Address, *semaphore.Weighted]

	// unfilledSyncs tracks sync sessions that have not yet been filled to maximum capacity for each
	// node. Once a sync session unassignable, we remove the reference here. The sync session continues
	// to be accessed via it's go routine, but it will be garbage collected if the routine exits.
	// In such cases the sync session runner will first relocate all of its streams.
	unfilledSyncs *xsync.Map[common.Address, *syncSessionRunner]

	// TODO: use a single node registry and modify http client settings for better performance.
	nodeRegistries []nodes.NodeRegistry

	// cookieStore is an optional store for persisting sync cookies for stream resumption.
	// If nil, cookie persistence is disabled.
	cookieStore SyncCookieStore
}

// getNodeRequestPool returns the node-specific semaphore used to rate limit requests to each node
// on the network.
func (msr *MultiSyncRunner) getNodeRequestPool(addr common.Address) *semaphore.Weighted {
	if workerPool, ok := msr.concurrentNodeRequests.Load(addr); ok {
		return workerPool
	}

	workerPool, _ := msr.concurrentNodeRequests.LoadOrStore(
		addr,
		semaphore.NewWeighted(int64(msr.config.MaxConcurrentNodeRequests)),
	)
	return workerPool
}

// NewMultiSyncRunner creates a MultiSyncRunner instance.
// cookieStore is optional - if nil, cookie persistence is disabled. Cookie persistence
// is controlled by each TrackedStreamView's ShouldPersistCookie method.
func NewMultiSyncRunner(
	metricsFactory infra.MetricsFactory,
	onChainConfig crypto.OnChainConfiguration,
	nodeRegistries []nodes.NodeRegistry,
	trackedStreamViewConstructor TrackedViewConstructorFn,
	streamTrackingConfig config.StreamTrackingConfig,
	otelTracer trace.Tracer,
	cookieStore SyncCookieStore,
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
		metrics:                NewTrackStreamsSyncMetrics(metricsFactory),
		onChainConfig:          onChainConfig,
		nodeRegistries:         nodeRegistries,
		trackedViewConstructor: trackedStreamViewConstructor,
		streamsToSync:          make(chan (*streamSyncInitRecord), 2048),
		config:                 streamTrackingConfig,
		workerPool:             workerpool.New(streamTrackingConfig.NumWorkers),
		concurrentNodeRequests: xsync.NewMap[common.Address, *semaphore.Weighted](),
		unfilledSyncs:          xsync.NewMap[common.Address, *syncSessionRunner](),
		otelTracer:             otelTracer,
		cookieStore:            cookieStore,
	}
}

// Run starts the operation of the MultiSyncRunner and continues to add streams to sync sessions until rootCtx is
// canceled.
func (msr *MultiSyncRunner) Run(
	rootCtx context.Context,
) {
	// Start metrics reporter for unsynced queue length
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-rootCtx.Done():
				return
			case <-ticker.C:
				msr.metrics.UnsyncedQueueLength.Set(float64(msr.workerPool.WaitingQueueSize()))
			}
		}
	}()

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

	runner, ok := msr.unfilledSyncs.Load(targetNode)
	if !ok {
		runner = newSyncSessionRunner(
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
			msr.cookieStore,
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

		if runner, loaded = msr.unfilledSyncs.LoadOrStore(targetNode, runner); !loaded {
			// If our new runner won the race to be stored for this node, kick off the runner. Streams
			// are not assignable until the sync session starts.
			msr.metrics.SyncSessionsInFlight.With(prometheus.Labels{"target_node": targetNode.Hex()}).Inc()
			go runner.Run()
			runner.WaitUntilStarted()
			msr.metrics.SyncSessionsInFlight.With(prometheus.Labels{"target_node": targetNode.Hex()}).Dec()
		}
		pool.Release(1)
	}

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

	// If we fail to add a stream to a sync session runner due to closed or full sync,
	// relocate the stream and replace the runner. Otherwise, retry adding the stream to the same sync.
	// This failure could occur if the session is full or due to an underlying sync error.
	// The runner will continue to stay in memory until its go routine stops running, which will occur
	// if the underlying sync fails or the root context is canceled.
	// AddStream involves an rpc request to the node, so we use the node's worker pool to rate limit.
	if err := runner.AddStream(rootCtx, *record); err != nil {
		// Aggressively release the lock on target node resources to maximize request throughput.
		pool.Release(1)

		if base.IsRiverErrorCode(err, protocol.Err_SYNC_SESSION_RUNNER_UNASSIGNABLE) ||
			base.IsRiverErrorCode(err, protocol.Err_UNAVAILABLE) {
			// If the sync operation is full OR the remote node is not available, we need to
			// re-assign the stream to a new sync session runner.
			newRunner := newSyncSessionRunner(
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
				msr.cookieStore,
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

			msr.unfilledSyncs.Compute(
				targetNode,
				func(oldRunner *syncSessionRunner, loaded bool) (*syncSessionRunner, xsync.ComputeOp) {
					if loaded && oldRunner == runner {
						go newRunner.Run()
						newRunner.WaitUntilStarted()
						return newRunner, xsync.UpdateOp
					}
					return oldRunner, xsync.CancelOp
				},
			)
			pool.Release(1)

			log := logging.FromCtx(rootCtx)

			// Relocate this stream's target node and re-insert into the pool of unassigned streams
			newRemote := record.remotes.AdvanceStickyPeer(targetNode)

			log.Debugw(
				"Could not assign stream to existing session, cycling to new session",
				"streamId", record.streamId,
				"syncId", runner.GetSyncId(),
				"failedRemote", targetNode,
				"newRemote", newRemote,
			)
		} else if base.IsRiverErrorCode(err, protocol.Err_NOT_FOUND) {
			log.Warn("Sync not found; cancelling sync runner and relocating streams", "syncId", runner.syncer.GetSyncId())
			runner.Close(err)
		} else {
			log.Errorw(
				"Error adding stream to sync on node, retrying",
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
// If a cookie store is configured, it will attempt to load a stored cookie for the stream
// to resume from the last persisted position.
// This method may block if the queue fills.
func (msr *MultiSyncRunner) AddStream(
	ctx context.Context,
	stream *river.StreamWithId,
	applyHistoricalContent ApplyHistoricalContent,
) {
	promLabels := prometheus.Labels{"type": shared.StreamTypeToString(stream.StreamId().Type())}
	msr.metrics.TotalStreams.With(promLabels).Inc()

	streamId := stream.StreamId()
	var persistedMinipoolGen int64

	// Try to load persisted state for gap detection on restart.
	// Note: We always start with minipoolGen=MaxInt64 to force a reset response from the server.
	// The persisted state is only used for gap detection after we receive the reset response.
	if msr.cookieStore != nil {
		cookie, updatedAt, err := msr.cookieStore.GetSyncCookie(ctx, streamId)
		if err != nil {
			logging.FromCtx(ctx).Warnw("Failed to load sync cookie", "streamId", streamId, "error", err)
		} else if cookie != nil {
			persistedMinipoolGen = cookie.MinipoolGen
			applyHistoricalContent = ApplyHistoricalContent{
				Enabled:          true,
				FromMiniblockNum: persistedMinipoolGen,
			}
			logging.FromCtx(ctx).Infow("Loaded sync cookie for historical content",
				"streamId", streamId,
				"persistedMinipoolGen", persistedMinipoolGen,
				"updatedAt", updatedAt,
			)
		}
	}

	msr.streamsToSync <- &streamSyncInitRecord{
		streamId:               streamId,
		applyHistoricalContent: applyHistoricalContent,
		minipoolGen:            int64(math.MaxInt64),
		prevMiniblockHash:      common.Hash{}.Bytes(),
		persistedMinipoolGen:   persistedMinipoolGen,
		remotes: nodes.NewStreamNodesWithLock(
			stream.ReplicationFactor(),
			stream.Nodes(),
			common.Address{},
		),
	}
}
