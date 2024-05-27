package cmd

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/dlog"
)

var (
	fileLogLevel    slog.LevelVar
	consoleLogLevel slog.LevelVar
)

func InitLogFromConfig(c *config.LogConfig) {
	commonLevel := slog.LevelInfo
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
			consoleLogLevel.Set(commonLevel)
		}
	} else {
		consoleLogLevel.Set(commonLevel)
	}

	if c.FileLevel != "" {
		err := fileLogLevel.UnmarshalText([]byte(c.FileLevel))
		if err != nil {
			fmt.Printf("Failed to parse file log level, level=%s, error=%v\n", c.FileLevel, err)
			fileLogLevel.Set(commonLevel)
		}
	} else {
		fileLogLevel.Set(commonLevel)
	}

	var consoleColors dlog.ColorMap
	if c.NoColor {
		consoleColors = dlog.ColorMap_Disabled
	} else {
		consoleColors = dlog.ColorMap_Enabled
	}

	var slogHandlers []slog.Handler
	if c.Console {
		var handler slog.Handler
		prettyHandlerOptions := &dlog.PrettyHandlerOptions{
			Level:  &consoleLogLevel,
			Colors: consoleColors,
		}

		if c.Format == "json" {
			handler = dlog.NewPrettyJSONHandler(dlog.DefaultLogOut, prettyHandlerOptions)
		} else {
			// c.Format == "text"
			handler = dlog.NewPrettyTextHandler(dlog.DefaultLogOut, prettyHandlerOptions)
		}
		slogHandlers = append(
			slogHandlers,
			handler,
		)
	}

	if c.File != "" {
		file, err := os.OpenFile(c.File, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
		if err == nil {
			var handler slog.Handler
			prettyHandlerOptions := &dlog.PrettyHandlerOptions{
				Level:  &fileLogLevel,
				Colors: dlog.ColorMap_Disabled,
			}
			if c.Format == "json" {
				handler = dlog.NewPrettyJSONHandler(file, prettyHandlerOptions)
			} else {
				// c.Format == "text"
				handler = dlog.NewPrettyTextHandler(file, prettyHandlerOptions)
			}
			slogHandlers = append(
				slogHandlers,
				handler,
			)
			// TODO: close file when program exits
		} else {
			fmt.Printf("Failed to open log file, file=%s, error=%v\n", c.FileLevel, err)
		}
	}

	var slogHandler slog.Handler
	if len(slogHandlers) > 1 {
		slogHandler = dlog.NewMultiHandler(slogHandlers...)
	} else if len(slogHandlers) == 1 {
		slogHandler = slogHandlers[0]
	} else {
		slogHandler = &dlog.NullHandler{}
	}

	slog.SetDefault(slog.New(slogHandler))
}
