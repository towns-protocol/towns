package handler

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/rpc/syncv3/eventbus"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/utils/dynmsgbuf"
)

type handlerTestEnv struct {
	handler       *syncStreamHandlerImpl
	receiver      *fakeReceiver
	eventBus      *fakeEventBus
	streamCache   *stubStreamCache
	streamUpdates *dynmsgbuf.DynamicBuffer[*protocol.SyncStreamsResponse]
	ctx           context.Context

	cancelMu   sync.Mutex
	cancelErrs []error
	cancelBase context.CancelCauseFunc
}

func newHandlerTestEnv(t *testing.T) *handlerTestEnv {
	t.Helper()

	receiver := newFakeReceiver()
	eventBus := newFakeEventBus()
	streamCache := newStubStreamCache()
	streamUpdates := dynmsgbuf.NewUnboundedDynamicBuffer[*protocol.SyncStreamsResponse]()

	ctx, baseCancel := context.WithCancelCause(context.Background())

	env := &handlerTestEnv{
		receiver:      receiver,
		eventBus:      eventBus,
		streamCache:   streamCache,
		streamUpdates: streamUpdates,
		ctx:           ctx,
		cancelBase:    baseCancel,
	}

	handlerCancel := func(err error) {
		env.cancelMu.Lock()
		env.cancelErrs = append(env.cancelErrs, err)
		env.cancelMu.Unlock()
		baseCancel(err)
	}

	env.handler = &syncStreamHandlerImpl{
		ctx:           ctx,
		cancel:        handlerCancel,
		log:           logging.NoopLogger(),
		syncID:        "sync-test",
		receiver:      receiver,
		eventBus:      eventBus,
		streamUpdates: streamUpdates,
		streamCache:   streamCache,
	}

	return env
}

func (env *handlerTestEnv) cancelCount() int {
	env.cancelMu.Lock()
	defer env.cancelMu.Unlock()
	return len(env.cancelErrs)
}

func (env *handlerTestEnv) cancelErrAt(idx int) error {
	env.cancelMu.Lock()
	defer env.cancelMu.Unlock()
	if idx < 0 || idx >= len(env.cancelErrs) {
		return nil
	}
	return env.cancelErrs[idx]
}

func (env *handlerTestEnv) triggerCancel(err error) {
	env.cancelBase(err)
}

type fakeReceiver struct {
	mu    sync.Mutex
	msgs  []*protocol.SyncStreamsResponse
	err   error
	errAt map[int]error
	calls int
}

func newFakeReceiver() *fakeReceiver {
	return &fakeReceiver{errAt: make(map[int]error)}
}

func (r *fakeReceiver) Send(msg *protocol.SyncStreamsResponse) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.calls++
	r.msgs = append(r.msgs, proto.Clone(msg).(*protocol.SyncStreamsResponse))

	if err, ok := r.errAt[r.calls]; ok {
		delete(r.errAt, r.calls)
		return err
	}

	if r.err != nil {
		return r.err
	}

	return nil
}

func (r *fakeReceiver) Messages() []*protocol.SyncStreamsResponse {
	r.mu.Lock()
	defer r.mu.Unlock()

	out := make([]*protocol.SyncStreamsResponse, len(r.msgs))
	for i, msg := range r.msgs {
		out[i] = proto.Clone(msg).(*protocol.SyncStreamsResponse)
	}
	return out
}

func (r *fakeReceiver) SetErr(err error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.err = err
}

func (r *fakeReceiver) SetErrAt(call int, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.errAt[call] = err
}

type eventBusSubscribeCall struct {
	cookie     *protocol.SyncCookie
	subscriber eventbus.StreamSubscriber
}

type eventBusUnsubscribeCall struct {
	streamID   shared.StreamId
	subscriber eventbus.StreamSubscriber
}

type eventBusBackfillCall struct {
	cookie  *protocol.SyncCookie
	syncIDs []string
}

type fakeEventBus struct {
	mu sync.Mutex

	subscribeCalls   []eventBusSubscribeCall
	unsubscribeCalls []eventBusUnsubscribeCall
	backfillCalls    []eventBusBackfillCall
	removeCalls      []string

	subscribeErr   map[string]error
	unsubscribeErr map[string]error
	backfillErr    map[string]error
}

func newFakeEventBus() *fakeEventBus {
	return &fakeEventBus{
		subscribeErr:   make(map[string]error),
		unsubscribeErr: make(map[string]error),
		backfillErr:    make(map[string]error),
	}
}

func (f *fakeEventBus) EnqueueSubscribe(cookie *protocol.SyncCookie, subscriber eventbus.StreamSubscriber) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.subscribeCalls = append(f.subscribeCalls, eventBusSubscribeCall{
		cookie:     proto.Clone(cookie).(*protocol.SyncCookie),
		subscriber: subscriber,
	})

	if err, ok := f.subscribeErr[string(cookie.GetStreamId())]; ok {
		return err
	}
	return nil
}

func (f *fakeEventBus) EnqueueUnsubscribe(streamID shared.StreamId, subscriber eventbus.StreamSubscriber) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.unsubscribeCalls = append(f.unsubscribeCalls, eventBusUnsubscribeCall{
		streamID:   streamID,
		subscriber: subscriber,
	})

	if err, ok := f.unsubscribeErr[streamID.String()]; ok {
		return err
	}
	return nil
}

