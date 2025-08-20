package sync

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"sync"
	"time"

	mapset "github.com/deckarep/golang-set/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
	"go.opentelemetry.io/otel/trace"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/http_client"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/nodes"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/registries"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

const (
	// LagDetectionGracePeriod is the minimum time to wait after stream placement before detecting lag.
	// We offer a grace period here to make sure we're not accidentally detecting stalled syncs when
	// in fact the sync runner just needs to catch up to the current stream state. We would expect the
	// process events to be behind whenever a sync is first established or when a sync is relocated if
	// there is a gap between syncs.
	LagDetectionGracePeriod = 30 * time.Second
)

type StreamSyncMonitor struct {
	track_streams.StreamsTrackerImpl

	ctx            context.Context
	config         *config.StreamSyncMonitorConfig
	trackedStreams *xsync.Map[shared.StreamId, *MonitoredStream]
	httpClient     *http.Client
	nodeUrls       map[common.Address]string // node address -> URL mapping
	metricsFactory infra.MetricsFactory
	onChainConfig  crypto.OnChainConfiguration
	riverRegistry  *registries.RiverRegistryContract
}

// StreamPlacementInfo contains information about where and when a stream was last placed
type StreamPlacementInfo struct {
	NodeAddress       common.Address // Node where the stream was placed
	SyncId            string         // Sync session ID
	MinipoolGen       int64          // Minipool generation at time of placement
	PrevMiniblockHash []byte         // Previous miniblock hash at time of placement
	PlacedAt          time.Time      // When this placement occurred
}

type MonitoredStream struct {
	streamID            shared.StreamId
	nodeAddresses       []common.Address // All monitored nodes hosting this stream
	onChainMiniblockNum uint64
	syncMiniblockNum    uint64
	lastLagCheck        time.Time
	lastPlacement       *StreamPlacementInfo // Information about the last sync placement
	mu                  sync.RWMutex
}

func NewStreamSyncMonitor(
	ctx context.Context,
	cfg *config.Config,
	riverRegistry *registries.RiverRegistryContract,
	onChainConfig crypto.OnChainConfiguration,
	nodeRegistries []nodes.NodeRegistry,
	metricsFactory infra.MetricsFactory,
	otelTracer trace.Tracer,
) (*StreamSyncMonitor, error) {
	httpClient, err := http_client.GetHttpClient(ctx, cfg)
	if err != nil {
		return nil, err
	}

	// Create stack trace output directory if it doesn't exist
	if cfg.StreamSyncMonitor.StackTraceOutputDir != "" {
		err = os.MkdirAll(cfg.StreamSyncMonitor.StackTraceOutputDir, 0755)
		if err != nil {
			return nil, fmt.Errorf("failed to create stack trace output directory: %w", err)
		}
	}

	monitor := &StreamSyncMonitor{
		ctx:            ctx,
		config:         &cfg.StreamSyncMonitor,
		trackedStreams: xsync.NewMap[shared.StreamId, *MonitoredStream](),
		httpClient:     httpClient,
		nodeUrls:       make(map[common.Address]string),
		metricsFactory: metricsFactory,
		onChainConfig:  onChainConfig,
		riverRegistry:  riverRegistry,
	}

	// Initialize the embedded StreamsTrackerImpl
	err = monitor.StreamsTrackerImpl.Init(
		ctx,
		onChainConfig,
		riverRegistry,
		nodeRegistries,
		monitor, // StreamEventListener
		monitor, // StreamFilter
		metricsFactory,
		cfg.StreamSyncMonitor.StreamTracking,
		otelTracer,
		monitor, // StreamPlacementListener
	)
	if err != nil {
		return nil, err
	}

	// Build node URL mapping
	blockNum, err := riverRegistry.Blockchain.GetBlockNumber(ctx)
	if err != nil {
		return nil, err
	}

	allNodes, err := riverRegistry.GetAllNodes(ctx, blockNum)
	if err != nil {
		return nil, err
	}

	for _, node := range allNodes {
		monitor.nodeUrls[node.NodeAddress] = node.Url
	}

	return monitor, nil
}

