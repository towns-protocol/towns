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
	StartMiniblockNumber    int64
	SnapshotMiniblockOffset int
	Miniblocks              [][]byte
	MinipoolEnvelopes       [][]byte
}

type StreamStorage interface {
	// CreateStreamStorage creates a new stream with the given genesis miniblock at index 0.
	// Last snapshot minblock index is set to 0.
	// Minipool is set to generation number 1 (i.e. number of miniblock that is going to be produced next) and is empty.
	CreateStreamStorage(ctx context.Context, streamId StreamId, genesisMiniblock []byte) error

	// ReadStreamFromLastSnapshot reads last stream miniblocks and gurantees that last snapshot miniblock is included.
	// It attempts to read at least numToRead miniblocks, but may return less if there are not enough miniblocks in storage,
	// or more, if there are more miniblocks since the last snapshot.
	// Also returns minipool envelopes for the current minipool.
	ReadStreamFromLastSnapshot(
		ctx context.Context,
		streamId StreamId,
		numToRead int,
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

	// WriteMiniblockCandidate adds a proposal candidate for future miniblock.
	WriteMiniblockCandidate(
		ctx context.Context,
		streamId StreamId,
		blockHash common.Hash,
		blockNumber int64,
		miniblock []byte,
	) error

	ReadMiniblockCandidate(
		ctx context.Context,
		streamId StreamId,
		blockHash common.Hash,
		blockNumber int64,
	) ([]byte, error)

	// Promote block candidate to miniblock
	// Deletes current minipool at minipoolGeneration,
	// creates new minipool at minipoolGeneration + 1,
	// stores miniblock proposal with given hash at minipoolGeneration index and wipes all candidates for stream.
	// If snapshotMiniblock is true, stores minipoolGeneration as last snapshot miniblock index,
	// stores envelopes in the new minipool in slots starting with 0.
	PromoteMiniblockCandidate(
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

	DebugReadStreamData(
		ctx context.Context,
		streamId StreamId,
	) (*DebugReadStreamDataResult, error)

	// StreamLastMiniBlock returns the last mini-block number for the given stream from storage.
	StreamLastMiniBlock(ctx context.Context, streamID StreamId) (*MiniblockData, error)

	// ImportMiniblocks imports raw blocks into the database.
	//
	// This bypasses the mini-block candidate/promotion approach and is meant to catch up the storage with the
	// streams registry after the node was down.
	ImportMiniblocks(ctx context.Context, miniBlocks []*MiniblockData) error

	Close(ctx context.Context)
}

type MiniblockData struct {
	StreamID      StreamId
	Number        int64
	MiniBlockInfo []byte
}

type MiniblockDescriptor struct {
	MiniblockNumber int64
	Data            []byte
	Hash            common.Hash // Only set for miniblock candidates
}

type EventDescriptor struct {
	Generation int64
	Slot       int64
	Data       []byte
}

type DebugReadStreamDataResult struct {
	StreamId                   StreamId
	LatestSnapshotMiniblockNum int64
	Miniblocks                 []MiniblockDescriptor
	Events                     []EventDescriptor
	MbCandidates               []MiniblockDescriptor
}
