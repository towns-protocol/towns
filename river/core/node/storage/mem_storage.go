package storage

import (
	"context"
	"sync"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

type memStream struct {
	miniblocks        [][]byte
	minipool          [][]byte
	candidates        map[common.Hash]*blockCandidate // map of hash -> block content
	lastSnapshotIndex int
}

type blockCandidate struct {
	blockData []byte
	blockNum  int64
}

type memStorage struct {
	streams map[StreamId]*memStream
	mutex   sync.Mutex
}

var _ StreamStorage = (*memStorage)(nil)

func (m *memStorage) CreateStreamStorage(ctx context.Context, streamId StreamId, genesisMiniblock []byte) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	if _, ok := m.streams[streamId]; ok {
		return RiverError(Err_ALREADY_EXISTS, "Stream already exists")
	}
	m.streams[streamId] = &memStream{
		miniblocks:        [][]byte{genesisMiniblock},
		minipool:          [][]byte{},
		candidates:        map[common.Hash]*blockCandidate{},
		lastSnapshotIndex: 0,
	}
	return nil
}

func (m *memStorage) ReadStreamFromLastSnapshot(
	ctx context.Context,
	streamId StreamId,
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

func (m *memStorage) ReadMiniblocks(
	ctx context.Context,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([][]byte, error) {
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
	streamId StreamId,
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

// WriteBlockProposal adds a miniblock proposal candidate. When the miniblock is finalized, the node will promote the
// candidate with the correct hash.
func (m *memStorage) WriteBlockProposal(
	ctx context.Context,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
	miniblock []byte,
) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	stream, ok := m.streams[streamId]
	if !ok {
		return RiverError(Err_NOT_FOUND, "Stream not found")
	}
	if blockNumber != int64(len(stream.miniblocks)) {
		return RiverError(Err_BAD_BLOCK_NUMBER, "Invalid minipool generation")
	}
	stream.candidates[blockHash] = &blockCandidate{
		blockData: miniblock,
		blockNum:  blockNumber,
	}
	return nil
}

func (m *memStorage) PromoteBlock(
	ctx context.Context,
	streamId StreamId,
	minipoolGeneration int64,
	candidateBlockHash common.Hash,
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
	blockCandidate, ok := stream.candidates[candidateBlockHash]
	if !ok {
		return RiverError(Err_NOT_FOUND, "Miniblock candidate not found")
	}

	stream.miniblocks = append(stream.miniblocks, blockCandidate.blockData)

	stream.minipool = envelopes
	if snapshotMiniblock {
		stream.lastSnapshotIndex = len(stream.miniblocks) - 1
	}

	// Delete all stale candidates upon block promotion.
	for blockHash, candidate := range stream.candidates {
		if candidate.blockNum <= minipoolGeneration {
			delete(stream.candidates, blockHash)
		}
	}

	return nil
}

func (m *memStorage) Close(ctx context.Context) {
}

func NewMemStorage() *memStorage {
	return &memStorage{
		streams: map[StreamId]*memStream{},
	}
}
