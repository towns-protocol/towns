package testutils

import (
	"crypto/rand"

	"github.com/river-build/river/core/node/shared"
)

func FakeStreamId(prefix byte) shared.StreamId {
	var b [32]byte
	b[0] = prefix
	n, err := shared.StreamIdLengthForType(prefix)
	if err != nil {
		panic(err)
	}
	_, err = rand.Read(b[1:n])
	if err != nil {
		panic(err)
	}
	id, err := shared.StreamIdFromHash(b)
	if err != nil {
		panic(err)
	}
	return id
}

// func UserStreamIdFromAddress(address common.Address) string {
// 	streamId, err := shared.UserStreamIdFromAddress(address)
// 	if err != nil {
// 		panic(err)
// 	}
// 	return streamId
// }

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

// func StreamIdStringToBytes(s string) []byte {
// 	b, err := shared.StreamIdFromString(s)
// 	if err != nil {
// 		panic(err)
// 	}
// 	return b.Bytes()
// }
