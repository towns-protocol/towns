package storage

import (
	"context"
	"embed"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/sha3"

	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"
)

type PostgresStreamStore struct {
	PostgresEventStore

	exitSignal        chan error
	nodeUUID          string
	cleanupListenFunc func()
}

var _ StreamStorage = (*PostgresStreamStore)(nil)

//go:embed migrations/*.sql
var migrationsDir embed.FS

func NewPostgresStreamStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	instanceId string,
	exitSignal chan error,
	metrics infra.MetricsFactory,
) (*PostgresStreamStore, error) {
	store := &PostgresStreamStore{
		nodeUUID:   instanceId,
		exitSignal: exitSignal,
	}
	if err := store.PostgresEventStore.init(
		ctx,
		poolInfo,
		metrics,
		migrationsDir,
	); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresStreamStore")
	}

	if err := store.initStreamStorage(ctx); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresStreamStore")
	}

	cancelCtx, cancel := context.WithCancel(ctx)
	store.cleanupListenFunc = cancel
	go store.listenForNewNodes(cancelCtx)

	return store, nil
}

func (s *PostgresStreamStore) initStreamStorage(ctx context.Context) error {
	err := s.txRunner(
		ctx,
		"listOtherInstances",
		pgx.ReadOnly,
		s.listOtherInstancesTx,
		nil,
	)
	if err != nil {
		return err
	}

	return s.txRunner(
		ctx,
		"initializeSingleNodeKey",
		pgx.ReadWrite,
		s.initializeSingleNodeKeyTx,
		nil,
	)
}

// txRunner runs transactions against the underlying postgres store. This override
// adds logging tags for the node's UUID.
func (s *PostgresStreamStore) txRunner(
	ctx context.Context,
	name string,
	accessMode pgx.TxAccessMode,
	txFn func(context.Context, pgx.Tx) error,
	opts *txRunnerOpts,
	tags ...any,
) error {
	tags = append(tags, "currentUUID", s.nodeUUID)
	return s.PostgresEventStore.txRunner(
		ctx,
		name,
		accessMode,
		txFn,
		opts,
		tags...,
	)
}

// txRunnerWithUUIDCheck conditionally run the transaction only if a check against the
// singlenodekey table shows that this is still the only node writing to the database.
func (s *PostgresStreamStore) txRunnerWithUUIDCheck(
	ctx context.Context,
	name string,
	accessMode pgx.TxAccessMode,
	txFn func(context.Context, pgx.Tx) error,
	opts *txRunnerOpts,
	tags ...any,
) error {
	return s.txRunner(
		ctx,
		name,
		accessMode,
		func(ctx context.Context, txn pgx.Tx) error {
			if err := s.compareUUID(ctx, txn); err != nil {
				return err
			}
			return txFn(ctx, txn)
		},
		opts,
		tags...,
	)
}

// processErrorForMissingPartition looks for the specific error type returned when a table is not found
// and returns that as a NOT_FOUND river error for the specified stream.
func processErrorForMissingPartition(err error, streamId StreamId) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		if pgErr.Code == pgerrcode.UndefinedTable {
			return RiverError(Err_NOT_FOUND, "stream not found in local storage", "streamId", streamId)
		}
	}
	return err
}

// sqlForStream escapes references to partitioned tables to the specific partition where the stream
// is assigned whenever they are surrounded by double curly brackets.
func sqlForStream(sql string, streamId StreamId) string {
	suffix := createTableSuffix(streamId)

	sql = strings.ReplaceAll(
		sql,
		"{{miniblocks}}",
		"miniblocks_"+suffix,
	)
	sql = strings.ReplaceAll(
		sql,
		"{{minipools}}",
		"minipools_"+suffix,
	)
	sql = strings.ReplaceAll(
		sql,
		"{{miniblock_candidates}}",
		"miniblock_candidates_"+suffix,
	)

	return sql
}

func (s *PostgresStreamStore) CreateStreamStorage(
	ctx context.Context,
	streamId StreamId,
	genesisMiniblock []byte,
) error {
	return s.txRunnerWithUUIDCheck(
		ctx,
		"CreateStreamStorage",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createStreamStorageTx(ctx, tx, streamId, genesisMiniblock)
		},
		nil,
		"streamId", streamId,
	)
}

func (s *PostgresStreamStore) createStreamStorageTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	genesisMiniblock []byte,
) error {
	sql := sqlForStream(
		`INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, 0);
		CREATE TABLE {{miniblocks}} PARTITION OF miniblocks FOR VALUES IN ($1);
		CREATE TABLE {{minipools}} PARTITION OF minipools FOR VALUES IN ($1);
		CREATE TABLE {{miniblock_candidates}} PARTITION OF miniblock_candidates for values in ($1);
		INSERT INTO {{miniblocks}} (stream_id, seq_num, blockdata) VALUES ($1, 0, $2);
		INSERT INTO {{minipools}} (stream_id, generation, slot_num) VALUES ($1, 1, -1);`,
		streamId,
	)
	_, err := tx.Exec(ctx, sql, streamId, genesisMiniblock)
	if err != nil {
		if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code == pgerrcode.UniqueViolation {
			return WrapRiverError(Err_ALREADY_EXISTS, err).Message("stream already exists")
		}
		return err
	}
	return nil
}

func (s *PostgresStreamStore) CreateStreamArchiveStorage(
	ctx context.Context,
	streamId StreamId,
) error {
	return s.txRunnerWithUUIDCheck(
		ctx,
		"CreateStreamArchiveStorage",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.createStreamArchiveStorageTx(ctx, tx, streamId)
		},
		nil,
		"streamId", streamId,
	)
}

