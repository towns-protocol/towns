package river

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi"
	bind2 "github.com/ethereum/go-ethereum/accounts/abi/bind/v2"
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/blockchain"
	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type StreamRegistryInstance struct {
	*bind2.BoundContract
	contract *StreamRegistryV1
}

func (r *StreamRegistryV1) ABI() *abi.ABI {
	return &r.abi
}

func (r *StreamRegistryV1) NewInstance(
	backend bind2.ContractBackend,
	addr common.Address,
) *StreamRegistryInstance {
	return &StreamRegistryInstance{
		BoundContract: bind2.NewBoundContract(addr, r.abi, backend, backend, backend),
		contract:      r,
	}
}

func (c *StreamRegistryInstance) GetStreamOnBlock(
	ctx context.Context,
	streamId StreamId,
	blockNum blockchain.BlockNumber,
) (*Stream, error) {
	return blockchain.CallPtr(
		c.BoundContract,
		ctx,
		"GetStream",
		blockNum,
		func() ([]byte, error) { return c.contract.TryPackGetStream(streamId) },
		c.contract.UnpackGetStream,
	)
}

func (c *StreamRegistryInstance) GetStreamOnLatestBlock(
	ctx context.Context,
	streamId StreamId,
) (*Stream, error) {
	return c.GetStreamOnBlock(ctx, streamId, 0)
}

// GetStreamWithGenesis returns stream, genesis miniblock hash, genesis miniblock, error
func (c *StreamRegistryInstance) GetStreamWithGenesis(
	ctx context.Context,
	streamId StreamId,
	blockNum blockchain.BlockNumber,
) (*Stream, common.Hash, []byte, error) {
	result, err := blockchain.CallPtr(
		c.BoundContract,
		ctx,
		"GetStreamWithGenesis",
		blockNum,
		func() ([]byte, error) { return c.contract.TryPackGetStreamWithGenesis(streamId) },
		c.contract.UnpackGetStreamWithGenesis,
	)
	if err != nil {
		return nil, common.Hash{}, nil, err
	}
	return &result.Arg0, result.Arg1, result.Arg2, nil
}

func (c *StreamRegistryInstance) GetStreamCount(ctx context.Context, blockNum blockchain.BlockNumber) (int64, error) {
	return blockchain.CallInt64Raw(
		c.BoundContract,
		ctx,
		"GetStreamCount",
		blockNum,
		c.contract.PackGetStreamCount(),
		c.contract.UnpackGetStreamCount,
	)
}

func (c *StreamRegistryInstance) GetStreamCountOnNode(
	ctx context.Context,
	blockNum blockchain.BlockNumber,
	node common.Address,
) (int64, error) {
	return blockchain.CallInt64(
		c.BoundContract,
		ctx,
		"GetStreamCountOnNode",
		blockNum,
		func() ([]byte, error) { return c.contract.TryPackGetStreamCountOnNode(node) },
		c.contract.UnpackGetStreamCountOnNode,
	)
}

func (c *StreamRegistryInstance) GetPaginatedStreamsOnNode(
	ctx context.Context,
	blockNum blockchain.BlockNumber,
	node common.Address,
	start int64,
	end int64,
) ([]StreamWithId, error) {
	return blockchain.CallValue(
		c.BoundContract,
		ctx,
		"GetPaginatedStreamsOnNode",
		blockNum,
		func() ([]byte, error) {
			return c.contract.TryPackGetPaginatedStreamsOnNode(node, big.NewInt(start), big.NewInt(end))
		},
		c.contract.UnpackGetPaginatedStreamsOnNode,
	)
}

func (c *StreamRegistryInstance) GetPaginatedStreams(
	ctx context.Context,
	blockNum blockchain.BlockNumber,
	start int64,
	end int64,
) ([]StreamWithId, bool, error) {
	ret, err := blockchain.CallValue(
		c.BoundContract,
		ctx,
		"GetPaginatedStreams",
		blockNum,
		func() ([]byte, error) {
			return c.contract.TryPackGetPaginatedStreams(big.NewInt(start), big.NewInt(end))
		},
		c.contract.UnpackGetPaginatedStreams,
	)
	if err != nil {
		return nil, false, err
	}
	return ret.Arg0, ret.Arg1, nil
}

const StreamFlagSealed uint64 = 0x1

// ReplicationFactor returns on how many nodes the stream is replicated.
// TODO: rename Reserved0 in the contract.
func (s *Stream) ReplicationFactor() int {
	// if s.Reserved0 & 0xFF is 0 it indicates this is an old stream that was created before the replication factor was
	// added and the migration to replicated stream hasn't started. Use a replication factor of 1. This ensures that
	// the first node in the streams node list is used as primary and ensures both backwards and forwards compatability.
	return max(1, int(s.Reserved0&0xFF))
}

func (s *Stream) LastMbHash() common.Hash {
	return s.LastMiniblockHash
}

func (s *Stream) LastMbNum() int64 {
	return int64(s.LastMiniblockNum)
}

func (s *Stream) LastMb() *MiniblockRef {
	return &MiniblockRef{
		Hash: s.LastMiniblockHash,
		Num:  int64(s.LastMiniblockNum),
	}
}

func (s *Stream) IsSealed() bool {
	return s.Flags&StreamFlagSealed != 0
}

func NewStreamWithId(streamId StreamId, stream *Stream) *StreamWithId {
	return &StreamWithId{
		Id:     streamId,
		Stream: *stream,
	}
}

func (s *StreamWithId) StreamId() StreamId {
	return StreamId(s.Id)
}

func (s *StreamWithId) ReplicationFactor() int {
	return s.Stream.ReplicationFactor()
}

