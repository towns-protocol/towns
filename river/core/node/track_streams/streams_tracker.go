package track_streams

import (
	"context"
	"math/rand"
	"slices"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/shared"
)

// The StreamFilter is used by the StreamTrackerImpl, which is a cross-application, shared implementation
// of stream tracking used by both the notification service and the app registry service. Each application
// must provide the logic for determining which streams to track, and for constructing application-specific
// tracked stream views.
type StreamFilter interface {
	TrackStream(streamID shared.StreamId) bool

	NewTrackedStream(
		ctx context.Context,
		streamID shared.StreamId,
		cfg crypto.OnChainConfiguration,
		stream *protocol.StreamAndCookie,
	) (events.TrackedStreamView, error)
}

type StreamsTracker interface {
	Run(ctx context.Context) error
}

// The StreamsTrackerImpl implements watching the river registry, detecting new streams, and syncing them.
// It defers to the filter to determine whether a stream should be tracked and to create new tracked stream
// views, which are application-specific. The filter implementation struct embeds this tracker implementation
// and provides these methods for encapsulation.
type StreamsTrackerImpl struct {
	filter         StreamFilter
	nodeRegistries []nodes.NodeRegistry
	riverRegistry  *registries.RiverRegistryContract
	onChainConfig  crypto.OnChainConfiguration
	listener       StreamEventListener
	metrics        *TrackStreamsSyncMetrics
	tracked        sync.Map // map[shared.StreamId] = struct{}
	syncRunner     *SyncRunner
}

// Init can be used by a struct embedding the StreamsTrackerImpl to initialize it.
func (tracker *StreamsTrackerImpl) Init(
	ctx context.Context,
	onChainConfig crypto.OnChainConfiguration,
	riverRegistry *registries.RiverRegistryContract,
	nodeRegistries []nodes.NodeRegistry,
	listener StreamEventListener,
	filter StreamFilter,
	metricsFactory infra.MetricsFactory,
) error {
	tracker.metrics = NewTrackStreamsSyncMetrics(metricsFactory)
	tracker.riverRegistry = riverRegistry
	tracker.onChainConfig = onChainConfig
	tracker.nodeRegistries = nodeRegistries
	tracker.listener = listener
	tracker.filter = filter
	tracker.syncRunner = NewSyncRunner()

	// Subscribe to stream events in river registry
	if err := tracker.riverRegistry.OnStreamEvent(
		ctx,
		tracker.riverRegistry.Blockchain.InitialBlockNum,
		tracker.OnStreamAllocated,
		tracker.OnStreamLastMiniblockUpdated,
		tracker.OnStreamPlacementUpdated,
	); err != nil {
		return err
	}

	return nil
}

func (tracker *StreamsTrackerImpl) Listener() StreamEventListener {
	return tracker.listener
}

// Run the stream tracker workers until the given ctx expires.
func (tracker *StreamsTrackerImpl) Run(ctx context.Context) error {
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
			// Print progress report every 50k streams that are added to track
			if streamsLoaded > 0 && streamsLoaded%50_000 == 0 && streamsLoadedProgress != streamsLoaded {
				log.Infow("Progress stream loading", "tracked", streamsLoaded, "total", totalStreams)
				streamsLoadedProgress = streamsLoaded
			}

			totalStreams++

			if !tracker.filter.TrackStream(stream.StreamId) {
				return true
			}

			// There are some streams managed by a node that isn't registered anymore.
			// Filter these out because we can't sync these streams.
			stream.Nodes = slices.DeleteFunc(stream.Nodes, func(address common.Address) bool {
				return !slices.Contains(validNodes, address)
			})

			if len(stream.Nodes) == 0 {
				// We know that we have a set of these on the network because some nodes were accidentally deployed
				// with the wrong addresses early in the network's history. We've deemed these streams not worthy
				// of repairing and generally ignore them.
				log.Debugw("Ignore stream, no valid node found", "stream", stream.StreamId)
				return true
			}

			streamsLoaded++

			// start stream sync session for stream if it hasn't seen before
			_, loaded := tracker.tracked.LoadOrStore(stream.StreamId, struct{}{})
			if !loaded {
				// start tracking the stream until ctx expires
				go func() {
					idx := rand.Int63n(int64(len(tracker.nodeRegistries)))
					tracker.syncRunner.Run(
						ctx,
						stream,
						false,
						tracker.nodeRegistries[idx],
						tracker.onChainConfig,
						tracker.filter.NewTrackedStream,
						tracker.metrics,
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

// OnStreamAllocated is called each time a stream is allocated in the river registry.
// If the stream must be tracked for the service, then add it to the worker that is
// responsible for it.
func (tracker *StreamsTrackerImpl) OnStreamAllocated(
	ctx context.Context,
	event *river.StreamRegistryV1StreamAllocated,
) {
	streamID := shared.StreamId(event.StreamId)
	if !tracker.filter.TrackStream(streamID) {
		return
	}

	_, loaded := tracker.tracked.LoadOrStore(streamID, struct{}{})
	if !loaded {
		go func() {
			stream := &registries.GetStreamResult{
				StreamId: streamID,
				Nodes:    event.Nodes,
			}

			idx := rand.Int63n(int64(len(tracker.nodeRegistries)))
			tracker.syncRunner.Run(
				ctx,
				stream,
				true,
				tracker.nodeRegistries[idx],
				tracker.onChainConfig,
				tracker.filter.NewTrackedStream,
				tracker.metrics,
			)
		}()
	}
}

func (tracker *StreamsTrackerImpl) OnStreamLastMiniblockUpdated(
	context.Context,
	*river.StreamRegistryV1StreamLastMiniblockUpdated,
) {
	// miniblocks are processed when a stream event with a block header is received for the stream
}

func (tracker *StreamsTrackerImpl) OnStreamPlacementUpdated(
	context.Context,
	*river.StreamRegistryV1StreamPlacementUpdated,
) {
	// reserved when replacements are introduced
	// 1. stop existing sync operation
	// 2. restart it against the new node
}
