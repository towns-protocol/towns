package testutils

import (
	"os"
	"testing"
)

func SkipFlackyTest(t *testing.T) {
	if os.Getenv("RIVER_TEST_ENABLE_FLACKY") == "" {
		t.Skip("skipping flacky test")
	}
}
