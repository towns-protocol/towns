package test

import (
	"context"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

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
	var level zapcore.Level
	err := level.UnmarshalText([]byte(logLevel))
	if err != nil {
		level = zapcore.InfoLevel
	}

	//lint:ignore LE0000 context.Background() used correctly
	ctx := logging.CtxWithLog(context.Background(), logging.DefaultZapLogger(level))
	return context.WithCancel(ctx)
}
