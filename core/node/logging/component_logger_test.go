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
		{"", logging.LogLevels{"default": zapcore.InfoLevel}, false},
		{"info", logging.LogLevels{"default": zapcore.InfoLevel}, false},
		{"debug", logging.LogLevels{"default": zapcore.DebugLevel}, false},
		{"warn,", nil, true},
		{"warn,miniblock=debug", logging.LogLevels{"default": zapcore.WarnLevel, "miniblock": zapcore.DebugLevel}, false},
		{"warn,miniblock=debug,rpc=info", logging.LogLevels{"default": zapcore.WarnLevel, "miniblock": zapcore.DebugLevel, "rpc": zapcore.InfoLevel}, false},
		{"warn,,miniblock=debug,rpc=info", nil, true},
		{"warn,miniblock=debug,,rpc=info", nil, true},
		{"warn,miniblock=debug,rpc=info,", nil, true},
	}

	require := assert.New(t)

	for _, test := range tests {
		t.Run(test.lvl, func(t *testing.T) {
			got, err := logging.ParseLogLevels(test.lvl)
			require.False(err == nil && test.expErr, "expected error, got nil")
			require.False(err != nil && !test.expErr, "expected no error, got %v", err)
			require.True(cmp.Equal(test.exp, got), "expected %s, got %s", test.exp, got)
		})
	}
}
