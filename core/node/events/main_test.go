package events

import (
	"os"
	"testing"

	"github.com/towns-protocol/towns/core/node/crypto"
)

func TestMain(m *testing.M) {
	_ = os.Setenv("ENABLE_NEW_SNAPSHOT_FORMAT", "true")

	c := m.Run()
	if c != 0 {
		os.Exit(c)
	}

	crypto.TestMainForLeaksIgnoreGeth()
}
