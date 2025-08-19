package syncer

import (
	"context"
	"sync"
	"time"

	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"

	"github.com/ethereum/go-ethereum/common"
)

const (
	// getFirstLocalStreamUpdateTimeout defines the maximum duration before the
	// first stream update must be received.
	getFirstLocalStreamUpdateTimeout = 10 * time.Second
	// updatesSinceCookieTimeout defines the maximum duration before the stream needs to
	// return updates since the given cookie. If it takes longer, the syncer is considered
	// to be stuck and will be closed.
	updatesSinceCookieTimeout = 10 * time.Second
	// maxPendingBackfillRequests defines the maximum number of pending backfill requests
	maxPendingBackfillRequests = 100
)

// localWithMutex subscribes to a local stream and emits stream updates to a subscriber.
// It uses a mutex to protect concurrent access to its fields.
type localWithMutex struct {
	streamID     StreamId
	localAddress common.Address
	version      int32
	subscriber   StreamSubscriber
	log          *logging.Log

	// closed is a channel closed when the syncer is closed.
	closed chan struct{}

	// mu guards all following fields for concurrent access.
	mu sync.Mutex
	// gotFirstUpdate is true when the first update was received.
	gotFirstUpdate bool
	// pendingBackfillRequests stores backfill requests that need to be processed.
	pendingBackfillRequests chan *backfillRequest
}

var _ StreamUpdateEmitter = (*localWithMutex)(nil)

// NewLocal instantiates a new syncer for a local stream.
func NewLocal(
	ctx context.Context,
	localAddress common.Address,
	streamCache StreamCache,
	streamID StreamId,
	subscriber StreamSubscriber,
	version int32,
) StreamUpdateEmitter {
	s := &localWithMutex{
		streamID:                streamID,
		localAddress:            localAddress,
		version:                 version,
		subscriber:              subscriber,
		pendingBackfillRequests: make(chan *backfillRequest, maxPendingBackfillRequests),
		closed:                  make(chan struct{}),
		log: logging.FromCtx(ctx).
			Named("syncv3.localWithMutex").
			With("addr", localAddress, "streamID", streamID, "version", version),
	}

	go s.run(ctx, streamCache)

	return s
}

// run subscribes the stream and processes incoming backfill requests.
func (l *localWithMutex) run(ctx context.Context, streamCache StreamCache) {
	var (
		stream                        *events.Stream
		ctxWithTimeout, ctxWithCancel = context.WithTimeout(ctx, getFirstLocalStreamUpdateTimeout)
		err                           error
		backfillRequestInProgress     *backfillRequest
	)

	// This ensures that the subscriber and pending backfill requests get a SyncOp_SYNC_DOWN update.
	// And that the syncer unsubscribes from stream updates.
	defer func() {
		// Ensure that the syncer is closed. This guarantees that no more backfill
		// requests are accepted by the syncer from this moment.
		l.Close()

		// stop receiving updates from the stream.
		if stream != nil {
			stream.Unsub(l)
		}

		// send an update to the subscriber that the syncer closed.
		l.subscriber.OnStreamEvent(
			&SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: l.streamID[:]}, l.version)

		// send an update to all pending backfill requests that the syncer closed.
		if backfillRequestInProgress != nil {
			l.subscriber.OnStreamEvent(&SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_DOWN,
				StreamId:      l.streamID[:],
				TargetSyncIds: backfillRequestInProgress.syncIDs,
			}, l.version)
		}

		for request := range l.pendingBackfillRequests {
			l.subscriber.OnStreamEvent(&SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_DOWN,
				StreamId:      l.streamID[:],
				TargetSyncIds: request.syncIDs,
			}, l.version)
		}
	}()

	// Get stream from the stream cache by its ID.
	stream, err = streamCache.GetStreamWaitForLocal(ctxWithTimeout, l.streamID)
	if stream == nil {
		ctxWithCancel()
		l.log.Errorw("initialization failed: failed to get stream", "error", err)
		streamDownUpdate := &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: l.streamID[:]}
		l.subscriber.OnStreamEvent(streamDownUpdate, l.version)
		return
	}

	// subscribe for stream updates
	err = stream.Sub(ctxWithTimeout, &SyncCookie{
		StreamId:    l.streamID[:],
		NodeAddress: l.localAddress[:],
	}, l)

	ctxWithCancel()

	if err != nil {
		l.log.Errorw("initialization failed: failed to subscribe on stream", "error", err)
		streamDownUpdate := &SyncStreamsResponse{SyncOp: SyncOp_SYNC_DOWN, StreamId: l.streamID[:]}
		l.subscriber.OnStreamEvent(streamDownUpdate, l.version)
		return
	}

	// process backfill requests until context is canceled or the syncer is closed
	for {
		backfillRequestInProgress = nil
		ok := false
		select {
		case backfillRequestInProgress, ok = <-l.pendingBackfillRequests:
			if !ok { // syncer closed
				return
			}
			if err := l.processBackfillRequest(ctx, backfillRequestInProgress, stream); err != nil {
				l.log.Errorw("failed to process backfill request",
					"cookie", backfillRequestInProgress.cookie,
					"error", err)
				return
			}
		case <-ctx.Done():
			return
		case <-l.closed:
			return
		}
	}
}

