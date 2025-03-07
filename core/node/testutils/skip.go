package testutils

import (
	"os"
	"testing"
)

func SkipFlakyTest(t *testing.T, msg string) {
	if os.Getenv("RIVER_TEST_ENABLE_FLAKY") == "" {
		t.Skip("Skipping flaky test", t.Name(), "(RIVER_TEST_ENABLE_FLAKY to enable)", msg)
	}
}
