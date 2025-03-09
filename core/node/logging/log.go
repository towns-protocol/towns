package logging

import (
	"context"
	"fmt"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	DefaultLogOut zapcore.WriteSyncer = os.Stdout
	defaultLogger *ComponentsLogger
)

func init() {
	defaultLogger = DefaultZapLogger(zapcore.InfoLevel)
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

func DefaultZapLogger(level zapcore.Level) *ComponentsLogger {
	encoder := NewJSONEncoder(DefaultZapEncoderConfig())

	core := zapcore.NewCore(encoder, DefaultLogOut, level)
	core = NewComponentCore(core, LogLevels{"default": zapcore.InfoLevel})
	logger := zap.New(core, zap.AddCaller())

	return &ComponentsLogger{
		Default:   logger.Named("default").Sugar(),
		Miniblock: logger.Named("miniblock").Sugar(),
		Rpc:       logger.Named("rpc").Sugar(),
	}
}

type loggingCtxKeyType struct{}

var loggingCtxKey = loggingCtxKeyType{}

func CtxWithLog(ctx context.Context, l *ComponentsLogger) context.Context {
	return context.WithValue(ctx, loggingCtxKey, l)
}

func FromCtx(ctx context.Context) *ComponentsLogger {
	if l, ok := ctx.Value(loggingCtxKey).(*ComponentsLogger); ok {
		return l
	}
	return defaultLogger
}

func InitComponentsLogger(
	commonLevels LogLevels,
	enableConsole bool,
	consoleLevels LogLevels,
	fileName string,
	fileLevels LogLevels,
) (*ComponentsLogger, error) {
	var (
		zapCores []zapcore.Core
		encoder  = NewJSONEncoder(DefaultZapEncoderConfig())
	)

	if enableConsole {
		if len(consoleLevels) == 0 {
			consoleLevels = commonLevels
		}
		core := zapcore.NewCore(encoder, zapcore.AddSync(DefaultLogOut), consoleLevels.DefaultLevel())
		zapCores = append(zapCores, NewComponentCore(core, consoleLevels))
	}

	if fileName != "" {
		file, err := os.OpenFile(fileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
		if err == nil {
			if len(fileLevels) == 0 {
				fileLevels = commonLevels
			}
			core := zapcore.NewCore(encoder, zapcore.AddSync(file), fileLevels.DefaultLevel())
			zapCores = append(zapCores, NewComponentCore(core, fileLevels))
		} else {
			fmt.Printf("Failed to open log file, file=%s, error=%v\n", fileLevels, err)
		}
	}

	var logger *zap.Logger
	if len(zapCores) > 1 {
		core := zapcore.NewTee(zapCores...)
		logger = zap.New(core)
	} else if len(zapCores) == 1 {
		core := zapCores[0]
		logger = zap.New(core)
	} else {
		logger = zap.NewNop()
	}

	return &ComponentsLogger{
		Default:   logger.Named("default").Sugar(),
		Miniblock: logger.Named("miniblock").Sugar(),
		Rpc:       logger.Named("rpc").Sugar(),
	}, nil
}

func MustInitDefaultLogger(
	commonLevel LogLevels,
	enableConsole bool,
	consoleLevel LogLevels,
	fileName string,
	fileLevel LogLevels,
) {
	l, err := InitComponentsLogger(commonLevel, enableConsole, consoleLevel, fileName, fileLevel)
	if err != nil {
		panic(err)
	}

	zap.ReplaceGlobals(l.Default.Desugar())

	defaultLogger = l
}
