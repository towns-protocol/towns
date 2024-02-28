package testutils

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/shared"
)

func FakeStreamId(prefix string) string {
	b := make([]byte, shared.ExpectedStreamIdLength(prefix)/2-1)
	_, err := rand.Read(b)
	if err != nil {
		panic(err)
	}
	return prefix + hex.EncodeToString(b)
}

func UserStreamIdFromAddress(address common.Address) string {
	streamId, err := shared.UserStreamIdFromAddress(address)
	if err != nil {
		panic(err)
	}
	return streamId
}
