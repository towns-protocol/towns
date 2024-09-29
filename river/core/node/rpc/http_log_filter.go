package rpc

import (
	"context"
	"log"
	"log/slog"
	"strings"
	"time"

	"github.com/river-build/river/core/node/dlog"
)

// newHttpLogger returns a logger that print TLS handshake errors on debug level
// and everything else on warn level.
func newHttpLogger(ctx context.Context) *log.Logger {
	l := dlog.FromCtx(ctx)
	return log.New(&handlerWriter{h: l.Handler()}, "", 0)
}

type handlerWriter struct {
	h slog.Handler
}

func (w *handlerWriter) Write(buf []byte) (int, error) {
	level := slog.LevelWarn
	if strings.HasPrefix(string(buf), "http: TLS handshake error") {
		level = slog.LevelDebug
	}

	if !w.h.Enabled(context.Background(), level) { //lint:ignore LE0000 context.Background() used correctly
		return 0, nil
	}

	// Remove final newline.
	origLen := len(buf) // Report that the entire buf was written.
	if len(buf) > 0 && buf[len(buf)-1] == '\n' {
		buf = buf[:len(buf)-1]
	}
	r := slog.NewRecord(time.Now(), level, string(buf), 0)
	return origLen, w.h.Handle(context.Background(), r) //lint:ignore LE0000 context.Background() used correctly
}
