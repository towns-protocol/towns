package contracts

import "github.com/ethereum/go-ethereum/accounts/abi/bind"

func (_NodeRegistryV1 *NodeRegistryV1Caller) BoundContract() *bind.BoundContract {
	return _NodeRegistryV1.contract
}

const (
	NodeStatus_NotInitialized uint8 = iota
	NodeStatus_RemoteOnly
	NodeStatus_Operational
	NodeStatus_Failed
	NodeStatus_Departing
	NodeStatus_Deleted
)
