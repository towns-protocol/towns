package base

import (
	. "github.com/river-build/river/core/node/protocol"

	"github.com/ethereum/go-ethereum/common"
)

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

func BytesToEthAddress(bytes []byte) (common.Address, error) {
	if len(bytes) == 20 {
		return common.BytesToAddress(bytes), nil
	}
	return common.Address{}, RiverError(
		Err_BAD_ADDRESS,
		"Bad address bytes",
		"address",
		bytes,
	).Func("BytesToEthAddress")
}

func EthAddressToAddressStr(address common.Address) string {
	return address.Hex()
}

func AddressStrsToEthAddresses(addresses []string) ([]common.Address, error) {
	ethAddresses := make([]common.Address, len(addresses))
	for i, address := range addresses {
		ethAddress, err := AddressStrToEthAddress(address)
		if err != nil {
			return nil, err
		}
		ethAddresses[i] = ethAddress
	}
	return ethAddresses, nil
}

func EthAddressesToAddressStrs(addresses []common.Address) []string {
	addressStrs := make([]string, len(addresses))
	for i, address := range addresses {
		addressStrs[i] = EthAddressToAddressStr(address)
	}
	return addressStrs
}

var ZeroHashBytes = make([]byte, 32)

func BytesToEthHash(bytes []byte) (common.Hash, error) {
	var byte32 [32]byte
	if len(bytes) != 32 {
		return byte32, RiverError(Err_BAD_HASH_FORMAT, "Bad hash length", "length", len(bytes)).Func("BytesToByte32")
	}
	copy(byte32[:], bytes)
	return byte32, nil
}
