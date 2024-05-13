package storage

import (
	"context"

	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/shared"
)

const (
	StreamStorageTypePostgres = "postgres"
)

type ReadStreamFromLastSnapshotResult struct {
	StartMiniblockNumber int64
	Miniblocks           [][]byte
	MinipoolEnvelopes    [][]byte
}

type StreamStorage interface {
	// CreateStreamStorage creates a new stream with the given genesis miniblock at index 0.
	// Last snapshot minblock index is set to 0.
	// Minipool is set to generation number 1 (i.e. number of miniblock that is going to be produced next) and is empty.
	CreateStreamStorage(ctx context.Context, streamId StreamId, genesisMiniblock []byte) error

	// Returns all stream blocks starting from last snapshot miniblock index and all envelopes in the given minipool.
	ReadStreamFromLastSnapshot(
		ctx context.Context,
		streamId StreamId,
		precedingBlockCount int,
	) (*ReadStreamFromLastSnapshotResult, error)

	// Returns miniblocks with miniblockNum or "generation" from fromInclusive, to toExlusive.
	ReadMiniblocks(ctx context.Context, streamId StreamId, fromInclusive int64, toExclusive int64) ([][]byte, error)

	// Adds event to the given minipool.
	// Current generation of minipool should match minipoolGeneration,
	// and there should be exactly minipoolSlot events in the minipool.
	WriteEvent(
		ctx context.Context,
		streamId StreamId,
		minipoolGeneration int64,
		minipoolSlot int,
		envelope []byte,
	) error

	// WriteBlockProposal adds a proposal candidate for future
	WriteBlockProposal(
		ctx context.Context,
		streamId StreamId,
		blockHash common.Hash,
		blockNumber int64,
		miniblock []byte,
	) error

	// Promote block candidate to miniblock
	// Deletes current minipool at minipoolGeneration,
	// creates new minipool at minipoolGeneration + 1,
	// stores miniblock proposal with given hash at minipoolGeneration index and wipes all candidates for stream.
	// If snapshotMiniblock is true, stores minipoolGeneration as last snapshot miniblock index,
	// stores envelopes in the new minipool in slots starting with 0.
	PromoteBlock(
		ctx context.Context,
		streamId StreamId,
		minipoolGeneration int64,
		candidateBlockHash common.Hash,
		snapshotMiniblock bool,
		envelopes [][]byte,
	) error

	// CreateStreamArchiveStorage creates a new archive storage for the given stream.
	// Unlike regular CreateStreamStorage, only entry in es table and partition table for miniblocks are created.
	CreateStreamArchiveStorage(
		ctx context.Context,
		streamId StreamId,
	) error

	// GetMaxArchivedMiniblockNumber returns the maximum miniblock number that has been archived for the given stream.
	// If stream record is created, but no miniblocks are archived, returns -1.
	GetMaxArchivedMiniblockNumber(ctx context.Context, streamId StreamId) (int64, error)

	// WriteArchiveMiniblocks writes miniblocks to the archive storage.
	// Miniblocks are written starting from startMiniblockNum.
	// It checks that startMiniblockNum - 1 miniblock exists in storage.
	WriteArchiveMiniblocks(
		ctx context.Context,
		streamId StreamId,
		startMiniblockNum int64,
		miniblocks [][]byte,
	) error

	Close(ctx context.Context)
}
