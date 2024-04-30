package contracts

import "github.com/ethereum/go-ethereum/accounts/abi/bind"

func (_RiverConfigRegistryV1 *RiverConfigV1Caller) BoundContract() *bind.BoundContract {
	return _RiverConfigRegistryV1.contract
}
