package logging

import (
	"fmt"
	"strings"

	"go.uber.org/zap"

	"go.uber.org/zap/zapcore"
)

// ComponentsLogger provides component based logging.
// Log level can be configured per component.
type (
	Log struct {
		// RootLogger is the global logger from with all other loggers are a descendant.
		RootLogger *zap.Logger
		// Default represents the global logger that uses the default log level.
		// Logging that directly written on Log uses this logger by default.
		Default *zap.SugaredLogger
		// Miniblock represents the logger for the Miniblock component.
		Miniblock *zap.SugaredLogger
		// Miniblock represents the logger for the Rpc component.
		Rpc *zap.SugaredLogger
		// StreamSync is a logger for the sync component, which is used for syncing streams.
		StreamSync *zap.SugaredLogger
	}

	// LogLevels represents the set of log levels for each component.
	LogLevels map[Component]zapcore.Level
)

// Component represents the supported logging components enum.
// See the list of components below.
type Component string

const (
	Default    Component = "default"
	Miniblock  Component = "miniblock"
	Rpc        Component = "rpc"
	StreamSync Component = "sync"
)

func (l *Log) With(args ...interface{}) *Log {
	return &Log{
		RootLogger: l.RootLogger,
		Default:    l.Default.With(args...),
		Miniblock:  l.Miniblock.With(args...),
		Rpc:        l.Rpc.With(args...),
		StreamSync: l.StreamSync.With(args...),
	}
}

// Named returns a new Log with child loggers that are named with the given name.
func (l *Log) Named(name string) *Log {
	return &Log{
		RootLogger: l.RootLogger,
		Default:    l.Default.Named(name),
		Miniblock:  l.Miniblock.Named(name),
		Rpc:        l.Rpc.Named(name),
		StreamSync: l.StreamSync.Named(name),
	}
}

func (l *Log) Level() zapcore.Level {
	return l.Default.Level()
}

// Debug is a convenient alias for l.Default.Debug
func (l *Log) Debug(args ...interface{}) {
	l.Default.Debug(args)
}

// Debugw is a convenient alias for l.Default.Debugw
func (l *Log) Debugw(msg string, keysAndValues ...interface{}) {
	l.Default.Debugw(msg, keysAndValues...)
}

// Info is a convenient alias for l.Default.Info
func (l *Log) Info(args ...interface{}) {
	l.Default.Info(args...)
}

// Logw is a convenient alias for l.Default.Logw
func (l *Log) Logw(lvl zapcore.Level, msg string, keysAndValues ...interface{}) {
	l.Default.Logw(lvl, msg, keysAndValues...)
}

// Infow is a convenient alias for l.Default.Infow
func (l *Log) Infow(msg string, keysAndValues ...interface{}) {
	l.Default.Infow(msg, keysAndValues...)
}

// Warn is a convenient alias for l.Default.Warn
func (l *Log) Warn(args ...interface{}) {
	l.Default.Warn(args...)
}

// Warnw is a convenient alias for l.Default.Warnw
func (l *Log) Warnw(msg string, keysAndValues ...interface{}) {
	l.Default.Warnw(msg, keysAndValues...)
}

// Error is a convenient alias for l.Default.Error
func (l *Log) Error(args ...interface{}) {
	l.Default.Error(args...)
}

// Errorw is a convenient alias for l.Default.Errorw
func (l *Log) Errorw(msg string, keysAndValues ...interface{}) {
	l.Default.Errorw(msg, keysAndValues...)
}

// Panicw is a convenient alias for l.Default.Panicw
func (l *Log) Panicw(msg string, keysAndValues ...interface{}) {
	l.Default.Panicw(msg, keysAndValues...)
}

// Sync flushes any buffered log entries.
func (l *Log) Sync() error {
	if err := l.Default.Sync(); err != nil {
		return err
	}
	if err := l.Rpc.Sync(); err != nil {
		return err
	}
	return l.Miniblock.Sync()
}

func (ll LogLevels) OverWriteWith(other LogLevels) LogLevels {
	result := make(LogLevels)
	for k, v := range ll {
		result[k] = v
	}
	for k, v := range other {
		result[k] = v
	}
	return result
}

// NoComponentOverwrites returns true if the log levels only contain the default log level and no component overwrites.
func (ll LogLevels) NoComponentOverwrites() bool {
	_, ok := ll[Default]
	return ok && len(ll) == 1
}

func (ll LogLevels) LowestLevel() zapcore.Level {
	lvl := zapcore.DebugLevel
	for _, l := range ll {
		if !lvl.Enabled(l) {
			lvl = l
		}
	}

	return lvl
}

func (ll LogLevels) core(c Component, core zapcore.Core) (zapcore.Core, error) {
	lowestLevel := ll.LowestLevel()
	lvl := ll.LowestLevel()

	if l, ok := ll[c]; ok { // custom component overwrite
		lvl = l
	} else if l, ok := ll[Default]; ok { // fall back to defaut log level for all components
		lvl = l
	}

	if lvl > lowestLevel { // only increase level when component level is higher than the lowest level
		return zapcore.NewIncreaseLevelCore(core, lvl)
	}

	return core, nil
}

func (ll LogLevels) Cores(
	core zapcore.Core,
) (
	default_ zapcore.Core,
	miniblock zapcore.Core,
	rpc zapcore.Core,
	sync zapcore.Core,
	err error,
) {
	defCore, err := ll.core(Default, core)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	mbCore, err := ll.core(Miniblock, core)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	rpcCore, err := ll.core(Rpc, core)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	syncCore, err := ll.core(StreamSync, core)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	return defCore, mbCore, rpcCore, syncCore, nil
}

// ParseLogLevels decodes the given cfg into log configuration grouped by module.
// It starts with a global log leven for the default logger followed by optional
// component specific log levels prefixed with a comma.
// e.g. <log level>[,<component>=<log level>]*
//
// examples:
// "" (empty string, all loggers are INFO)
// debug (all loggers are DEBUG)
// info,rpc=debug (all loggers are INFO, except rpc is DEBUG)
// info,rpc=debug,txpool=debug (all loggers are INFO, except rpc and txpool are DEBUG)
func ParseLogLevels(cfg string) (LogLevels, error) {
	var (
		defaultLogLevel = zapcore.InfoLevel
		tokens          = strings.Split(strings.ToLower(strings.ReplaceAll(cfg, " ", "")), ",")
		levels          = LogLevels{Default: zapcore.InfoLevel}
	)

	if len(tokens) == 0 {
		return levels, nil
	}

	// see if cfg starts with global log level
	if err := defaultLogLevel.UnmarshalText([]byte(tokens[0])); err == nil {
		levels[Default] = defaultLogLevel
		tokens = tokens[1:]
	}

	// tokens holds now keypairs of component=loglevel
	for _, token := range tokens {
		parts := strings.Split(token, "=")
		if len(parts) != 2 {
			return nil, fmt.Errorf("unsupported log configuration component %s", cfg)
		}

		lvl := zapcore.InfoLevel
		if err := lvl.UnmarshalText([]byte(parts[1])); err != nil {
			return nil, fmt.Errorf("invalid log configuration components value %s", cfg)
		}

		switch Component(strings.ToLower(parts[0])) {
		case Miniblock:
			levels[Miniblock] = lvl
		case Rpc:
			levels[Rpc] = lvl
		case StreamSync:
			levels[StreamSync] = lvl
		default:
			return nil, fmt.Errorf("unsupported log configuration component %s", parts[0])
		}
	}

	return levels, nil
}
