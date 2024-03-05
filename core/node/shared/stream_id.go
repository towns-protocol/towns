package shared

import (
	"bytes"
	"encoding/hex"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

const (
	STREAM_CHANNEL_BIN            uint8 = 0x20
	STREAM_CHANNEL_PREFIX               = "20"
	STREAM_DM_CHANNEL_BIN         uint8 = 0x88
	STREAM_DM_CHANNEL_PREFIX            = "88"
	STREAM_GDM_CHANNEL_BIN        uint8 = 0x77
	STREAM_GDM_CHANNEL_PREFIX           = "77"
	STREAM_MEDIA_BIN              uint8 = 0xff
	STREAM_MEDIA_PREFIX                 = "ff"
	STREAM_SPACE_BIN              uint8 = 0x10
	STREAM_SPACE_PREFIX                 = "10"
	STREAM_USER_DEVICE_KEY_BIN    uint8 = 0xad
	STREAM_USER_DEVICE_KEY_PREFIX       = "ad"
	STREAM_USER_INBOX_BIN         uint8 = 0xa1
	STREAM_USER_INBOX_PREFIX            = "a1"
	STREAM_USER_BIN               uint8 = 0xa8
	STREAM_USER_PREFIX                  = "a8"
	STREAM_USER_SETTINGS_BIN      uint8 = 0xa5
	STREAM_USER_SETTINGS_PREFIX         = "a5"
)

type StreamId struct {
	bytes [32]byte
}

func StreamIdFromString(s string) (StreamId, error) {
	b, err := hex.DecodeString(s)
	if err != nil {
		return StreamId{}, RiverError(Err_BAD_STREAM_ID, "invalid address hex", "streamId", s)
	}
	return StreamIdFromBytes(b)
}

func StreamIdFromBytes(b []byte) (StreamId, error) {
	if len(b) < 3 {
		return StreamId{}, RiverError(Err_BAD_STREAM_ID, "invalid length", "streamId", b)
	}
	expectedLen, err := streamIdLengthForType(b[0])
	if err != nil {
		return StreamId{}, err
	}
	if len(b) > expectedLen {
		return StreamId{}, RiverError(Err_BAD_STREAM_ID, "invalid length", "streamId", b, "expectedLen", expectedLen, "actualLen", len(b))
	}
	var id StreamId
	copy(id.bytes[:], b)
	return id, nil
}

func StreamIdFromHash(b common.Hash) (StreamId, error) {
	expectedLen, err := streamIdLengthForType(b[0])
	if err != nil {
		return StreamId{}, err
	}
	// all bytes after expectedLen should be 0
	for i := expectedLen; i < len(b); i++ {
		if b[i] != 0 {
			return StreamId{}, RiverError(Err_BAD_STREAM_ID, "zero suffix exptected for id type", "streamId", b, "expectedLen", expectedLen)
		}
	}
	return StreamId{bytes: b}, nil
}

// Returns truncated bytes of the stream id, use with protobufs
func (id *StreamId) Bytes() []byte {
	n, err := streamIdLengthForType(id.bytes[0])
	if err != nil {
		panic(err)
	}
	return id.bytes[:n]
}

// Returns full 32 byte fixed array, use with crypto
func (id *StreamId) ByteArray() [32]byte {
	return id.bytes
}

func (id *StreamId) String() string {
	n, err := streamIdLengthForType(id.bytes[0])
	if err != nil {
		panic(err)
	}
	return hex.EncodeToString(id.bytes[:n])
}

func (id StreamId) GoString() string {
	return id.String()
}

func (id *StreamId) Equal(other StreamId) bool {
	return bytes.Equal(id.Bytes(), other.Bytes())
}

func (id *StreamId) EqualsBytes(other []byte) bool {
	return bytes.Equal(id.Bytes(), other)
}

func streamIdLengthForType(t uint8) (int, error) {
	switch t {
	case STREAM_USER_DEVICE_KEY_BIN:
		return 21, nil
	case STREAM_USER_INBOX_BIN:
		return 21, nil
	case STREAM_USER_BIN:
		return 21, nil
	case STREAM_USER_SETTINGS_BIN:
		return 21, nil
	case STREAM_MEDIA_BIN:
		return 32, nil
	case STREAM_CHANNEL_BIN:
		return 32, nil
	case STREAM_DM_CHANNEL_BIN:
		return 32, nil
	case STREAM_GDM_CHANNEL_BIN:
		return 32, nil
	case STREAM_SPACE_BIN:
		return 32, nil
	default:
		return 0, RiverError(Err_BAD_STREAM_ID, "invalid stream prefix", "prefix", t)
	}
}
