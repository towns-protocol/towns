package shared

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidDMStreamId(t *testing.T) {
	userIdA, _ := AddressFromUserId("0x376eC15Fa24A76A18EB980629093cFFd559333Bb")
	userIdB, _ := AddressFromUserId("0x6d58a6597Eb5F849Fb46604a81Ee31654D6a4B44")
	expected := "DMDM-b6cd7a587ea499f57bfdc820b8c57ef654e38bc4572e7843df05321dd74c2f36"

	assert.True(t, ValidDMChannelStreamIdBetween(expected, userIdA, userIdB))
}

func TestReverseOrderDMStreamId(t *testing.T) {
	userIdA, _ := AddressFromUserId("0x376eC15Fa24A76A18EB980629093cFFd559333Bb")
	userIdB, _ := AddressFromUserId("0x6d58a6597Eb5F849Fb46604a81Ee31654D6a4B44")
	expected := "DMDM-b6cd7a587ea499f57bfdc820b8c57ef654e38bc4572e7843df05321dd74c2f36"

	assert.True(t, ValidDMChannelStreamIdBetween(expected, userIdB, userIdA))
}

func TestInvalidDMStreamId(t *testing.T) {
	userIdA, _ := AddressFromUserId("0x376eC15Fa24A76A18EB980629093cFFd559333Bb")
	userIdB, _ := AddressFromUserId("0x6d58a6597Eb5F849Fb46604a81Ee31654D6a4B44")
	expected := "DMDM-invalid-id"

	assert.False(t, ValidDMChannelStreamIdBetween(expected, userIdA, userIdB))
}
