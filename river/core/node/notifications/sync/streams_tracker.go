package sync

import (
	"context"
	"math/rand"
	"slices"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/river-build/river/core/contracts/river"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/infra"
	"github.com/river-build/river/core/node/logging"
	"github.com/river-build/river/core/node/nodes"
	"github.com/river-build/river/core/node/registries"
	"github.com/river-build/river/core/node/shared"
	"golang.org/x/sync/semaphore"
)

// maxConcurrentNodeRequests is the maximum number of concurrent
// requests made to a remote node
const maxConcurrentNodeRequests = 50

type StreamsTracker struct {
	nodeRegistries []nodes.NodeRegistry
	riverRegistry  *registries.RiverRegistryContract
	// prevent making too many requests at the same time to a remote.
	// keep per remote a worker pool that limits the number of concurrent requests.
	workerPool    map[common.Address]*semaphore.Weighted
	onChainConfig crypto.OnChainConfiguration
	listener      events.StreamEventListener
	storage       events.UserPreferencesStore
	metrics       *streamsTrackerWorkerMetrics
	tracked       sync.Map // map[shared.StreamId] = struct{}
}

// NewStreamsTracker create stream tracker instance.
func NewStreamsTracker(
	ctx context.Context,
	onChainConfig crypto.OnChainConfiguration,
	riverRegistry *registries.RiverRegistryContract,
	nodeRegistries []nodes.NodeRegistry,
	listener events.StreamEventListener,
	storage events.UserPreferencesStore,
	metricsFactory infra.MetricsFactory,
) (*StreamsTracker, error) {
	metrics := &streamsTrackerWorkerMetrics{
		ActiveStreamSyncSessions: metricsFactory.NewGaugeEx(
			"sync_sessions_active", "Active stream sync sessions"),
		TotalStreams: metricsFactory.NewGaugeVec(prometheus.GaugeOpts{
			Name: "total_streams",
			Help: "Number of streams to track for notification events",
		}, []string{"type"}), // type= dm, gdm, space_channel, user_settings
		TrackedStreams: metricsFactory.NewGaugeVec(prometheus.GaugeOpts{
			Name: "tracked_streams",
			Help: "Number of streams to track for notification events",
		}, []string{"type"}), // type= dm, gdm, space_channel, user_settings
		SyncSessionInFlight: metricsFactory.NewGaugeEx(
			"stream_session_inflight",
			"Number of pending stream sync session requests in flight",
		),
		SyncUpdate: metricsFactory.NewCounterVec(prometheus.CounterOpts{
			Name: "sync_update",
			Help: "Number of received stream sync updates",
		}, []string{"reset"}), // reset = true or false
		SyncDown: metricsFactory.NewCounterEx(
			"sync_down",
			"Number of received stream sync downs",
		),
		SyncPingInFlight: metricsFactory.NewGaugeEx(
			"stream_ping_inflight",
			"Number of pings requests in flight",
		),
		SyncPing: metricsFactory.NewCounterVec(prometheus.CounterOpts{
			Name: "sync_ping",
			Help: "Number of send stream sync pings",
		}, []string{"status"}), // status = success or failure
		SyncPong: metricsFactory.NewCounterEx(
			"sync_pong",
			"Number of received stream sync pong replies",
		),
	}

	tracker := &StreamsTracker{
		riverRegistry:  riverRegistry,
		onChainConfig:  onChainConfig,
		nodeRegistries: nodeRegistries,
		workerPool:     make(map[common.Address]*semaphore.Weighted),
		listener:       listener,
		storage:        storage,
		metrics:        metrics,
	}

	// subscribe to stream events in river registry
	if err := tracker.riverRegistry.OnStreamEvent(
		ctx,
		tracker.riverRegistry.Blockchain.InitialBlockNum,
		tracker.OnStreamAllocated,
		tracker.OnStreamLastMiniblockUpdated,
		tracker.OnStreamPlacementUpdated,
	); err != nil {
		return nil, err
	}

	return tracker, nil
}

