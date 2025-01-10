package sync

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"math/rand"
	"strconv"
	"sync/atomic"
	"time"

	"connectrpc.com/connect"
	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"
	"golang.org/x/sync/semaphore"

	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/events"
	"github.com/river-build/river/core/node/nodes"
	"github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/registries"
	"github.com/river-build/river/core/node/shared"
)

type StreamTrackerConnectGo struct{}

func channelLabelType(streamID shared.StreamId) string {
	switch streamID.Type() {
	case shared.STREAM_DM_CHANNEL_BIN:
		return "dm"
	case shared.STREAM_GDM_CHANNEL_BIN:
		return "gdm"
	case shared.STREAM_CHANNEL_BIN:
		return "space_channel"
	case shared.STREAM_USER_SETTINGS_BIN:
		return "user_settings"
	default:
		return "unknown"
	}
}

func (s *StreamTrackerConnectGo) Run(
	rootCtx context.Context,
	stream *registries.GetStreamResult,
	nodeRegistry nodes.NodeRegistry,
	workerPool *semaphore.Weighted,
	onChainConfig crypto.OnChainConfiguration,
	listener events.StreamEventListener,
	userPreferences events.UserPreferencesStore,
	metrics *streamsTrackerWorkerMetrics,
) {
	var (
		promLabels                = prometheus.Labels{"type": channelLabelType(stream.StreamId)}
		remotes                   = nodes.NewStreamNodesWithLock(stream.Nodes, common.Address{})
		restartSyncSessionCounter = 0
	)

	metrics.TotalStreams.With(promLabels).Inc()

	for {
		var (
			sticky              = remotes.GetStickyPeer()
			log                 = dlog.FromCtx(rootCtx).With("stream", stream.StreamId, "remote", sticky)
			syncCtx, syncCancel = context.WithCancel(rootCtx)
			lastReceivedPong    atomic.Int64
			syncID              string
			trackedStream       *events.TrackedNotificationStreamView
		)

		var (
			client     protocolconnect.StreamServiceClient
			remoteAddr common.Address
			err        error
		)

		// loop over the nodes responsible for the stream and try to connect to one of them
		remotesNodes, _ := remotes.GetRemotesAndIsLocal()
		for range remotesNodes {
			remoteAddr = remotes.GetStickyPeer()
			client, err = nodeRegistry.GetStreamServiceClientForAddress(remoteAddr)
			if client != nil {
				break
			}
			remotes.AdvanceStickyPeer(remoteAddr)
		}

		// backoff, remote service client could not be created
		if client == nil {
			syncCancel()
			log.Error("unable to obtain stream service client", "err", err)
			if s.waitMaxOrUntilCancel(rootCtx, time.Minute, 2*time.Minute) {
				return
			}
			continue
		}

		// workers are started in parallel, prevent starting too many at the same time
		// to ensure that remotes are not overflown with SyncStream requests.
		metrics.SyncSessionInFlight.Inc()
		if err := workerPool.Acquire(syncCtx, 1); err != nil {
			metrics.SyncSessionInFlight.Dec()
			syncCancel()
			if !errors.Is(err, context.Canceled) {
				log.Error("unable to acquire worker pool task", "err", err)
			}
			if s.waitMaxOrUntilCancel(rootCtx, 10*time.Second, 30*time.Second) {
				return
			}
			continue
		}

		restartSyncSessionCounter++

		if restartSyncSessionCounter > 1 {
			log.Debug("restart sync session", "times", restartSyncSessionCounter)
		}

		syncPos := []*protocol.SyncCookie{{
			NodeAddress:       sticky[:],
			StreamId:          stream.StreamId[:],
			MinipoolGen:       math.MaxInt64, // force sync reset
			MinipoolSlot:      0,
			PrevMiniblockHash: common.Hash{}.Bytes(),
		}}

		log.Debug("Start sync stream session")

		streamUpdates, err := client.SyncStreams(syncCtx, connect.NewRequest(&protocol.SyncStreamsRequest{
			SyncPos: syncPos,
		}))
		workerPool.Release(1)
		metrics.SyncSessionInFlight.Dec()

		if err != nil {
			remotes.AdvanceStickyPeer(remoteAddr)
			syncCancel()
			if !errors.Is(err, context.Canceled) {
				log.Debug("unable to start stream sync session", "err", err)
			}
			if s.waitMaxOrUntilCancel(rootCtx, time.Minute, 2*time.Minute) {
				return
			}
			continue
		}

		// ensure that the first message is received within 30 seconds.
		// if not cancel the sync session and restart a new one.
		syncIDCtx, syncIDGot := context.WithTimeout(syncCtx, time.Minute)
		go func(log *slog.Logger) {
			select {
			case <-time.After(30 * time.Second):
				log.Debug("Didn't receive sync id within 30s, cancel sync session")
				syncCancel() // cancel sync session
				syncIDGot()
				return
			case <-syncIDCtx.Done(): // cancelled when syncID is received within 30s
				return
			case <-rootCtx.Done():
				return
			}
		}(log)

		if streamUpdates.Receive() {
			firstMsg := streamUpdates.Msg()
			if firstMsg.GetSyncOp() != protocol.SyncOp_SYNC_NEW {
				syncCancel()
				if !errors.Is(err, context.Canceled) {
					log.Error("Stream sync session didn't start with SyncOp_SYNC_NEW")
				}
				if s.waitMaxOrUntilCancel(rootCtx, 10*time.Second, 30*time.Second) {
					return
				}
				continue
			}
			syncID = firstMsg.GetSyncId()
		}

		if err := streamUpdates.Err(); err != nil {
			if !errors.Is(err, context.Canceled) {
				// if remote node is down this gets fired
				log.Debug("Unable to receive first sync message", "err", err)
			}
			syncCancel()
			remotes.AdvanceStickyPeer(remoteAddr)
			if s.waitMaxOrUntilCancel(rootCtx, time.Minute, 2*time.Minute) {
				return
			}
			continue
		}

		if syncID == "" {
			syncCancel()
			remotes.AdvanceStickyPeer(remoteAddr)
			log.Error("Received empty syncID")
			if s.waitMaxOrUntilCancel(rootCtx, time.Minute, 2*time.Minute) {
				return
			}
			continue
		}

		// indicate that the sync ID was received
		syncIDGot()

		log = log.With("syncID", syncID)

		metrics.ActiveStreamSyncSessions.Inc()

		// sync session started, start liveness loop that periodically checks the
		// status of the sync session with ping/pong. If no pong is received this
		// will cancel the sync session and a new one will be started after.
		// gotSyncResetUpdate is set to true when the expected sync reset is received.
		// If it isn't received within reasonable time the liveness loop will
		// cancel the sync session causing a new session to be started.
		var gotSyncResetUpdate atomic.Bool
		// TODO: determine if this can be dropped now http2 pings are enabled
		// go s.liveness(log, syncCtx, syncCancel, &gotSyncResetUpdate,
		//	workerPool, stream.StreamId, syncID, client, &lastReceivedPong, metrics)

		for streamUpdates.Receive() {
			update := streamUpdates.Msg()
			switch update.GetSyncOp() {
			case protocol.SyncOp_SYNC_UPDATE:
				var (
					reset  = update.GetStream().GetSyncReset()
					labels = prometheus.Labels{"reset": fmt.Sprintf("%v", reset)}
				)

				if reset {
					gotSyncResetUpdate.Store(true)
					log.Debug("Received sync reset update")
				}

				metrics.SyncUpdate.With(labels).Inc()

				streamID, err := shared.StreamIdFromBytes(update.GetStream().GetNextSyncCookie().GetStreamId())
				if err != nil {
					log.Error("Received corrupt update, invalid stream ID")
					syncCancel()
					continue
				}

				if streamID != stream.StreamId {
					log.Error("Received update for unexpected stream", "want", stream.StreamId, "got", streamID)
					syncCancel()
					continue
				}

				if reset {
					trackedStream, err = events.NewNotificationsStreamTrackerFromStreamAndCookie(
						syncCtx, streamID, onChainConfig, update.GetStream(), listener, userPreferences)
					if err != nil {
						syncCancel()
						log.Error("Unable to instantiate tracked stream", "err", err)
						continue
					}

					metrics.TrackedStreams.With(promLabels).Inc()

					continue
				}

				// first received update must be a sync reset that instantiates the trackedStream
				if trackedStream == nil {
					syncCancel()
					log.Error("Received unexpected non sync-reset update")
					continue
				}

				for _, block := range update.GetStream().GetMiniblocks() {
					if err := trackedStream.ApplyBlock(block, onChainConfig.Get()); err != nil {
						log.Error("Unable to apply block", "stream", streamID, "err", err)
					}
				}

				for _, event := range update.GetStream().GetEvents() {
					if err := trackedStream.ApplyEvent(syncCtx, event); err != nil {
						log.Error("Unable to apply event", "stream", streamID, "err", err)
					}
				}

			case protocol.SyncOp_SYNC_DOWN:
				log.Debug("Stream reported as down")
				metrics.SyncDown.Inc()
				syncCancel()
			case protocol.SyncOp_SYNC_CLOSE:
				log.Debug("Got stream close")
				syncCancel()
			case protocol.SyncOp_SYNC_UNSPECIFIED:
				log.Warn("Got stream unspecified")
				syncCancel()
			case protocol.SyncOp_SYNC_NEW:
				log.Warn("Got stream new")
				syncCancel()
			case protocol.SyncOp_SYNC_PONG:
				// lastReceivedPong is used in the liveness check to check that pong reply is received
				metrics.SyncPong.Inc()
				receivedPong, err := strconv.ParseInt(update.GetPongNonce(), 0, 64)
				if err == nil {
					lastPong := lastReceivedPong.Load()
					if receivedPong > lastPong {
						lastReceivedPong.Store(receivedPong)
					}
				}
			}
		}

		metrics.ActiveStreamSyncSessions.Dec()

		if trackedStream != nil {
			metrics.TrackedStreams.With(promLabels).Dec()
			trackedStream = nil
		}

		if err := streamUpdates.Err(); err != nil {
			select {
			case <-rootCtx.Done(): // if parent ctx is cancelled -> service shutdown is initiated
				syncCancel()
				return
			default:
				if !errors.Is(err, context.Canceled) {
					log.Debug("Stream sync session ended unexpected", "err", err)
				}
			}
		}

		syncCancel()
		remotes.AdvanceStickyPeer(remoteAddr)

		if s.waitMaxOrUntilCancel(rootCtx, 10*time.Second, 30*time.Second) {
			return
		}
	}
}