func (s *PostgresStreamStore) createStreamArchiveStorageTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) error {
	sql := sqlForStream(
		`INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, -1);
		CREATE TABLE {{miniblocks}} PARTITION OF miniblocks FOR VALUES IN ($1);`,
		streamId,
	)
	_, err := tx.Exec(ctx, sql, streamId)
	if err != nil {
		if pgerr, ok := err.(*pgconn.PgError); ok && pgerr.Code == pgerrcode.UniqueViolation {
			return WrapRiverError(Err_ALREADY_EXISTS, err).Message("stream already exists")
		}
		return err
	}
	return nil
}

func (s *PostgresStreamStore) GetMaxArchivedMiniblockNumber(
	ctx context.Context,
	streamId StreamId,
) (int64, error) {
	var maxArchivedMiniblockNumber int64
	err := s.txRunnerWithUUIDCheck(
		ctx,
		"GetMaxArchivedMiniblockNumber",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.getMaxArchivedMiniblockNumberTx(ctx, tx, streamId, &maxArchivedMiniblockNumber)
		},
		&txRunnerOpts{skipLoggingNotFound: true},
		"streamId", streamId,
	)
	if err != nil {
		return -1, err
	}
	return maxArchivedMiniblockNumber, nil
}

func (s *PostgresStreamStore) getMaxArchivedMiniblockNumberTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	maxArchivedMiniblockNumber *int64,
) error {
	err := tx.QueryRow(
		ctx,
		sqlForStream(
			"SELECT COALESCE(MAX(seq_num), -1) FROM {{miniblocks}} WHERE stream_id = $1",
			streamId,
		),
		streamId,
	).Scan(maxArchivedMiniblockNumber)
	if err != nil {
		return processErrorForMissingPartition(err, streamId)
	}

	if *maxArchivedMiniblockNumber == -1 {
		var exists bool
		err = tx.QueryRow(
			ctx,
			"SELECT EXISTS(SELECT 1 FROM es WHERE stream_id = $1)",
			streamId,
		).Scan(&exists)
		if err != nil {
			return err
		}
		if !exists {
			return RiverError(Err_NOT_FOUND, "stream not found in local storage", "streamId", streamId)
		}
	}
	return nil
}

func (s *PostgresStreamStore) WriteArchiveMiniblocks(
	ctx context.Context,
	streamId StreamId,
	startMiniblockNum int64,
	miniblocks [][]byte,
) error {
	return s.txRunnerWithUUIDCheck(
		ctx,
		"WriteArchiveMiniblocks",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.writeArchiveMiniblocksTx(ctx, tx, streamId, startMiniblockNum, miniblocks)
		},
		nil,
		"streamId", streamId,
		"startMiniblockNum", startMiniblockNum,
		"numMiniblocks", len(miniblocks),
	)
}

func (s *PostgresStreamStore) writeArchiveMiniblocksTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	startMiniblockNum int64,
	miniblocks [][]byte,
) error {
	var lastKnownMiniblockNum int64
	err := s.getMaxArchivedMiniblockNumberTx(ctx, tx, streamId, &lastKnownMiniblockNum)
	if err != nil {
		return err
	}
	if lastKnownMiniblockNum+1 != startMiniblockNum {
		return RiverError(
			Err_DB_OPERATION_FAILURE,
			"miniblock sequence number mismatch",
			"lastKnownMiniblockNum", lastKnownMiniblockNum,
			"startMiniblockNum", startMiniblockNum,
			"streamId", streamId,
		)
	}

	for i, miniblock := range miniblocks {
		_, err := tx.Exec(
			ctx,
			sqlForStream(
				"INSERT INTO {{miniblocks}} (stream_id, seq_num, blockdata) VALUES ($1, $2, $3)",
				streamId,
			),
			streamId,
			startMiniblockNum+int64(i),
			miniblock)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *PostgresStreamStore) ReadStreamFromLastSnapshot(
	ctx context.Context,
	streamId StreamId,
	numToRead int,
) (*ReadStreamFromLastSnapshotResult, error) {
	var ret *ReadStreamFromLastSnapshotResult
	err := s.txRunnerWithUUIDCheck(
		ctx,
		"ReadStreamFromLastSnapshot",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.readStreamFromLastSnapshotTx(ctx, tx, streamId, numToRead)
			return err
		},
		nil,
		"streamId", streamId,
	)
	if err != nil {
		return nil, err
	}
	return ret, nil
}