// Run the stream tracker workers until the given ctx expires.
func (tracker *StreamsTracker) Run(ctx context.Context) error {
	// load streams and distribute streams by hashing the stream id over buckets and assign each bucket
	// to a worker to process stream updates.
	var (
		log                   = logging.FromCtx(ctx)
		validNodes            = tracker.nodeRegistries[0].GetValidNodeAddresses()
		streamsLoaded         = 0
		totalStreams          = 0
		streamsLoadedProgress = 0
		start                 = time.Now()
	)

	err := tracker.riverRegistry.ForAllStreams(
		ctx,
		tracker.riverRegistry.Blockchain.InitialBlockNum,
		func(stream *registries.GetStreamResult) bool {
			// print progress report every 50k streams that are added to track
			if streamsLoaded > 0 && streamsLoaded%50_000 == 0 && streamsLoadedProgress != streamsLoaded {
				log.Infow("Progress stream loading", "tracked", streamsLoaded, "total", totalStreams)
				streamsLoadedProgress = streamsLoaded
			}

			totalStreams++

			if !tracker.TrackStreamForNotifications(stream.StreamId) {
				return true
			}

			// there are some streams managed by a node that isn't registered anymore.
			// filter these out because we can't sync these streams.
			stream.Nodes = slices.DeleteFunc(stream.Nodes, func(address common.Address) bool {
				return !slices.Contains(validNodes, address)
			})

			if len(stream.Nodes) == 0 {
				log.Warnw("Ignore stream, no valid node found", "stream", stream.StreamId)
				return true
			}

			streamsLoaded++

			// start stream sync session for stream if it hasn't seen before
			_, loaded := tracker.tracked.LoadOrStore(stream.StreamId, struct{}{})
			if !loaded {
				// TODO: this is not correct, nodes should be saved and use to track working peer
				sticky := nodes.NewStreamNodesWithLock(stream.Nodes, common.Address{}).GetStickyPeer()

				// worker pool is a semaphore that prevents making too many concurrent requests
				// at the same time to a node and overwhelming it.
				workerPool, found := tracker.workerPool[sticky]
				if !found {
					workerPool = semaphore.NewWeighted(maxConcurrentNodeRequests)
					tracker.workerPool[sticky] = workerPool
				}

				// start tracking the stream until ctx expires
				go func() {
					st := StreamTrackerConnectGo{}
					idx := rand.Int63n(int64(len(tracker.nodeRegistries)))
					st.Run(ctx, stream, false, tracker.nodeRegistries[idx], workerPool, tracker.onChainConfig,
						tracker.listener, tracker.storage, tracker.metrics,
					)
				}()
			}

			return true
		})
	if err != nil {
		return err
	}

	log.Infow("Loaded streams from streams registry",
		"count", streamsLoaded,
		"total", totalStreams,
		"took", time.Since(start).String())

	// wait till service stopped
	<-ctx.Done()

	log.Infow("stream tracker stopped")

	return nil
}

// TrackStreamForNotifications returns true if the given streamID must be tracked for notifications.
func (tracker *StreamsTracker) TrackStreamForNotifications(streamID shared.StreamId) bool {
	streamType := streamID.Type()

	return streamType == shared.STREAM_DM_CHANNEL_BIN ||
		streamType == shared.STREAM_GDM_CHANNEL_BIN ||
		streamType == shared.STREAM_CHANNEL_BIN ||
		streamType == shared.STREAM_USER_SETTINGS_BIN // users add addresses of blocked users into their settings stream
}

// OnStreamAllocated is called each time a stream is allocated in the river registry.
// If the stream must be tracked for notifications add it to the worker that is responsible for it.
func (tracker *StreamsTracker) OnStreamAllocated(
	ctx context.Context,
	event *river.StreamRegistryV1StreamAllocated,
) {
	streamID := shared.StreamId(event.StreamId)
	if !tracker.TrackStreamForNotifications(streamID) {
		return
	}

	_, loaded := tracker.tracked.LoadOrStore(streamID, struct{}{})
	if !loaded {
		// TODO: this is not correct, nodes should be saved and use to track working peer
		sticky := nodes.NewStreamNodesWithLock(event.Nodes, common.Address{}).GetStickyPeer()
		workerPool, found := tracker.workerPool[sticky]
		if !found {
			workerPool = semaphore.NewWeighted(maxConcurrentNodeRequests)
			tracker.workerPool[sticky] = workerPool
		}

		go func() {
			st := StreamTrackerConnectGo{}
			stream := &registries.GetStreamResult{
				StreamId: streamID,
				Nodes:    event.Nodes,
			}

			idx := rand.Int63n(int64(len(tracker.nodeRegistries)))
			st.Run(ctx, stream, true, tracker.nodeRegistries[idx], workerPool,
				tracker.onChainConfig, tracker.listener, tracker.storage, tracker.metrics)
		}()
	}
}

func (tracker *StreamsTracker) OnStreamLastMiniblockUpdated(
	context.Context,
	*river.StreamRegistryV1StreamLastMiniblockUpdated,
) {
	// miniblocks are processed when a stream event with a block header is received for the stream
}

func (tracker *StreamsTracker) OnStreamPlacementUpdated(
	context.Context,
	*river.StreamRegistryV1StreamPlacementUpdated,
) {
	// reserved when replacements are introduced
	// 1. stop existing sync operation
	// 2. restart it against the new node
}
