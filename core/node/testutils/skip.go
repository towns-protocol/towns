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

func SkipXlTest(t *testing.T) {
	if os.Getenv("RIVER_TEST_ENABLE_XL") == "" {
		t.Skip("Skipping xl test", t.Name(), "(RIVER_TEST_ENABLE_XL to enable)")
	}
}
