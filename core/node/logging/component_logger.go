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
	ComponentsLogger struct {
		// Default represents the global logger that uses the default log level and
		// doesn't include the component in the structured log output. Logging that
		// isn't written to a specific component logger will be written to this logger.
		Default *zap.SugaredLogger
		// Miniblock represents the logger for the Miniblock component.
		Miniblock *zap.SugaredLogger
		// Miniblock represents the logger for the Rpc component.
		Rpc *zap.SugaredLogger
	}

	// ComponentCore wraps a zapcore.Core and allows to set log level per component.
	ComponentCore struct {
		levels  LogLevels
		wrapped zapcore.Core
	}

	// LogLevels represents the set of log levels for each component.
	LogLevels map[string]zapcore.Level
)

func (cl *ComponentsLogger) With(args ...interface{}) *ComponentsLogger {
	return &ComponentsLogger{
		Default:   cl.Default.With(args...),
		Miniblock: cl.Miniblock.With(args...),
		Rpc:       cl.Rpc.With(args...),
	}
}

// Level reports the minimum enabled level for the default logger.
//
// For NopLoggers, this is [zapcore.InvalidLevel].
func (cl *ComponentsLogger) Level() zapcore.Level {
	return cl.Default.Level()
}

// Debug logs a message with the default logger.
func (cl *ComponentsLogger) Debug(args ...interface{}) {
	cl.Default.Debug(args)
}

// Debugw logs a message with the default logger.
func (cl *ComponentsLogger) Debugw(msg string, keysAndValues ...interface{}) {
	cl.Default.Debugw(msg, keysAndValues...)
}

// Infow logs a message with the default logger.
func (cl *ComponentsLogger) Infow(msg string, keysAndValues ...interface{}) {
	cl.Default.Infow(msg, keysAndValues...)
}

// Info logs a message with the default logger.
func (cl *ComponentsLogger) Info(args ...interface{}) {
	cl.Default.Info(args)
}

// Warnw logs a message with the default logger.
func (cl *ComponentsLogger) Warnw(msg string, keysAndValues ...interface{}) {
	cl.Default.Warnw(msg, keysAndValues...)
}

// Errorw logs a message with the default logger.
func (cl *ComponentsLogger) Errorw(msg string, keysAndValues ...interface{}) {
	cl.Default.Errorw(msg, keysAndValues...)
}

// Error logs a message with the default logger.
func (cl *ComponentsLogger) Error(args ...interface{}) {
	cl.Default.Error(args)
}

// Logw logs a message with some additional context with the default logger.
// The variadic key-value pairs are treated as they are in With.
func (cl *ComponentsLogger) Logw(lvl zapcore.Level, msg string, keysAndValues ...interface{}) {
	cl.Default.Logw(lvl, msg, nil, keysAndValues)
}

func NewComponentCore(wrapped zapcore.Core, levels LogLevels) *ComponentCore {
	return &ComponentCore{levels: levels, wrapped: wrapped}
}

func (c *ComponentCore) Enabled(level zapcore.Level) bool {
	return true // always true because this hasn't got the context of the component
}

func (c *ComponentCore) With(fields []zapcore.Field) zapcore.Core {
	return c.wrapped.With(fields)
}

func (c *ComponentCore) Check(ent zapcore.Entry, ce *zapcore.CheckedEntry) *zapcore.CheckedEntry {
	if lvl, found := c.levels[ent.LoggerName]; found {
		if ent.Level >= lvl {
			return ce.AddCore(ent, c)
		} else {
			return ce // don't log
		}
	}
	return c.wrapped.Check(ent, ce) // fall back to global level on the core
}

func (c *ComponentCore) Write(entry zapcore.Entry, fields []zapcore.Field) error {
	return c.wrapped.Write(entry, fields)
}

func (c *ComponentCore) Sync() error {
	return c.wrapped.Sync()
}

func (ll LogLevels) DefaultLevel() zapcore.Level {
	if lvl, ok := ll["default"]; ok {
		return lvl
	}
	return zapcore.InfoLevel
}

func (ll LogLevels) DebugEnabled() bool {
	if lvl, ok := ll["default"]; ok {
		return lvl <= zapcore.DebugLevel
	}
	return false // default is info
}

func (ll LogLevels) Merge(other LogLevels) LogLevels {
	for k, v := range other {
		ll[k] = v
	}
	return ll
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
		levels          = LogLevels{"default": zapcore.InfoLevel}
	)

	if len(tokens) == 0 {
		return levels, nil
	}

	// see if cfg starts with global log level
	if err := defaultLogLevel.UnmarshalText([]byte(tokens[0])); err == nil {
		levels["default"] = defaultLogLevel
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

		switch parts[0] {
		case "default":
			levels["default"] = lvl
		case "miniblock":
			levels["miniblock"] = lvl
		case "rpc":
			levels["rpc"] = lvl
		default:
			return nil, fmt.Errorf("unsupported log configuration component %s", cfg)
		}
	}

	return levels, nil
}