func (s *PostgresStreamStore) readStreamFromLastSnapshotTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	numToRead int,
) (*ReadStreamFromLastSnapshotResult, error) {
	var snapshotMiniblockIndex int64
	err := tx.
		QueryRow(ctx, "SELECT latest_snapshot_miniblock FROM es WHERE stream_id = $1", streamId).
		Scan(&snapshotMiniblockIndex)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, WrapRiverError(Err_NOT_FOUND, err).Message("stream not found in local storage")
		} else {
			return nil, err
		}
	}

	var lastMiniblockIndex int64
	err = tx.
		QueryRow(
			ctx,
			sqlForStream(
				"SELECT MAX(seq_num) FROM {{miniblocks}} WHERE stream_id = $1",
				streamId,
			),
			streamId).
		Scan(&lastMiniblockIndex)
	if err != nil {
		return nil, WrapRiverError(Err_INTERNAL, err).Message("db inconsistency: failed to get last miniblock index")
	}

	numToRead = max(1, numToRead)
	startSeqNum := max(0, lastMiniblockIndex-int64(numToRead-1))
	startSeqNum = min(startSeqNum, snapshotMiniblockIndex)

	miniblocksRow, err := tx.Query(
		ctx,
		sqlForStream(
			"SELECT blockdata, seq_num FROM {{miniblocks}} WHERE seq_num >= $1 AND stream_id = $2 ORDER BY seq_num",
			streamId,
		),
		startSeqNum,
		streamId,
	)
	if err != nil {
		return nil, err
	}
	defer miniblocksRow.Close()

	var miniblocks [][]byte
	var counter int64 = 0
	var readLastSeqNum int64
	var readFirstSeqNum int64
	for miniblocksRow.Next() {
		var blockdata []byte
		err = miniblocksRow.Scan(&blockdata, &readLastSeqNum)
		if err != nil {
			return nil, err
		}
		if counter == 0 {
			readFirstSeqNum = readLastSeqNum
		} else if readLastSeqNum != readFirstSeqNum+counter {
			return nil, RiverError(
				Err_INTERNAL,
				"Miniblocks consistency violation - miniblocks are not sequential in db",
				"ActualSeqNum", readLastSeqNum,
				"ExpectedSeqNum", readFirstSeqNum+counter)
		}
		miniblocks = append(miniblocks, blockdata)
		counter++
	}
	miniblocksRow.Close()

	if !(readFirstSeqNum <= snapshotMiniblockIndex && snapshotMiniblockIndex <= readLastSeqNum) {
		return nil, RiverError(
			Err_INTERNAL,
			"Miniblocks consistency violation - snapshotMiniblocIndex is out of range",
			"snapshotMiniblockIndex", snapshotMiniblockIndex,
			"readFirstSeqNum", readFirstSeqNum,
			"readLastSeqNum", readLastSeqNum)
	}

	rows, err := tx.Query(
		ctx,
		sqlForStream(
			"SELECT envelope, generation, slot_num FROM {{minipools}} WHERE stream_id = $1 ORDER BY generation, slot_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var envelopes [][]byte
	var expectedGeneration int64 = readLastSeqNum + 1
	var expectedSlot int64 = -1
	for rows.Next() {
		var envelope []byte
		var generation int64
		var slotNum int64
		err = rows.Scan(&envelope, &generation, &slotNum)
		if err != nil {
			return nil, err
		}
		if generation != expectedGeneration {
			return nil, RiverError(
				Err_MINIBLOCKS_STORAGE_FAILURE,
				"Minipool consistency violation - minipool generation doesn't match last miniblock generation",
			).
				Tag("generation", generation).
				Tag("expectedGeneration", expectedGeneration)
		}
		if slotNum != expectedSlot {
			return nil, RiverError(
				Err_MINIBLOCKS_STORAGE_FAILURE,
				"Minipool consistency violation - slotNums are not sequential",
			).
				Tag("slotNum", slotNum).
				Tag("expectedSlot", expectedSlot)
		}

		if slotNum >= 0 {
			envelopes = append(envelopes, envelope)
		}
		expectedSlot++
	}

	return &ReadStreamFromLastSnapshotResult{
		StartMiniblockNumber:    readFirstSeqNum,
		SnapshotMiniblockOffset: int(snapshotMiniblockIndex - readFirstSeqNum),
		Miniblocks:              miniblocks,
		MinipoolEnvelopes:       envelopes,
	}, nil
}

// Adds event to the given minipool.
// Current generation of minipool should match minipoolGeneration,
// and there should be exactly minipoolSlot events in the minipool.
func (s *PostgresStreamStore) WriteEvent(
	ctx context.Context,
	streamId StreamId,
	minipoolGeneration int64,
	minipoolSlot int,
	envelope []byte,
) error {
	return s.txRunnerWithUUIDCheck(
		ctx,
		"WriteEvent",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.writeEventTx(ctx, tx, streamId, minipoolGeneration, minipoolSlot, envelope)
		},
		nil,
		"streamId", streamId,
		"minipoolGeneration", minipoolGeneration,
		"minipoolSlot", minipoolSlot,
	)
}

