package storage

import (
	"context"
	"embed"
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/prometheus/client_golang/prometheus"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/config"
	"github.com/river-build/river/core/node/infra"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"

	"github.com/river-build/river/core/node/dlog"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/sha3"
	"golang.org/x/sync/semaphore"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

type PostgresEventStore struct {
	config            *config.DatabaseConfig
	pool              *pgxpool.Pool
	schemaName        string
	nodeUUID          string
	exitSignal        chan error
	dbUrl             string
	migrationDir      embed.FS
	cleanupListenFunc func()

	regularConnections   *semaphore.Weighted
	streamingConnections *semaphore.Weighted

	txCounter  *infra.StatusCounterVec
	txDuration *prometheus.HistogramVec
}

var _ StreamStorage = (*PostgresEventStore)(nil)

const (
	PG_REPORT_INTERVAL = 3 * time.Minute
)

type txRunnerOpts struct {
	disableCompareUUID  bool
	streaming           bool
	skipLoggingNotFound bool
}

func rollbackTx(ctx context.Context, tx pgx.Tx) {
	_ = tx.Rollback(ctx)
}

func (s *PostgresEventStore) acquireRegularConnection(ctx context.Context) (func(), error) {
	// Return error if context is already done.
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	if err := s.regularConnections.Acquire(ctx, 1); err != nil {
		return nil, err
	}

	release := func() {
		s.regularConnections.Release(1)
	}

	// semaphore acquire can sometimes return a valid result for an expired context, so go ahead
	// and check again here.
	if ctx.Err() != nil {
		release()
		return nil, ctx.Err()
	}

	return release, nil
}

func (s *PostgresEventStore) acquireStreamingConnection(ctx context.Context) (func(), error) {
	// Return error if context is already done.
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	if err := s.streamingConnections.Acquire(ctx, 1); err != nil {
		return nil, err
	}

	release := func() {
		s.streamingConnections.Release(1)
	}

	// semaphore acquire can sometimes return a valid result for an expired context, so go ahead
	// and check again here.
	if ctx.Err() != nil {
		release()
		return nil, ctx.Err()
	}

	return release, nil
}

func (s *PostgresEventStore) txRunnerInner(
	ctx context.Context,
	accessMode pgx.TxAccessMode,
	txFn func(context.Context, pgx.Tx) error,
	opts *txRunnerOpts,
) error {
	// Acquire rights to use a connection. We split the pool ourselves into two parts: one for connections that stream results
	// back, and one for regular connections. This is to prevent a streaming connections from consuming the regular pool.
	var err error
	var release func()
	if opts == nil || !opts.streaming {
		release, err = s.acquireRegularConnection(ctx)
	} else {
		release, err = s.acquireStreamingConnection(ctx)
	}
	if err != nil {
		return AsRiverError(err, Err_DB_OPERATION_FAILURE).
			Func("pg.txRunnerInner").
			Message("failed to acquire connection before running transaction")
	}
	defer release()

	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable, AccessMode: accessMode})
	if err != nil {
		return err
	}
	defer rollbackTx(ctx, tx)

	if opts == nil || !opts.disableCompareUUID {
		err = s.compareUUID(ctx, tx)
		if err != nil {
			return err
		}
	}

	err = txFn(ctx, tx)
	if err != nil {
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return err
	}
	return nil
}

func (s *PostgresEventStore) txRunner(
	ctx context.Context,
	name string,
	accessMode pgx.TxAccessMode,
	txFn func(context.Context, pgx.Tx) error,
	opts *txRunnerOpts,
	tags ...any,
) error {
	log := dlog.FromCtx(ctx).With(append(tags, "name", name, "currentUUID", s.nodeUUID, "dbSchema", s.schemaName)...)

	if accessMode == pgx.ReadWrite {
		// For write transactions context should not be cancelled if a client connection drops. Cancellations due to lost client connections can cause
		// operations on the PostgresEventStore to fail even if transactions commit, leading to a corruption in cached state.
		ctx = context.WithoutCancel(ctx)
	}

	defer prometheus.NewTimer(s.txDuration.WithLabelValues(name)).ObserveDuration()

	for {
		err := s.txRunnerInner(ctx, accessMode, txFn, opts)
		if err != nil {
			pass := false

			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == pgerrcode.SerializationFailure {
					log.Warn(
						"pg.txRunner: retrying transaction due to serialization failure",
						"pgErr", pgErr,
					)
					s.txCounter.WithLabelValues(name, "retry").Inc()
					continue
				}
				log.Warn("pg.txRunner: transaction failed", "pgErr", pgErr)
			} else {
				level := slog.LevelWarn
				if opts != nil && opts.skipLoggingNotFound && AsRiverError(err).Code == Err_NOT_FOUND {
					// Count "not found" as succeess if error is potentially expected
					pass = true
					level = slog.LevelDebug
				}
				log.Log(ctx, level, "pg.txRunner: transaction failed", "err", err)
			}

			if pass {
				s.txCounter.IncPass(name)
			} else {
				s.txCounter.IncFail(name)
			}

			return WrapRiverError(
				Err_DB_OPERATION_FAILURE,
				err,
			).Func("pg.txRunner").
				Message("transaction failed").
				Tag("name", name).
				Tags(tags...)
		}

		log.Debug("pg.txRunner: transaction succeeded")
		s.txCounter.IncPass(name)
		return nil
	}
}

