package logging

import (
	"context"
	"fmt"
	"os"
	"sync"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	DefaultLogOut zapcore.WriteSyncer = os.Stdout
	initOnce      sync.Once
	globalLogger  *Log
)

func init() {
	globalLogger = DefaultZapLogger(zapcore.InfoLevel)
}

// Init must be called before this package can be used.
func Init(
	globalLevel string,
	enableConsole bool,
	consoleLevel string,
	fileName string,
	fileLevel string,
) {
	initOnce.Do(func() {
		var (
			defaultLevels = LogLevels{}
			consoleLevels LogLevels
			fileLevels    LogLevels
			zapCores      []zapcore.Core
			encoder       = NewJSONEncoder(DefaultZapEncoderConfig())
			err           error
		)

		if globalLevel != "" {
			defaultLevels, err = ParseLogLevels(globalLevel)
			if err != nil {
				fmt.Printf("Failed to parse log level, level=%s, error=%v\n", globalLevel, err)
			}
		}

		if enableConsole {
			consoleLevels, err = ParseLogLevels(consoleLevel)
			if err == nil {
				zapCores = append(zapCores, &CoreWithLevels{
					Core:   zapcore.NewCore(encoder, zapcore.AddSync(DefaultLogOut), zapcore.DebugLevel),
					Levels: defaultLevels.OverWriteWith(consoleLevels),
				})
			} else {
				fmt.Printf("Failed to parse console log level, level=%s, error=%v\n", consoleLevel, err)
			}
		}

		if fileName != "" {
			fileLevels, err = ParseLogLevels(fileLevel)
			if err == nil {
				file, err := os.OpenFile(fileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
				if err == nil {
					zapCores = append(zapCores, &CoreWithLevels{
						Core:   zapcore.NewCore(encoder, zapcore.AddSync(file), zapcore.DebugLevel),
						Levels: defaultLevels.OverWriteWith(fileLevels),
					})
				}
			} else {
				fmt.Printf("Failed to parse file log level, level=%s, error=%v\n", fileLevel, err)
			}
		}

		var core zapcore.Core
		var logger *zap.Logger

		if len(zapCores) > 1 {
			core = zapcore.NewTee(zapCores...)
			logger = zap.New(core)
		} else if len(zapCores) == 1 {
			core = zapCores[0]
			logger = zap.New(core)
		} else {
			logger = zap.NewNop()
		}

		zap.ReplaceGlobals(logger)

		globalLogger = &Log{
			Default:   logger.Named(string(Default)).Sugar(),
			Miniblock: logger.Named(string(Miniblock)).Sugar(),
			Rpc:       logger.Named(string(Rpc)).Sugar(),
		}
	})
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

func DefaultZapLogger(level zapcore.Level) *Log {
	encoder := NewJSONEncoder(DefaultZapEncoderConfig())

	core := zapcore.NewCore(encoder, DefaultLogOut, level)
	logger := zap.New(core, zap.AddCaller())

	sugar := logger.Sugar()

	return &Log{
		Logger:    logger,
		Default:   sugar.Named(string(Default)),
		Miniblock: sugar.Named(string(Miniblock)),
		Rpc:       sugar.Named(string(Rpc)),
	}
}

type loggingCtxKeyType struct{}

var loggingCtxKey = loggingCtxKeyType{}

func CtxWithLog(ctx context.Context, l *Log) context.Context {
	return context.WithValue(ctx, loggingCtxKey, l)
}

func FromCtx(ctx context.Context) *Log {
	if l, ok := ctx.Value(loggingCtxKey).(*Log); ok {
		return l
	}
	return globalLogger
}
