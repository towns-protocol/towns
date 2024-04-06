package base

import (
	"fmt"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/protocol"
)

func BytesToAddress(bytes []byte) (common.Address, error) {
	if len(bytes) == 20 {
		return common.BytesToAddress(bytes), nil
	}

	return common.Address{}, RiverError(
		Err_BAD_ADDRESS,
		"Bad address bytes",
		"address", fmt.Sprintf("%x", bytes),
	).Func("BytesToAddress")
}

func AddressStrToEthAddress(address string) (common.Address, error) {
	if common.IsHexAddress(address) {
		return common.HexToAddress(address), nil
	}
	return common.Address{}, RiverError(
		Err_BAD_ADDRESS,
		"Bad address string",
		"address",
		address,
	).Func("AddressStrToEthAddress")
}
