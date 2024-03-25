package dlog

import (
	"context"
	"log/slog"
	"os"
)

var (
	DefaultLogOut              = os.Stdout
	defaultLogger *slog.Logger = slog.New(NewPrettyTextHandler(DefaultLogOut, &PrettyHandlerOptions{}))
)

// Log is the default logger.
func Log() *slog.Logger {
	return defaultLogger
}

func SetLog(l *slog.Logger) {
	defaultLogger = l
}

func LogWith(args ...any) *slog.Logger {
	return Log().With(args...)
}

type dlogCtxKeyType struct{}

var dlogCtxKey = dlogCtxKeyType{}

func CtxWithLog(ctx context.Context, l *slog.Logger) context.Context {
	return context.WithValue(ctx, dlogCtxKey, l)
}

func CtxWithLogValues(ctx context.Context, args ...any) context.Context {
	return context.WithValue(ctx, dlogCtxKey, LogWith(args...))
}

func FromCtx(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(dlogCtxKey).(*slog.Logger); ok {
		return l
	}
	return slog.Default()
}