func (f *fakeEventBus) EnqueueBackfill(cookie *protocol.SyncCookie, syncIDs ...string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.backfillCalls = append(f.backfillCalls, eventBusBackfillCall{
		cookie:  proto.Clone(cookie).(*protocol.SyncCookie),
		syncIDs: append([]string(nil), syncIDs...),
	})

	if err, ok := f.backfillErr[string(cookie.GetStreamId())]; ok {
		return err
	}
	return nil
}

func (f *fakeEventBus) EnqueueRemoveSubscriber(syncID string) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	f.removeCalls = append(f.removeCalls, syncID)
	return nil
}

func (f *fakeEventBus) SubscribeCalls() []eventBusSubscribeCall {
	f.mu.Lock()
	defer f.mu.Unlock()

	out := make([]eventBusSubscribeCall, len(f.subscribeCalls))
	copy(out, f.subscribeCalls)
	return out
}

func (f *fakeEventBus) UnsubscribeCalls() []eventBusUnsubscribeCall {
	f.mu.Lock()
	defer f.mu.Unlock()

	out := make([]eventBusUnsubscribeCall, len(f.unsubscribeCalls))
	copy(out, f.unsubscribeCalls)
	return out
}

func (f *fakeEventBus) BackfillCalls() []eventBusBackfillCall {
	f.mu.Lock()
	defer f.mu.Unlock()

	out := make([]eventBusBackfillCall, len(f.backfillCalls))
	copy(out, f.backfillCalls)
	return out
}

func (f *fakeEventBus) RemoveCalls() []string {
	f.mu.Lock()
	defer f.mu.Unlock()

	out := make([]string, len(f.removeCalls))
	copy(out, f.removeCalls)
	return out
}

func (f *fakeEventBus) SetSubscribeError(streamID []byte, err error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.subscribeErr[string(streamID)] = err
}

func (f *fakeEventBus) SetUnsubscribeError(streamID shared.StreamId, err error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.unsubscribeErr[streamID.String()] = err
}

func (f *fakeEventBus) SetBackfillError(streamID []byte, err error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.backfillErr[string(streamID)] = err
}

type nopReceiver struct{}

func (nopReceiver) Send(*protocol.SyncStreamsResponse) error { return nil }

type capturingMetrics struct {
	infra.MetricsFactory

	mu   sync.Mutex
	opts []prometheus.GaugeOpts
	fns  []func() float64
}

func newCapturingMetrics() *capturingMetrics {
	return &capturingMetrics{MetricsFactory: infra.NewMetricsFactory(prometheus.NewRegistry(), "", "")}
}

func (c *capturingMetrics) NewGaugeFunc(opts prometheus.GaugeOpts, fn func() float64) prometheus.GaugeFunc {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.opts = append(c.opts, opts)
	c.fns = append(c.fns, fn)

	return c.MetricsFactory.NewGaugeFunc(opts, fn)
}

type gaugeSnapshot struct {
	opts []prometheus.GaugeOpts
	fns  []func() float64
}

func (c *capturingMetrics) gaugeSnapshot() gaugeSnapshot {
	c.mu.Lock()
	defer c.mu.Unlock()

	optsCopy := make([]prometheus.GaugeOpts, len(c.opts))
	copy(optsCopy, c.opts)

	fnsCopy := make([]func() float64, len(c.fns))
	copy(fnsCopy, c.fns)

	return gaugeSnapshot{opts: optsCopy, fns: fnsCopy}
}

type stubStreamCache struct {
	mu      sync.Mutex
	timeout time.Duration
	stream  *events.Stream
	err     error
	// perStream allows configuring per-stream responses. Key is stream ID string.
	perStream map[string]stubStreamCacheEntry
}

type stubStreamCacheEntry struct {
	stream *events.Stream
	err    error
}

func newStubStreamCache() *stubStreamCache {
	return &stubStreamCache{
		perStream: make(map[string]stubStreamCacheEntry),
	}
}

func (s *stubStreamCache) GetStreamNoWait(_ context.Context, streamID shared.StreamId) (*events.Stream, error) {
	if s.timeout > 0 {
		time.Sleep(s.timeout)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Check per-stream configuration first
	if entry, ok := s.perStream[streamID.String()]; ok {
		return entry.stream, entry.err
	}

	// Fall back to default behavior
	if s.err != nil {
		return nil, s.err
	}
	if s.stream != nil {
		return s.stream, nil
	}

	// If no stream is configured, return NOT_FOUND error
	return nil, base.RiverError(protocol.Err_NOT_FOUND, "stream not found")
}

// AddStream adds a stream to the cache that will be returned for lookups.
func (s *stubStreamCache) AddStream(streamID shared.StreamId) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.perStream[streamID.String()] = stubStreamCacheEntry{
		stream: &events.Stream{},
	}
}

// SetStreamError sets an error to be returned for a specific stream lookup.
func (s *stubStreamCache) SetStreamError(streamID shared.StreamId, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.perStream[streamID.String()] = stubStreamCacheEntry{
		err: err,
	}
}
