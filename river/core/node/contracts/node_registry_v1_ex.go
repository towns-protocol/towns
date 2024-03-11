package contracts

import "github.com/ethereum/go-ethereum/accounts/abi/bind"

func (_NodeRegistryV1 *NodeRegistryV1Caller) BoundContract() *bind.BoundContract {
	return _NodeRegistryV1.contract
}
