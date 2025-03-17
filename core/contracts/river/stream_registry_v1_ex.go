package river

import (
	"encoding/json"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	Event_StreamAllocated            = "StreamAllocated"
	Event_StreamCreated              = "StreamCreated"
	Event_StreamLastMiniblockUpdated = "StreamLastMiniblockUpdated"
	Event_StreamPlacementUpdated     = "StreamPlacementUpdated"
	// Event_StreamUpdated is the unified event emitted by the stream registry when a stream mutation occurs.
	// Either when its created or modified.
	Event_StreamUpdated = "StreamUpdated"
)

type (
	StreamAllocated            = StreamRegistryV1StreamAllocated
	StreamCreated              = StreamRegistryV1StreamCreated
	StreamLastMiniblockUpdated = StreamRegistryV1StreamLastMiniblockUpdated
	StreamPlacementUpdated     = StreamRegistryV1StreamPlacementUpdated
	// StreamUpdated is the unified event emitted by the stream registry when a stream mutation occurs.
	// Either when its created or modified.
	StreamUpdated = StreamRegistryV1StreamUpdated
)

// StreamUpdatedEventType defines Solidity IStreamRegistryBase.StreamEventType enum type.
type StreamUpdatedEventType uint8

const (
	StreamUpdatedEventTypeAllocate                  StreamUpdatedEventType = 0
	StreamUpdatedEventTypeCreate                    StreamUpdatedEventType = 1
	StreamUpdatedEventTypePlacementUpdated          StreamUpdatedEventType = 2
	StreamUpdatedEventTypeLastMiniblockBatchUpdated StreamUpdatedEventType = 3
)

