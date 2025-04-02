package storage

import (
	"context"

	"github.com/ethereum/go-ethereum/common"

	. "github.com/towns-protocol/towns/core/node/shared"
)

const (
	postgres                        = "postgres"
	StreamStorageTypePostgres       = postgres
	NotificationStorageTypePostgres = postgres
	AppRegistryStorageTypePostgres  = postgres
)

type (
	MiniblockHandlerFunc func(blockdata []byte, seqNum int64, snapshot []byte) error

	ReadStreamFromLastSnapshotResult struct {
		SnapshotMiniblockOffset int
		Miniblocks              []*MiniblockDescriptor
		MinipoolEnvelopes       [][]byte
	}

	WriteMiniblockData struct {
		Number   int64
		Hash     common.Hash
		Snapshot []byte
		Data     []byte
	}

	MiniblockDescriptor struct {
		Number   int64
		Data     []byte
		Hash     common.Hash // Only set for miniblock candidates
		Snapshot []byte
	}

	EventDescriptor struct {
		Generation int64
		Slot       int64
		Data       []byte
	}

	DebugReadStreamDataResult struct {
		StreamId                   StreamId
		LatestSnapshotMiniblockNum int64
		Miniblocks                 []MiniblockDescriptor
		Events                     []EventDescriptor
		MbCandidates               []MiniblockDescriptor
	}

	MiniblockCandidateStatisticsResult struct {
		Hash     string
		BlockNum int64
	}

	DebugReadStreamStatisticsResult struct {
		StreamId                   string
		LatestMiniblockNum         int64
		CurrentMiniblockCandidates []MiniblockCandidateStatisticsResult
		NumMinipoolEvents          int64
		LatestSnapshotMiniblockNum int64
	}

	StreamStorage interface {
		// CreateStreamStorage creates a new stream with the given genesis miniblock at index 0.
		// Last snapshot minblock index is set to 0.
		// Minipool is set to generation number 1 (i.e. number of miniblock that is going to be produced next) and is empty.
		CreateStreamStorage(ctx context.Context, streamId StreamId, genesisMiniblock *WriteMiniblockData) error

		// CreateEphemeralStreamStorage same as CreateStreamStorage but marks the stream as ephemeral.
		CreateEphemeralStreamStorage(ctx context.Context, streamId StreamId, genesisMiniblock *WriteMiniblockData) error

		// CreateStreamArchiveStorage creates a new archive storage for the given stream.
		// Unlike regular CreateStreamStorage, only entry in es table and partition table for miniblocks are created.
		CreateStreamArchiveStorage(ctx context.Context, streamId StreamId) error

		// ReadStreamFromLastSnapshot reads last stream miniblocks and guarantees that last snapshot miniblock is included.
		// It attempts to read at least numToRead miniblocks, but may return less if there are not enough miniblocks in storage,
		// or more, if there are more miniblocks since the last snapshot.
		// Also returns minipool envelopes for the current minipool.
		ReadStreamFromLastSnapshot(
			ctx context.Context,
			streamId StreamId,
			numToRead int,
		) (*ReadStreamFromLastSnapshotResult, error)

		// NormalizeEphemeralStream normalizes the given ephemeral stream.
		// Returns the hash of the first and last miniblock of the normalized stream.
		NormalizeEphemeralStream(ctx context.Context, streamId StreamId) (common.Hash, error)

		// IsStreamEphemeral returns true if the stream is ephemeral.
		IsStreamEphemeral(ctx context.Context, streamId StreamId) (bool, error)

		// ReadMiniblocks returns miniblocks with miniblockNum or "generation" from fromInclusive, to toExlusive.
		ReadMiniblocks(
			ctx context.Context,
			streamId StreamId,
			fromInclusive int64,
			toExclusive int64,
		) ([]*MiniblockDescriptor, error)

		// ReadMiniblocksByStream calls onEachMb for each selected miniblock
		ReadMiniblocksByStream(
			ctx context.Context,
			streamId StreamId,
			onEachMb MiniblockHandlerFunc,
		) error

		// ReadMiniblocksByIds calls onEachMb for each specified miniblock
		ReadMiniblocksByIds(
			ctx context.Context,
			streamId StreamId,
			mbs []int64,
			onEachMb MiniblockHandlerFunc,
		) error

		// ReadEphemeralMiniblockNums returns the list of ephemeral miniblock numbers for the given ephemeral stream.
		ReadEphemeralMiniblockNums(ctx context.Context, streamId StreamId) ([]int, error)

		// WriteMiniblockCandidate adds a proposal candidate for future miniblock.
		WriteMiniblockCandidate(
			ctx context.Context,
			streamId StreamId,
			miniblock *WriteMiniblockData,
		) error

		ReadMiniblockCandidate(
			ctx context.Context,
			streamId StreamId,
			blockHash common.Hash,
			blockNumber int64,
		) (*MiniblockDescriptor, error)

		// WriteMiniblocks writes miniblocks to the stream storage and creates new minipool.
		//
		// WriteMiniblocks checks that storage is in the consistent state matching the arguments.
		//
		// Old minipool is deleted, new miniblocks are inserted, new minipool is created,
		// latest snapshot generation record is updated if required and old miniblock candidates are deleted.
		//
		// While miniblock number and minipool generations arguments are redundant to each other,
		// they are used to confirm intention of the calling code and to make correctness checks easier.
		WriteMiniblocks(
			ctx context.Context,
			streamId StreamId,
			miniblocks []*WriteMiniblockData,
			newMinipoolGeneration int64,
			newMinipoolEnvelopes [][]byte,
			prevMinipoolGeneration int64,
			prevMinipoolSize int,
		) error

		// WriteEphemeralMiniblock writes a miniblock as part of ephemeral stream. Skips a bunch of consistency checks.
		// Stream with the given ID must be ephemeral.
		WriteEphemeralMiniblock(ctx context.Context, streamId StreamId, miniblock *WriteMiniblockData) error

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
			miniblocks []*WriteMiniblockData,
		) error

		// GetLastMiniblockNumber returns the last miniblock number for the given stream from storage.
		GetLastMiniblockNumber(ctx context.Context, streamID StreamId) (int64, error)

		// WriteEvent adds event to the given minipool.
		// Current generation of minipool should match minipoolGeneration,
		// and there should be exactly minipoolSlot events in the minipool.
		WriteEvent(
			ctx context.Context,
			streamId StreamId,
			minipoolGeneration int64,
			minipoolSlot int,
			envelope []byte,
		) error

		// DebugReadStreamData returns details for debugging about the stream.
		DebugReadStreamData(ctx context.Context, streamId StreamId) (*DebugReadStreamDataResult, error)

		// DebugReadStreamStatistics returns statistics for debugging about the stream.
		DebugReadStreamStatistics(ctx context.Context, streamId StreamId) (*DebugReadStreamStatisticsResult, error)

		// Close closes the storage.
		Close(ctx context.Context)
	}
)