// Implement StreamFilter interface
func (m *StreamSyncMonitor) NewTrackedStream(
	ctx context.Context,
	streamID shared.StreamId,
	cfg crypto.OnChainConfiguration,
	stream *protocol.StreamAndCookie,
) (events.TrackedStreamView, error) {
	monitored, ok := m.trackedStreams.Load(streamID)
	if !ok {
		// Stream not in our monitored list, skip it
		return nil, base.RiverError(protocol.Err_NOT_FOUND, "stream not on monitored nodes")
	}

	return NewMonitorTrackedStreamView(
		ctx,
		monitored,
		m,
		stream,
	)
}

// TrackStream determines if a stream should be tracked and filters nodes to only monitored ones
func (m *StreamSyncMonitor) TrackStream(stream *river.StreamWithId, isInit bool) (bool, *river.StreamWithId) {
	// Filter nodes to only include monitored ones
	var filteredNodes []common.Address
	for _, node := range stream.Nodes() {
		if slices.Contains(m.config.MonitoredNodeAddresses, node) {
			filteredNodes = append(filteredNodes, node)
		}
	}

	// Don't track if no monitored nodes host this stream
	if len(filteredNodes) == 0 {
		return false, nil
	}

	// Adjust Reserved0 to set the new replication factor (stored in the lowest byte)
	adjustedReserved0 := (stream.Stream.Reserved0 &^ 0xFF) | uint64(len(filteredNodes))

	// Create a copy with filtered nodes
	filteredStream := &river.StreamWithId{
		Id: stream.Id,
		Stream: river.Stream{
			LastMiniblockHash: stream.Stream.LastMiniblockHash,
			LastMiniblockNum:  stream.Stream.LastMiniblockNum,
			Reserved0:         adjustedReserved0, // Adjusted replication factor
			Flags:             stream.Stream.Flags,
			Nodes:             filteredNodes, // Only monitored nodes
		},
	}

	// Store in our tracked streams for monitoring
	monitored := &MonitoredStream{
		streamID:            filteredStream.StreamId(),
		nodeAddresses:       filteredNodes,
		onChainMiniblockNum: stream.Stream.LastMiniblockNum,
		syncMiniblockNum:    0,
		lastLagCheck:        time.Now(),
	}
	m.trackedStreams.Store(filteredStream.StreamId(), monitored)

	return true, filteredStream
}

// Implement StreamEventListener interface
func (m *StreamSyncMonitor) OnMessageEvent(
	ctx context.Context,
	streamID shared.StreamId,
	parentStreamID *shared.StreamId,
	members mapset.Set[string],
	event *events.ParsedEvent,
) {
	// We don't need to process individual messages for monitoring
}

// OnStreamMiniblockUpdate is called when a miniblock is updated on-chain
func (m *StreamSyncMonitor) OnStreamMiniblockUpdate(
	ctx context.Context,
	event *river.StreamMiniblockUpdate,
) {
	streamId := shared.StreamId(event.StreamId)
	monitored, ok := m.trackedStreams.Load(streamId)
	if !ok {
		return
	}

	monitored.mu.Lock()
	monitored.onChainMiniblockNum = event.LastMiniblockNum
	lag := int64(monitored.onChainMiniblockNum) - int64(monitored.syncMiniblockNum)

	monitored.mu.Unlock()

	log := logging.FromCtx(ctx)
	if monitored.lastPlacement != nil {
		onChainMiniblockNum := monitored.onChainMiniblockNum
		syncMiniblockNum := monitored.syncMiniblockNum
		log.Debugw(
			"OnStreamMiniblockUpdate",
			"monitored.streamID",
			monitored.streamID,
			"lastPlacement",
			monitored.lastPlacement,
			"lastLagCheck",
			monitored.lastLagCheck,
			"miniblockLag",
			lag,
			"syncMBNum",
			syncMiniblockNum,
			"onChainMbNum",
			onChainMiniblockNum,
		)
	}

	// Only consider lag if we have placement info and lag exceeds threshold
	if monitored.lastPlacement != nil && lag >= int64(m.config.LagThreshold) {
		timeSincePlacement := time.Since(monitored.lastPlacement.PlacedAt)
		if timeSincePlacement >= LagDetectionGracePeriod {
			log.Warnw("Stream sync lag detected",
				"streamId", monitored.streamID,
				"nodeAddress", monitored.lastPlacement.NodeAddress,
				"syncId", monitored.lastPlacement.SyncId,
				"onChainMiniblockNum", monitored.onChainMiniblockNum,
				"syncMiniblockNum", monitored.syncMiniblockNum,
				"lag", lag,
				"threshold", m.config.LagThreshold,
				"timeSincePlacement", timeSincePlacement,
			)

			// Capture stack trace
			m.captureStackTrace(monitored, lag)
		} else {
			log.Debugw("Stream lag detected but within grace period",
				"streamId", monitored.streamID,
				"lag", lag,
				"timeSincePlacement", timeSincePlacement,
				"gracePeriod", LagDetectionGracePeriod,
			)
		}
	}
}

