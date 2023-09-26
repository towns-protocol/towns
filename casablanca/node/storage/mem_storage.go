package storage

import (
	. "casablanca/node/base"
	. "casablanca/node/protocol"
	"context"
	"sync"
)

type memStream struct {
	miniblocks        [][]byte
	minipool          [][]byte
	lastSnapshotIndex int
}

type memStorage struct {
	streams map[string]*memStream
	mutex   sync.Mutex
}

func (m *memStorage) CreateStream(ctx context.Context, streamId string, genesisMiniblock []byte) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, ok := m.streams[streamId]; ok {
		return RiverError(Err_ALREADY_EXISTS, "Stream already exists")
	}
	m.streams[streamId] = &memStream{
		miniblocks:        [][]byte{genesisMiniblock},
		minipool:          [][]byte{},
		lastSnapshotIndex: 0,
	}
	return nil
}

func (m *memStorage) GetStreamFromLastSnapshot(ctx context.Context, streamId string) (*GetStreamFromLastSnapshotResult, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	stream, ok := m.streams[streamId]
	if !ok {
		return nil, RiverError(Err_NOT_FOUND, "Stream not found")
	}
	return &GetStreamFromLastSnapshotResult{
		StartMiniblockNumber: stream.lastSnapshotIndex,
		Miniblocks:           stream.miniblocks[stream.lastSnapshotIndex:],
		MinipoolEnvelopes:    stream.minipool,
	}, nil
}

func (m *memStorage) GetMiniblocks(ctx context.Context, streamId string, fromIndex int, toIndex int) ([][]byte, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	stream, ok := m.streams[streamId]
	if !ok {
		return nil, RiverError(Err_NOT_FOUND, "Stream not found")
	}
	if fromIndex < 0 || fromIndex >= len(stream.miniblocks) || toIndex <= fromIndex || toIndex > len(stream.miniblocks) {
		return nil, RiverError(Err_BAD_BLOCK_NUMBER, "Invalid miniblock index")
	}
	return stream.miniblocks[fromIndex:toIndex], nil
}

func (m *memStorage) AddEvent(ctx context.Context, streamId string, minipoolGeneration int, minipoolSlot int, envelope []byte) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	stream, ok := m.streams[streamId]
	if !ok {
		return RiverError(Err_NOT_FOUND, "Stream not found")
	}
	if minipoolGeneration != len(stream.miniblocks) {
		return RiverError(Err_BAD_BLOCK_NUMBER, "Invalid minipool generation")
	}
	if minipoolSlot != len(stream.minipool) {
		return RiverError(Err_BAD_MINIPOOL_SLOT, "Invalid minipool slot")
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
	m.mutex.Lock()
	defer m.mutex.Unlock()

	stream, ok := m.streams[streamId]
	if !ok {
		return RiverError(Err_NOT_FOUND, "Stream not found")
	}
	if minipoolGeneration != len(stream.miniblocks) {
		return RiverError(Err_BAD_BLOCK_NUMBER, "Invalid minipool generation")
	}
	if minipoolSize != len(stream.minipool) {
		return RiverError(Err_BAD_MINIPOOL_SLOT, "Invalid minipool size")
	}
	stream.miniblocks = append(stream.miniblocks, miniblock)
	stream.minipool = envelopes
	if snapshotMiniblock {
		stream.lastSnapshotIndex = minipoolGeneration
	}
	return nil
}

func NewMemStorage() *memStorage {
	return &memStorage{
		streams: map[string]*memStream{},
	}
}
