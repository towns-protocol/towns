package testutils

import (
	"crypto/rand"
	"encoding/hex"
)

func FakeStreamId(prefix string) string {
	b := make([]byte, 20)
	_, err := rand.Read(b)
	if err != nil {
		panic(err)
	}
	return prefix + "-" + hex.EncodeToString(b)
}