func (m *StreamSyncMonitor) captureStackTrace(monitored *MonitoredStream, lag int64) {
	if monitored.lastPlacement == nil {
		return
	}

	nodeUrl, ok := m.nodeUrls[monitored.lastPlacement.NodeAddress]
	if !ok {
		logging.FromCtx(m.ctx).Errorw("No URL found for node", "nodeAddress", monitored.lastPlacement.NodeAddress)
		return
	}

	url := fmt.Sprintf("%s/debug/stacks2", nodeUrl)
	req, err := http.NewRequestWithContext(m.ctx, "GET", url, nil)
	if err != nil {
		logging.FromCtx(m.ctx).Errorw("Failed to create stack trace request",
			"error", err,
			"nodeAddress", monitored.lastPlacement.NodeAddress,
			"url", url,
		)
		return
	}

	resp, err := m.httpClient.Do(req)
	if err != nil {
		logging.FromCtx(m.ctx).Errorw("Failed to get stack trace",
			"error", err,
			"nodeAddress", monitored.lastPlacement.NodeAddress,
			"url", url,
		)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		logging.FromCtx(m.ctx).Errorw("Failed to get stack trace, non-200 status",
			"statusCode", resp.StatusCode,
			"nodeAddress", monitored.lastPlacement.NodeAddress,
			"url", url,
		)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		logging.FromCtx(m.ctx).Errorw("Failed to read stack trace response",
			"error", err,
			"nodeAddress", monitored.lastPlacement.NodeAddress,
		)
		return
	}

	// Save stack trace to file
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("stack_%s_%s_%s_%s_lag%d.txt",
		timestamp,
		monitored.streamID.String(),
		monitored.lastPlacement.NodeAddress.Hex(),
		monitored.lastPlacement.SyncId,
		lag,
	)
	filepath := filepath.Join(m.config.StackTraceOutputDir, filename)

	// Include placement info in the file content
	stackInfo := fmt.Sprintf("Stream Sync Lag Stack Trace\n"+
		"===========================\n"+
		"Timestamp: %s\n"+
		"Stream ID: %s\n"+
		"Node Address: %s\n"+
		"Sync ID: %s\n"+
		"Lag: %d miniblocks\n"+
		"Minipool Gen: %d\n"+
		"Prev Miniblock Hash: %x\n"+
		"Time Since Placement: %s\n"+
		"\nStack Trace:\n"+
		"============\n\n%s",
		time.Now().Format(time.RFC3339),
		monitored.streamID,
		monitored.lastPlacement.NodeAddress.Hex(),
		monitored.lastPlacement.SyncId,
		lag,
		monitored.lastPlacement.MinipoolGen,
		monitored.lastPlacement.PrevMiniblockHash,
		time.Since(monitored.lastPlacement.PlacedAt),
		string(body),
	)

	err = os.WriteFile(filepath, []byte(stackInfo), 0644)
	if err != nil {
		logging.FromCtx(m.ctx).Errorw("Failed to write stack trace to file",
			"error", err,
			"filepath", filepath,
		)
		return
	}

	logging.FromCtx(m.ctx).Infow("Stack trace captured",
		"filepath", filepath,
		"streamId", monitored.streamID,
		"nodeAddress", monitored.lastPlacement.NodeAddress,
		"syncId", monitored.lastPlacement.SyncId,
		"lag", lag,
	)
}

