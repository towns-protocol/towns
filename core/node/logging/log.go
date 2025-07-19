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
	globalLogger = DefaultLogger(zapcore.InfoLevel)
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
			encoder = NewJSONEncoder(DefaultZapEncoderConfig())

			defaultCores   []zapcore.Core
			miniblockCores []zapcore.Core
			rpcCores       []zapcore.Core
			syncCores      []zapcore.Core

			globalLevels  = LogLevels{}
			consoleLevels LogLevels
			fileLevels    LogLevels

			err error
		)

		if globalLevel != "" {
			globalLevels, err = ParseLogLevels(globalLevel)
			if err != nil {
				fmt.Printf("Failed to parse log level, level=%s, error=%v\n", globalLevel, err)
			}
		}

		if enableConsole {
			consoleLevels = globalLevels.OverWriteWith(LogLevels{}) // clone global levels
			if consoleLevel != "" {
				consoleLevels, err = ParseLogLevels(consoleLevel)
				if err == nil {
					consoleLevels = globalLevels.OverWriteWith(consoleLevels)
				} else {
					fmt.Printf("Failed to parse console log level, level=%s, error=%v\n", consoleLevel, err)
				}
			}

			if consoleLevels.NoComponentOverwrites() {
				consoleCore := zapcore.NewCore(encoder, zapcore.AddSync(DefaultLogOut), consoleLevels[Default])
				defaultCores = append(defaultCores, consoleCore)
				miniblockCores = append(miniblockCores, consoleCore)
				rpcCores = append(rpcCores, consoleCore)
				syncCores = append(syncCores, consoleCore)
			} else {
				consoleCore := zapcore.NewCore(encoder, zapcore.AddSync(DefaultLogOut), consoleLevels.LowestLevel())
				default_, miniblock, rpc, streamSync, err := consoleLevels.Cores(consoleCore)
				if err != nil {
					panic(err)
				}

				defaultCores = append(defaultCores, default_)
				miniblockCores = append(miniblockCores, miniblock)
				rpcCores = append(rpcCores, rpc)
				syncCores = append(syncCores, streamSync)
			}
		}

		if fileName != "" {
			file, err := os.OpenFile(fileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
			if err == nil {
				fileLevels = globalLevels.OverWriteWith(LogLevels{}) // clone: global levels
				if fileLevel != "" {
					fileLevels, err = ParseLogLevels(fileLevel)
					if err == nil {
						fileLevels = globalLevels.OverWriteWith(fileLevels)
					} else {
						fmt.Printf("Failed to parse file log level, level=%s, error=%v\n", fileLevel, err)
					}
				}

				if fileLevels.NoComponentOverwrites() {
					fileCore := zapcore.NewCore(encoder, zapcore.AddSync(file), fileLevels[Default])
					defaultCores = append(defaultCores, fileCore)
					miniblockCores = append(miniblockCores, fileCore)
					rpcCores = append(rpcCores, fileCore)
					syncCores = append(syncCores, fileCore)
				} else {
					fileCore := zapcore.NewCore(encoder, zapcore.AddSync(file), fileLevels.LowestLevel())
					default_, miniblock, rpc, streamSync, err := fileLevels.Cores(fileCore)
					if err != nil {
						panic(err)
					}

					defaultCores = append(defaultCores, default_)
					miniblockCores = append(miniblockCores, miniblock)
					rpcCores = append(rpcCores, rpc)
					syncCores = append(syncCores, streamSync)
				}
			}
		}

		if len(defaultCores) > 1 {
			defaultLogger := zap.New(zapcore.NewTee(defaultCores...), zap.AddCaller(), zap.AddCallerSkip(1))
			miniblockLogger := zap.New(zapcore.NewTee(miniblockCores...), zap.AddCaller(), zap.AddCallerSkip(1))
			rpcLogger := zap.New(zapcore.NewTee(rpcCores...), zap.AddCaller(), zap.AddCallerSkip(1))
			syncLogger := zap.New(zapcore.NewTee(syncCores...), zap.AddCaller(), zap.AddCallerSkip(1))

			zap.ReplaceGlobals(defaultLogger)

			globalLogger = &Log{
				RootLogger: defaultLogger,
				Default:    defaultLogger.Sugar(),
				Miniblock:  miniblockLogger.Sugar(),
				Rpc:        rpcLogger.Sugar(),
				StreamSync: syncLogger.Sugar(),
			}
		} else if len(defaultCores) == 1 {
			defaultLogger := zap.New(defaultCores[0], zap.AddCaller(), zap.AddCallerSkip(1))
			miniblockLogger := zap.New(miniblockCores[0], zap.AddCaller(), zap.AddCallerSkip(1))
			rpcLogger := zap.New(rpcCores[0], zap.AddCaller(), zap.AddCallerSkip(1))
			syncLogger := zap.New(syncCores[0], zap.AddCaller(), zap.AddCallerSkip(1))

			zap.ReplaceGlobals(defaultLogger)

			globalLogger = &Log{
				RootLogger: defaultLogger,
				Default:    defaultLogger.Sugar(),
				Miniblock:  miniblockLogger.Sugar(),
				Rpc:        rpcLogger.Sugar(),
				StreamSync: syncLogger.Sugar(),
			}
		} else {
			logger := zap.NewNop()

			zap.ReplaceGlobals(logger)

			globalLogger = &Log{
				RootLogger: logger,
				Default:    logger.Sugar(),
				Miniblock:  logger.Sugar(),
				Rpc:        logger.Sugar(),
				StreamSync: logger.Sugar(),
			}
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

func DefaultLogger(level zapcore.Level) *Log {
	return LoggerWithWriter(level, DefaultLogOut)
}

func LoggerWithWriter(level zapcore.Level, writer zapcore.WriteSyncer) *Log {
	encoder := NewJSONEncoder(DefaultZapEncoderConfig())

	core := zapcore.NewCore(encoder, writer, level)
	logger := zap.New(core, zap.AddCaller(), zap.AddCallerSkip(1))

	sugar := logger.Sugar()

	return &Log{
		RootLogger: logger,
		Default:    sugar.Named(string(Default)),
		Miniblock:  sugar.Named(string(Miniblock)),
		Rpc:        sugar.Named(string(Rpc)),
		StreamSync: sugar.Named(string(StreamSync)),
	}
}

func NoopLogger() *Log {
	nop := zap.NewNop().Sugar()
	return &Log{
		RootLogger: nop.Desugar(),
		Default:    nop.Named(string(Default)),
		Rpc:        nop.Named(string(Rpc)),
		Miniblock:  nop.Named(string(Miniblock)),
		StreamSync: nop.Named(string(StreamSync)),
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
