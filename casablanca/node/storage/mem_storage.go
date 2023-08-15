package storage

import (
	. "casablanca/node/base"
	. "casablanca/node/protocol"
	"context"
)

type memStream struct {
	miniblocks        [][]byte
	minipool          [][]byte
	lastSnapshotIndex int
}

type memStorage map[string]*memStream

func (m *memStorage) CreateStream(ctx context.Context, streamId string, genesisMiniblock []byte) error {
	if _, ok := (*m)[streamId]; ok {
		return RpcError(Err_STREAM_ALREADY_EXISTS, "Stream already exists")
	}
	(*m)[streamId] = &memStream{
		miniblocks:        [][]byte{genesisMiniblock},
		minipool:          [][]byte{},
		lastSnapshotIndex: 0,
	}
	return nil
}

func (m *memStorage) GetStreamFromLastSnapshot(ctx context.Context, streamId string) (*GetStreamFromLastSnapshotResult, error) {
	stream, ok := (*m)[streamId]
	if !ok {
		return nil, RpcError(Err_STREAM_NOT_FOUND, "Stream not found")
	}
	return &GetStreamFromLastSnapshotResult{
		StartMiniblockNumber: stream.lastSnapshotIndex,
		Miniblocks:           stream.miniblocks[stream.lastSnapshotIndex:],
		MinipoolEnvelopes:    stream.minipool,
	}, nil
}

func (m *memStorage) GetMiniblocks(ctx context.Context, streamId string, fromIndex int, toIndex int) ([][]byte, error) {
	stream, ok := (*m)[streamId]
	if !ok {
		return nil, RpcError(Err_STREAM_NOT_FOUND, "Stream not found")
	}
	if fromIndex < 0 || fromIndex >= len(stream.miniblocks) || toIndex <= fromIndex || toIndex > len(stream.miniblocks) {
		return nil, RpcError(Err_BAD_BLOCK_NUMBER, "Invalid miniblock index")
	}
	return stream.miniblocks[fromIndex:toIndex], nil
}

func (m *memStorage) AddEvent(ctx context.Context, streamId string, minipoolGeneration int, minipoolSlot int, envelope []byte) error {
	stream, ok := (*m)[streamId]
	if !ok {
		return RpcError(Err_STREAM_NOT_FOUND, "Stream not found")
	}
	if minipoolGeneration != len(stream.miniblocks) {
		return RpcError(Err_BAD_BLOCK_NUMBER, "Invalid minipool generation")
	}
	if minipoolSlot != len(stream.minipool) {
		return RpcError(Err_BAD_MINIPOOL_SLOT, "Invalid minipool slot")
	}
	stream.minipool = append(stream.minipool, envelope)
	return nil
}

func (m *memStorage) CreateBlock(
	ctx context.Context,
	streamId string,
	minipoolGeneration int,
	minipoolSize int,
	miniblock []byte,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	stream, ok := (*m)[streamId]
	if !ok {
		return RpcError(Err_STREAM_NOT_FOUND, "Stream not found")
	}
	if minipoolGeneration != len(stream.miniblocks) {
		return RpcError(Err_BAD_BLOCK_NUMBER, "Invalid minipool generation")
	}
	if minipoolSize != len(stream.minipool) {
		return RpcError(Err_BAD_MINIPOOL_SLOT, "Invalid minipool size")
	}
	stream.miniblocks = append(stream.miniblocks, miniblock)
	stream.minipool = envelopes
	if snapshotMiniblock {
		stream.lastSnapshotIndex = minipoolGeneration
	}
	return nil
}

func NewMemStorage() *memStorage {
	var m memStorage = make(map[string]*memStream)
	return &m
}
