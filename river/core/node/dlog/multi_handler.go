package dlog

import (
	"context"
	"log/slog"
)

// MultiHandler is a slog.Handler that writes to multiple handlers.
type MultiHandler []slog.Handler

func (h *MultiHandler) Enabled(ctx context.Context, l slog.Level) bool {
	for _, c := range *h {
		if c.Enabled(ctx, l) {
			return true
		}
	}
	return false
}

func (h *MultiHandler) Handle(ctx context.Context, r slog.Record) error {
	for _, c := range *h {
		if err := c.Handle(ctx, r); err != nil {
			return err
		}
	}
	return nil
}

func (h *MultiHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	var handlers MultiHandler
	for _, c := range *h {
		handlers = append(handlers, c.WithAttrs(attrs))
	}
	return &handlers
}

func (h *MultiHandler) WithGroup(name string) slog.Handler {
	var handlers MultiHandler
	for _, c := range *h {
		handlers = append(handlers, c.WithGroup(name))
	}
	return &handlers
}

func NewMultiHandler(handlers ...slog.Handler) *MultiHandler {
	multiHandler := MultiHandler(handlers)
	return &multiHandler
}
