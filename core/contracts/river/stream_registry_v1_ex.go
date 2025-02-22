package river

import (
	"github.com/ethereum/go-ethereum/accounts/abi/bind"

	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	Event_StreamAllocated            = "StreamAllocated"
	Event_StreamCreated              = "StreamCreated"
	Event_StreamLastMiniblockUpdated = "StreamLastMiniblockUpdated"
	Event_StreamPlacementUpdated     = "StreamPlacementUpdated"
)

type (
	StreamAllocated            = StreamRegistryV1StreamAllocated
	StreamCreated              = StreamRegistryV1StreamCreated
	StreamLastMiniblockUpdated = StreamRegistryV1StreamLastMiniblockUpdated
	StreamPlacementUpdated     = StreamRegistryV1StreamPlacementUpdated
)

func (_StreamRegistryV1 *StreamRegistryV1Caller) BoundContract() *bind.BoundContract {
	return _StreamRegistryV1.contract
}

type EventWithStreamId interface {
	GetStreamId() StreamId
}

func (e *StreamAllocated) GetStreamId() StreamId {
	return e.StreamId
}

func (e *StreamCreated) GetStreamId() StreamId {
	return e.StreamId
}

func (e *StreamLastMiniblockUpdated) GetStreamId() StreamId {
	return e.StreamId
}

func (e *StreamPlacementUpdated) GetStreamId() StreamId {
	return e.StreamId
}

func MiniblockRefFromContractRecord(stream *Stream) *MiniblockRef {
	return &MiniblockRef{
		Hash: stream.LastMiniblockHash,
		Num:  int64(stream.LastMiniblockNum),
	}
}