func (s *PostgresEventStore) CreateStreamStorage(
	ctx context.Context,
	streamId StreamId,
	genesisMiniblock []byte,
) error {
	return s.txRunner(
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

func (s *PostgresEventStore) createStreamStorageTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	genesisMiniblock []byte,
) error {
	tableSuffix := createTableSuffix(streamId)
	sql := fmt.Sprintf(
		`INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, 0);
		CREATE TABLE miniblocks_%[1]s PARTITION OF miniblocks FOR VALUES IN ($1);
		CREATE TABLE minipools_%[1]s PARTITION OF minipools FOR VALUES IN ($1);
		CREATE TABLE miniblock_candidates_%[1]s PARTITION OF miniblock_candidates for values in ($1);
		INSERT INTO miniblocks (stream_id, seq_num, blockdata) VALUES ($1, 0, $2);
		INSERT INTO minipools (stream_id, generation, slot_num) VALUES ($1, 1, -1);`,
		tableSuffix,
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

func (s *PostgresEventStore) CreateStreamArchiveStorage(
	ctx context.Context,
	streamId StreamId,
) error {
	return s.txRunner(
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

func (s *PostgresEventStore) createStreamArchiveStorageTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) error {
	tableSuffix := createTableSuffix(streamId)
	sql := fmt.Sprintf(
		`INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, -1);
		CREATE TABLE miniblocks_%[1]s PARTITION OF miniblocks FOR VALUES IN ($1);`,
		tableSuffix,
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

func (s *PostgresEventStore) GetMaxArchivedMiniblockNumber(ctx context.Context, streamId StreamId) (int64, error) {
	var maxArchivedMiniblockNumber int64
	err := s.txRunner(
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

func (s *PostgresEventStore) getMaxArchivedMiniblockNumberTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	maxArchivedMiniblockNumber *int64,
) error {
	err := tx.QueryRow(
		ctx,
		"SELECT COALESCE(MAX(seq_num), -1) FROM miniblocks WHERE stream_id = $1",
		streamId,
	).Scan(maxArchivedMiniblockNumber)
	if err != nil {
		return err
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

func (s *PostgresEventStore) WriteArchiveMiniblocks(
	ctx context.Context,
	streamId StreamId,
	startMiniblockNum int64,
	miniblocks [][]byte,
) error {
	return s.txRunner(
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

func (s *PostgresEventStore) writeArchiveMiniblocksTx(
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
			"INSERT INTO miniblocks (stream_id, seq_num, blockdata) VALUES ($1, $2, $3)",
			streamId,
			startMiniblockNum+int64(i),
			miniblock)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *PostgresEventStore) ReadStreamFromLastSnapshot(
	ctx context.Context,
	streamId StreamId,
	precedingBlockCount int,
) (*ReadStreamFromLastSnapshotResult, error) {
	var ret *ReadStreamFromLastSnapshotResult
	err := s.txRunner(
		ctx,
		"ReadStreamFromLastSnapshot",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.readStreamFromLastSnapshotTx(ctx, tx, streamId, precedingBlockCount)
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

// Supported consistency checks:
// 1. There are no gaps in miniblocks sequence and it starts from latestsnaphot
// 2. There are no gaps in slot_num for envelopes in minipools and it starts from 0
// 3. For envelopes all generations are the same and equals to "max generation seq_num in miniblocks" + 1
func (s *PostgresEventStore) readStreamFromLastSnapshotTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	precedingBlockCount int,
) (*ReadStreamFromLastSnapshotResult, error) {
	var result ReadStreamFromLastSnapshotResult

	// first let's check what is the last block with snapshot
	var latest_snapshot_miniblock_index int64
	err := tx.
		QueryRow(ctx, "SELECT latest_snapshot_miniblock FROM es WHERE stream_id = $1", streamId).
		Scan(&latest_snapshot_miniblock_index)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, WrapRiverError(Err_NOT_FOUND, err).Message("stream not found in local storage")
		} else {
			return nil, err
		}
	}

	result.StartMiniblockNumber = max(0, latest_snapshot_miniblock_index-int64(max(0, precedingBlockCount)))

	miniblocksRow, err := tx.Query(
		ctx,
		"SELECT blockdata, seq_num FROM miniblocks WHERE seq_num >= $1 AND stream_id = $2 ORDER BY seq_num",
		latest_snapshot_miniblock_index,
		streamId,
	)
	if err != nil {
		return nil, err
	}
	defer miniblocksRow.Close()

	// Retrieve miniblocks starting from the latest miniblock with snapshot
	var miniblocks [][]byte

	// During scanning rows we also check that there are no gaps in miniblocks sequence and it starts from latestsnaphot
	var counter int64 = 0
	var seqNum int64

	for miniblocksRow.Next() {
		var blockdata []byte

		err = miniblocksRow.Scan(&blockdata, &seqNum)
		if err != nil {
			return nil, err
		}
		if seqNum != latest_snapshot_miniblock_index+counter {
			return nil, RiverError(
				Err_MINIBLOCKS_STORAGE_FAILURE,
				"Miniblocks consistency violation - wrong block sequence number",
				"ActualSeqNum", seqNum,
				"ExpectedSeqNum", latest_snapshot_miniblock_index+counter)
		}
		miniblocks = append(miniblocks, blockdata)
		counter++
	}

	// At this moment seqNum contains max miniblock number in the miniblock storage
	result.Miniblocks = miniblocks

	// Retrieve events from minipool
	rows, err := tx.Query(
		ctx,
		"SELECT envelope, generation, slot_num FROM minipools WHERE slot_num > -1 AND stream_id = $1 ORDER BY generation, slot_num",
		streamId,
	)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	var envelopes [][]byte
	var slotNumsCounter int64 = 0

	// Let's check during scan that slot_nums start from 0 and there are no gaps and that each generation is equal to maxSeqNumInMiniblocksTable+1
	for rows.Next() {
		var envelope []byte
		var generation int64
		var slotNum int64
		err = rows.Scan(&envelope, &generation, &slotNum)
		if err != nil {
			return nil, err
		}
		// Check that we don't have gaps in slot numbers
		if slotNum != slotNumsCounter {
			return nil, RiverError(
				Err_MINIBLOCKS_STORAGE_FAILURE,
				"Minipool consistency violation - slotNums are not sequential",
			).
				Tag("ActualSlotNumber", slotNum).
				Tag("ExpectedSlotNumber", slotNumsCounter)
		}
		// Check that all events in minipool have proper generation
		if generation != seqNum+1 {
			return nil, RiverError(
				Err_MINIBLOCKS_STORAGE_FAILURE,
				"Minipool consistency violation - wrong event generation",
			).
				Tag("ActualGeneration", generation).
				Tag("ExpectedGeneration", slotNum)
		}
		envelopes = append(envelopes, envelope)
		slotNumsCounter++
	}

	result.MinipoolEnvelopes = envelopes
	return &result, nil
}

// Adds event to the given minipool.
// Current generation of minipool should match minipoolGeneration,
// and there should be exactly minipoolSlot events in the minipool.
func (s *PostgresEventStore) WriteEvent(
	ctx context.Context,
	streamId StreamId,
	minipoolGeneration int64,
	minipoolSlot int,
	envelope []byte,
) error {
	return s.txRunner(
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
		"SELECT generation, slot_num FROM minipools WHERE stream_id = $1 ORDER BY slot_num",
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
		"INSERT INTO minipools (stream_id, envelope, generation, slot_num) VALUES ($1, $2, $3, $4)",
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
func (s *PostgresEventStore) ReadMiniblocks(
	ctx context.Context,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([][]byte, error) {
	var miniblocks [][]byte
	err := s.txRunner(
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

func (s *PostgresEventStore) readMiniblocksTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	fromInclusive int64,
	toExclusive int64,
) ([][]byte, error) {
	miniblocksRow, err := tx.Query(
		ctx,
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

// WriteBlockProposal adds a miniblock proposal candidate. When the miniblock is finalized, the node will promote the
// candidate with the correct hash.
func (s *PostgresEventStore) WriteBlockProposal(
	ctx context.Context,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
	miniblock []byte,
) error {
	return s.txRunner(
		ctx,
		"WriteBlockProposal",
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
func (s *PostgresEventStore) writeBlockProposalTxn(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
	miniblock []byte,
) error {
	var seqNum *int64

	err := tx.QueryRow(ctx, "SELECT MAX(seq_num) as latest_blocks_number FROM miniblocks WHERE stream_id = $1", streamId).
		Scan(&seqNum)
	if err != nil {
		return err
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
		"INSERT INTO miniblock_candidates (stream_id, seq_num, block_hash, blockdata) VALUES ($1, $2, $3, $4) ON CONFLICT(stream_id, seq_num, block_hash) DO NOTHING",
		streamId,
		blockNumber,
		hex.EncodeToString(blockHash.Bytes()), // avoid leading '0x'
		miniblock,
	)
	return err
}

func (s *PostgresEventStore) PromoteBlock(
	ctx context.Context,
	streamId StreamId,
	minipoolGeneration int64,
	candidateBlockHash common.Hash,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	return s.txRunner(
		ctx,
		"PromoteBlock",
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

func (s *PostgresEventStore) promoteBlockTxn(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	minipoolGeneration int64,
	candidateBlockHash common.Hash,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	var seqNum *int64

	err := tx.QueryRow(ctx, "SELECT MAX(seq_num) as latest_blocks_number FROM miniblocks WHERE stream_id = $1", streamId).
		Scan(&seqNum)
	if err != nil {
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
	_, err = tx.Exec(ctx, "DELETE FROM minipools WHERE slot_num > -1 AND stream_id = $1", streamId)
	if err != nil {
		return err
	}

	// update -1 record of minipools table to minipoolGeneration + 1
	_, err = tx.Exec(
		ctx,
		"UPDATE minipools SET generation = $1 WHERE slot_num = -1 AND stream_id = $2",
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
			"INSERT INTO minipools (stream_id, slot_num, generation, envelope) VALUES ($1, $2, $3, $4)",
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
		"INSERT INTO miniblocks SELECT stream_id, seq_num, blockdata FROM miniblock_candidates WHERE stream_id = $1 AND seq_num = $2 AND miniblock_candidates.block_hash = $3",
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
		"DELETE FROM miniblock_candidates WHERE stream_id = $1 and seq_num <= $2",
		streamId,
		minipoolGeneration,
	)
	return err
}

func (s *PostgresEventStore) GetStreamsNumber(ctx context.Context) (int, error) {
	var count int
	err := s.txRunner(
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

func (s *PostgresEventStore) getStreamsNumberTx(ctx context.Context, tx pgx.Tx) (int, error) {
	var count int
	row := tx.QueryRow(ctx, "SELECT COUNT(stream_id) FROM es")
	err := row.Scan(&count)
	if err != nil {
		return 0, err
	}
	dlog.FromCtx(ctx).Debug("GetStreamsNumberTx", "count", count)
	return count, nil
}

func (s *PostgresEventStore) compareUUID(ctx context.Context, tx pgx.Tx) error {
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

func (s *PostgresEventStore) CleanupStorage(ctx context.Context) error {
	return s.txRunner(
		ctx,
		"CleanupStorage",
		pgx.ReadWrite,
		s.cleanupStorageTx,
		&txRunnerOpts{disableCompareUUID: true},
	)
}

func (s *PostgresEventStore) cleanupStorageTx(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, "DELETE FROM singlenodekey WHERE uuid = $1", s.nodeUUID)
	return err
}

// GetStreams returns a list of all event streams
func (s *PostgresEventStore) GetStreams(ctx context.Context) ([]StreamId, error) {
	var streams []StreamId
	err := s.txRunner(
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

func (s *PostgresEventStore) getStreamsTx(ctx context.Context, tx pgx.Tx) ([]StreamId, error) {
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

func (s *PostgresEventStore) DeleteStream(ctx context.Context, streamId StreamId) error {
	return s.txRunner(
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

func (s *PostgresEventStore) deleteStreamTx(ctx context.Context, tx pgx.Tx, streamId StreamId) error {
	_, err := tx.Exec(
		ctx,
		fmt.Sprintf(
			`DROP TABLE miniblocks_%[1]s;
			DROP TABLE minipools_%[1]s;
			DELETE FROM es WHERE stream_id = $1`,
			createTableSuffix(streamId),
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

func getDbURL(dbConfig *config.DatabaseConfig) string {
	if dbConfig.Password != "" {
		return fmt.Sprintf(
			"postgresql://%s:%s@%s:%d/%s%s",
			dbConfig.User,
			dbConfig.Password,
			dbConfig.Host,
			dbConfig.Port,
			dbConfig.Database,
			dbConfig.Extra,
		)
	}

	return dbConfig.Url
}

type PgxPoolInfo struct {
	Pool   *pgxpool.Pool
	Url    string
	Schema string
	Config *config.DatabaseConfig
}

func createAndValidatePgxPool(
	ctx context.Context,
	cfg *config.DatabaseConfig,
	databaseSchemaName string,
) (*PgxPoolInfo, error) {
	databaseUrl := getDbURL(cfg)

	poolConf, err := pgxpool.ParseConfig(databaseUrl)
	if err != nil {
		return nil, err
	}

	// In general, it should be possible to add database schema name into database url as a parameter search_path (&search_path=database_schema_name)
	// For some reason it doesn't work so have to put it into config explicitly
	poolConf.ConnConfig.RuntimeParams["search_path"] = databaseSchemaName

	poolConf.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, poolConf)
	if err != nil {
		return nil, err
	}

	err = pool.Ping(ctx)
	if err != nil {
		return nil, err
	}

	return &PgxPoolInfo{
		Pool:   pool,
		Url:    databaseUrl,
		Schema: databaseSchemaName,
		Config: cfg,
	}, nil
}

func CreateAndValidatePgxPool(
	ctx context.Context,
	cfg *config.DatabaseConfig,
	databaseSchemaName string,
) (*PgxPoolInfo, error) {
	r, err := createAndValidatePgxPool(ctx, cfg, databaseSchemaName)
	if err != nil {
		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).Func("CreateAndValidatePgxPool")
	}
	return r, nil
}

func NewPostgresEventStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	instanceId string,
	exitSignal chan error,
	metrics infra.MetricsFactory,
) (*PostgresEventStore, error) {
	store, err := newPostgresEventStore(
		ctx,
		poolInfo,
		instanceId,
		exitSignal,
		metrics,
		migrationsDir,
	)
	if err != nil {
		return nil, AsRiverError(err).Func("NewPostgresEventStore")
	}

	return store, nil
}

// Disallow allocating more than 30% of connections for streaming connections.
var MaxStreamingConnectionsRatio float32 = 0.3

func newPostgresEventStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	instanceId string,
	exitSignal chan error,
	metrics infra.MetricsFactory,
	migrations embed.FS,
) (*PostgresEventStore, error) {
	log := dlog.FromCtx(ctx)

	streamingConnectionRatio := poolInfo.Config.StreamingConnectionsRatio
	// Bounds check the streaming connection ratio
	// TODO: when we add streaming calls, we should make the minimum larger, perhaps 5%.
	if streamingConnectionRatio < 0 {
		log.Info(
			"Invalid streaming connection ratio, setting to 0",
			"streamingConnectionRatio",
			streamingConnectionRatio,
		)
		streamingConnectionRatio = 0
	}
	// Limit the ratio of available connections reserved for streaming to 30%
	if streamingConnectionRatio > MaxStreamingConnectionsRatio {
		log.Info(
			"Invalid streaming connection ratio, setting to maximum of 30%",
			"streamingConnectionRatio",
			streamingConnectionRatio,
		)
		streamingConnectionRatio = MaxStreamingConnectionsRatio
	}

	var totalReservableConns int64 = int64(poolInfo.Pool.Config().MaxConns) - 1 // subtract extra connection for the listeneer
	var numRegularConnections int64 = int64(float32(totalReservableConns) * (1 - streamingConnectionRatio))
	var numStreamingConnections int64 = totalReservableConns - numRegularConnections

	// Ensure there is at least one connection set aside for streaming queries even though we're not using them at
	// this time.
	if numStreamingConnections < 1 {
		numStreamingConnections += 1
		numRegularConnections -= 1
	}

	store := &PostgresEventStore{
		config:               poolInfo.Config,
		pool:                 poolInfo.Pool,
		schemaName:           poolInfo.Schema,
		nodeUUID:             instanceId,
		exitSignal:           exitSignal,
		dbUrl:                poolInfo.Url,
		migrationDir:         migrations,
		regularConnections:   semaphore.NewWeighted(numRegularConnections),
		streamingConnections: semaphore.NewWeighted(numStreamingConnections),

		txCounter: metrics.NewStatusCounterVecEx("dbtx_status", "PG transaction status", "name"),
		txDuration: metrics.NewHistogramVecEx(
			"dbtx_duration_seconds",
			"PG transaction duration",
			infra.DefaultDurationBucketsSeconds,
			"name",
		),
	}

	err := store.InitStorage(ctx)
	if err != nil {
		return nil, err
	}

	cancelCtx, cancel := context.WithCancel(ctx)
	store.cleanupListenFunc = cancel
	go store.listenForNewNodes(cancelCtx)

	// TODO: publish these as metrics
	// stats thread
	// go func() {
	// 	for {
	// 		timer := time.NewTimer(PG_REPORT_INTERVAL)
	// 		select {
	// 		case <-ctx.Done():
	// 			timer.Stop()
	// 			return
	// 		case <-timer.C:
	// 			stats := pool.Stat()
	// 			log.Debug("PG pool stats",
	// 				"acquireCount", stats.AcquireCount(),
	// 				"acquiredConns", stats.AcquiredConns(),
	// 				"idleConns", stats.IdleConns(),
	// 				"totalConns", stats.TotalConns(),
	// 			)
	// 		}
	// 	}
	// }()

	return store, nil
}

// Close removes instance record from singlenodekey table and closes the connection pool
func (s *PostgresEventStore) Close(ctx context.Context) {
	_ = s.CleanupStorage(ctx)
	// Cancel the notify listening func to release the listener connection before closing the pool.
	s.cleanupListenFunc()

	s.pool.Close()
}

//go:embed migrations/*.sql
var migrationsDir embed.FS

func (s *PostgresEventStore) InitStorage(ctx context.Context) error {
	err := s.initStorage(ctx)
	if err != nil {
		return AsRiverError(err).Func("InitStorage").Tag("schemaName", s.schemaName)
	}

	return nil
}

func (s *PostgresEventStore) createSchemaTx(ctx context.Context, tx pgx.Tx) error {
	log := dlog.FromCtx(ctx)

	// Create schema iff not exists
	var schemaExists bool
	err := tx.QueryRow(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)",
		s.schemaName).Scan(&schemaExists)
	if err != nil {
		return err
	}

	if !schemaExists {
		createSchemaQuery := fmt.Sprintf("CREATE SCHEMA \"%s\"", s.schemaName)
		_, err := tx.Exec(ctx, createSchemaQuery)
		if err != nil {
			return err
		}
		log.Info("DB Schema created", "schema", s.schemaName)
	} else {
		log.Info("DB Schema already exists", "schema", s.schemaName)
	}
	return nil
}

func (s *PostgresEventStore) runMigrations() error {
	// Run migrations
	iofsMigrationsDir, err := iofs.New(s.migrationDir, "migrations")
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error loading migrations")
	}

	dbUrlWithSchema := strings.Split(s.dbUrl, "?")[0] + fmt.Sprintf(
		"?sslmode=disable&search_path=%v,public",
		s.schemaName,
	)
	migration, err := migrate.NewWithSourceInstance("iofs", iofsMigrationsDir, dbUrlWithSchema)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error creating migration instance")
	}

	if err = migration.Up(); err != nil && err != migrate.ErrNoChange {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error running migrations")
	}

	return nil
}

func (s *PostgresEventStore) listOtherInstancesTx(ctx context.Context, tx pgx.Tx) error {
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
		log.Info("Found UUID during startup", "uuid", storedUUID, "timestamp", storedTimestamp, "info", storedInfo)
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

func (s *PostgresEventStore) initializeSingleNodeKeyTx(ctx context.Context, tx pgx.Tx) error {
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
func (s *PostgresEventStore) listenForNewNodes(ctx context.Context) {
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

func (s *PostgresEventStore) initStorage(ctx context.Context) error {
	err := s.txRunner(
		ctx,
		"createSchema",
		pgx.ReadWrite,
		s.createSchemaTx,
		&txRunnerOpts{disableCompareUUID: true},
	)
	if err != nil {
		return err
	}

	err = s.runMigrations()
	if err != nil {
		return err
	}

	err = s.txRunner(
		ctx,
		"listOtherInstances",
		pgx.ReadOnly,
		s.listOtherInstancesTx,
		&txRunnerOpts{disableCompareUUID: true},
	)
	if err != nil {
		return err
	}

	return s.txRunner(
		ctx,
		"initializeSingleNodeKey",
		pgx.ReadWrite,
		s.initializeSingleNodeKeyTx,
		&txRunnerOpts{disableCompareUUID: true},
	)
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