// liveness periodically checks the status of a stream sync session to determine if it's still active.
// if not it cancels the session which forces a restart.
//
//nolint:unused
//lint:ignore U1000 temporary disabled - pings are commented out
func (s *StreamTrackerConnectGo) liveness(
	log *slog.Logger,
	syncCtx context.Context,
	cancelSyncSession context.CancelFunc,
	gotSyncResetUpdate *atomic.Bool,
	workerPool *semaphore.Weighted,
	streamID shared.StreamId,
	syncID string,
	client protocolconnect.StreamServiceClient,
	lastReceivedPong *atomic.Int64,
	metrics *streamsTrackerWorkerMetrics,
) {
	const pongTimeout = 30 * time.Second

	// if liveness loop stops always cancel associated sync session since its considered dead
	defer cancelSyncSession()

	// ensure that a pong reply on a ping is received within pongTimeout. If pong replay is not
	// received cancel the stream sync session. This will initiate a new stream sync session.
	for {
		pingInterval := time.Minute + time.Duration(rand.Int63n(int64(time.Minute)))

		select {
		case <-time.After(pingInterval):
			// first update must be a sync update reset, if not received the sync session
			// is considered dead -> cancel it.
			if !gotSyncResetUpdate.Load() {
				log.Warn("Sync reset not received for sync session within reasonable time")
				// TODO: this loads the stream in the nodes cache and seem to be a workaround
				// for an issue that no sync reset was received during the previous run.
				err := workerPool.Acquire(syncCtx, 1)
				if err == nil {
					reqCtx, reqCancel := context.WithTimeout(syncCtx, 10*time.Second)
					_, err = client.GetStream(reqCtx, connect.NewRequest(&protocol.GetStreamRequest{
						StreamId: streamID[:],
						Optional: false,
					}))
					workerPool.Release(1)
					reqCancel()

					if err != nil {
						log.Warn("Unable to retrieve stream")
					}
				}

				return
			}

			if err := workerPool.Acquire(syncCtx, 1); err != nil {
				continue
			}

			ping := time.Now().Unix()
			pingReqCtx, pingReqCancel := context.WithTimeout(syncCtx, 30*time.Second)
			metrics.SyncPingInFlight.Inc()
			_, err := client.PingSync(pingReqCtx, connect.NewRequest(&protocol.PingSyncRequest{
				SyncId: syncID,
				Nonce:  fmt.Sprintf("%d", ping),
			}))
			workerPool.Release(1)
			metrics.SyncPingInFlight.Dec()
			pingReqCancel()

			if err != nil {
				metrics.SyncPing.With(prometheus.Labels{"status": "failure"}).Inc()
				if !errors.Is(err, context.Canceled) {
					log.Error("Unable to ping stream session", "err", err)
				}
				return
			}

			metrics.SyncPing.With(prometheus.Labels{"status": "success"}).Inc()

			// expect to receive the pong reply from remote within pongTimeout
			pongCtx, cancelPong := context.WithTimeout(syncCtx, pongTimeout)

		pingReceiveLoop:
			for {
				select {
				case <-time.After(time.Second):
					lastPong := lastReceivedPong.Load()
					if lastPong >= ping {
						cancelPong()
						break pingReceiveLoop // restart new ping/ping after pingInterval
					}
				case <-pongCtx.Done():
					cancelPong()

					// stream sync session considered dead
					// cancel existing stream sync session and start a new sync session
					if syncCtx.Err() == nil {
						log.Warn("Stream sync session timeout")
					}
					return
				case <-syncCtx.Done():
					cancelPong()
					return
				}
			}

			cancelPong()

		case <-syncCtx.Done():
			return
		}
	}
}

// waitMaxOrUntilCancel waits a random duration between minWait and maxWait
// or returns true when ctx expires before.
func (s *StreamTrackerConnectGo) waitMaxOrUntilCancel(
	ctx context.Context,
	minWait time.Duration,
	maxWait time.Duration,
) bool {
	if minWait > maxWait {
		panic("minWait > maxWait")
	}
	wait := minWait + time.Duration(rand.Int63n(int64(maxWait-minWait)))
	select {
	case <-time.After(wait):
		return false
	case <-ctx.Done():
		return true
	}
}
