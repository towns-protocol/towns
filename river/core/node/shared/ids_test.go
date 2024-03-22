package shared

import (
	"bytes"
	"fmt"
	"log/slog"
	"reflect"
	"strings"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidDMStreamId(t *testing.T) {
	userIdA, _ := AddressFromUserId("0x376eC15Fa24A76A18EB980629093cFFd559333Bb")
	userIdB, _ := AddressFromUserId("0x6d58a6597Eb5F849Fb46604a81Ee31654D6a4B44")
	expected := "88b6cd7a587ea499f57bfdc820b8c57ef654e38bc4572e7843df05321dd74c2f"

	res, err := DMStreamIdForUsers(userIdA, userIdB)
	assert.NoError(t, err)
	assert.Equal(t, expected, res.String())

	// Test that the order of the user ids doesn't matter
	res, err = DMStreamIdForUsers(userIdB, userIdA)
	assert.NoError(t, err)
	assert.Equal(t, expected, res.String())
}

func TestInvalidDMStreamId(t *testing.T) {
	userIdA, _ := AddressFromUserId("0x376eC15Fa24A76A18EB980629093cFFd559333Bb")
	userIdB, _ := AddressFromUserId("0x6d58a6597Eb5F849Fb46604a81Ee31654D6a4B44")
	notExpected, err := StreamIdFromString(STREAM_DM_CHANNEL_PREFIX + strings.Repeat("0", 62))
	assert.NoError(t, err)

	assert.False(t, ValidDMChannelStreamIdBetween(notExpected, userIdA, userIdB))
}

func TestStreamIdFromString(t *testing.T) {
	addrStr := "0x376eC15Fa24A76A18EB980629093cFFd559333Bb"
	addr := common.HexToAddress(addrStr)
	a := UserStreamIdFromAddr(addr)
	streamIdStr := padStringId(STREAM_USER_PREFIX + strings.ToLower(addrStr[2:]))
	assert.Equal(t, streamIdStr, a.String())

	length, err := StreamIdContentLengthForType(STREAM_USER_BIN)
	require.NoError(t, err)

	var bytes [32]byte
	require.Equal(t, length, 21) // hard coded value is 21
	bytes[0] = STREAM_USER_BIN
	copy(bytes[1:], addr.Bytes())

	streamIdFromBytes, err := StreamIdFromBytes(bytes[:])
	require.NoError(t, err)
	streamIdFromStr, err := StreamIdFromString(a.String())
	require.NoError(t, err)
	assert.Equal(t, a.String(), streamIdFromBytes.String())
	assert.Equal(t, a.String(), streamIdFromStr.String())
	assert.Equal(t, streamIdFromBytes, streamIdFromStr)
}

func TestReflectStreamId(t *testing.T) {
	streamId, err := StreamIdFromString(padStringId(STREAM_SPACE_PREFIX + "a00000"))
	require.NoError(t, err)
	goStringerType := reflect.TypeOf((*fmt.GoStringer)(nil)).Elem()
	v := reflect.ValueOf(streamId)
	assert.True(t, v.IsValid())
	assert.True(t, v.CanInterface())
	assert.True(t, v.Type().Implements(goStringerType))
	i := v.Interface()
	_, ok := i.(fmt.GoStringer)
	assert.True(t, ok)
}

func TestLoggingText(t *testing.T) {
	require := require.New(t)

	buffer := &bytes.Buffer{}
	log := slog.New(dlog.NewPrettyTextHandler(buffer, &dlog.PrettyHandlerOptions{
		Colors: dlog.ColorMap_Disabled,
	}))

	streamId, err := StreamIdFromBytes(padBytesId([]byte{STREAM_SPACE_BIN, 0x22, 0x33}))
	require.NoError(err)

	log.Info("test", "streamId", streamId)
	require.Contains(buffer.String(), "1022330000000000000000000000000000000000000000000000000000000000")
}

func TestLoggingJson(t *testing.T) {
	require := require.New(t)

	buffer := &bytes.Buffer{}
	log := slog.New(dlog.NewPrettyJSONHandler(buffer, &dlog.PrettyHandlerOptions{}))

	streamId, err := StreamIdFromBytes(padBytesId([]byte{STREAM_SPACE_BIN, 0x22, 0x33}))
	require.NoError(err)

	log.Info("test", "streamId", streamId)
	require.Contains(buffer.String(), "1022330000000000000000000000000000000000000000000000000000000000")
}

func TestErrorFormat(t *testing.T) {
	require := require.New(t)

	streamId, err := StreamIdFromBytes(padBytesId([]byte{STREAM_SPACE_BIN, 0x22, 0x33}))
	require.NoError(err)

	err = RiverError(Err_INTERNAL, "test error", "streamId", streamId)
	require.Contains(err.Error(), "1022330000000000000000000000000000000000000000000000000000000000")
}

func padStringId(s string) string {
	if len(s) < STREAM_ID_STRING_LENGTH {
		s += strings.Repeat("0", STREAM_ID_STRING_LENGTH-len(s))
	}
	return s
}

func padBytesId(b []byte) []byte {
	if len(b) < STREAM_ID_BYTES_LENGTH {
		b = append(b, make([]byte, STREAM_ID_BYTES_LENGTH-len(b))...)
	}
	return b
}