// Supported consistency checks:
// 1. Minipool has proper number of records including service one (equal to minipoolSlot)
// 2. There are no gaps in seqNums and they start from 0 execpt service record with seqNum = -1
// 3. All events in minipool have proper generation
func (s *PostgresEventStore) writeEventTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	minipoolGeneration int64,
	minipoolSlot int,
	envelope []byte,
) error {
	envelopesRow, err := tx.Query(
		ctx,
		// Ordering by generation, slot_num allows this to be an index only query
		sqlForStream(
			"SELECT generation, slot_num FROM {{minipools}} WHERE stream_id = $1 ORDER BY generation, slot_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return err
	}
	defer envelopesRow.Close()

	var counter int = -1 // counter is set to -1 as we have service record in the first row of minipool table

	for envelopesRow.Next() {
		var generation int64
		var slotNum int
		err = envelopesRow.Scan(&generation, &slotNum)
		if err != nil {
			return err
		}
		if generation != minipoolGeneration {
			return RiverError(Err_DB_OPERATION_FAILURE, "Wrong event generation in minipool").
				Tag("ExpectedGeneration", minipoolGeneration).Tag("ActualGeneration", generation).
				Tag("SlotNumber", slotNum)
		}
		if slotNum != counter {
			return RiverError(Err_DB_OPERATION_FAILURE, "Wrong slot number in minipool").
				Tag("ExpectedSlotNumber", counter).Tag("ActualSlotNumber", slotNum)
		}
		// Slots number for envelopes start from 1, so we skip counter equal to zero
		counter++
	}

	// At this moment counter should be equal to minipoolSlot otherwise it is discrepancy of actual and expected records in minipool
	// Keep in mind that there is service record with seqNum equal to -1
	if counter != minipoolSlot {
		return RiverError(Err_DB_OPERATION_FAILURE, "Wrong number of records in minipool").
			Tag("ActualRecordsNumber", counter).Tag("ExpectedRecordsNumber", minipoolSlot)
	}

	// All checks passed - we need to insert event into minipool
	_, err = tx.Exec(
		ctx,
		sqlForStream(
			"INSERT INTO {{minipools}} (stream_id, envelope, generation, slot_num) VALUES ($1, $2, $3, $4)",
			streamId,
		),
		streamId,
		envelope,
		minipoolGeneration,
		minipoolSlot,
	)
	if err != nil {
		return err
	}
	return nil
}

// Supported consistency checks:
// 1. There are no gaps in miniblocks sequence
// TODO: Do we want to check that if we get miniblocks an toIndex is greater or equal block with latest snapshot, than in results we will have at least
// miniblock with latest snapshot?
// This functional is not transactional as it consists of only one SELECT query
func (s *PostgresStreamStore) ReadMiniblocks(
	ctx context.Context,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([][]byte, error) {
	var miniblocks [][]byte
	err := s.txRunnerWithUUIDCheck(
		ctx,
		"ReadMiniblocks",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			miniblocks, err = s.readMiniblocksTx(ctx, tx, streamId, fromInclusive, toExclusive)
			return err
		},
		nil,
		"streamId", streamId,
	)
	if err != nil {
		return nil, err
	}
	return miniblocks, nil
}

func (s *PostgresStreamStore) readMiniblocksTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([][]byte, error) {
	miniblocksRow, err := tx.Query(
		ctx,
		// NOTE: this method returns a nil result if stream does not exist, not an error.
		// For this reason we do not target the partition in this query, because a missing
		// partition will put the transaction into a bad state and result in an unexpected
		// commit failure.
		"SELECT blockdata, seq_num FROM miniblocks WHERE seq_num >= $1 AND seq_num < $2 AND stream_id = $3 ORDER BY seq_num",
		fromInclusive,
		toExclusive,
		streamId,
	)
	if err != nil {
		return nil, err
	}
	defer miniblocksRow.Close()

	// Retrieve miniblocks starting from the latest miniblock with snapshot
	var miniblocks [][]byte

	var prevSeqNum int = -1 // There is no negative generation, so we use it as a flag on the first step of the loop during miniblocks sequence check
	for miniblocksRow.Next() {
		var blockdata []byte
		var seq_num int

		err = miniblocksRow.Scan(&blockdata, &seq_num)
		if err != nil {
			return nil, err
		}

		if (prevSeqNum != -1) && (seq_num != prevSeqNum+1) {
			// There is a gap in sequence numbers
			return nil, RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Miniblocks consistency violation").
				Tag("ActualBlockNumber", seq_num).Tag("ExpectedBlockNumber", prevSeqNum+1).Tag("streamId", streamId)
		}
		prevSeqNum = seq_num

		miniblocks = append(miniblocks, blockdata)
	}
	return miniblocks, nil
}

// WriteMiniblockCandidate adds a miniblock proposal candidate. When the miniblock is finalized, the node will promote the
// candidate with the correct hash.
func (s *PostgresStreamStore) WriteMiniblockCandidate(
	ctx context.Context,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
	miniblock []byte,
) error {
	return s.txRunnerWithUUIDCheck(
		ctx,
		"WriteMiniblockCandidate",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.writeBlockProposalTxn(ctx, tx, streamId, blockHash, blockNumber, miniblock)
		},
		nil,
		"streamId", streamId,
		"blockHash", blockHash,
		"blockNumber", blockNumber,
	)
}

// Supported consistency checks:
// 1. Proposal block number is current miniblock block number + 1
func (s *PostgresStreamStore) writeBlockProposalTxn(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
	miniblock []byte,
) error {
	var seqNum *int64

	err := tx.QueryRow(
		ctx,
		sqlForStream(
			"SELECT MAX(seq_num) as latest_blocks_number FROM {{miniblocks}} WHERE stream_id = $1",
			streamId,
		),
		streamId,
	).
		Scan(&seqNum)
	if err != nil {
		return processErrorForMissingPartition(err, streamId)
	}
	if seqNum == nil {
		return RiverError(Err_NOT_FOUND, "No blocks for the stream found in block storage")
	}
	// Proposal should be for or after the next block number. Candidates from before the next block number are rejected.
	if blockNumber < *seqNum+1 {
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Miniblock proposal blockNumber mismatch").
			Tag("ExpectedBlockNumber", *seqNum+1).Tag("ActualBlockNumber", blockNumber)
	}

	// insert miniblock proposal into miniblock_candidates table
	_, err = tx.Exec(
		ctx,
		sqlForStream(
			"INSERT INTO {{miniblock_candidates}} (stream_id, seq_num, block_hash, blockdata) VALUES ($1, $2, $3, $4) ON CONFLICT(stream_id, seq_num, block_hash) DO NOTHING",
			streamId,
		),
		streamId,
		blockNumber,
		hex.EncodeToString(blockHash.Bytes()), // avoid leading '0x'
		miniblock,
	)
	return err
}

