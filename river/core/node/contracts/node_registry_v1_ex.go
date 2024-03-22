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

func NodeStatusString(ns uint8) string {
	switch ns {
	case NodeStatus_NotInitialized:
		return "NotInit"
	case NodeStatus_RemoteOnly:
		return "RemoteOnly"
	case NodeStatus_Operational:
		return "Operational"
	case NodeStatus_Failed:
		return "Failed"
	case NodeStatus_Departing:
		return "Departing"
	case NodeStatus_Deleted:
		return "Deleted"
	default:
		return "Unknown"
	}
}