func (m *StreamSyncMonitor) Run(ctx context.Context) error {
	// Subscribe to miniblock updates separately for lag detection
	// This is necessary because the embedded StreamsTrackerImpl's callbacks
	// are bound at Init time and don't call our overridden methods
	err := m.riverRegistry.OnStreamEvent(
		ctx,
		m.riverRegistry.Blockchain.InitialBlockNum,
		func(ctx context.Context, event *river.StreamState) {
			// Ignore allocation events - we only care about miniblock updates
		},
		func(ctx context.Context, event *river.StreamState) {
			// Ignore add events - we only care about miniblock updates
		},
		func(ctx context.Context, event *river.StreamMiniblockUpdate) {
			// Handle miniblock updates for lag detection
			m.OnStreamMiniblockUpdate(ctx, event)
		},
		func(ctx context.Context, event *river.StreamState) {
			// Ignore placement events - we only care about miniblock updates
		},
	)
	if err != nil {
		return err
	}

	// Start periodic status reporting
	go m.reportStatus(ctx)

	// Run the stream tracker
	return m.StreamsTrackerImpl.Run(ctx)
}

// reportStatus periodically logs the number of tracked streams and other status information
func (m *StreamSyncMonitor) reportStatus(ctx context.Context) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Count tracked streams
			trackedCount := 0
			laggingCount := 0

			m.trackedStreams.Range(func(streamId shared.StreamId, monitored *MonitoredStream) bool {
				trackedCount++

				monitored.mu.RLock()
				lag := int64(monitored.onChainMiniblockNum) - int64(monitored.syncMiniblockNum)
				hasPlacement := monitored.lastPlacement != nil
				monitored.mu.RUnlock()

				if hasPlacement && lag >= int64(m.config.LagThreshold) {
					laggingCount++
				}

				return true
			})

			log := logging.FromCtx(ctx)

			// Get metrics as structured map for better JSON logging
			syncQueueLength := float64(-1)
			metricsMap, err := m.metricsFactory.GetMetricsAsMap()
			if err != nil {
				log.Errorw("Failed to get metrics as map", "error", err)
			} else {
				syncQueueLength = (metricsMap["metrics"].(map[string]interface{})["river_sync_monitor_unsynced_queue_length"]).(float64)
			}

			log.Infow("Stream sync monitor status",
				"trackedStreams", trackedCount,
				"laggingStreams", laggingCount,
				"monitoredNodes", m.config.MonitoredNodeAddresses,
				"lagThreshold", m.config.LagThreshold,
				"syncQueueLength", syncQueueLength,
			)

		case <-ctx.Done():
			return
		}
	}
}

// Config returns the monitor configuration
func (m *StreamSyncMonitor) Config() *config.StreamSyncMonitorConfig {
	return m.config
}

// OnStreamPlacement implements StreamPlacementListener interface
func (m *StreamSyncMonitor) OnStreamPlacement(
	streamId shared.StreamId,
	syncId string,
	nodeAddress common.Address,
	minipoolGen int64,
	prevMiniblockHash []byte,
) {
	monitored, ok := m.trackedStreams.Load(streamId)
	if !ok {
		// We should never get placement events for a stream we're not monitoring.
		logging.FromCtx(m.ctx).
			Errorw("Received OnStreamPlacement for unmonitored stream - this should not be possible", "streamId", streamId)
		return
	}

	monitored.mu.Lock()
	// prevPlacement := monitored.lastPlacement
	monitored.lastPlacement = &StreamPlacementInfo{
		NodeAddress:       nodeAddress,
		SyncId:            syncId,
		MinipoolGen:       minipoolGen,
		PrevMiniblockHash: prevMiniblockHash,
		PlacedAt:          time.Now(),
	}
	monitored.mu.Unlock()

	// logging.FromCtx(m.ctx).Debugw("Stream placement updated",
	// 	"streamId", streamId,
	// 	"newPlacement", monitored.lastPlacement,
	// 	"prevPlacement", prevPlacement,
	// )
}