// OnUpdate implements events.SyncResultReceiver interface.
func (l *localWithMutex) OnUpdate(r *StreamAndCookie) {
	// If the syncer is closed, ignore the update. The subscriber will
	// receive a SyncOp_SYNC_DOWN update when l.run returns.
	l.doIfNotClosed(func() {
		// The first update must be ignored because the local syncer starts a shared sync
		// session on the stream, and the first update is for itself and not the result
		// of a client backfill request.
		if !l.gotFirstUpdate {
			l.gotFirstUpdate = true
			return
		}

		// emit update to the subscriber
		l.subscriber.OnStreamEvent(&SyncStreamsResponse{SyncOp: SyncOp_SYNC_UPDATE, Stream: r}, l.version)
	})
}

// OnSyncError implements events.SyncResultReceiver interface.
func (l *localWithMutex) OnSyncError(err error) {
	l.Close()
	l.log.Errorw("sync error for local stream", "error", err)
}

// OnStreamSyncDown implements events.SyncResultReceiver interface.
func (l *localWithMutex) OnStreamSyncDown(_ StreamId) {
	l.Close()
}

func (l *localWithMutex) StreamID() StreamId {
	return l.streamID
}

func (l *localWithMutex) Node() common.Address {
	return l.localAddress
}

func (l *localWithMutex) Version() int32 {
	return l.version
}

// Backfill creates a backfill request for the given cookie and sync IDs.
//
// It adds the request to an internal queue for async processing. If this
// function returns true, the caller is guaranteed to receive a stream update.
// If false is returned, the backfill request is not accepted. This can happen
// when the syncer is closed before the request was added to the queue, or when
// there are too many pending backfill requests and the syncer won't accept new
// requests temporarily.
func (l *localWithMutex) Backfill(cookie *protocol.SyncCookie, syncIDs []string) bool {
	result := false

	l.doIfNotClosed(func() {
		// Try to add the backfill request to the queue if it's not full.
		select {
		case l.pendingBackfillRequests <- &backfillRequest{cookie: cookie, syncIDs: syncIDs}:
			result = true
		default:
		}
	})

	return result
}

// Close the syncer so it will unsubscribe from stream updates
// and stops emitting stream updates and processing backfill requests.
// It is safe to call this method multiple times.
func (l *localWithMutex) Close() {
	l.doIfNotClosed(func() {
		close(l.closed)
		close(l.pendingBackfillRequests)
	})
}

// doIfNotClosed executes the given f if the syncer isn't closed and with l.mu locked.
func (l *localWithMutex) doIfNotClosed(f func()) {
	l.mu.Lock()
	defer l.mu.Unlock()

	select {
	case <-l.closed:
	default:
		f()
	}
}

// processBackfillRequest processes the given backfill request by fetching updates since the given cookie
// and sending the message back to the event bus for further forwarding to the specified sync operation.
func (l *localWithMutex) processBackfillRequest(
	ctx context.Context,
	msg *backfillRequest,
	stream *events.Stream,
) error {
	ctxWithTimeout, cancel := context.WithTimeout(ctx, updatesSinceCookieTimeout)
	defer cancel()

	return stream.UpdatesSinceCookie(
		ctxWithTimeout,
		&SyncCookie{
			NodeAddress:       l.localAddress[:],
			StreamId:          msg.cookie.GetStreamId(),
			MinipoolGen:       msg.cookie.GetMinipoolGen(),
			PrevMiniblockHash: msg.cookie.GetPrevMiniblockHash(),
		},
		func(streamAndCookie *StreamAndCookie) error {
			l.subscriber.OnStreamEvent(&SyncStreamsResponse{
				SyncOp:        SyncOp_SYNC_UPDATE,
				Stream:        streamAndCookie,
				TargetSyncIds: msg.syncIDs,
			}, l.version)
			return nil
		},
	)
}
