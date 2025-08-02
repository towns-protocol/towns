package logging_test

import (
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap/zapcore"

	"github.com/towns-protocol/towns/core/node/logging"
)

func TestParseLogLevels(t *testing.T) {
	t.Parallel()

	tests := []struct {
		lvl    string
		exp    logging.LogLevels
		expErr bool
	}{
		{"", logging.LogLevels{logging.Default: zapcore.InfoLevel}, false},
		{"info", logging.LogLevels{logging.Default: zapcore.InfoLevel}, false},
		{"debug", logging.LogLevels{logging.Default: zapcore.DebugLevel}, false},
		{
			"warn,miniblock=debug",
			logging.LogLevels{logging.Default: zapcore.WarnLevel, logging.Miniblock: zapcore.DebugLevel},
			false,
		},
		{
			"warn,miniblock=debug,rpc=info",
			logging.LogLevels{
				logging.Default:   zapcore.WarnLevel,
				logging.Miniblock: zapcore.DebugLevel,
				logging.Rpc:       zapcore.InfoLevel,
			},
			false,
		},
		{",", nil, true},
		{"warn,", nil, true},
		{"warn,,miniblock=debug,rpc=info", nil, true},
		{"warn,miniblock=debug,,rpc=info", nil, true},
		{"warn,miniblock=debug,rpc=info,", nil, true},
	}

	assert := assert.New(t)

	for _, test := range tests {
		t.Run(test.lvl, func(t *testing.T) {
			got, err := logging.ParseLogLevels(test.lvl)
			assert.False(err == nil && test.expErr, "expected error, got nil")
			assert.False(err != nil && !test.expErr, "expected no error, got %v", err)
			assert.True(cmp.Equal(test.exp, got), "expected %s, got %s", test.exp, got)
		})
	}
}
