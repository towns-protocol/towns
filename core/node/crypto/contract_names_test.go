package crypto_test

import (
	"encoding/binary"
	"encoding/hex"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/xchain/bindings/erc721"
)

func TestContractNameMap(t *testing.T) {
	nameMap := crypto.NewContractNameMap()
	abi, _ := erc721.Erc721MetaData.GetAbi()
	nameMap.RegisterABI("Erc721", abi)

	balanceOfHash := "70a08231"
	bytes, err := hex.DecodeString(balanceOfHash)
	require.NoError(t, err)
	balanceOfSelector := binary.BigEndian.Uint32(bytes)
	name, ok := nameMap.GetMethodName(balanceOfSelector)
	require.True(t, ok)
	require.Equal(t, "Erc721.balanceOf", name)

	transferFromHash := "23b872dd"
	bytes, err = hex.DecodeString(transferFromHash)
	require.NoError(t, err)
	transferFromSelector := binary.BigEndian.Uint32(bytes)
	name, ok = nameMap.GetMethodName(transferFromSelector)
	require.True(t, ok)
	require.Equal(t, "Erc721.transferFrom", name)
}
