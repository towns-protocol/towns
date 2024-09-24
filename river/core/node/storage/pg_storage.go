package storage

import (
	"context"
	"database/sql"
	"embed"
	"encoding/hex"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/exaring/otelpgx"
	"github.com/prometheus/client_golang/prometheus"
	"go.opentelemetry.io/otel/trace"

	"github.com/river-build/river/core/config"
	. "github.com/river-build/river/core/node/base"
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

type backoffTracker struct {
	last time.Duration
}

// Retries first attempt immediately, next waits for 50ms, then multipled by 1.5 each time.
func (b *backoffTracker) wait(ctx context.Context) error {
	if b.last == 0 {
		b.last = 50 * time.Millisecond
		return nil
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(b.last):
		b.last = b.last * 3 / 2
		return nil
	}
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

	var backoff backoffTracker
	for {
		err := s.txRunnerInner(ctx, accessMode, txFn, opts)
		if err != nil {
			pass := false

			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == pgerrcode.SerializationFailure {
					backoffErr := backoff.wait(ctx)
					if backoffErr != nil {
						return AsRiverError(backoffErr).Func(name).Message("Timed out waiting for backoff")
					}
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
	numToRead int,
) (*ReadStreamFromLastSnapshotResult, error) {
	var ret *ReadStreamFromLastSnapshotResult
	err := s.txRunner(
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

func (s *PostgresEventStore) readStreamFromLastSnapshotTx(
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
		QueryRow(ctx, "SELECT MAX(seq_num) FROM miniblocks WHERE stream_id = $1", streamId).
		Scan(&lastMiniblockIndex)
	if err != nil {
		return nil, WrapRiverError(Err_INTERNAL, err).Message("db inconsistency: failed to get last miniblock index")
	}

	numToRead = max(1, numToRead)
	startSeqNum := max(0, lastMiniblockIndex-int64(numToRead-1))
	startSeqNum = min(startSeqNum, snapshotMiniblockIndex)

	miniblocksRow, err := tx.Query(
		ctx,
		"SELECT blockdata, seq_num FROM miniblocks WHERE seq_num >= $1 AND stream_id = $2 ORDER BY seq_num",
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
		"SELECT envelope, generation, slot_num FROM minipools WHERE stream_id = $1 ORDER BY generation, slot_num",
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
		// Ordering by generation, slot_num allows this to be an index only query
		"SELECT generation, slot_num FROM minipools WHERE stream_id = $1 ORDER BY generation, slot_num",
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

// WriteMiniblockCandidate adds a miniblock proposal candidate. When the miniblock is finalized, the node will promote the
// candidate with the correct hash.
func (s *PostgresEventStore) WriteMiniblockCandidate(
	ctx context.Context,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
	miniblock []byte,
) error {
	return s.txRunner(
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

func (s *PostgresEventStore) ReadMiniblockCandidate(
	ctx context.Context,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
) ([]byte, error) {
	var miniblock []byte
	err := s.txRunner(
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

func (s *PostgresEventStore) readMiniblockCandidateTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
) ([]byte, error) {
	var miniblock []byte
	err := tx.QueryRow(
		ctx,
		"SELECT blockdata FROM miniblock_candidates WHERE stream_id = $1 AND seq_num = $2 AND block_hash = $3",
		streamId,
		blockNumber,
		hex.EncodeToString(blockHash.Bytes()), // avoid leading '0x'
	).Scan(&miniblock)
	if err != nil {
		return nil, err
	}
	return miniblock, nil
}

func (s *PostgresEventStore) PromoteMiniblockCandidate(
	ctx context.Context,
	streamId StreamId,
	minipoolGeneration int64,
	candidateBlockHash common.Hash,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	return s.txRunner(
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
	tracerProvider trace.TracerProvider,
) (*PgxPoolInfo, error) {
	databaseUrl := cfg.GetUrl()

	poolConf, err := pgxpool.ParseConfig(databaseUrl)
	if err != nil {
		return nil, err
	}

	// In general, it should be possible to add database schema name into database url as a parameter search_path (&search_path=database_schema_name)
	// For some reason it doesn't work so have to put it into config explicitly
	poolConf.ConnConfig.RuntimeParams["search_path"] = databaseSchemaName

	poolConf.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	if tracerProvider != nil {
		poolConf.ConnConfig.Tracer = otelpgx.NewTracer(
			otelpgx.WithTracerProvider(tracerProvider),
			otelpgx.WithDisableQuerySpanNamePrefix(),
			otelpgx.WithTrimSQLInSpanName(),
		)
	}

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
	tracerProvider trace.TracerProvider,
) (*PgxPoolInfo, error) {
	r, err := createAndValidatePgxPool(ctx, cfg, databaseSchemaName, tracerProvider)
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

type PostgresStatusResult struct {
	TotalConns              int32         `json:"total_conns"`
	AcquiredConns           int32         `json:"acquired_conns"`
	IdleConns               int32         `json:"idle_conns"`
	ConstructingConns       int32         `json:"constructing_conns"`
	MaxConns                int32         `json:"max_conns"`
	NewConnsCount           int64         `json:"new_conns_count"`
	AcquireCount            int64         `json:"acquire_count"`
	EmptyAcquireCount       int64         `json:"empty_acquire_count"`
	CanceledAcquireCount    int64         `json:"canceled_acquire_count"`
	AcquireDuration         time.Duration `json:"acquire_duration"`
	MaxLifetimeDestroyCount int64         `json:"max_lifetime_destroy_count"`
	MaxIdleDestroyCount     int64         `json:"max_idle_destroy_count"`
	Version                 string        `json:"version"`
	EsCount                 string        `json:"es_count"`
	SystemId                string        `json:"system_id"`
}

func PreparePostgresStatus(ctx context.Context, pool PgxPoolInfo) PostgresStatusResult {
	poolStat := pool.Pool.Stat()
	// Query to get PostgreSQL version
	var version string
	err := pool.Pool.QueryRow(ctx, "SELECT version()").Scan(&version)
	if err != nil {
		version = fmt.Sprintf("Error: %v", err)
		dlog.FromCtx(ctx).Error("failed to get PostgreSQL version", "err", err)
	}

	// Query to count rows in the es table
	var esCount string
	var count int64
	err = pool.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM es").Scan(&count)
	if err != nil {
		esCount = fmt.Sprintf("Error: %v", err)
	} else {
		esCount = fmt.Sprintf("%d", count)
	}

	var systemId string
	err = pool.Pool.QueryRow(ctx, "SELECT system_identifier FROM pg_control_system()").Scan(&systemId)
	if err != nil {
		systemId = fmt.Sprintf("Error: %v", err)
	}

	return PostgresStatusResult{
		TotalConns:              poolStat.TotalConns(),
		AcquiredConns:           poolStat.AcquiredConns(),
		IdleConns:               poolStat.IdleConns(),
		ConstructingConns:       poolStat.ConstructingConns(),
		MaxConns:                poolStat.MaxConns(),
		NewConnsCount:           poolStat.NewConnsCount(),
		AcquireCount:            poolStat.AcquireCount(),
		EmptyAcquireCount:       poolStat.EmptyAcquireCount(),
		CanceledAcquireCount:    poolStat.CanceledAcquireCount(),
		AcquireDuration:         poolStat.AcquireDuration(),
		MaxLifetimeDestroyCount: poolStat.MaxLifetimeDestroyCount(),
		MaxIdleDestroyCount:     poolStat.MaxIdleDestroyCount(),
		Version:                 version,
		EsCount:                 esCount,
		SystemId:                systemId,
	}
}

func SetupPostgresMetrics(ctx context.Context, pool PgxPoolInfo, factory infra.MetricsFactory) {
	// Create a function to get the latest PostgreSQL status
	getStatus := func() PostgresStatusResult {
		return PreparePostgresStatus(ctx, pool)
	}

	// Metrics for numeric values
	numericMetrics := []struct {
		name     string
		help     string
		getValue func(PostgresStatusResult) float64
	}{
		{
			"postgres_total_conns",
			"Total number of connections in the pool",
			func(s PostgresStatusResult) float64 { return float64(s.TotalConns) },
		},
		{
			"postgres_acquired_conns",
			"Number of currently acquired connections",
			func(s PostgresStatusResult) float64 { return float64(s.AcquiredConns) },
		},
		{
			"postgres_idle_conns",
			"Number of idle connections",
			func(s PostgresStatusResult) float64 { return float64(s.IdleConns) },
		},
		{
			"postgres_constructing_conns",
			"Number of connections with construction in progress",
			func(s PostgresStatusResult) float64 { return float64(s.ConstructingConns) },
		},
		{
			"postgres_max_conns",
			"Maximum number of connections allowed",
			func(s PostgresStatusResult) float64 { return float64(s.MaxConns) },
		},
		{
			"postgres_new_conns_count",
			"Total number of new connections opened",
			func(s PostgresStatusResult) float64 { return float64(s.NewConnsCount) },
		},
		{
			"postgres_acquire_count",
			"Total number of successful connection acquisitions",
			func(s PostgresStatusResult) float64 { return float64(s.AcquireCount) },
		},
		{
			"postgres_empty_acquire_count",
			"Total number of successful acquires that waited for a connection",
			func(s PostgresStatusResult) float64 { return float64(s.EmptyAcquireCount) },
		},
		{
			"postgres_canceled_acquire_count",
			"Total number of acquires canceled by context",
			func(s PostgresStatusResult) float64 { return float64(s.CanceledAcquireCount) },
		},
		{
			"postgres_acquire_duration_seconds",
			"Duration of connection acquisitions",
			func(s PostgresStatusResult) float64 { return s.AcquireDuration.Seconds() },
		},
		{
			"postgres_max_lifetime_destroy_count",
			"Total number of connections destroyed due to MaxConnLifetime",
			func(s PostgresStatusResult) float64 { return float64(s.MaxLifetimeDestroyCount) },
		},
		{
			"postgres_max_idle_destroy_count",
			"Total number of connections destroyed due to MaxConnIdleTime",
			func(s PostgresStatusResult) float64 { return float64(s.MaxIdleDestroyCount) },
		},
	}

	for _, metric := range numericMetrics {
		factory.NewGaugeFunc(
			prometheus.GaugeOpts{
				Name: metric.name,
				Help: metric.help,
			},
			func(getValue func(PostgresStatusResult) float64) func() float64 {
				return func() float64 {
					return getValue(getStatus())
				}
			}(metric.getValue),
		)
	}

	// Metrics for version, system ID, and ES count
	versionGauge := factory.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "postgres_version_info",
			Help: "PostgreSQL version information",
		},
		[]string{"version"},
	)

	systemIDGauge := factory.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "postgres_system_id_info",
			Help: "PostgreSQL system identifier information",
		},
		[]string{"system_id"},
	)

	esCountGauge := factory.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "postgres_es_count_info",
			Help: "Number of rows in the es table",
		},
		[]string{"es_count"},
	)

	// Function to update version, system ID, and ES count
	var (
		lastVersion  string
		lastSystemID string
		lastEsCount  string
		mu           sync.Mutex
	)

	updateMetrics := func() {
		status := getStatus()
		mu.Lock()
		defer mu.Unlock()

		if status.Version != lastVersion {
			versionGauge.Reset()
			versionGauge.WithLabelValues(status.Version).Set(1)
			lastVersion = status.Version
		}

		if status.SystemId != lastSystemID {
			systemIDGauge.Reset()
			systemIDGauge.WithLabelValues(status.SystemId).Set(1)
			lastSystemID = status.SystemId
		}

		if status.EsCount != lastEsCount {
			esCountGauge.Reset()
			esCountGauge.WithLabelValues(status.EsCount).Set(1)
			lastEsCount = status.EsCount
		}
	}

	// Initial update
	updateMetrics()

	// Setup periodic updates
	go func() {
		ticker := time.NewTicker(5 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				updateMetrics()
			}
		}
	}()
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
	SetupPostgresMetrics(ctx, *poolInfo, metrics)

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
		if config.UseDetailedLog(ctx) {
			log.Info("DB Schema already exists", "schema", s.schemaName)
		}
	}
	return nil
}

func getSSLMode(dbURL string) string {
	if strings.Contains(dbURL, "sslmode=") {
		startIndex := strings.Index(dbURL, "sslmode=") + len("sslmode=")
		endIndex := strings.Index(dbURL[startIndex:], "&")
		if endIndex == -1 {
			endIndex = len(dbURL)
		} else {
			endIndex += startIndex
		}
		return dbURL[startIndex:endIndex]
	}
	return "disable"
}

func (s *PostgresEventStore) runMigrations(ctx context.Context) error {
	// Run migrations
	iofsMigrationsDir, err := iofs.New(s.migrationDir, "migrations")
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error loading migrations")
	}

	dbUrlWithSchema := strings.Split(s.dbUrl, "?")[0] + fmt.Sprintf(
		"?sslmode=%s&search_path=%v,public",
		getSSLMode(s.dbUrl),
		s.schemaName,
	)
	migration, err := migrate.NewWithSourceInstance("iofs", iofsMigrationsDir, dbUrlWithSchema)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error creating migration instance")
	}

	// Get the current migration version before running Up()
	beforeVersion, _, err := migration.Version()
	if err != nil && err != migrate.ErrNilVersion {
		return WrapRiverError(
			Err_DB_OPERATION_FAILURE,
			err,
		).Message("Error fetching migration version before running migrations")
	}

	if err = migration.Up(); err != nil && err != migrate.ErrNoChange {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error running migrations")
	}

	// Get the migration version after running Up()
	afterVersion, _, err := migration.Version()
	if err != nil {
		return WrapRiverError(
			Err_DB_OPERATION_FAILURE,
			err,
		).Message("Error fetching migration version after running migrations")
	}

	// Trigger a full vacuum if we're upgrading to 5 to reclaim disk space
	if beforeVersion < 5 && afterVersion == 5 {
		// Run VACUUM FULL on the relevant tables
		if err = s.vacuumTables(ctx, dbUrlWithSchema); err != nil {
			return err
		}
	}

	return nil
}

// vacuumTables runs VACUUM FULL on the list of tables
func (s *PostgresEventStore) vacuumTables(ctx context.Context, dbUrlWithSchema string) error {
	log := dlog.FromCtx(ctx)

	db, err := sql.Open("postgres", dbUrlWithSchema)
	if err != nil {
		return err
	}
	defer db.Close()

	// Skipping miniblocks table as it can be very large and VACUUM FULL can take a long time
	tables := []string{"miniblock_candidates", "es", "minipools"}

	for _, table := range tables {
		query := fmt.Sprintf("VACUUM FULL %s;", table)
		if _, err := db.Exec(query); err != nil {
			return WrapRiverError(
				Err_DB_OPERATION_FAILURE,
				err,
			).Message("Error running VACUUM FULL").
				Tag("table", table)
		}
		log.Info("Successfully vacuumed table", "table", table)
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

	err = s.runMigrations(ctx)
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

func (s *PostgresEventStore) DebugReadStreamData(
	ctx context.Context,
	streamId StreamId,
) (*DebugReadStreamDataResult, error) {
	var ret *DebugReadStreamDataResult
	err := s.txRunner(
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

func (s *PostgresEventStore) debugReadStreamData(
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
		"SELECT seq_num, blockdata FROM miniblocks WHERE stream_id = $1 ORDER BY seq_num",
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
		"SELECT generation, slot_num, envelope FROM minipools WHERE stream_id = $1 ORDER BY generation, slot_num",
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
		"SELECT seq_num, block_hash, blockdata FROM miniblock_candidates WHERE stream_id = $1 ORDER BY seq_num",
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

func (s *PostgresEventStore) StreamLastMiniBlock(
	ctx context.Context,
	streamID StreamId,
) (*MiniblockData, error) {
	var ret *MiniblockData
	err := s.txRunner(
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

func (s *PostgresEventStore) streamLastMiniBlockTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID StreamId,
) (*MiniblockData, error) {
	miniblockNumsRow, err := tx.Query(
		ctx,
		"SELECT seq_num, blockdata FROM miniblocks WHERE stream_id = $1 ORDER BY seq_num DESC LIMIT 1",
		streamID,
	)
	if err != nil {
		return nil, err
	}

	defer miniblockNumsRow.Close()

	if miniblockNumsRow.Next() {
		var (
			maxSeqNum int64
			blockData []byte
		)

		if err = miniblockNumsRow.Scan(&maxSeqNum, &blockData); err != nil {
			return nil, err
		}

		return &MiniblockData{
			StreamID:      streamID,
			Number:        maxSeqNum,
			MiniBlockInfo: blockData,
		}, nil
	}

	return nil, RiverError(Err_NOT_FOUND, "latest miniblock in DB not found for stream").
		Tags("stream", streamID).
		Func("lastMiniBlockForStream")
}

func (s *PostgresEventStore) ImportMiniblocks(ctx context.Context, miniBlocks []*MiniblockData) error {
	if len(miniBlocks) == 0 {
		return nil
	}

	return s.txRunner(
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

func (s *PostgresEventStore) importMiniblocksTx(ctx context.Context, tx pgx.Tx, miniBlocks []*MiniblockData) error {
	if len(miniBlocks) == 0 {
		return nil
	}

	var (
		streamID = miniBlocks[0].StreamID
		seqNum   *int64
	)

	err := tx.QueryRow(
		ctx,
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
			err = s.txRunner(
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
				"INSERT INTO miniblocks (stream_id, seq_num, blockdata) values ($1, $2, $3)",
				//"INSERT INTO miniblocks SELECT stream_id, seq_num, blockdata FROM miniblock_candidates WHERE stream_id = $1 AND seq_num = $2 AND miniblock_candidates.block_hash = $3",
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
		"UPDATE minipools SET generation = $1 WHERE slot_num = -1 AND stream_id = $2",
		miniBlocks[len(miniBlocks)-1].Number+1,
		streamID,
	)

	return err
}
