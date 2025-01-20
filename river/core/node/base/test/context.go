package test

import (
	"context"
	"log/slog"
	"os"

	"go.uber.org/zap"

	"github.com/river-build/river/core/node/logging"
)

func NewTestContext() (context.Context, context.CancelFunc) {
	logLevel := os.Getenv("RIVER_TEST_LOG")
	if logLevel == "" {
		//lint:ignore LE0000 context.Background() used correctly
		ctx := logging.CtxWithLog(context.Background(), zap.NewNop().Sugar())
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

	//lint:ignore LE0000 context.Background() used correctly
	ctx := logging.CtxWithLog(context.Background(), logging.DefaultZapLogger())
	return context.WithCancel(ctx)
}
