package contracts

import "github.com/ethereum/go-ethereum/accounts/abi/bind"

const (
	Event_StreamAllocated            = "StreamAllocated"
	Event_StreamLastMiniblockUpdated = "StreamLastMiniblockUpdated"
	Event_StreamPlacementUpdated     = "StreamPlacementUpdated"
)

func (_StreamRegistryV1 *StreamRegistryV1Caller) BoundContract() *bind.BoundContract {
	return _StreamRegistryV1.contract
}
