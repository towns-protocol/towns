package auth

import (
	"os"
	"testing"

	"github.com/river-build/river/core/node/crypto"
)

func TestMain(m *testing.M) {
	c := m.Run()
	if c != 0 {
		os.Exit(c)
	}

	crypto.TestMainForLeaksIgnoreGeth()
}
