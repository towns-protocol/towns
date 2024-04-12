package shared

import (
	"bytes"
	"encoding/hex"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5/pgtype"
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
)

const (
	STREAM_CHANNEL_BIN            byte = 0x20
	STREAM_CHANNEL_PREFIX              = "20"
	STREAM_DM_CHANNEL_BIN         byte = 0x88
	STREAM_DM_CHANNEL_PREFIX           = "88"
	STREAM_GDM_CHANNEL_BIN        byte = 0x77
	STREAM_GDM_CHANNEL_PREFIX          = "77"
	STREAM_MEDIA_BIN              byte = 0xff
	STREAM_MEDIA_PREFIX                = "ff"
	STREAM_SPACE_BIN              byte = 0x10
	STREAM_SPACE_PREFIX                = "10"
	STREAM_USER_DEVICE_KEY_BIN    byte = 0xad
	STREAM_USER_DEVICE_KEY_PREFIX      = "ad"
	STREAM_USER_INBOX_BIN         byte = 0xa1
	STREAM_USER_INBOX_PREFIX           = "a1"
	STREAM_USER_BIN               byte = 0xa8
	STREAM_USER_PREFIX                 = "a8"
	STREAM_USER_SETTINGS_BIN      byte = 0xa5
	STREAM_USER_SETTINGS_PREFIX        = "a5"

	STREAM_ID_BYTES_LENGTH  = 32
	STREAM_ID_STRING_LENGTH = STREAM_ID_BYTES_LENGTH * 2
)

type StreamId [STREAM_ID_BYTES_LENGTH]byte

func StreamIdFromString(s string) (StreamId, error) {
	b, err := hex.DecodeString(s)
	if err != nil {
		return StreamId{}, RiverError(Err_BAD_STREAM_ID, "invalid address hex", "streamId", s)
	}
	return StreamIdFromBytes(b)
}

func StreamIdFromBytes(b []byte) (StreamId, error) {
	err := checkExpectedLength(b[:])
	if err != nil {
		return StreamId{}, err
	}
	var id StreamId
	copy(id[:], b)
	return id, nil
}

// Hash represents the 32 byte Keccak256 hash of arbitrary data.
func StreamIdFromHash(b common.Hash) (StreamId, error) {
	err := checkExpectedLength(b[:])
	if err != nil {
		return StreamId{}, err
	}
	var sid StreamId
	copy(sid[:], b[:])
	return sid, nil
}

func checkExpectedLength(b []byte) error {
	if len(b) != STREAM_ID_BYTES_LENGTH {
		return RiverError(Err_BAD_STREAM_ID, "invalid length", "streamId", b)
	}
	expectedContentLen, err := StreamIdContentLengthForType(b[0])
	if err != nil {
		return err
	}
	// all bytes after expectedLen should be 0
	for i := expectedContentLen; i < len(b); i++ {
		if b[i] != 0 {
			return RiverError(
				Err_BAD_STREAM_ID,
				"zero suffix expected for id type",
				"streamId",
				b,
				"expectedLen",
				expectedContentLen,
			)
		}
	}
	return nil
}

func (id StreamId) String() string {
	return hex.EncodeToString(id[:])
}

func (id StreamId) GoString() string {
	return id.String()
}

func (id StreamId) EqualsBytes(other []byte) bool {
	return bytes.Equal(id[:], other)
}

func (id StreamId) Type() byte {
	return id[0]
}

func (id StreamId) Compare(other StreamId) int {
	return bytes.Compare(id[:], other[:])
}

// user streams are expected to have 20 bytes of address, so the expected content length is 21 when including the prefix
func StreamIdContentLengthForType(t byte) (int, error) {
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
		return 21, nil
	default:
		return 0, RiverError(Err_BAD_STREAM_ID, "invalid stream prefix", "prefix", t)
	}
}

// Here abstraction leaks to implement marshalling for pgx.
// TODO: This can be avoided by registering a custom type with pgx.
func (id StreamId) TextValue() (pgtype.Text, error) {
	return pgtype.Text{
		String: id.String(),
		Valid:  true,
	}, nil
}

func (id *StreamId) ScanText(v pgtype.Text) error {
	if !v.Valid {
		*id = StreamId{}
		return nil
	}
	var err error
	*id, err = StreamIdFromString(v.String)
	if err != nil {
		return err
	}
	return nil
}

func (id StreamId) MarshalJSON() ([]byte, error) {
	return []byte("\"" + id.String() + "\""), nil
}
