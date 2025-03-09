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

var (
	fileLogLevel    zapcore.Level
	consoleLogLevel zapcore.Level
)

func InitComponentsLogger(
	commonLevel string,
	enableConsole bool,
	consoleLevel string,
	fileName string,
	fileLevel string,
) (*ComponentsLogger, error) {
	// parse log configuration per module
	var (
		commonLogLevels  = LogLevels{"default": zapcore.InfoLevel}
		consoleLogLevels = LogLevels{"default": zapcore.InfoLevel}
		fileLogLevels    = LogLevels{"default": zapcore.InfoLevel}
		err              error
	)

	if commonLevel != "" {
		commonLogLevels, err = ParseLogLevels(commonLevel)
		if err != nil {
			fmt.Printf("Failed to parse log level, level=%s, error=%v\n", commonLevel, err)
			commonLogLevels = LogLevels{"default": zapcore.InfoLevel}
		}
	}

	if consoleLevel != "" {
		levels, err := ParseLogLevels(commonLevel)
		if err != nil {
			fmt.Printf("Failed to parse console log level, level=%s, error=%v\n", consoleLevel, err)
			consoleLogLevels = LogLevels{"default": zapcore.InfoLevel}
		}
		consoleLogLevels.Merge(commonLogLevels)
		consoleLogLevels.Merge(levels)
	}

	if fileLevel != "" {
		levels, err := ParseLogLevels(commonLevel)
		if err != nil {
			fmt.Printf("Failed to parse file log level, level=%s, error=%v\n", fileLevel, err)
			fileLogLevels = LogLevels{"default": zapcore.InfoLevel}
		}
		fileLogLevels.Merge(commonLogLevels)
		fileLogLevels.Merge(levels)
	}

	encoder := NewJSONEncoder(DefaultZapEncoderConfig())
	var zapCores []zapcore.Core
	if enableConsole {
		core := zapcore.NewCore(encoder, zapcore.AddSync(DefaultLogOut), consoleLogLevels["default"])
		zapCores = append(zapCores, NewComponentCore(core, consoleLogLevels))
	}

	if fileName != "" {
		file, err := os.OpenFile(fileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
		if err == nil {
			core := zapcore.NewCore(encoder, zapcore.AddSync(file), fileLogLevels["default"])
			zapCores = append(zapCores, NewComponentCore(core, fileLogLevels))
		} else {
			fmt.Printf("Failed to open log file, file=%s, error=%v\n", fileLevel, err)
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
	commonLevel string,
	enableConsole bool,
	consoleLevel string,
	fileName string,
	fileLevel string,
) {
	l, err := InitComponentsLogger(commonLevel, enableConsole, consoleLevel, fileName, fileLevel)
	if err != nil {
		panic(err)
	}

	zap.ReplaceGlobals(l.Default.Desugar())

	defaultLogger = l
}
