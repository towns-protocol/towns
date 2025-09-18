package handler

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
)

func TestSyncStreamHandlerRegistry_NewGetRemove(t *testing.T) {
	metrics := newCapturingMetrics()
	bus := newFakeEventBus()
	registry := NewRegistry(bus, metrics)
	impl := registry.(*syncStreamHandlerRegistryImpl)

	handler, ok := impl.Get("missing")
	require.False(t, ok)
	require.Nil(t, handler)

	recv := &nopReceiver{}

	ctx := context.Background()
	h, err := impl.New(ctx, "sync-1", recv)
	require.NoError(t, err)
	require.NotNil(t, h)

	captured := metrics.gaugeSnapshot()
	require.Len(t, captured.opts, 1)
	require.Equal(t, "stream_syncv3_sync_ops_count", captured.opts[0].Name)
	require.Len(t, captured.fns, 1)
	require.Equal(t, 1.0, captured.fns[0]())

	got, ok := impl.Get("sync-1")
	require.True(t, ok)
	require.Same(t, h, got)

	handlerImpl := h.(*syncStreamHandlerImpl)
	storedBus, ok := handlerImpl.eventBus.(*fakeEventBus)
	require.True(t, ok)
	require.Same(t, bus, storedBus)
	storedReceiver, ok := handlerImpl.receiver.(*nopReceiver)
	require.True(t, ok)
	require.Same(t, recv, storedReceiver)
	require.NotNil(t, handlerImpl.streamUpdates)
	require.Equal(t, "sync-1", handlerImpl.syncID)

	impl.Remove("sync-1")
	_, ok = impl.Get("sync-1")
	require.False(t, ok)

	captured = metrics.gaugeSnapshot()
	require.Len(t, captured.fns, 1)
	require.Equal(t, 0.0, captured.fns[0]())

	// Removing again should be a noop without panics or errors.
	impl.Remove("sync-1")
}

func TestSyncStreamHandlerRegistry_NewDuplicate(t *testing.T) {
	metrics := newCapturingMetrics()
	registry := NewRegistry(newFakeEventBus(), metrics)
	impl := registry.(*syncStreamHandlerRegistryImpl)

	recv := nopReceiver{}

	_, err := impl.New(context.Background(), "sync-dup", recv)
	require.NoError(t, err)

	_, err = impl.New(context.Background(), "sync-dup", recv)
	require.Error(t, err)

	var riverErr *base.RiverErrorImpl
	require.True(t, errors.As(err, &riverErr))
	require.Equal(t, protocol.Err_ALREADY_EXISTS, riverErr.Code)
}