func (s *StreamWithId) LastMbHash() common.Hash {
	return s.Stream.LastMiniblockHash
}

func (s *StreamWithId) LastMbNum() int64 {
	return int64(s.Stream.LastMiniblockNum)
}

func (s *StreamWithId) LastMb() *MiniblockRef {
	return &MiniblockRef{
		Hash: s.Stream.LastMiniblockHash,
		Num:  int64(s.Stream.LastMiniblockNum),
	}
}

func (s *StreamWithId) IsSealed() bool {
	return s.Stream.Flags&StreamFlagSealed != 0
}

func (s *StreamWithId) Nodes() []common.Address {
	return s.Stream.Nodes
}

type (
	// StreamUpdated is the unified event emitted by the stream registry when a stream mutation occurs.
	// Either when its created or modified.
	StreamUpdated                   = StreamRegistryV1StreamUpdated
	StreamLastMiniblockUpdateFailed = StreamRegistryV1StreamLastMiniblockUpdateFailed

	// StreamUpdatedEventType defines Solidity IStreamRegistryBase.StreamEventType enum type.
	StreamUpdatedEventType uint8

	// StreamState indicates a stream state in the river streams registry.
	StreamState struct {
		// Stream contains the new stream state after the transaction was processed.
		Stream *StreamWithId
		// Reason contains the reason why the stream state was updated/created.
		reason StreamUpdatedEventType
	}

	// StreamMiniblockUpdate indicates that the stream identified by StreamID has a new miniblock.
	StreamMiniblockUpdate struct {
		// SetMiniblock contains the stream updated data.
		SetMiniblock
	}

	// StreamUpdatedEvent represents an event that was decoded from a StreamUpdated log by the stream registry.
	StreamUpdatedEvent interface {
		// GetStreamId returns the stream ID of the stream that was updated.
		GetStreamId() StreamId
		// Reason returns the reason the StreamUpdated log was emitted.
		Reason() StreamUpdatedEventType
	}
)

func (t StreamUpdatedEventType) String() string {
	switch t {
	case StreamUpdatedEventTypeAllocate:
		return "Allocate"
	case StreamUpdatedEventTypeCreate:
		return "Create"
	case StreamUpdatedEventTypePlacementUpdated:
		return "PlacementUpdated"
	case StreamUpdatedEventTypeLastMiniblockBatchUpdated:
		return "LastMiniblockBatchUpdated"
	}
	return "Unknown"
}

const (
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

// GetStreamId implements the EventWithStreamId interface.
func (ss *StreamState) GetStreamId() StreamId {
	return ss.Stream.Id
}

func (ss *StreamState) Reason() StreamUpdatedEventType {
	return ss.reason
}

// GetStreamId implements the EventWithStreamId interface.
func (smu *StreamMiniblockUpdate) GetStreamId() StreamId {
	return smu.StreamId
}

func (smu *StreamMiniblockUpdate) Reason() StreamUpdatedEventType {
	return StreamUpdatedEventTypeLastMiniblockBatchUpdated
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
		stream, err := parseStreamIDAndStreamFromSolABIEncoded(event.Data)
		if err != nil {
			return nil, err
		}
		return []StreamUpdatedEvent{&StreamState{Stream: stream, reason: reason}}, nil
	case StreamUpdatedEventTypeCreate:
		stream, err := parseStreamIDAndStreamFromSolABIEncoded(event.Data)
		if err != nil {
			return nil, err
		}
		return []StreamUpdatedEvent{&StreamState{Stream: stream, reason: reason}}, nil
	case StreamUpdatedEventTypePlacementUpdated:
		stream, err := parseStreamIDAndStreamFromSolABIEncoded(event.Data)
		if err != nil {
			return nil, err
		}
		return []StreamUpdatedEvent{&StreamState{Stream: stream, reason: reason}}, nil
	case StreamUpdatedEventTypeLastMiniblockBatchUpdated:
		return parseSetMiniblocksFromSolABIEncoded(event)
	default:
		return nil, AsRiverError(nil, Err_BAD_EVENT).
			Message("Unsupported StreamUpdated event type").
			Tags("type", reason, "tx", event.Raw.TxHash, "eventIndex", event.Raw.Index)
	}
}

func parseStreamIDAndStreamFromSolABIEncoded(data []byte) (*StreamWithId, error) {
	values := abi.Arguments{{Type: abi.Type{Size: 32, T: abi.FixedBytesTy}}, {Type: streamABIType}}
	unpacked, err := values.Unpack(data)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_EVENT).
			Message("Unable to decode stream updated event").
			Func("parseStreamIDAndStreamFromSolABIEncoded")
	}

	ret := &StreamWithId{}
	abi.ConvertType(unpacked[0], &ret.Id)
	abi.ConvertType(unpacked[1], &ret.Stream)
	return ret, nil
}

func parseSetMiniblocksFromSolABIEncoded(event *StreamRegistryV1StreamUpdated) ([]StreamUpdatedEvent, error) {
	values := abi.Arguments{{Type: abi.Type{T: abi.SliceTy, Elem: &setMiniblockABIType}}}
	unpacked, err := values.Unpack(event.Data)
	if err != nil {
		return nil, AsRiverError(err, Err_BAD_EVENT).
			Message("Unable to decode stream updated event").
			Func("parseSetMiniblocksFromSolcABIEncoded")
	}

	parsed := make([]SetMiniblock, 0)
	_ = abi.ConvertType(unpacked[0], &parsed)

	results := make([]StreamUpdatedEvent, len(parsed))
	for i, setMiniblock := range parsed {
		results[i] = &StreamMiniblockUpdate{
			SetMiniblock: setMiniblock,
		}
	}

	return results, nil
}
