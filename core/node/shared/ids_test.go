package shared

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/stretchr/testify/assert"
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

	var expectedId StreamId
	expectedId[0] = STREAM_USER_BIN
	copy(expectedId[1:], addr.Bytes())
	id, err := StreamIdFromString(a)
	assert.NoError(t, err)
	assert.Equal(t, expectedId, id)
}