func (s *PostgresStreamStore) ReadMiniblockCandidate(
	ctx context.Context,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
) ([]byte, error) {
	var miniblock []byte
	err := s.txRunnerWithUUIDCheck(
		ctx,
		"ReadMiniblockCandidate",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			miniblock, err = s.readMiniblockCandidateTx(ctx, tx, streamId, blockHash, blockNumber)
			return err
		},
		nil,
		"streamId", streamId,
		"blockHash", blockHash,
		"blockNumber", blockNumber,
	)
	if err != nil {
		return nil, err
	}
	return miniblock, nil
}

func (s *PostgresStreamStore) readMiniblockCandidateTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
) ([]byte, error) {
	var miniblock []byte
	err := tx.QueryRow(
		ctx,
		sqlForStream(
			"SELECT blockdata FROM {{miniblock_candidates}} WHERE stream_id = $1 AND seq_num = $2 AND block_hash = $3",
			streamId,
		),
		streamId,
		blockNumber,
		hex.EncodeToString(blockHash.Bytes()), // avoid leading '0x'
	).Scan(&miniblock)
	if err != nil {
		return nil, err
	}
	return miniblock, nil
}

func (s *PostgresStreamStore) PromoteMiniblockCandidate(
	ctx context.Context,
	streamId StreamId,
	minipoolGeneration int64,
	candidateBlockHash common.Hash,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return s.txRunnerWithUUIDCheck(
		ctx,
		"PromoteMiniblockCandidate",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.promoteBlockTxn(
				ctx,
				tx,
				streamId,
				minipoolGeneration,
				candidateBlockHash,
				snapshotMiniblock,
				envelopes,
			)
		},
		nil,
		"streamId", streamId,
		"minipoolGeneration", minipoolGeneration,
		"candidateBlockHash", candidateBlockHash,
		"snapshotMiniblock", snapshotMiniblock,
	)
}

func (s *PostgresStreamStore) promoteBlockTxn(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	minipoolGeneration int64,
	candidateBlockHash common.Hash,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	var seqNum *int64

	if err := tx.QueryRow(
		ctx,
		// NOTE: This query could not be targeted to the specific partition without producing deadlocks
		// with the CreateStreamStorage transaction above. I think there may be a race condition in our
		// logic where a go routine is attempting to make a miniblock while a stream is being created
		// that only causes a deadlock if we are attempting to read from a table that is in the middle of
		// being created.
		"SELECT MAX(seq_num) as latest_block_number FROM miniblocks WHERE stream_id = $1",
		streamId,
	).Scan(&seqNum); err != nil {
		return err
	}
	if seqNum == nil {
		return RiverError(Err_NOT_FOUND, "No blocks for the stream found in block storage")
	}
	if minipoolGeneration != *seqNum+1 {
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Minipool generation mismatch").
			Tag("ExpectedNewMinipoolGeneration", minipoolGeneration).Tag("ActualNewMinipoolGeneration", *seqNum+1)
	}

	// clean up minipool
	if _, err := tx.Exec(
		ctx,
		sqlForStream(
			"DELETE FROM {{minipools}} WHERE slot_num > -1 AND stream_id = $1",
			streamId,
		),
		streamId,
	); err != nil {
		return err
	}

	// update -1 record of minipools table to minipoolGeneration + 1
	_, err := tx.Exec(
		ctx,
		sqlForStream(
			"UPDATE {{minipools}} SET generation = $1 WHERE slot_num = -1 AND stream_id = $2",
			streamId,
		),
		minipoolGeneration+1,
		streamId,
	)
	if err != nil {
		return err
	}

	// update stream_snapshots_index if needed
	if snapshotMiniblock {
		_, err := tx.Exec(
			ctx,
			`UPDATE es SET latest_snapshot_miniblock = $1 WHERE stream_id = $2`,
			minipoolGeneration,
			streamId,
		)
		if err != nil {
			return err
		}
	}

	// insert all minipool events into minipool
	for i, envelope := range envelopes {
		_, err = tx.Exec(
			ctx,
			sqlForStream(
				"INSERT INTO {{minipools}} (stream_id, slot_num, generation, envelope) VALUES ($1, $2, $3, $4)",
				streamId,
			),
			streamId,
			i,
			minipoolGeneration+1,
			envelope,
		)
		if err != nil {
			return err
		}
	}

	// promote miniblock candidate into miniblocks table
	tag, err := tx.Exec(
		ctx,
		sqlForStream(
			"INSERT INTO {{miniblocks}} SELECT stream_id, seq_num, blockdata FROM {{miniblock_candidates}} WHERE stream_id = $1 AND seq_num = $2 AND {{miniblock_candidates}}.block_hash = $3",
			streamId,
		),
		streamId,
		minipoolGeneration,
		hex.EncodeToString(candidateBlockHash.Bytes()), // avoid leading '0x'
	)
	if err != nil {
		return err
	}
	// Exactly one row should be copied. (stream_id, seq_num, blockhash) is a unique key, so we expect 0 or 1 copies.
	if tag.RowsAffected() < 1 {
		return RiverError(Err_NOT_FOUND, "No candidate block found")
	}

	// clean up miniblock proposals for stream id
	_, err = tx.Exec(
		ctx,
		sqlForStream(
			"DELETE FROM {{miniblock_candidates}} WHERE stream_id = $1 and seq_num <= $2",
			streamId,
		),
		streamId,
		minipoolGeneration,
	)
	return err
}

