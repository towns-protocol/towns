package track_streams

import (
	"context"

	"github.com/towns-protocol/towns/core/node/protocol"
)

// syncCookieCtxKey is an unexported key type for storing sync cookies in contexts.
type syncCookieCtxKey struct{}

type syncCookieCtxValue struct {
	cookie    *protocol.SyncCookie
	persisted bool
}

// ContextWithSyncCookie returns a child context that carries the given sync cookie.
func ContextWithSyncCookie(ctx context.Context, cookie *protocol.SyncCookie) context.Context {
	if cookie == nil {
		return ctx
	}
	return context.WithValue(ctx, syncCookieCtxKey{}, &syncCookieCtxValue{
		cookie: cookie,
	})
}

// SyncCookieFromContext extracts the sync cookie from the context, if present.
func SyncCookieFromContext(ctx context.Context) *protocol.SyncCookie {
	if ctx == nil {
		return nil
	}
	if val, ok := ctx.Value(syncCookieCtxKey{}).(*syncCookieCtxValue); ok {
		return val.cookie
	}
	return nil
}

// MarkSyncCookiePersisted marks the cookie in the context as persisted so callers can avoid redundant writes.
func MarkSyncCookiePersisted(ctx context.Context) {
	if ctx == nil {
		return
	}
	if val, ok := ctx.Value(syncCookieCtxKey{}).(*syncCookieCtxValue); ok {
		val.persisted = true
	}
}

// SyncCookiePersisted reports whether the cookie in the context has already been persisted.
func SyncCookiePersisted(ctx context.Context) bool {
	if ctx == nil {
		return false
	}
	if val, ok := ctx.Value(syncCookieCtxKey{}).(*syncCookieCtxValue); ok {
		return val.persisted
	}
	return false
}

// SyncCookieConsumer can persist sync cookies that accompany stream updates.
type SyncCookieConsumer interface {
	PersistSyncCookie(ctx context.Context, cookie *protocol.SyncCookie) error
}

// SyncCookieProvider exposes stored sync cookies for streams so tracking can resume from checkpoints.
type SyncCookieProvider interface {
	StreamSyncCookie(streamID [32]byte) *protocol.SyncCookie
}
