package test

import (
	"context"
	"log/slog"
	"os"

	"github.com/river-build/river/core/node/dlog"
)

func NewTestContext() (context.Context, context.CancelFunc) {
	logLevel := os.Getenv("RIVER_TEST_LOG")
	if logLevel == "" {
		handler := &dlog.NullHandler{}
		//lint:ignore LE0000 context.Background() used correctly
		ctx := dlog.CtxWithLog(context.Background(), slog.New(handler))
		return context.WithCancel(ctx)
	} else {
		return NewTestContextWithLogging(logLevel)
	}
}

func NewTestContextWithLogging(logLevel string) (context.Context, context.CancelFunc) {
	var level slog.Level
	err := level.UnmarshalText([]byte(logLevel))
	if err != nil {
		level = slog.LevelInfo
	}
	handler := dlog.NewPrettyTextHandler(
		os.Stdout,
		&dlog.PrettyHandlerOptions{
			Level:         level,
			PrintLongTime: false,
			Colors:        dlog.ColorMap_Enabled,
		},
	)

	//lint:ignore LE0000 context.Background() used correctly
	ctx := dlog.CtxWithLog(context.Background(), slog.New(handler))
	return context.WithCancel(ctx)
}
