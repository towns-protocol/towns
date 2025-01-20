package logging

import (
	"context"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	DefaultLogOut = os.Stdout
	defaultLogger *zap.SugaredLogger
)

func init() {
	defaultLogger = DefaultZapLogger()
}

func DefaultZapEncoderConfig() zapcore.EncoderConfig {
	return zapcore.EncoderConfig{
		MessageKey:       "msg",
		LevelKey:         "level",
		TimeKey:          "timestamp",
		FunctionKey:      "function",
		EncodeLevel:      zapcore.CapitalLevelEncoder,
		EncodeTime:       zapcore.ISO8601TimeEncoder,
		EncodeName:       zapcore.FullNameEncoder,
		ConsoleSeparator: " ",
	}
}

func DefaultZapLogger() *zap.SugaredLogger {
	encoder := zapcore.NewJSONEncoder(DefaultZapEncoderConfig())
	writer := zapcore.AddSync(DefaultLogOut)

	logLevel := zapcore.InfoLevel
	core := zapcore.NewCore(encoder, writer, logLevel)

	logger := zap.New(
		core,
		zap.AddCaller(),
	)
	return logger.Sugar()
}

// Log is the default logger.
func Log() *zap.SugaredLogger {
	return defaultLogger
}

func SetLog(l *zap.SugaredLogger) {
	defaultLogger = l
}

func LogWith(args ...any) *zap.SugaredLogger {
	return Log().With(args...)
}

type loggingCtxKeyType struct{}

var loggingCtxKey = loggingCtxKeyType{}

func CtxWithLog(ctx context.Context, l *zap.SugaredLogger) context.Context {
	return context.WithValue(ctx, loggingCtxKey, l)
}

func CtxWithLogValues(ctx context.Context, args ...any) context.Context {
	return context.WithValue(ctx, loggingCtxKey, LogWith(args...))
}

func FromCtx(ctx context.Context) *zap.SugaredLogger {
	if l, ok := ctx.Value(loggingCtxKey).(*zap.SugaredLogger); ok {
		return l
	}
	return zap.L().Sugar()
}
