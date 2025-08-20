package sync

import (
	"context"
	"time"

	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
)

type MonitorTrackedStreamView struct {
	events.TrackedStreamViewImpl

	monitored *MonitoredStream
	monitor   *StreamSyncMonitor
}

func NewMonitorTrackedStreamView(
	ctx context.Context,
	monitored *MonitoredStream,
	monitor *StreamSyncMonitor,
	streamAndCookie *protocol.StreamAndCookie,
) (events.TrackedStreamView, error) {
	view := &MonitorTrackedStreamView{
		monitored: monitored,
		monitor:   monitor,
	}

	// Initialize the embedded TrackedStreamViewImpl
	_, err := view.TrackedStreamViewImpl.Init(
		ctx,
		monitored.streamID,
		monitor.onChainConfig,
		streamAndCookie,
		view.onNewEvent,
	)
	if err != nil {
		return nil, err
	}

	return view, nil
}

// onNewEvent is called when a new event is processed
func (v *MonitorTrackedStreamView) onNewEvent(
	ctx context.Context,
	streamView *events.StreamView,
	event *events.ParsedEvent,
) error {
	// We don't need to process individual events for lag monitoring
	return nil
}

// Override ApplyBlock to track miniblock numbers
func (v *MonitorTrackedStreamView) ApplyBlock(miniblock *protocol.Miniblock, snapshot *protocol.Envelope) error {
	// First apply the block using the parent implementation
	err := v.TrackedStreamViewImpl.ApplyBlock(miniblock, snapshot)
	if err != nil {
		return err
	}

	// Parse the miniblock header to get the number
	if miniblock.Header != nil {
		parsedHeader, err := events.ParseEvent(miniblock.Header)
		if err == nil && parsedHeader.Event.GetMiniblockHeader() != nil {
			miniblockHeader := parsedHeader.Event.GetMiniblockHeader()
			// Update sync miniblock number
			v.monitored.mu.Lock()
			v.monitored.syncMiniblockNum = uint64(miniblockHeader.MiniblockNum)
			v.monitored.lastLagCheck = time.Now()

			// Check lag while we have the lock
			lag := int64(v.monitored.onChainMiniblockNum) - int64(v.monitored.syncMiniblockNum)
			v.monitored.mu.Unlock()

			// Log sync progress periodically
			if miniblockHeader.MiniblockNum%100 == 0 {
				logging.FromCtx(v.monitor.ctx).Debugw("Stream sync progress",
					"streamId", v.monitored.streamID,
					"nodeAddresses", v.monitored.nodeAddresses,
					"syncMiniblockNum", miniblockHeader.MiniblockNum,
					"onChainMiniblockNum", v.monitored.onChainMiniblockNum,
					"lag", lag,
				)
			}

			// Check if we're lagging (only if we have placement info and grace period has passed)
			if v.monitored.lastPlacement != nil && lag > int64(v.monitor.config.LagThreshold) {
				timeSincePlacement := time.Since(v.monitored.lastPlacement.PlacedAt)
				if timeSincePlacement >= LagDetectionGracePeriod {
					logging.FromCtx(v.monitor.ctx).Warnw("Stream sync lag detected during sync",
						"streamId", v.monitored.streamID,
						"nodeAddress", v.monitored.lastPlacement.NodeAddress,
						"syncId", v.monitored.lastPlacement.SyncId,
						"syncMiniblockNum", miniblockHeader.MiniblockNum,
						"onChainMiniblockNum", v.monitored.onChainMiniblockNum,
						"lag", lag,
						"threshold", v.monitor.config.LagThreshold,
						"timeSincePlacement", timeSincePlacement,
					)

					// Capture stack trace
					v.monitor.captureStackTrace(v.monitored, lag)
				}
			}
		}
	}

	return nil
}
