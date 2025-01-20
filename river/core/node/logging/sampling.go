package logging

import (
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// SampledLogger returns a modified version of the input log that samples the logs
// using zap's sampling algorithm, which drops logs with identical messages within
// a time period after a threshold of identical logs is met. The sampling here is
// configured to drop 95% of logs after 10 of the same log message is seen in 10
// seconds.
func SampledLogger(log *zap.Logger) *zap.Logger {
	return log.WithOptions(
		zap.WrapCore(
			func(core zapcore.Core) zapcore.Core {
				return zapcore.NewSamplerWithOptions(core, 10*time.Second, 10, 20)
			},
		),
	)
}
