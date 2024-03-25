package dlog

import (
	"context"
	"log/slog"
)

// NullHandler is a slog.Handler that does nothing.
type NullHandler struct{}

func (h *NullHandler) Enabled(ctx context.Context, l slog.Level) bool {
	return false
}

func (h *NullHandler) Handle(ctx context.Context, r slog.Record) error {
	return nil
}

func (h *NullHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return h
}

func (h *NullHandler) WithGroup(name string) slog.Handler {
	return h
}
