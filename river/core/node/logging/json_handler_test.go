package logging_test

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"

	. "github.com/river-build/river/core/node/protocol"
	"github.com/river-build/river/core/node/testutils"
)

func TestJsonLoggerLogsSaneProtoBinaryStrings(t *testing.T) {
	// The byte string renders sanely, but the proto is missing nested brackets in the
	// final log response.
	t.Skip("TODO - implement in zap")
	envelope := &Envelope{
		Hash: []byte("2346ad27d7568ba9896f1b7da6b5991251debdf2"),
	}

	// Create a new logging logger that logs to a temp file in JSON format
	logger, buffer := testutils.ZapJsonLogger()

	logger.Infow("Logging envelope", "envelope", envelope)

	logOutput := buffer.String()
	logOutput = testutils.RemoveJsonTimestamp(string(logOutput))

	expectedBytes, err := os.ReadFile("testdata/envelope_json.txt")
	require.NoError(t, err)
	expected := testutils.RemoveJsonTimestamp(string(expectedBytes[:]))

	// Compare the output with the expected output
	// The expected output contains a b64-encoded string of the Hash field above.
	t.Log(logOutput)
	require.Equal(t, expected, logOutput)
}
