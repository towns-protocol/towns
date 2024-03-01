package testutils

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/shared"
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

func StreamIdFromString(s string) shared.StreamId {
	streamId, err := shared.StreamIdFromString(s)
	if err != nil {
		panic(err)
	}
	return streamId
}

func StreamIdFromBytes(b []byte) shared.StreamId {
	streamId, err := shared.StreamIdFromBytes(b)
	if err != nil {
		panic(err)
	}
	return streamId
}


func StreamIdStringToBytes(s string) []byte {
	b, err := shared.StreamIdFromString(s)
	if err != nil {
		panic(err)
	}
	return b.Bytes()
}