func (s *PostgresStreamStore) GetStreamsNumber(ctx context.Context) (int, error) {
	var count int
	err := s.txRunnerWithUUIDCheck(
		ctx,
		"GetStreamsNumber",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			count, err = s.getStreamsNumberTx(ctx, tx)
			return err
		},
		nil,
	)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *PostgresStreamStore) getStreamsNumberTx(ctx context.Context, tx pgx.Tx) (int, error) {
	var count int
	row := tx.QueryRow(ctx, "SELECT COUNT(stream_id) FROM es")
	err := row.Scan(&count)
	if err != nil {
		return 0, err
	}
	dlog.FromCtx(ctx).Debug("GetStreamsNumberTx", "count", count)
	return count, nil
}

func (s *PostgresStreamStore) compareUUID(ctx context.Context, tx pgx.Tx) error {
	log := dlog.FromCtx(ctx)

	rows, err := tx.Query(ctx, "SELECT uuid FROM singlenodekey")
	if err != nil {
		return err
	}
	defer rows.Close()

	allIds := []string{}
	for rows.Next() {
		var id string
		err = rows.Scan(&id)
		if err != nil {
			return err
		}
		allIds = append(allIds, id)
	}

	if len(allIds) == 1 && allIds[0] == s.nodeUUID {
		return nil
	}

	err = RiverError(Err_RESOURCE_EXHAUSTED, "No longer a current node, shutting down").
		Func("pg.compareUUID").
		Tag("currentUUID", s.nodeUUID).
		Tag("schema", s.schemaName).
		Tag("newUUIDs", allIds).
		LogError(log)
	s.exitSignal <- err
	return err
}

// Close removes instance record from singlenodekey table, releases the listener connection, and
// closes the postgres connection pool
func (s *PostgresStreamStore) Close(ctx context.Context) {
	err := s.CleanupStreamStorage(ctx)
	if err != nil {
		log := dlog.FromCtx(ctx)
		log.Error("Error when deleting singlenodekey entry", "error", err)
	}

	// Cancel the notify listening func to release the listener connection before closing the pool.
	s.cleanupListenFunc()

	s.PostgresEventStore.Close(ctx)
}

func (s *PostgresStreamStore) CleanupStreamStorage(ctx context.Context) error {
	return s.txRunner(
		ctx,
		"CleanupStreamStorage",
		pgx.ReadWrite,
		s.cleanupStreamStorageTx,
		&txRunnerOpts{},
	)
}

func (s *PostgresStreamStore) cleanupStreamStorageTx(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, "DELETE FROM singlenodekey WHERE uuid = $1", s.nodeUUID)
	return err
}

// GetStreams returns a list of all event streams
func (s *PostgresStreamStore) GetStreams(ctx context.Context) ([]StreamId, error) {
	var streams []StreamId
	err := s.txRunnerWithUUIDCheck(
		ctx,
		"GetStreams",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			streams, err = s.getStreamsTx(ctx, tx)
			return err
		},
		nil,
	)
	if err != nil {
		return nil, err
	}
	return streams, nil
}

func (s *PostgresStreamStore) getStreamsTx(ctx context.Context, tx pgx.Tx) ([]StreamId, error) {
	streams := []string{}
	rows, err := tx.Query(ctx, "SELECT stream_id FROM es")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var streamName string
		err = rows.Scan(&streamName)
		if err != nil {
			return nil, err
		}
		streams = append(streams, streamName)
	}

	ret := make([]StreamId, len(streams))
	for i, stream := range streams {
		ret[i], err = StreamIdFromString(stream)
		if err != nil {
			return nil, err
		}
	}
	return ret, nil
}

func (s *PostgresStreamStore) DeleteStream(ctx context.Context, streamId StreamId) error {
	return s.txRunnerWithUUIDCheck(
		ctx,
		"DeleteStream",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.deleteStreamTx(ctx, tx, streamId)
		},
		nil,
		"streamId", streamId,
	)
}

func (s *PostgresStreamStore) deleteStreamTx(ctx context.Context, tx pgx.Tx, streamId StreamId) error {
	_, err := tx.Exec(
		ctx,
		sqlForStream(
			`DROP TABLE {{miniblocks}};
			DROP TABLE {{minipools}};
			DELETE FROM es WHERE stream_id = $1`,
			streamId,
		),
		streamId)
	return err
}

func DbSchemaNameFromAddress(address string) string {
	return "s" + strings.ToLower(address)
}

func DbSchemaNameForArchive(archiveId string) string {
	return "arch" + strings.ToLower(archiveId)
}

func (s *PostgresStreamStore) listOtherInstancesTx(ctx context.Context, tx pgx.Tx) error {
	log := dlog.FromCtx(ctx)

	rows, err := tx.Query(ctx, "SELECT uuid, storage_connection_time, info FROM singlenodekey")
	if err != nil {
		return err
	}
	defer rows.Close()

	found := false
	for rows.Next() {
		var storedUUID string
		var storedTimestamp time.Time
		var storedInfo string
		err := rows.Scan(&storedUUID, &storedTimestamp, &storedInfo)
		if err != nil {
			return err
		}
		log.Info(
			"Found UUID during startup",
			"uuid",
			storedUUID,
			"timestamp",
			storedTimestamp,
			"storedInfo",
			storedInfo,
		)
		found = true
	}

	if found {
		delay := s.config.StartupDelay
		if delay == 0 {
			delay = 2 * time.Second
		} else if delay <= time.Millisecond {
			delay = 0
		}
		if delay > 0 {
			log.Info("singlenodekey is not empty; Delaying startup to let other instance exit", "delay", delay)
			time.Sleep(delay)
		}
	}

	return nil
}

