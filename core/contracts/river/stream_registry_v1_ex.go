package river

import (
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/core/types"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type (
	// StreamUpdated is the unified event emitted by the stream registry when a stream mutation occurs.
	// Either when its created or modified.
	StreamUpdated = StreamRegistryV1StreamUpdated

	// StreamUpdatedEventType defines Solidity IStreamRegistryBase.StreamEventType enum type.
	StreamUpdatedEventType uint8

	// StreamState indicates a stream state in the river streams registry.
	StreamState struct {
		// Stream contains the new stream state after the transaction was processed.
		Stream
		// StreamID identifies the stream
		StreamID StreamId
		// Reason contains the reason why the stream state was updated/created.
		reason StreamUpdatedEventType
		// raw is the raw event log that was emitted after the state change and this stream state was parsed from.
		// it provides information about which transaction caused the state change and at which block number and index.
		raw types.Log
	}

	// StreamMiniblockUpdate indicates that the stream identified by StreamID has a new miniblock.
	StreamMiniblockUpdate struct {
		// SetMiniblock contains the stream updated data.
		SetMiniblock
		// raw is the raw event log that was emitted after the state change and this stream state was parsed from.
		// it provides information about which transaction caused the state change and at which block number and index.
		raw types.Log
	}

	// StreamUpdatedEvent represents an event that was decoded from a StreamUpdated log by the stream registry.
	StreamUpdatedEvent interface {
		// GetStreamId returns the stream ID of the stream that was updated.
		GetStreamId() StreamId
		// Reason returns the reason the StreamUpdated log was emitted.
		Reason() StreamUpdatedEventType
		// Raw returns the log from which the StreamUpdate event was decoded.
		Raw() types.Log
	}
)

const (
	// Event_StreamUpdated is the unified event emitted by the stream registry when a stream mutation occurs.
	// Either when its created or modified.
	Event_StreamUpdated = "StreamUpdated"

	StreamUpdatedEventTypeAllocate                  StreamUpdatedEventType = 0
	StreamUpdatedEventTypeCreate                    StreamUpdatedEventType = 1
	StreamUpdatedEventTypePlacementUpdated          StreamUpdatedEventType = 2
	StreamUpdatedEventTypeLastMiniblockBatchUpdated StreamUpdatedEventType = 3
)

var (
	_ StreamUpdatedEvent = (*StreamState)(nil)
	_ StreamUpdatedEvent = (*StreamMiniblockUpdate)(nil)

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

func (_StreamRegistryV1 *StreamRegistryV1Caller) BoundContract() *bind.BoundContract {
	return _StreamRegistryV1.contract
}

// GetStreamId implements the EventWithStreamId interface.
func (ss *StreamState) GetStreamId() StreamId {
	return ss.StreamID
}

func (ss *StreamState) Reason() StreamUpdatedEventType {
	return ss.reason
}

func (ss *StreamState) Raw() types.Log {
	return ss.raw
}

// GetStreamId implements the EventWithStreamId interface.
func (smu *StreamMiniblockUpdate) GetStreamId() StreamId {
	return smu.StreamId
}

func (smu *StreamMiniblockUpdate) Reason() StreamUpdatedEventType {
	return StreamUpdatedEventTypeLastMiniblockBatchUpdated
}

func (smu *StreamMiniblockUpdate) Raw() types.Log {
	return smu.raw
}

func MiniblockRefFromContractRecord(stream *Stream) *MiniblockRef {
	return &MiniblockRef{
		Hash: stream.LastMiniblockHash,
		Num:  int64(stream.LastMiniblockNum),
	}
}

// ParseStreamUpdatedEvent parses the given stream update into the stream registry state after the update.
// The returned slice contains one or more *StreamState or *StreamMiniblockUpdate instances.
func ParseStreamUpdatedEvent(event *StreamRegistryV1StreamUpdated) ([]StreamUpdatedEvent, error) {
	reason := StreamUpdatedEventType(event.EventType)
	switch reason {
	case StreamUpdatedEventTypeAllocate:
		streamID, stream, err := parseStreamIDAndStreamFromSolABIEncoded(event.Data)
		if err != nil {
			return nil, err
		}
		return []StreamUpdatedEvent{&StreamState{Stream: *stream, StreamID: streamID, reason: reason, raw: event.Raw}}, nil
	case StreamUpdatedEventTypeCreate:
		streamID, stream, err := parseStreamIDAndStreamFromSolABIEncoded(event.Data)
		if err != nil {
			return nil, err
		}
		return []StreamUpdatedEvent{&StreamState{Stream: *stream, StreamID: streamID, reason: reason, raw: event.Raw}}, nil
	case StreamUpdatedEventTypePlacementUpdated:
		streamID, stream, err := parseStreamIDAndStreamFromSolABIEncoded(event.Data)
		if err != nil {
			return nil, err
		}
		return []StreamUpdatedEvent{&StreamState{Stream: *stream, StreamID: streamID, reason: reason, raw: event.Raw}}, nil
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

func parseSetMiniblocksFromSolABIEncoded(event *StreamRegistryV1StreamUpdated) ([]StreamUpdatedEvent, error) {
	values := abi.Arguments{{Type: abi.Type{T: abi.SliceTy, Elem: &setMiniblockABIType}}}
	unpacked, err := values.Unpack(event.Data)
	if err != nil {
		return nil, AsRiverError(err, protocol.Err_BAD_EVENT).
			Message("Unable to decode stream updated event").
			Func("parseSetMiniblocksFromSolcABIEncoded")
	}

	parsed := make([]SetMiniblock, 0)
	_ = abi.ConvertType(unpacked[0], &parsed)

	results := make([]StreamUpdatedEvent, len(parsed))
	for i, setMiniblock := range parsed {
		results[i] = &StreamMiniblockUpdate{
			SetMiniblock: setMiniblock,
			raw:          event.Raw,
		}
	}

	return results, nil
}
