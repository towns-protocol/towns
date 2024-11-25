package crypto

import (
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	c := m.Run()
	if c != 0 {
		os.Exit(c)
	}

	TestMainForLeaksIgnoreGeth()
}