func (s *PostgresStreamStore) initializeSingleNodeKeyTx(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, "DELETE FROM singlenodekey")
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		ctx,
		"INSERT INTO singlenodekey (uuid, storage_connection_time, info) VALUES ($1, $2, $3)",
		s.nodeUUID,
		time.Now(),
		getCurrentNodeProcessInfo(s.schemaName),
	)
	if err != nil {
		return err
	}

	return nil
}

// acquireListeningConnection returns a connection that listens for changes to the schema, or
// a nil connection if the context is cancelled. In the event of failure to acquire a connection
// or listen, it will retry indefinitely until success.
func (s *PostgresEventStore) acquireListeningConnection(ctx context.Context) *pgxpool.Conn {
	var err error
	var conn *pgxpool.Conn
	log := dlog.FromCtx(ctx)
	for {
		conn, err = s.pool.Acquire(ctx)
		if err == nil {
			_, err = conn.Exec(ctx, "listen singlenodekey")
			if err == nil {
				log.Debug("Listening connection acquired")
				return conn
			} else {
				conn.Release()
			}
		}
		if err == context.Canceled {
			return nil
		}
		log.Debug("Failed to acquire listening connection, retrying", "error", err)

		// In the event of networking issues, wait a small period of time for recovery.
		time.Sleep(100 * time.Millisecond)
	}
}

// Call with a cancellable context and pgx should terminate when the context is
// cancelled. Call after storage has been initialized in order to not receive a
// notification when this node updates the table.
func (s *PostgresStreamStore) listenForNewNodes(ctx context.Context) {
	conn := s.acquireListeningConnection(ctx)
	if conn == nil {
		return
	}
	defer conn.Release()

	for {
		notification, err := conn.Conn().WaitForNotification(ctx)

		// Cancellation indicates a valid exit.
		if err == context.Canceled {
			return
		}

		// Unexpected.
		if err != nil {
			// Ok to call Release multiple times
			conn.Release()
			conn = s.acquireListeningConnection(ctx)
			if conn == nil {
				return
			}
			defer conn.Release()
			continue
		}

		// Listen only for changes to our schema.
		if notification.Payload == s.schemaName {
			err = RiverError(Err_RESOURCE_EXHAUSTED, "No longer a current node, shutting down").
				Func("listenForNewNodes").
				Tag("schema", s.schemaName).
				LogWarn(dlog.FromCtx(ctx))

			// In the event of detecting node conflict, send the error to the main thread to shut down.
			s.exitSignal <- err
			return
		}
	}
}

func (s *PostgresStreamStore) DebugReadStreamData(
	ctx context.Context,
	streamId StreamId,
) (*DebugReadStreamDataResult, error) {
	var ret *DebugReadStreamDataResult
	err := s.txRunnerWithUUIDCheck(
		ctx,
		"DebugReadStreamData",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.debugReadStreamData(ctx, tx, streamId)
			return err
		},
		nil,
		"streamId", streamId,
	)
	if err != nil {
		return nil, err
	}
	return ret, nil
}

func (s *PostgresStreamStore) debugReadStreamData(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (*DebugReadStreamDataResult, error) {
	result := &DebugReadStreamDataResult{
		StreamId: streamId,
	}

	err := tx.
		QueryRow(ctx, "SELECT latest_snapshot_miniblock FROM es WHERE stream_id = $1", streamId).
		Scan(&result.LatestSnapshotMiniblockNum)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, WrapRiverError(Err_NOT_FOUND, err).Message("stream not found in local storage")
		} else {
			return nil, err
		}
	}

	miniblocksRow, err := tx.Query(
		ctx,
		sqlForStream(
			"SELECT seq_num, blockdata FROM {{miniblocks}} WHERE stream_id = $1 ORDER BY seq_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}
	defer miniblocksRow.Close()

	for miniblocksRow.Next() {
		var mb MiniblockDescriptor

		err = miniblocksRow.Scan(&mb.MiniblockNumber, &mb.Data)
		if err != nil {
			return nil, err
		}
		result.Miniblocks = append(result.Miniblocks, mb)
	}

	rows, err := tx.Query(
		ctx,
		sqlForStream(
			"SELECT generation, slot_num, envelope FROM {{minipools}} WHERE stream_id = $1 ORDER BY generation, slot_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var e EventDescriptor
		err = rows.Scan(&e.Generation, &e.Slot, &e.Data)
		if err != nil {
			return nil, err
		}
		result.Events = append(result.Events, e)
	}

	candRows, err := tx.Query(
		ctx,
		sqlForStream(
			"SELECT seq_num, block_hash, blockdata FROM {{miniblock_candidates}} WHERE stream_id = $1 ORDER BY seq_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}
	defer candRows.Close()

	for candRows.Next() {
		var num int64
		var hashStr string
		var data []byte
		err = candRows.Scan(&num, &hashStr, &data)
		if err != nil {
			return nil, err
		}
		result.MbCandidates = append(result.MbCandidates, MiniblockDescriptor{
			MiniblockNumber: num,
			Data:            data,
			Hash:            common.HexToHash(hashStr),
		})
	}

	return result, nil
}

func (s *PostgresStreamStore) StreamLastMiniBlock(
	ctx context.Context,
	streamID StreamId,
) (*MiniblockData, error) {
	var ret *MiniblockData
	err := s.txRunnerWithUUIDCheck(
		ctx,
		"StreamLastMiniBlock",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.streamLastMiniBlockTx(ctx, tx, streamID)
			return err
		},
		nil,
	)
	if err != nil {
		return nil, err
	}
	return ret, nil
}

func (s *PostgresStreamStore) streamLastMiniBlockTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID StreamId,
) (*MiniblockData, error) {
	var (
		maxSeqNum int64
		blockData []byte
	)
	err := tx.QueryRow(
		ctx,
		sqlForStream(
			"SELECT seq_num, blockdata FROM {{miniblocks}} WHERE stream_id = $1 ORDER BY seq_num DESC LIMIT 1",
			streamID,
		),
		streamID,
	).Scan(&maxSeqNum, &blockData)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, RiverError(Err_NOT_FOUND, "latest miniblock in DB not found for stream").
				Tags("stream", streamID).
				Func("lastMiniBlockForStream")
		}
		return nil, processErrorForMissingPartition(err, streamID)
	}

	return &MiniblockData{
		StreamID:      streamID,
		Number:        maxSeqNum,
		MiniBlockInfo: blockData,
	}, nil
}

