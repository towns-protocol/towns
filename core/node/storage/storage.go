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

	MiniblockDescriptor struct {
		Number   int64
		Data     []byte
		Hash     common.Hash // On read only set for miniblock candidates
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

	MiniblockRange struct {
		StartInclusive int64
		EndInclusive   int64
	}

	StreamStorage interface {
		// CreateStreamStorage creates a new stream with the given genesis miniblock at index 0.
		// Last snapshot minblock index is set to 0.
		// Minipool is set to generation number 1 (i.e. number of miniblock that is going to be produced next) and is empty.
		CreateStreamStorage(ctx context.Context, streamId StreamId, genesisMiniblock *MiniblockDescriptor) error

		// ReinitializeStreamStorage initialized or reinitializes storage for the given stream.
		//
		// If stream is not present in storage: creates a new stream.
		// If stream is present in storage:
		// - if updateExisting is false, returns an error.
		// - if updateExisting is true, updates the stream.
		//
		// If existing stream is updated, minipool is reset to empty and generation number is set to the last miniblock number + 1.
		// If existing stream is updated, number of the last provided miniblock should exceed the last miniblock in storage;
		// only new miniblocks are added to the stream, existing miniblocks are left as is,
		// miniblocks range may overlap existing miniblocks.
		// If existing stream is updated, existing miniblock candidates are deleted.
		// miniblocks numbers should be continuous and in the ascending order.
		// miniblocks numbers may start from non-zero value.
		// lastSnapshotMiniblockNum must be in the range of miniblocks numbers.
		ReinitializeStreamStorage(
			ctx context.Context,
			streamId StreamId,
			miniblocks []*MiniblockDescriptor,
			lastSnapshotMiniblockNum int64,
			updateExisting bool,
		) error

		// CreateEphemeralStreamStorage same as CreateStreamStorage but marks the stream as ephemeral.
		CreateEphemeralStreamStorage(
			ctx context.Context,
			streamId StreamId,
			genesisMiniblock *MiniblockDescriptor,
		) error

		// CreateStreamArchiveStorage creates a new archive storage for the given stream.
		// Unlike regular CreateStreamStorage, only entry in es table and partition table for miniblocks are created.
		CreateStreamArchiveStorage(ctx context.Context, streamId StreamId) error

		// ReadStreamFromLastSnapshot reads last stream miniblocks and guarantees that last snapshot miniblock is included.
		// It attempts to read at least numPrecedingMiniblocks miniblocks before the snapshot, but may return less if there are not enough miniblocks in storage,
		// or more, if there are more miniblocks since the last snapshot.
		// Also returns minipool envelopes for the current minipool.
		ReadStreamFromLastSnapshot(
			ctx context.Context,
			streamId StreamId,
			numPrecedingMiniblocks int,
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
			omitSnapshot bool,
		) ([]*MiniblockDescriptor, error)

		// ReadMiniblocksByStream calls onEachMb for each selected miniblock
		ReadMiniblocksByStream(
			ctx context.Context,
			streamId StreamId,
			omitSnapshot bool,
			onEachMb MiniblockHandlerFunc,
		) error

		// ReadMiniblocksByIds calls onEachMb for each specified miniblock
		ReadMiniblocksByIds(
			ctx context.Context,
			streamId StreamId,
			mbs []int64,
			omitSnapshot bool,
			onEachMb MiniblockHandlerFunc,
		) error

		// ReadEphemeralMiniblockNums returns the list of ephemeral miniblock numbers for the given ephemeral stream.
		ReadEphemeralMiniblockNums(ctx context.Context, streamId StreamId) ([]int, error)

		// WriteMiniblockCandidate adds a proposal candidate for future miniblock.
		WriteMiniblockCandidate(
			ctx context.Context,
			streamId StreamId,
			miniblock *MiniblockDescriptor,
		) error

		ReadMiniblockCandidate(
			ctx context.Context,
			streamId StreamId,
			blockHash common.Hash,
			blockNumber int64,
		) (*MiniblockDescriptor, error)

		GetMiniblockCandidateCount(
			ctx context.Context,
			streamId StreamId,
			miniblockNumber int64,
		) (int, error)

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
			miniblocks []*MiniblockDescriptor,
			newMinipoolGeneration int64,
			newMinipoolEnvelopes [][]byte,
			prevMinipoolGeneration int64,
			prevMinipoolSize int,
		) error

		// WriteEphemeralMiniblock writes a miniblock as part of ephemeral stream. Skips a bunch of consistency checks.
		// Stream with the given ID must be ephemeral.
		WriteEphemeralMiniblock(ctx context.Context, streamId StreamId, miniblock *MiniblockDescriptor) error

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
			miniblocks []*MiniblockDescriptor,
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

		// WritePrecedingMiniblocks writes miniblocks that precede existing miniblocks in storage.
		// This is used for backfilling gaps in the miniblock sequence during reconciliation.
		//
		// Requirements:
		// - miniblocks must be continuous (no gaps)
		// - all miniblock numbers must be less than the last miniblock in storage
		// - overlapping miniblocks are skipped (not overwritten)
		// - does not modify minipool
		// - does not update latest_snapshot_miniblock
		//
		// This function is designed for reconciliation processes that need to fill gaps
		// in the miniblock sequence without affecting the current stream state.
		WritePrecedingMiniblocks(
			ctx context.Context,
			streamId StreamId,
			miniblocks []*MiniblockDescriptor,
		) error

		// GetMiniblockNumberRanges returns all continuous ranges of miniblock numbers
		// present in storage for the given stream, starting from the specified miniblock number.
		// Each range contains StartInclusive and EndInclusive miniblock numbers.
		// This is useful for identifying gaps in the miniblock sequence during reconciliation.
		//
		// Example: If the stream has miniblocks [0,1,2,5,6,7,10] and startMiniblockNumberInclusive=0,
		// the result would be: [{0,2}, {5,7}, {10,10}]
		//
		// If startMiniblockNumberInclusive is greater than all existing miniblocks, returns empty slice.
		GetMiniblockNumberRanges(
			ctx context.Context,
			streamId StreamId,
			startMiniblockNumberInclusive int64,
		) ([]MiniblockRange, error)

		// DebugReadStreamData returns details for debugging about the stream.
		DebugReadStreamData(ctx context.Context, streamId StreamId) (*DebugReadStreamDataResult, error)

		// DebugReadStreamStatistics returns statistics for debugging about the stream.
		DebugReadStreamStatistics(ctx context.Context, streamId StreamId) (*DebugReadStreamStatisticsResult, error)

		// DebugDeleteMiniblocks deletes miniblocks from the storage in the given range.
		// This is a debug function used for testing backwards reconciliation.
		// fromInclusive and toExclusive specify the range of miniblock numbers to delete.
		// WARNING: This function should only be used for testing purposes.
		DebugDeleteMiniblocks(ctx context.Context, streamId StreamId, fromInclusive int64, toExclusive int64) error

		// Close closes the storage.
		Close(ctx context.Context)
	}
)