var (
	StreamUpdatedEventTypeAllocateTopic                  = common.BytesToHash([]byte{byte(StreamUpdatedEventTypeAllocate)})
	StreamUpdatedEventTypeCreateTopic                    = common.BytesToHash([]byte{byte(StreamUpdatedEventTypeCreate)})
	StreamUpdatedEventTypePlacementUpdatedTopic          = common.BytesToHash([]byte{byte(StreamUpdatedEventTypePlacementUpdated)})
	StreamUpdatedEventTypeLastMiniblockBatchUpdatedTopic = common.BytesToHash([]byte{byte(StreamUpdatedEventTypeLastMiniblockBatchUpdated)})
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

type (
	// StreamState indicates a stream state in the river streams registry.
	StreamState struct {
		// Stream contains the new stream state after the transaction was processed.
		Stream
		// StreamID identifies the stream
		StreamID StreamId
		// Reason contains the reason why the stream state was updated/created.
		Reason StreamUpdatedEventType
		// Raw is the raw event log that triggered the state change and this stream state was parsed from.
		Raw types.Log
	}

	// StreamMiniblockUpdate indicates that the stream identified by StreamID has a new miniblock.
	StreamMiniblockUpdate struct {
		// SetMiniblock contains the stream updated data.
		SetMiniblock
		// StreamID identifies the stream
		StreamID StreamId
		// Raw is the raw event log that triggered the state change and this stream state was parsed from.
		Raw types.Log
	}
)

// GetStreamId implements the EventWithStreamId interface.
func (ss *StreamState) GetStreamId() StreamId {
	return ss.StreamID
}

// GetStreamId implements the EventWithStreamId interface.
func (smu *StreamMiniblockUpdate) GetStreamId() StreamId {
	return smu.StreamID
}

var (
	// TODO: update definition when replication factor is added
	streamABIType, _ = abi.NewType("tuple", "structStream", []abi.ArgumentMarshaling{
		{Name: "lastMiniblockHash", Type: "bytes32", InternalType: "bytes32"},
		{Name: "lastMiniblockNum", Type: "uint64", InternalType: "uint64"},
		{Name: "reserved0", Type: "uint64", InternalType: "uint64"},
		{Name: "flags", Type: "uint64", InternalType: "uint64"},
		{Name: "nodes", Type: "address[]", InternalType: "address[]"},
	})

	setMiniblockABIType, _ = abi.NewType("tuple", "structSetMiniblock", []abi.ArgumentMarshaling{
		{Name: "streamId", Type: "bytes32", InternalType: "bytes32"},
		{Name: "prevMiniBlockHash", Type: "bytes32", InternalType: "bytes32"},
		{Name: "lastMiniblockHash", Type: "bytes32", InternalType: "bytes32"},
		{Name: "lastMiniblockNum", Type: "uint64", InternalType: "uint64"},
		{Name: "isSealed", Type: "bool", InternalType: "bool"},
	})
)

// ParseStreamUpdatedEvent parses the given stream update into the stream registry state after the update.
// The returned slice contains one or more *StreamState or *StreamMiniblockUpdate instances.
func ParseStreamUpdatedEvent(event *StreamRegistryV1StreamUpdated) ([]EventWithStreamId, error) {
	reason := StreamUpdatedEventType(event.EventType)
	switch reason {
	case StreamUpdatedEventTypeAllocate:
		streamID, stream, err := parseStreamIDAndStreamFromSolABIEncoded(event.Data)
		if err != nil {
			return nil, err
		}

		return []EventWithStreamId{&StreamState{Stream: *stream, StreamID: streamID, Reason: reason, Raw: event.Raw}}, nil

	case StreamUpdatedEventTypeCreate:
		streamID, stream, err := parseStreamIDAndStreamFromSolABIEncoded(event.Data)
		if err != nil {
			return nil, err
		}

		return []EventWithStreamId{&StreamState{Stream: *stream, StreamID: streamID, Reason: reason, Raw: event.Raw}}, nil

	case StreamUpdatedEventTypePlacementUpdated:
		streamID, stream, err := parseStreamIDAndStreamFromSolABIEncoded(event.Data)
		if err != nil {
			return nil, err
		}

		return []EventWithStreamId{&StreamState{Stream: *stream, StreamID: streamID, Reason: reason, Raw: event.Raw}}, nil

	case StreamUpdatedEventTypeLastMiniblockBatchUpdated:
		return parseSetMiniblocksFromSolABIEncoded(event)

	default:
		return nil, AsRiverError(nil, protocol.Err_BAD_EVENT).
			Message("Unsupported StreamUpdated event type").
			Tags("type", reason, "tx", event.Raw.TxHash, "eventIndex", event.Raw.Index)
	}
}

func parseStreamIDAndStreamFromSolABIEncoded(data []byte) (StreamId, *Stream, error) {
	values := abi.Arguments{{Type: abi.Type{Size: 32, T: abi.FixedBytesTy}}, {Type: streamABIType}}
	unpacked, err := values.Unpack(data)
	if err != nil {
		return StreamId{}, nil, AsRiverError(err, protocol.Err_BAD_EVENT).
			Message("Unable to decode stream updated event").
			Func("parseStreamIDAndStreamFromSolABIEncoded")
	}

	var streamID StreamId
	abi.ConvertType(unpacked[0], &streamID)
	stream := *abi.ConvertType(unpacked[1], new(Stream)).(*Stream)

	return streamID, &stream, nil
}

func parseSetMiniblocksFromSolABIEncoded(event *StreamRegistryV1StreamUpdated) ([]EventWithStreamId, error) {
	values := abi.Arguments{{Type: abi.Type{T: abi.SliceTy, Elem: &setMiniblockABIType}}}
	unpacked, err := values.Unpack(event.Data)
	if err != nil {
		return nil, AsRiverError(err, protocol.Err_BAD_EVENT).
			Message("Unable to decode stream updated event").
			Func("parseSetMiniblocksFromSolcABIEncoded")
	}

	// TODO: workaround for abi.ConvertType(unpacked[1], make([]*SetMiniblock, 0)).([]*SetMiniblock) that panics
	serialized, _ := json.Marshal(unpacked[0])
	var setMiniblocks []*SetMiniblock
	if err := json.Unmarshal(serialized, &setMiniblocks); err != nil {
		return nil, err
	}

	results := make([]EventWithStreamId, len(setMiniblocks))
	for i, setMiniblock := range setMiniblocks {
		results[i] = &StreamMiniblockUpdate{
			SetMiniblock: *setMiniblock,
			StreamID:     setMiniblock.StreamId,
			Raw:          event.Raw,
		}
	}

	return results, nil
}
