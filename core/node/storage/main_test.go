package storage

import (
	"os"
	"testing"

	"github.com/towns-protocol/towns/core/node/crypto"
)

func TestMain(m *testing.M) {
	c := m.Run()
	if c != 0 {
		os.Exit(c)
	}

	crypto.TestMainForLeaksIgnoreGeth()
}
