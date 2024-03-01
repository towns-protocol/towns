package shared

import (
	"fmt"
	"reflect"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/river-build/river/core/node/dlog"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidDMStreamId(t *testing.T) {
	userIdA, _ := AddressFromUserId("0x376eC15Fa24A76A18EB980629093cFFd559333Bb")
	userIdB, _ := AddressFromUserId("0x6d58a6597Eb5F849Fb46604a81Ee31654D6a4B44")
	expected := "88b6cd7a587ea499f57bfdc820b8c57ef654e38bc4572e7843df05321dd74c2f"

	res, err := DMStreamIdForUsers(userIdA, userIdB)
	assert.NoError(t, err)
	assert.Equal(t, expected, res)

	// Test that the order of the user ids doesn't matter
	res, err = DMStreamIdForUsers(userIdB, userIdA)
	assert.NoError(t, err)
	assert.Equal(t, expected, res)
}

func TestInvalidDMStreamId(t *testing.T) {
	userIdA, _ := AddressFromUserId("0x376eC15Fa24A76A18EB980629093cFFd559333Bb")
	userIdB, _ := AddressFromUserId("0x6d58a6597Eb5F849Fb46604a81Ee31654D6a4B44")
	expected := "DMDM-invalid-id"

	assert.False(t, ValidDMChannelStreamIdBetween(expected, userIdA, userIdB))
}

func TestStreamIdFromString(t *testing.T) {
	addr := common.HexToAddress("0x376eC15Fa24A76A18EB980629093cFFd559333Bb")
	a, err := UserStreamIdFromAddress(addr)
	assert.NoError(t, err)
	assert.Equal(t, "a8376ec15fa24a76a18eb980629093cffd559333bb", a)

	length, err := streamIdLengthForType(STREAM_USER_BIN)
	require.NoError(t, err)

	var bytes [21]byte
	require.Equal(t, length, 21) // hard coded value is 21
	bytes[0] = STREAM_USER_BIN
	copy(bytes[1:], addr.Bytes())

	streamIdFromBytes, err := StreamIdFromBytes(bytes[:])
	require.NoError(t, err)
	streamIdFromStr, err := StreamIdFromString(a)
	require.NoError(t, err)
	assert.Equal(t, a, streamIdFromBytes.String())
	assert.Equal(t, a, streamIdFromStr.String())
	assert.Equal(t, streamIdFromBytes, streamIdFromStr)
}

func TestLogStreamId(t *testing.T) {
	log := dlog.Log()

	streamId1, err := StreamIdFromString(STREAM_SPACE_PREFIX + "a00000")
	require.NoError(t, err)
	log.Info("streamId", "streamId1", streamId1)

	streamId2, err := StreamIdFromBytes([]byte{STREAM_SPACE_BIN, 0x22, 0x33})
	require.NoError(t, err)
	log.Info("streamId", "streamId2", streamId2)
}

func TestReflectStreamId(t *testing.T) {
	streamId, err := StreamIdFromString(STREAM_SPACE_PREFIX + "a00000")
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
