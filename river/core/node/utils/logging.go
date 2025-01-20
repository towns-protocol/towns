package utils

import (
	"context"
	"log"
	"strings"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/river-build/river/core/node/logging"
)

// NewHttpLogger returns a logger that print TLS handshake errors on debug level
// and everything else on warn level.
func NewHttpLogger(ctx context.Context) *log.Logger {
	l := logging.FromCtx(ctx)

	return log.New(&handlerWriter{log: l.Named("http-logger")}, "", 0)
}

type handlerWriter struct {
	log *zap.SugaredLogger
}

func (w *handlerWriter) Write(buf []byte) (int, error) {
	level := zap.WarnLevel
	if strings.HasPrefix(string(buf), "http: TLS handshake error") {
		level = zap.DebugLevel
	}

	if w.log.Level() > level {
		return 0, nil
	}

	// Remove final newline.
	origLen := len(buf) // Report that the entire buf was written.
	if len(buf) > 0 && buf[len(buf)-1] == '\n' {
		buf = buf[:len(buf)-1]
	}
	w.log.Desugar().Log(level, string(buf))

	return origLen, nil
}

func NewLevelLogger(logger *zap.SugaredLogger, level zapcore.Level) *log.Logger {
	return log.New(&levelWriter{log: logger, level: level}, "", 0)
}

type levelWriter struct {
	log   *zap.SugaredLogger
	level zapcore.Level
}

func (l *levelWriter) Write(buf []byte) (int, error) {
	// Remove final newline.
	origLen := len(buf) // Report that the entire buf was written.
	if len(buf) > 0 && buf[len(buf)-1] == '\n' {
		buf = buf[:len(buf)-1]
	}
	l.log.Desugar().Log(l.level, string(buf))

	return origLen, nil
}
