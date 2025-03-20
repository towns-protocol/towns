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
			encoder = NewJSONEncoder(DefaultZapEncoderConfig())

			defaultCores   []zapcore.Core
			miniblockCores []zapcore.Core
			rpcCores       []zapcore.Core

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
			} else {
				consoleCore := zapcore.NewCore(encoder, zapcore.AddSync(DefaultLogOut), consoleLevels.LowestLevel())
				default_, miniblock, rpc, err := consoleLevels.Cores(consoleCore)
				if err != nil {
					panic(err)
				}

				defaultCores = append(defaultCores, default_)
				miniblockCores = append(miniblockCores, miniblock)
				rpcCores = append(rpcCores, rpc)
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
				} else {
					fileCore := zapcore.NewCore(encoder, zapcore.AddSync(file), fileLevels.LowestLevel())
					default_, miniblock, rpc, err := fileLevels.Cores(fileCore)
					if err != nil {
						panic(err)
					}

					defaultCores = append(defaultCores, default_)
					miniblockCores = append(miniblockCores, miniblock)
					rpcCores = append(rpcCores, rpc)
				}
			}
		}

		if len(defaultCores) > 1 {
			defaultLogger := zap.New(zapcore.NewTee(defaultCores...)).Sugar()
			miniblockLogger := zap.New(zapcore.NewTee(miniblockCores...)).Sugar()
			rpcLogger := zap.New(zapcore.NewTee(rpcCores...)).Sugar()

			zap.ReplaceGlobals(defaultLogger.Desugar())

			globalLogger = &Log{
				Default:   defaultLogger,
				Miniblock: miniblockLogger,
				Rpc:       rpcLogger,
			}

		} else if len(defaultCores) == 1 {
			defaultLogger := zap.New(defaultCores[0]).Sugar()
			miniblockLogger := zap.New(miniblockCores[0]).Sugar()
			rpcLogger := zap.New(rpcCores[0]).Sugar()

			zap.ReplaceGlobals(defaultLogger.Desugar())

			globalLogger = &Log{
				Default:   defaultLogger,
				Miniblock: miniblockLogger,
				Rpc:       rpcLogger,
			}
		} else {
			logger := zap.NewNop().Sugar()

			zap.ReplaceGlobals(logger.Desugar())

			globalLogger = &Log{
				Default:   logger,
				Miniblock: logger,
				Rpc:       logger,
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
