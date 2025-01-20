package cmd

import (
	"fmt"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"github.com/river-build/river/core/config"
	"github.com/river-build/river/core/node/logging"
)

var (
	fileLogLevel    zapcore.Level
	consoleLogLevel zapcore.Level
)

func InitLogFromConfig(c *config.LogConfig) {
	commonLevel := zap.InfoLevel
	if c.Level != "" {
		err := commonLevel.UnmarshalText([]byte(c.Level))
		if err != nil {
			fmt.Printf("Failed to parse log level, level=%s, error=%v\n", c.Level, err)
		}
	}

	if c.ConsoleLevel != "" {
		err := consoleLogLevel.UnmarshalText([]byte(c.ConsoleLevel))
		if err != nil {
			fmt.Printf("Failed to parse console log level, level=%s, error=%v\n", c.ConsoleLevel, err)
			consoleLogLevel = commonLevel
		}
	} else {
		consoleLogLevel = commonLevel
	}

	if c.FileLevel != "" {
		err := fileLogLevel.UnmarshalText([]byte(c.FileLevel))
		if err != nil {
			fmt.Printf("Failed to parse file log level, level=%s, error=%v\n", c.FileLevel, err)
			fileLogLevel = commonLevel
		}
	} else {
		fileLogLevel = commonLevel
	}

	encoder := zapcore.NewJSONEncoder(logging.DefaultZapEncoderConfig())
	var zapCores []zapcore.Core
	if c.Console {
		zapCores = append(zapCores, zapcore.NewCore(encoder, zapcore.AddSync(logging.DefaultLogOut), consoleLogLevel))
	}

	if c.File != "" {
		file, err := os.OpenFile(c.File, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
		if err == nil {
			zapCores = append(zapCores, zapcore.NewCore(encoder, zapcore.AddSync(file), fileLogLevel))
		} else {
			fmt.Printf("Failed to open log file, file=%s, error=%v\n", c.FileLevel, err)
		}
	}

	var core zapcore.Core
	if len(zapCores) > 1 {
		core = zapcore.NewTee(zapCores...)
	} else if len(zapCores) == 1 {
		core = zapCores[0]
	} else {
		zap.ReplaceGlobals(zap.NewNop())
		return
	}

	logger := zap.New(core)
	zap.ReplaceGlobals(logger)
}
