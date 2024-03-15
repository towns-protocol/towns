package testutils

import (
	"crypto/rand"
	"strings"

	"github.com/river-build/river/core/node/shared"
)

func FakeStreamId(prefix byte) shared.StreamId {
	var b [32]byte
	b[0] = prefix
	n, err := shared.StreamIdContentLengthForType(prefix)
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

func MakeChannelId(spaceId shared.StreamId) shared.StreamId {
	id, err := shared.MakeChannelId(spaceId)
	if err != nil {
		panic(err)
	}
	return id
}

func StreamIdFromString(s string) shared.StreamId {
	if len(s) < shared.STREAM_ID_STRING_LENGTH {
		s += strings.Repeat("0", shared.STREAM_ID_STRING_LENGTH-len(s))
	}
	streamId, err := shared.StreamIdFromString(s)
	if err != nil {
		panic(err)
	}
	return streamId
}

func StreamIdFromBytes(b []byte) shared.StreamId {
	if len(b) < shared.STREAM_ID_BYTES_LENGTH {
		b = append(b, make([]byte, shared.STREAM_ID_BYTES_LENGTH-len(b))...)
	}
	streamId, err := shared.StreamIdFromBytes(b)
	if err != nil {
		panic(err)
	}
	return streamId
}
