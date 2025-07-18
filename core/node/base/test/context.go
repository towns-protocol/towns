package test

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"go.uber.org/zap/zapcore"

	"github.com/towns-protocol/towns/core/node/logging"
)

func NewTestContext(t *testing.T) context.Context {
	t.Helper()

	ctx := t.Context()

	ctx = logging.CtxWithLog(ctx, newTestLoggerForName(t.Name()))

	return ctx
}

func newTestLoggerForName(name string) *logging.Log {
	logLevel := os.Getenv("RIVER_TEST_LOG")
	logDir := os.Getenv("RIVER_TEST_LOG_DIR")

	if logDir != "" && logLevel == "" {
		logLevel = "info"
	}

	if logLevel == "" {
		return logging.NoopLogger()
	}

	level, err := zapcore.ParseLevel(logLevel)
	if err != nil {
		level = zapcore.InfoLevel
	}

	if logDir == "" {
		return logging.DefaultLogger(level)
	}

	err = os.MkdirAll(logDir, 0755)
	if err != nil {
		panic(err)
	}
	name = strings.ReplaceAll(name, "/", "-")
	name = strings.ReplaceAll(name, " ", "_")
	writer, err := os.OpenFile(filepath.Join(logDir, name+".jsonl"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		panic(err)
	}

	return logging.LoggerWithWriter(level, writer)
}

func NewTestContextForTestMain(pkg string) context.Context {
	ctx := context.Background() //nolint:forbidigo  // No parent context available in TestMain

	ctx = logging.CtxWithLog(ctx, newTestLoggerForName(pkg))

	return ctx
}