func (s *PostgresStreamStore) ImportMiniblocks(ctx context.Context, miniBlocks []*MiniblockData) error {
	if len(miniBlocks) == 0 {
		return nil
	}

	return s.txRunnerWithUUIDCheck(
		ctx,
		"ImportMiniBlocks",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			if miniBlocks[0].Number == 0 {
				if err := s.createStreamStorageTx(ctx, tx, miniBlocks[0].StreamID, miniBlocks[0].MiniBlockInfo); err != nil {
					return err
				}
				miniBlocks = miniBlocks[1:]
			}

			return s.importMiniblocksTx(ctx, tx, miniBlocks)
		},
		nil,
		"streamId", miniBlocks[0].StreamID,
	)
}

func (s *PostgresStreamStore) importMiniblocksTx(
	ctx context.Context,
	tx pgx.Tx,
	miniBlocks []*MiniblockData,
) error {
	if len(miniBlocks) == 0 {
		return nil
	}

	var (
		streamID = miniBlocks[0].StreamID
		seqNum   *int64
	)

	err := tx.QueryRow(
		ctx,
		// NOTE: we do not target the specific partition here because a failed query would
		// put the transaction into a bad state, resulting in a failed commit. The caller of this
		// method does not need to assume that the stream exists in local storage. If it
		// does not exist, it will be created below.
		"SELECT MAX(seq_num) as latest_blocks_number FROM miniblocks WHERE stream_id = $1", streamID).
		Scan(&seqNum)
	if err != nil {
		return err
	}

	if seqNum == nil {
		seqNum = new(int64)
		*seqNum = -1
	}

	// clean up minipool
	// NOTE: as above, we do not escape the query here because a failed query would put the
	// transaction into a bad state, resulting in a failed commit.
	_, err = tx.Exec(ctx, "DELETE FROM minipools WHERE slot_num > -1 AND stream_id = $1", streamID)
	if err != nil {
		return err
	}

	for _, miniBlock := range miniBlocks {
		var (
			expBlockNum = *seqNum + 1
			err         error
		)

		if expBlockNum != miniBlock.Number {
			return RiverError(
				Err_BAD_BLOCK,
				"Expected block %d to import but got block %d",
				expBlockNum,
				miniBlock.Number,
			)
		}

		if expBlockNum == 0 {
			err = s.txRunnerWithUUIDCheck(
				ctx,
				"CreateStreamStorage",
				pgx.ReadWrite,
				func(ctx context.Context, tx pgx.Tx) error {
					return s.createStreamStorageTx(ctx, tx, streamID, miniBlock.MiniBlockInfo)
				},
				nil,
				"streamId", streamID,
			)
		} else {
			_, err = tx.Exec(
				ctx,
				sqlForStream(
					"INSERT INTO {{miniblocks}} (stream_id, seq_num, blockdata) values ($1, $2, $3)",
					//"INSERT INTO {{miniblocks}} SELECT stream_id, seq_num, blockdata FROM {{miniblock_candidates}} WHERE stream_id = $1 AND seq_num = $2 AND {{miniblock_candidates}}.block_hash = $3",
					streamID,
				),
				streamID,
				miniBlock.Number,
				miniBlock.MiniBlockInfo, // avoid leading '0x'
			)
		}
		if err != nil {
			return err
		}

		*seqNum = *seqNum + 1
	}

	_, err = tx.Exec(
		ctx,
		sqlForStream(
			"UPDATE {{minipools}} SET generation = $1 WHERE slot_num = -1 AND stream_id = $2",
			streamID,
		),
		miniBlocks[len(miniBlocks)-1].Number+1,
		streamID,
	)

	return err
}

func createTableSuffix(streamId StreamId) string {
	sum := sha3.Sum224([]byte(streamId.String()))
	return hex.EncodeToString(sum[:])
}

func getCurrentNodeProcessInfo(currentSchemaName string) string {
	currentHostname, err := os.Hostname()
	if err != nil {
		currentHostname = "unknown"
	}
	currentPID := os.Getpid()
	return fmt.Sprintf("hostname=%s, pid=%d, schema=%s", currentHostname, currentPID, currentSchemaName)
}
