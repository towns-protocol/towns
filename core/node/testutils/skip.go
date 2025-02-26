package testutils

import (
	"os"
	"testing"
)

func SkipFlackyTest(t *testing.T, msg string) {
	if os.Getenv("RIVER_TEST_ENABLE_FLACKY") == "" {
		t.Skip(msg)
	}
}
