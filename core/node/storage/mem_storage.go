package storage

import (
	"context"
	"sync"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
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

var _ StreamStorage = (*memStorage)(nil)

func (m *memStorage) CreateStreamStorage(ctx context.Context, streamId string, genesisMiniblock []byte) error {
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

func (m *memStorage) ReadStreamFromLastSnapshot(
	ctx context.Context,
	streamId string,
	precedingBlockCount int,
) (*ReadStreamFromLastSnapshotResult, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	stream, ok := m.streams[streamId]
	if !ok {
		return nil, RiverError(Err_NOT_FOUND, "Stream not found")
	}
	startIndex := max(0, stream.lastSnapshotIndex-max(0, precedingBlockCount))
	return &ReadStreamFromLastSnapshotResult{
		StartMiniblockNumber: int64(startIndex), // mem_storage, has all blocks in memory
		Miniblocks:           stream.miniblocks[startIndex:],
		MinipoolEnvelopes:    stream.minipool,
	}, nil
}

func (m *memStorage) ReadMiniblocks(ctx context.Context, streamId string, fromInclusive int64, toExclusive int64) ([][]byte, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	stream, ok := m.streams[streamId]
	if !ok {
		return nil, RiverError(Err_NOT_FOUND, "Stream not found")
	}
	if fromInclusive < 0 || fromInclusive >= int64(len(stream.miniblocks)) || toExclusive <= fromInclusive ||
		toExclusive > int64(len(stream.miniblocks)) {
		return nil, RiverError(Err_BAD_BLOCK_NUMBER, "Invalid miniblock index")
	}
	return stream.miniblocks[fromInclusive:toExclusive], nil
}

func (m *memStorage) WriteEvent(
	ctx context.Context,
	streamId string,
	minipoolGeneration int64,
	minipoolSlot int,
	envelope []byte,
) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	stream, ok := m.streams[streamId]
	if !ok {
		return RiverError(Err_NOT_FOUND, "Stream not found")
	}
	if minipoolGeneration != int64(len(stream.miniblocks)) { // mem_storage has app blocks in memory
		return RiverError(Err_BAD_BLOCK_NUMBER, "Invalid minipool generation")
	}
	if minipoolSlot != len(stream.minipool) {
		return RiverError(Err_BAD_MINIPOOL_SLOT, "Invalid minipool slot")
	}
	stream.minipool = append(stream.minipool, envelope)
	return nil
}

func (m *memStorage) WriteBlock(
	ctx context.Context,
	streamId string,
	minipoolGeneration int64,
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
	if minipoolGeneration != int64(len(stream.miniblocks)) {
		return RiverError(Err_BAD_BLOCK_NUMBER, "Invalid minipool generation")
	}
	if minipoolSize != len(stream.minipool) {
		return RiverError(Err_BAD_MINIPOOL_SLOT, "Invalid minipool size")
	}
	stream.miniblocks = append(stream.miniblocks, miniblock)
	stream.minipool = envelopes
	if snapshotMiniblock {
		stream.lastSnapshotIndex = len(stream.miniblocks) - 1
	}
	return nil
}

func (m *memStorage) Close(ctx context.Context) {
}

func NewMemStorage() *memStorage {
	return &memStorage{
		streams: map[string]*memStream{},
	}
}
