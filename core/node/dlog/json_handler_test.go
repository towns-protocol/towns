package dlog_test

import (
	"os"
	"testing"

	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/testutils"
	"github.com/stretchr/testify/require"
)

func TestJsonLoggerLogsSaneProtoBinaryStrings(t *testing.T) {
	envelope := &Envelope{
		Hash: []byte("2346ad27d7568ba9896f1b7da6b5991251debdf2"),
	}

	// Create a new dlog logger that logs to a temp file in JSON format
	logger, buffer := testutils.DlogJsonLogger()

	logger.Info("Logging envelope", "envelope", envelope)

	logOutput := buffer.String()
	logOutput = testutils.RemoveJsonTimestamp(string(logOutput))

	expectedBytes, err := os.ReadFile("testdata/envelope_json.txt")
	require.NoError(t, err)
	expected := testutils.RemoveJsonTimestamp(string(expectedBytes[:]))

	// Compare the output with the expected output
	// The expected output contains a b64-encoded string of the Hash field above.
	require.Equal(t, expected, logOutput)
}
