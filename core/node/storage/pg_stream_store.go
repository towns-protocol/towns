package storage

import (
	"context"
	"embed"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"slices"
	"strings"
	"time"

	"github.com/cespare/xxhash/v2"
	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
)

type PostgresStreamStore struct {
	PostgresEventStore

	exitSignal        chan error
	nodeUUID          string
	cleanupListenFunc func()
	cleanupLockFunc   func()

	numPartitions int

	//
	esm *ephemeralStreamMonitor
}

var _ StreamStorage = (*PostgresStreamStore)(nil)

//go:embed migrations/*.sql
var migrationsDir embed.FS

func GetRiverNodeDbMigrationSchemaFS() *embed.FS {
	return &migrationsDir
}

type txnFn func(ctx context.Context, tx pgx.Tx) error

// createSettingsTableTxnWithPartitions creates a txnFn that can be ran on the
// postgres store before migrations are applied. Our migrations actually check this
// table and use the partitions setting in order to determine how many partitions
// to use when creating the schema for stream data storage. If the table does not exist,
// it will be created and a default setting of 256 partitions will be used.
func (s *PostgresStreamStore) createSettingsTableTxnWithPartitions(partitions int) txnFn {
	return func(ctx context.Context, tx pgx.Tx) error {
		log := logging.FromCtx(ctx)
		log.Infow("Creating settings table")
		if _, err := tx.Exec(
			ctx,
			`CREATE TABLE IF NOT EXISTS settings (
				single_row_key BOOL PRIMARY KEY DEFAULT TRUE,
				num_partitions INT DEFAULT 256 NOT NULL);`,
		); err != nil {
			log.Errorw("Error creating settings table", "error", err)
			return err
		}

		log.Infow("Inserting config partitions", "partitions", partitions)
		tags, err := tx.Exec(
			ctx,
			`INSERT INTO settings (single_row_key, num_partitions) VALUES (true, $1)
			ON CONFLICT DO NOTHING`,
			partitions,
		)
		if err != nil {
			log.Errorw("Error setting partition count", "error", err)
			return err
		}

		var numPartitions int
		if err = tx.QueryRow(
			ctx,
			`SELECT num_partitions FROM settings WHERE single_row_key=true;`,
		).Scan(&numPartitions); err != nil {
			return err
		}

		// Assign the true partitions used to the store, which may be different than what
		// is specified in the config, if the config does not match what is already in the
		// database.
		s.numPartitions = numPartitions
		log.Infow("Creating stream storage schema with partition count", "numPartitions", numPartitions)

		if tags.RowsAffected() < 1 {
			log.Warnw(
				"Ignoring numPartitions config, previous setting detected",
				"numPartitionsConfig",
				partitions,
				"actualPartitions",
				numPartitions,
			)
		}

		return nil
	}
}

func NewPostgresStreamStore(
	ctx context.Context,
	poolInfo *PgxPoolInfo,
	instanceId string,
	exitSignal chan error,
	metrics infra.MetricsFactory,
	ephemeralStreamTtl time.Duration,
) (store *PostgresStreamStore, err error) {
	store = &PostgresStreamStore{
		nodeUUID:   instanceId,
		exitSignal: exitSignal,
	}

	if err = store.PostgresEventStore.init(
		ctx,
		poolInfo,
		metrics,
		store.createSettingsTableTxnWithPartitions(poolInfo.Config.NumPartitions),
		migrationsDir,
		"migrations",
	); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresStreamStore")
	}

	if err = store.initStreamStorage(ctx); err != nil {
		return nil, AsRiverError(err).Func("NewPostgresStreamStore")
	}

	cancelCtx, cancel := context.WithCancel(ctx)
	store.cleanupListenFunc = cancel
	go store.listenForNewNodes(cancelCtx)

	// Start the ephemeral stream monitor.
	store.esm, err = newEphemeralStreamMonitor(ctx, ephemeralStreamTtl, store)
	if err != nil {
		return nil, AsRiverError(err).Func("NewPostgresStreamStore")
	}

	return store, nil
}

// computeLockIdFromSchema computes an int64 which is a hash of the schema name.
// We will use this int64 as the key of a pg advisory lock to ensure only one
// node has R/W access to the schema at a time.
func (s *PostgresStreamStore) computeLockIdFromSchema() int64 {
	return (int64)(xxhash.Sum64String(s.schemaName))
}

// maintainSchemaLock periodically checks the connection that established the
// lock on the schema and will attempt to establish a new connection and take
// the lock again if the connection is lost. If the lock is lost and cannot be
// re-established, the store will send an exit signal to shut down the node.
// This is blocking and is intended to be launched as a go routine.
func (s *PostgresStreamStore) maintainSchemaLock(
	ctx context.Context,
	conn *pgxpool.Conn,
) {
	log := logging.FromCtx(ctx)
	defer conn.Release()

	lockId := s.computeLockIdFromSchema()
	for {
		// Check for connection health with a ping. Also, maintain the connection in the
		// case of idle timeouts.
		err := conn.Ping(ctx)
		if err != nil {
			// We expect cancellation only on node shutdown. In this case,
			// do not send an error signal.
			if errors.Is(err, context.Canceled) {
				return
			}

			log.Warnw("Error pinging pgx connection maintaining the session lock, closing connection", "error", err)

			// Close the connection to encourage the db server to immediately clean up the
			// session so we can go ahead and re-take the lock from a new session.
			conn.Conn().Close(ctx)
			// Fine to call multiple times.
			conn.Release()

			// Attempt to re-acquire a connection
			conn, err = s.acquireConnection(ctx)

			// Shutdown the node for non-cancellation errors
			if errors.Is(err, context.Canceled) {
				return
			} else if err != nil {
				err = AsRiverError(err, Err_RESOURCE_EXHAUSTED).
					Message("Lost connection and unable to re-acquire a connection").
					Func("maintainSchemaLock").
					Tag("schema", s.schemaName).
					Tag("lockId", lockId).
					LogError(logging.FromCtx(ctx))
				s.exitSignal <- err
				return
			}

			log.Infow("maintainSchemaLock: reacquired connection, re-establishing session lock")
			defer conn.Release()

			// Attempt to re-establish the lock
			var acquired bool
			err := conn.QueryRow(
				ctx,
				"select pg_try_advisory_lock($1)",
				lockId,
			).Scan(&acquired)

			// Shutdown the node for non-cancellation errors.
			if errors.Is(err, context.Canceled) {
				return
			} else if err != nil {
				err = AsRiverError(err, Err_RESOURCE_EXHAUSTED).
					Message("Lost connection and unable to re-acquire schema lock").
					Func("maintainSchemaLock").
					Tag("schema", s.schemaName).
					Tag("lockId", lockId).
					LogError(logging.FromCtx(ctx))
				s.exitSignal <- err
			}

			if !acquired {
				err = AsRiverError(fmt.Errorf("schema lock was not available"), Err_RESOURCE_EXHAUSTED).
					Message("Lost connection and unable to re-acquire schema lock").
					Func("maintainSchemaLock").
					Tag("schema", s.schemaName).
					Tag("lockId", lockId).
					LogError(logging.FromCtx(ctx))
				s.exitSignal <- err
			}
		}
		// Sleep 1s between polls, being sure to return if the context is cancelled.
		if err = SleepWithContext(ctx, 1*time.Second); err != nil {
			return
		}
	}
}

// acquireSchemaLock waits until it is able to acquire a session-wide pg advisory lock
// on the integer id derived from the hash of this node's schema name, and launches a
// go routine to periodically check the connection maintaining the lock.
func (s *PostgresStreamStore) acquireSchemaLock(ctx context.Context) error {
	log := logging.FromCtx(ctx)
	lockId := s.computeLockIdFromSchema()

	// Acquire connection
	conn, err := s.acquireConnection(ctx)
	if err != nil {
		return err
	}

	log.Infow("Acquiring lock on database schema", "lockId", lockId, "nodeUUID", s.nodeUUID)

	var lockWasUnavailable bool
	for {
		var acquired bool
		if err := conn.QueryRow(
			ctx,
			"select pg_try_advisory_lock($1)",
			lockId,
		).Scan(&acquired); err != nil {
			return AsRiverError(
				err,
				Err_DB_OPERATION_FAILURE,
			).Message("Could not acquire lock on schema").
				Func("acquireSchemaLock").
				Tag("lockId", lockId).
				Tag("nodeUUID", s.nodeUUID).
				LogError(log)
		}

		if acquired {
			log.Infow("Schema lock acquired", "lockId", lockId, "nodeUUID", s.nodeUUID)
			break
		}

		lockWasUnavailable = true
		if err = SleepWithContext(ctx, 1*time.Second); err != nil {
			return err
		}

		log.Infow(
			"Unable to acquire lock on schema, retrying...",
			"lockId",
			lockId,
			"nodeUUID",
			s.nodeUUID,
		)
	}

	// If we were not initially able to acquire the lock, delay startup after lock
	// acquisition to give the other node any needed time to fully release all resources.
	if lockWasUnavailable {
		delay := s.config.StartupDelay
		if delay == 0 {
			delay = 2 * time.Second
		} else if delay <= time.Millisecond {
			delay = 0
		}
		if delay > 0 {
			log.Infow(
				"schema lock could not be immediately acquired; Delaying startup to let other instance exit",
				"delay",
				delay,
			)

			// Be responsive to context cancellations
			if err = SleepWithContext(ctx, delay); err != nil {
				return err
			}
		}
	}

	// maintainSchemaLock is responsible for connection cleanup.
	go s.maintainSchemaLock(ctx, conn)
	return nil
}

func (s *PostgresStreamStore) initStreamStorage(ctx context.Context) error {
	logging.FromCtx(ctx).Infow("Detecting other instances")
	if err := s.txRunner(
		ctx,
		"listOtherInstances",
		pgx.ReadOnly,
		s.listOtherInstancesTx,
		nil,
	); err != nil {
		return err
	}

	logging.FromCtx(ctx).Infow("Establishing database usage")
	if err := s.txRunner(
		ctx,
		"initializeSingleNodeKey",
		pgx.ReadWrite,
		s.initializeSingleNodeKeyTx,
		nil,
	); err != nil {
		return err
	}

	// After writing to the singlenodekey table, wait until we acquire the schema lock.
	// In the meantime, any other nodes should detect the new entry in the table and
	// shut themselves down.
	ctx, cancel := context.WithCancel(ctx)
	s.cleanupLockFunc = cancel

	if err := s.acquireSchemaLock(ctx); err != nil {
		return AsRiverError(err, Err_DB_OPERATION_FAILURE).
			Message("Unable to acquire lock on database schema").
			Func("initStreamStorage")
	}

	return nil
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

// CreatePartitionSuffix determines the partition mapping for a particular stream id the
// hex encoding of the first byte of the xxHash of the stream ID.
func CreatePartitionSuffix(streamId StreamId, numPartitions int) string {
	// Media streams have separate partitions to handle the different data shapes and access
	// patterns. The partition suffix is prefixed with an "m". Regular streams are assigned to
	// partitions prefixed with "r", e.g. "miniblocks_ra4".
	streamType := "r"
	if streamId.Type() == STREAM_MEDIA_BIN {
		streamType = "m"
	}

	// Do not hash the stream bytes directly, but hash the hex encoding of the stream id, which is
	// what we store in the database. This leaves the door open for installing xxhash on postgres
	// and debugging this way in the future.
	hash := xxhash.Sum64String(streamId.String())
	bt := hash % uint64(numPartitions) & 255
	return fmt.Sprintf("%s%02x", streamType, bt)
}

// sqlForStream escapes references to partitioned tables to the specific partition where the stream
// is assigned whenever they are surrounded by double curly brackets.
func (s *PostgresStreamStore) sqlForStream(sql string, streamId StreamId) string {
	suffix := CreatePartitionSuffix(streamId, s.numPartitions)

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

func (s *PostgresStreamStore) lockStream(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	write bool,
) (
	lastSnapshotMiniblock int64,
	err error,
) {
	if write {
		err = tx.QueryRow(
			ctx,
			"SELECT latest_snapshot_miniblock from es WHERE stream_id = $1 FOR UPDATE",
			streamId,
		).Scan(&lastSnapshotMiniblock)
	} else {
		err = tx.QueryRow(
			ctx,
			"SELECT latest_snapshot_miniblock from es WHERE stream_id = $1 FOR SHARE",
			streamId,
		).Scan(&lastSnapshotMiniblock)
	}

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, RiverError(
				Err_NOT_FOUND,
				"Stream not found",
				"streamId",
				streamId,
			).Func("PostgresStreamStore.lockStream")
		}
		return 0, err
	}

	return lastSnapshotMiniblock, nil
}

func (s *PostgresStreamStore) createStreamStorageTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	genesisMiniblock []byte,
) error {
	sql := s.sqlForStream(
		`
			INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated, ephemeral) VALUES ($1, 0, true, false);
			INSERT INTO {{miniblocks}} (stream_id, seq_num, blockdata) VALUES ($1, 0, $2);
			INSERT INTO {{minipools}} (stream_id, generation, slot_num) VALUES ($1, 1, -1);`,
		streamId,
	)
	if _, err := tx.Exec(ctx, sql, streamId, genesisMiniblock); err != nil {
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

func (s *PostgresStreamStore) createStreamArchiveStorageTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) error {
	sql := `INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated) VALUES ($1, -1, true);`
	if _, err := tx.Exec(ctx, sql, streamId); err != nil {
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
	if err := s.txRunner(
		ctx,
		"GetMaxArchivedMiniblockNumber",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.getMaxArchivedMiniblockNumberTx(ctx, tx, streamId, &maxArchivedMiniblockNumber)
		},
		&txRunnerOpts{skipLoggingNotFound: true},
		"streamId", streamId,
	); err != nil {
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
	if _, err := s.lockStream(ctx, tx, streamId, false); err != nil {
		return err
	}

	if err := tx.QueryRow(
		ctx,
		s.sqlForStream(
			"SELECT COALESCE(MAX(seq_num), -1) FROM {{miniblocks}} WHERE stream_id = $1",
			streamId,
		),
		streamId,
	).Scan(maxArchivedMiniblockNumber); err != nil {
		return err
	}

	if *maxArchivedMiniblockNumber == -1 {
		var exists bool
		if err := tx.QueryRow(
			ctx,
			"SELECT EXISTS(SELECT 1 FROM es WHERE stream_id = $1)",
			streamId,
		).Scan(&exists); err != nil {
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

func (s *PostgresStreamStore) writeArchiveMiniblocksTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	startMiniblockNum int64,
	miniblocks [][]byte,
) error {
	if _, err := s.lockStream(ctx, tx, streamId, true); err != nil {
		return err
	}

	var lastKnownMiniblockNum int64
	if err := s.getMaxArchivedMiniblockNumberTx(ctx, tx, streamId, &lastKnownMiniblockNum); err != nil {
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
		if _, err := tx.Exec(
			ctx,
			s.sqlForStream(
				"INSERT INTO {{miniblocks}} (stream_id, seq_num, blockdata) VALUES ($1, $2, $3)",
				streamId,
			),
			streamId,
			startMiniblockNum+int64(i),
			miniblock); err != nil {
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
	if err := s.txRunner(
		ctx,
		"ReadStreamFromLastSnapshot",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.readStreamFromLastSnapshotTx(ctx, tx, streamId, numToRead)
			return err
		},
		nil,
		"streamId", streamId,
	); err != nil {
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
	snapshotMiniblockIndex, err := s.lockStream(ctx, tx, streamId, false)
	if err != nil {
		return nil, err
	}

	var lastMiniblockIndex int64
	if err = tx.
		QueryRow(
			ctx,
			s.sqlForStream(
				"SELECT MAX(seq_num) FROM {{miniblocks}} WHERE stream_id = $1",
				streamId,
			),
			streamId).
		Scan(&lastMiniblockIndex); err != nil {
		return nil, WrapRiverError(Err_INTERNAL, err).Message("db inconsistency: failed to get last miniblock index")
	}

	numToRead = max(1, numToRead)
	startSeqNum := max(0, lastMiniblockIndex-int64(numToRead-1))
	startSeqNum = min(startSeqNum, snapshotMiniblockIndex)

	miniblocksRow, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT blockdata, seq_num FROM {{miniblocks}} WHERE seq_num >= $1 AND stream_id = $2 ORDER BY seq_num",
			streamId,
		),
		startSeqNum,
		streamId,
	)
	if err != nil {
		return nil, err
	}

	var miniblocks [][]byte
	var counter int64 = 0
	var readFirstSeqNum int64

	var blockdata []byte
	var readLastSeqNum int64
	if _, err := pgx.ForEachRow(
		miniblocksRow,
		[]any{&blockdata, &readLastSeqNum},
		func() error {
			if counter == 0 {
				readFirstSeqNum = readLastSeqNum
			} else if readLastSeqNum != readFirstSeqNum+counter {
				return RiverError(
					Err_INTERNAL,
					"Miniblocks consistency violation - miniblocks are not sequential in db",
					"ActualSeqNum", readLastSeqNum,
					"ExpectedSeqNum", readFirstSeqNum+counter)
			}
			miniblocks = append(miniblocks, blockdata)
			counter++
			return nil
		},
	); err != nil {
		return nil, err
	}

	if !(readFirstSeqNum <= snapshotMiniblockIndex && snapshotMiniblockIndex <= readLastSeqNum) {
		return nil, RiverError(
			Err_INTERNAL,
			"Miniblocks consistency violation - snapshotMiniblockIndex is out of range",
			"snapshotMiniblockIndex", snapshotMiniblockIndex,
			"readFirstSeqNum", readFirstSeqNum,
			"readLastSeqNum", readLastSeqNum)
	}

	rows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT envelope, generation, slot_num FROM {{minipools}} WHERE stream_id = $1 ORDER BY generation, slot_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}

	var envelopes [][]byte
	var expectedGeneration int64 = readLastSeqNum + 1
	var expectedSlot int64 = -1

	// Scan variables
	var envelope []byte
	var generation int64
	var slotNum int64
	if _, err := pgx.ForEachRow(rows, []any{&envelope, &generation, &slotNum}, func() error {
		if generation != expectedGeneration {
			return RiverError(
				Err_MINIBLOCKS_STORAGE_FAILURE,
				"Minipool consistency violation - minipool generation doesn't match last miniblock generation",
			).
				Tag("generation", generation).
				Tag("expectedGeneration", expectedGeneration)
		}
		if slotNum != expectedSlot {
			return RiverError(
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
		return nil
	}); err != nil {
		return nil, err
	}

	return &ReadStreamFromLastSnapshotResult{
		StartMiniblockNumber:    readFirstSeqNum,
		SnapshotMiniblockOffset: int(snapshotMiniblockIndex - readFirstSeqNum),
		Miniblocks:              miniblocks,
		MinipoolEnvelopes:       envelopes,
	}, nil
}

// WriteEvent adds event to the given minipool.
// Current generation of minipool should match minipoolGeneration,
// and there should be exactly minipoolSlot events in the minipool.
func (s *PostgresStreamStore) WriteEvent(
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
func (s *PostgresStreamStore) writeEventTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	minipoolGeneration int64,
	minipoolSlot int,
	envelope []byte,
) error {
	_, err := s.lockStream(ctx, tx, streamId, true)
	if err != nil {
		return err
	}

	envelopesRow, err := tx.Query(
		ctx,
		// Ordering by generation, slot_num allows this to be an index only query
		s.sqlForStream(
			"SELECT generation, slot_num FROM {{minipools}} WHERE stream_id = $1 ORDER BY generation, slot_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return err
	}

	var counter int = -1 // counter is set to -1 as we have service record in the first row of minipool table
	var generation int64
	var slotNum int
	if _, err := pgx.ForEachRow(envelopesRow, []any{&generation, &slotNum}, func() error {
		if generation != minipoolGeneration {
			return RiverError(Err_DB_OPERATION_FAILURE, "Wrong event generation in minipool").
				Tag("ExpectedGeneration", minipoolGeneration).Tag("ActualGeneration", generation)
		}
		if slotNum != counter {
			return RiverError(Err_DB_OPERATION_FAILURE, "Wrong slot number in minipool").
				Tag("ExpectedSlotNumber", counter).Tag("ActualSlotNumber", slotNum)
		}
		// Slots number for envelopes start from 1, so we skip counter equal to zero
		counter++
		return nil
	}); err != nil {
		return err
	}

	// At this moment counter should be equal to minipoolSlot otherwise it is discrepancy of actual and expected records in minipool
	// Keep in mind that there is service record with seqNum equal to -1
	if counter != minipoolSlot {
		var seqNum int
		// Sometimes this transaction fails due to timeouts, but since we're rolling back the transaction
		// anyway, we might as well try to add this metadata to the returned error for debugging purposes.
		// Occasionally we see this error in local testing and there may be a race condition in our stream
		// caching logic that is causing this inconsistency.
		mbErr := tx.QueryRow(
			ctx,
			s.sqlForStream("select max(seq_num) from {{miniblocks}} where stream_id = $1", streamId),
			streamId,
		).Scan(&seqNum)
		return RiverError(Err_DB_OPERATION_FAILURE, "Wrong number of records in minipool").
			Tag("ActualRecordsNumber", counter).Tag("ExpectedRecordsNumber", minipoolSlot).
			Tag("maxSeqNum", seqNum).Tag("mbErr", mbErr)
	}

	// All checks passed - we need to insert event into minipool
	if _, err = tx.Exec(
		ctx,
		s.sqlForStream(
			"INSERT INTO {{minipools}} (stream_id, envelope, generation, slot_num) VALUES ($1, $2, $3, $4)",
			streamId,
		),
		streamId,
		envelope,
		minipoolGeneration,
		minipoolSlot,
	); err != nil {
		return err
	}
	return nil
}

// ReadMiniblocks returns miniblocks with miniblockNum or "generation" from fromInclusive, to toExlusive.
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
	if err := s.txRunner(
		ctx,
		"ReadMiniblocks",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			miniblocks, err = s.readMiniblocksTx(ctx, tx, streamId, fromInclusive, toExclusive)
			return err
		},
		nil,
		"streamId", streamId,
		"fromInclusive", fromInclusive,
		"toExclusive", toExclusive,
	); err != nil {
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
	if _, err := s.lockStream(ctx, tx, streamId, false); err != nil {
		return nil, err
	}

	miniblocksRow, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT blockdata, seq_num FROM {{miniblocks}} WHERE seq_num >= $1 AND seq_num < $2 AND stream_id = $3 ORDER BY seq_num",
			streamId,
		),
		fromInclusive,
		toExclusive,
		streamId,
	)
	if err != nil {
		return nil, err
	}

	// Retrieve miniblocks starting from the latest miniblock with snapshot
	miniblocks := make([][]byte, 0, toExclusive-fromInclusive)

	var prevSeqNum int = -1 // There is no negative generation, so we use it as a flag on the first step of the loop during miniblocks sequence check
	var blockdata []byte
	var seq_num int

	if _, err := pgx.ForEachRow(miniblocksRow, []any{&blockdata, &seq_num}, func() error {
		if (prevSeqNum != -1) && (seq_num != prevSeqNum+1) {
			// There is a gap in sequence numbers
			return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Miniblocks consistency violation").
				Tag("ActualBlockNumber", seq_num).Tag("ExpectedBlockNumber", prevSeqNum+1).Tag("streamId", streamId)
		}
		prevSeqNum = seq_num
		miniblocks = append(miniblocks, blockdata)
		return nil
	}); err != nil {
		return nil, err
	}

	return miniblocks, nil
}

// ReadMiniblocksByStream returns miniblocks data stream by the given stream ID.
// It does not read data from the database, but returns a MiniblocksDataStream object that can be used to read miniblocks.
// Client should call Close() on the returned MiniblocksDataStream object when done.
func (s *PostgresStreamStore) ReadMiniblocksByStream(
	ctx context.Context,
	streamId StreamId,
	onEachMb func(blockdata []byte, seqNum int64) error,
) error {
	return s.txRunner(
		ctx,
		"ReadMiniblocksByStream",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.readMiniblocksByStreamTx(ctx, tx, streamId, onEachMb)
		},
		&txRunnerOpts{useStreamingPool: true},
		"streamId", streamId,
	)
}

func (s *PostgresStreamStore) readMiniblocksByStreamTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	onEachMb func(blockdata []byte, seqNum int64) error,
) error {
	if _, err := s.lockStream(ctx, tx, streamId, false); err != nil {
		return err
	}

	rows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT blockdata, seq_num FROM {{miniblocks}} WHERE stream_id = $1 ORDER BY seq_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return err
	}

	prevSeqNum := int64(-1)
	var blockdata []byte
	var seqNum int64
	_, err = pgx.ForEachRow(rows, []any{&blockdata, &seqNum}, func() error {
		if (prevSeqNum != -1) && (seqNum != prevSeqNum+1) {
			// There is a gap in sequence numbers
			return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Miniblocks consistency violation").
				Tag("ActualBlockNumber", seqNum).Tag("ExpectedBlockNumber", prevSeqNum+1).Tag("streamId", streamId)
		}

		prevSeqNum = seqNum

		return onEachMb(blockdata, seqNum)
	})

	return err
}

// ReadMiniblocksByIds returns miniblocks data of the given miniblocks by the given stream ID.
func (s *PostgresStreamStore) ReadMiniblocksByIds(
	ctx context.Context,
	streamId StreamId,
	mbs []int64,
	onEachMb func(blockdata []byte, seqNum int64) error,
) error {
	return s.txRunner(
		ctx,
		"ReadMiniblocksByIds",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.readMiniblocksByIdsTx(ctx, tx, streamId, mbs, onEachMb)
		},
		&txRunnerOpts{useStreamingPool: true},
		"streamId", streamId,
		"mbs", mbs,
	)
}

func (s *PostgresStreamStore) readMiniblocksByIdsTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	mbs []int64,
	onEachMb func(blockdata []byte, seqNum int64) error,
) error {
	_, err := s.lockStream(ctx, tx, streamId, false)
	if err != nil {
		return err
	}

	rows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT blockdata, seq_num FROM {{miniblocks}} WHERE stream_id = $1 AND seq_num IN (SELECT unnest($2::int[])) ORDER BY seq_num",
			streamId,
		),
		streamId,
		mbs,
	)
	if err != nil {
		return err
	}

	var blockdata []byte
	var seqNum int64
	_, err = pgx.ForEachRow(rows, []any{&blockdata, &seqNum}, func() error {
		return onEachMb(blockdata, seqNum)
	})

	return err
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
	return s.txRunner(
		ctx,
		"WriteMiniblockCandidate",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.writeMiniblockCandidateTx(ctx, tx, streamId, blockHash, blockNumber, miniblock)
		},
		nil,
		"streamId", streamId,
		"blockHash", blockHash,
		"blockNumber", blockNumber,
	)
}

// Supported consistency checks:
// 1. Proposal block number is current miniblock block number + 1
func (s *PostgresStreamStore) writeMiniblockCandidateTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
	miniblock []byte,
) error {
	if _, err := s.lockStream(ctx, tx, streamId, true); err != nil {
		return err
	}

	var seqNum *int64
	if err := tx.QueryRow(
		ctx,
		s.sqlForStream(
			"SELECT MAX(seq_num) as latest_blocks_number FROM {{miniblocks}} WHERE stream_id = $1",
			streamId,
		),
		streamId,
	).Scan(&seqNum); err != nil {
		return err
	}

	if seqNum == nil {
		return RiverError(Err_NOT_FOUND, "No blocks for the stream found in block storage")
	}

	// Candidate block number should be greater than the last block number in storage.
	if blockNumber <= *seqNum {
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Candidate is too old").
			Tag("LastBlockInStorage", *seqNum).Tag("CandidateBlockNumber", blockNumber)
	}

	// insert miniblock proposal into miniblock_candidates table
	if _, err := tx.Exec(
		ctx,
		s.sqlForStream(
			"INSERT INTO {{miniblock_candidates}} (stream_id, seq_num, block_hash, blockdata) VALUES ($1, $2, $3, $4)",
			streamId,
		),
		streamId,
		blockNumber,
		hex.EncodeToString(blockHash.Bytes()), // avoid leading '0x'
		miniblock,
	); err != nil {
		if pgErr, ok := err.(*pgconn.PgError); ok && pgErr.Code == pgerrcode.UniqueViolation {
			return RiverError(Err_ALREADY_EXISTS, "Miniblock candidate already exists")
		}
		return err
	}
	return nil
}

func (s *PostgresStreamStore) ReadMiniblockCandidate(
	ctx context.Context,
	streamId StreamId,
	blockHash common.Hash,
	blockNumber int64,
) ([]byte, error) {
	var miniblock []byte
	err := s.txRunner(
		ctx,
		"ReadMiniblockCandidate",
		pgx.ReadWrite,
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
	if _, err := s.lockStream(ctx, tx, streamId, false); err != nil {
		return nil, err
	}

	var miniblock []byte
	if err := tx.QueryRow(
		ctx,
		s.sqlForStream(
			"SELECT blockdata FROM {{miniblock_candidates}} WHERE stream_id = $1 AND seq_num = $2 AND block_hash = $3",
			streamId,
		),
		streamId,
		blockNumber,
		hex.EncodeToString(blockHash.Bytes()), // avoid leading '0x'
	).Scan(&miniblock); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, RiverError(Err_NOT_FOUND, "Miniblock candidate not found")
		}
		return nil, err
	}
	return miniblock, nil
}

func (s *PostgresStreamStore) WriteMiniblocks(
	ctx context.Context,
	streamId StreamId,
	miniblocks []*WriteMiniblockData,
	newMinipoolGeneration int64,
	newMinipoolEnvelopes [][]byte,
	prevMinipoolGeneration int64,
	prevMinipoolSize int,
) error {
	// Check redundant data in arguments is consistent.
	if len(miniblocks) == 0 {
		return RiverError(Err_INTERNAL, "No miniblocks to write").Func("pg.WriteMiniblocks")
	}
	if prevMinipoolGeneration != miniblocks[0].Number {
		return RiverError(Err_INTERNAL, "Previous minipool generation mismatch").Func("pg.WriteMiniblocks")
	}
	if newMinipoolGeneration != miniblocks[len(miniblocks)-1].Number+1 {
		return RiverError(Err_INTERNAL, "New minipool generation mismatch").Func("pg.WriteMiniblocks")
	}
	firstMbNum := miniblocks[0].Number
	for i, mb := range miniblocks {
		if mb.Number != firstMbNum+int64(i) {
			return RiverError(Err_INTERNAL, "Miniblock number mismatch").Func("pg.WriteMiniblocks")
		}
	}

	// This function is also called from background goroutines, set additional timeout.
	// TODO: config
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.txRunner(
		ctx,
		"WriteMiniblocks",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.writeMiniblocksTx(
				ctx,
				tx,
				streamId,
				miniblocks,
				newMinipoolGeneration,
				newMinipoolEnvelopes,
				prevMinipoolGeneration,
				prevMinipoolSize,
			)
		},
		nil,
		"streamId", streamId,
		"newMinipoolGeneration", newMinipoolGeneration,
		"newMinipoolSize", len(newMinipoolEnvelopes),
		"prevMinipoolGeneration", prevMinipoolGeneration,
		"prevMinipoolSize", prevMinipoolSize,
		"miniblockSize", len(miniblocks),
		"firstMiniblockNumber", miniblocks[0].Number,
		"lastMiniblockNumber", miniblocks[len(miniblocks)-1].Number,
	)
}

func (s *PostgresStreamStore) writeMiniblocksTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	miniblocks []*WriteMiniblockData,
	newMinipoolGeneration int64,
	newMinipoolEnvelopes [][]byte,
	prevMinipoolGeneration int64,
	prevMinipoolSize int,
) error {
	if _, err := s.lockStream(ctx, tx, streamId, true); err != nil {
		return err
	}

	var lastMbNumInStorage *int64
	if err := tx.QueryRow(
		ctx,
		s.sqlForStream(
			"SELECT MAX(seq_num) FROM {{miniblocks}} WHERE stream_id = $1",
			streamId,
		),
		streamId,
	).Scan(&lastMbNumInStorage); err != nil {
		return err
	}

	if lastMbNumInStorage == nil {
		return RiverError(
			Err_INTERNAL,
			"DB data consistency check failed: No blocks for the stream found in block storage",
		)
	}

	if *lastMbNumInStorage+1 != prevMinipoolGeneration {
		return RiverError(
			Err_INTERNAL,
			"DB data consistency check failed: Previous minipool generation mismatch",
			"lastMbInStorage",
			*lastMbNumInStorage,
		)
	}

	// Delete old minipool and check old data for consistency.
	type mpRow struct {
		generation int64
		slot       int64
	}
	rows, _ := tx.Query(
		ctx,
		s.sqlForStream(
			"DELETE FROM {{minipools}} WHERE stream_id = $1 RETURNING generation, slot_num",
			streamId,
		),
		streamId,
	)
	mpRows, err := pgx.CollectRows(
		rows,
		func(row pgx.CollectableRow) (mpRow, error) {
			var gen, slot int64
			err := row.Scan(&gen, &slot)
			return mpRow{generation: gen, slot: slot}, err
		},
	)
	if err != nil {
		return err
	}
	slices.SortFunc(mpRows, func(a, b mpRow) int {
		if a.generation != b.generation {
			return int(a.generation - b.generation)
		} else {
			return int(a.slot - b.slot)
		}
	})
	expectedSlot := int64(-1)
	for _, mp := range mpRows {
		if mp.generation != prevMinipoolGeneration {
			return RiverError(
				Err_INTERNAL,
				"DB data consistency check failed: Minipool contains unexpected generation",
				"generation",
				mp.generation,
			)
		}
		if mp.slot != expectedSlot {
			return RiverError(
				Err_INTERNAL,
				"DB data consistency check failed: Minipool contains unexpected slot number",
				"slot_num",
				mp.slot,
				"expected_slot_num",
				expectedSlot,
			)
		}
		expectedSlot++
	}
	if prevMinipoolSize != -1 && expectedSlot != int64(prevMinipoolSize) {
		return RiverError(
			Err_INTERNAL,
			"DB data consistency check failed: Previous minipool size mismatch",
			"actual_size",
			expectedSlot,
		)
	}

	// Insert -1 marker and all new minipool events into minipool.
	_, err = tx.Exec(
		ctx,
		s.sqlForStream(
			"INSERT INTO {{minipools}} (stream_id, generation, slot_num) VALUES ($1, $2, -1)",
			streamId,
		),
		streamId,
		newMinipoolGeneration,
	)
	if err != nil {
		return err
	}
	_, err = tx.CopyFrom(
		ctx,
		pgx.Identifier{s.sqlForStream("{{minipools}}", streamId)},
		[]string{"stream_id", "generation", "slot_num", "envelope"},
		pgx.CopyFromSlice(
			len(newMinipoolEnvelopes),
			func(i int) ([]any, error) {
				return []any{streamId, newMinipoolGeneration, i, newMinipoolEnvelopes[i]}, nil
			},
		),
	)
	if err != nil {
		return err
	}

	// Insert all miniblocks into miniblocks table.
	newLastSnapshotMiniblock := int64(-1)
	_, err = tx.CopyFrom(
		ctx,
		pgx.Identifier{s.sqlForStream("{{miniblocks}}", streamId)},
		[]string{"stream_id", "seq_num", "blockdata"},
		pgx.CopyFromSlice(
			len(miniblocks),
			func(i int) ([]any, error) {
				if miniblocks[i].Snapshot {
					newLastSnapshotMiniblock = miniblocks[i].Number
				}

				return []any{streamId, miniblocks[i].Number, miniblocks[i].Data}, nil
			},
		),
	)
	if err != nil {
		return err
	}

	// Update stream_snapshots_index if needed.
	if newLastSnapshotMiniblock > -1 {
		if _, err := tx.Exec(
			ctx,
			`UPDATE es SET latest_snapshot_miniblock = $1 WHERE stream_id = $2`,
			newLastSnapshotMiniblock,
			streamId,
		); err != nil {
			return err
		}
	}

	// Delete miniblock candidates up to the last miniblock number.
	_, err = tx.Exec(
		ctx,
		s.sqlForStream(
			"DELETE FROM {{miniblock_candidates}} WHERE stream_id = $1 and seq_num < $2",
			streamId,
		),
		streamId,
		newMinipoolGeneration,
	)
	return err
}

func (s *PostgresStreamStore) GetStreamsNumber(ctx context.Context) (int, error) {
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

func (s *PostgresStreamStore) getStreamsNumberTx(ctx context.Context, tx pgx.Tx) (int, error) {
	var count int
	row := tx.QueryRow(ctx, "SELECT COUNT(stream_id) FROM es")
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	logging.FromCtx(ctx).Debugw("GetStreamsNumberTx", "count", count)
	return count, nil
}

// Close removes instance record from singlenodekey table, releases the listener connection, and
// closes the postgres connection pool
func (s *PostgresStreamStore) Close(ctx context.Context) {
	if err := s.CleanupStreamStorage(ctx); err != nil {
		log := logging.FromCtx(ctx)
		log.Errorw("Error when deleting singlenodekey entry", "error", err)
	}

	// Cancel the go process that maintains the connection holding the session-wide schema lock
	// and release it back to the pool.
	s.cleanupLockFunc()
	// Cancel the notify listening func to release the listener connection before closing the pool.
	s.cleanupListenFunc()
	s.esm.close()
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
	if err := s.txRunner(
		ctx,
		"GetStreams",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			streams, err = s.getStreamsTx(ctx, tx)
			return err
		},
		nil,
	); err != nil {
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

	var streamName string
	if _, err := pgx.ForEachRow(rows, []any{&streamName}, func() error {
		streams = append(streams, streamName)
		return nil
	}); err != nil {
		return nil, err
	}

	ret := make([]StreamId, len(streams))
	for i, stream := range streams {
		if ret[i], err = StreamIdFromString(stream); err != nil {
			return nil, err
		}
	}
	return ret, nil
}

func (s *PostgresStreamStore) DeleteStream(ctx context.Context, streamId StreamId) error {
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

func (s *PostgresStreamStore) deleteStreamTx(ctx context.Context, tx pgx.Tx, streamId StreamId) error {
	if _, err := s.lockStream(ctx, tx, streamId, true); err != nil {
		return err
	}

	_, err := tx.Exec(
		ctx,
		s.sqlForStream(
			`DELETE from {{miniblocks}} WHERE stream_id = $1;
				DELETE from {{minipools}} WHERE stream_id = $1;
				DELETE from {{miniblock_candidates}} where stream_id = $1;
				DELETE FROM es WHERE stream_id = $1`,
			streamId,
		),
		streamId,
	)
	return err
}

func DbSchemaNameFromAddress(address string) string {
	return "s" + strings.ToLower(address)
}

func DbSchemaNameForArchive(archiveId string) string {
	return "arch" + strings.ToLower(archiveId)
}

func (s *PostgresStreamStore) listOtherInstancesTx(ctx context.Context, tx pgx.Tx) error {
	log := logging.FromCtx(ctx)

	rows, err := tx.Query(ctx, "SELECT uuid, storage_connection_time, info FROM singlenodekey")
	if err != nil {
		return err
	}

	found := false
	var storedUUID string
	var storedTimestamp time.Time
	var storedInfo string
	if _, err := pgx.ForEachRow(rows, []any{&storedUUID, &storedTimestamp, &storedInfo}, func() error {
		log.Infow(
			"Found UUID during startup",
			"uuid",
			storedUUID,
			"timestamp",
			storedTimestamp,
			"storedInfo",
			storedInfo,
		)
		found = true
		return nil
	}); err != nil {
		return err
	}

	if found {
		delay := s.config.StartupDelay
		if delay == 0 {
			delay = 2 * time.Second
		} else if delay <= time.Millisecond {
			delay = 0
		}
		if delay > 0 {
			log.Infow("singlenodekey is not empty; Delaying startup to let other instance exit", "delay", delay)
			if err = SleepWithContext(ctx, delay); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *PostgresStreamStore) initializeSingleNodeKeyTx(ctx context.Context, tx pgx.Tx) error {
	if _, err := tx.Exec(ctx, "DELETE FROM singlenodekey"); err != nil {
		return err
	}

	_, err := tx.Exec(
		ctx,
		"INSERT INTO singlenodekey (uuid, storage_connection_time, info) VALUES ($1, $2, $3)",
		s.nodeUUID,
		time.Now(),
		getCurrentNodeProcessInfo(s.schemaName),
	)
	return err
}

// acquireListeningConnection returns a connection that listens for changes to the schema, or
// a nil connection if the context is cancelled. In the event of failure to acquire a connection
// or listen, it will retry indefinitely until success.
func (s *PostgresStreamStore) acquireListeningConnection(ctx context.Context) *pgxpool.Conn {
	var err error
	var conn *pgxpool.Conn
	log := logging.FromCtx(ctx)
	for {
		if conn, err = s.pool.Acquire(ctx); err == nil {
			if _, err = conn.Exec(ctx, "listen singlenodekey"); err == nil {
				log.Debugw("Listening connection acquired")
				return conn
			} else {
				conn.Release()
			}
		}
		// Expect cancellations if node is shut down
		if errors.Is(err, context.Canceled) {
			return nil
		}
		log.Debugw("Failed to acquire listening connection, retrying", "error", err)

		// In the event of networking issues, wait a small period of time for recovery.
		// (SleepWithContext should only return an error in the event of an expired or
		// cancelled context, hence returning nil here.)
		if err = SleepWithContext(ctx, 100*time.Millisecond); err != nil {
			return nil
		}
	}
}

// acquireConnection acquires a connection from the pgx pool. In the event of a failure to obtain
// a connection, the method retries multiple times to compensate for intermittent networking errors.
// If a connection cannot be obtained after multiple retries, it returns the error. Callers should
// make sure to release the connection when it is no longer being used.
func (s *PostgresStreamStore) acquireConnection(ctx context.Context) (*pgxpool.Conn, error) {
	var err error
	var conn *pgxpool.Conn

	log := logging.FromCtx(ctx)

	// 20 retries * 1s delay = 20s of connection attempts
	retries := 20
	for i := 0; i < retries; i++ {
		if conn, err = s.pool.Acquire(ctx); err == nil {
			return conn, nil
		}

		// Expect cancellations if node is shut down, abort retries and return wrapped error
		if errors.Is(err, context.Canceled) {
			break
		}

		log.Infow(
			"Failed to acquire pgx connection, retrying",
			"error",
			err,
			"nthRetry",
			i+1,
		)

		// In the event of networking issues, wait a small period of time for recovery.
		if err = SleepWithContext(ctx, 500*time.Millisecond); err != nil {
			break
		}
	}

	log.Errorw("Failed to acquire pgx connection", "error", err)

	// Assume final error is representative and return it.
	return nil, AsRiverError(
		err,
		Err_DB_OPERATION_FAILURE,
	).Message("Could not acquire postgres connection").
		Func("acquireConnection")
}

// listenForNewNodes maintains an open connection with postgres that listens for
// changes to the singlenodekey table in order to detect startup of competing nodes.
// Call it with a cancellable context and the method will return when the context is
// cancelled. Call it after storage has been initialized in order to not receive a
// notification when this node updates the table with it's own entry.
func (s *PostgresStreamStore) listenForNewNodes(ctx context.Context) {
	conn := s.acquireListeningConnection(ctx)
	if conn == nil {
		return
	}
	defer conn.Release()

	for {
		notification, err := conn.Conn().WaitForNotification(ctx)

		// Cancellation indicates a valid exit.
		if errors.Is(err, context.Canceled) {
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
				Tag("nodeUUID", s.nodeUUID).
				LogWarn(logging.FromCtx(ctx))

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
	if err := s.txRunner(
		ctx,
		"DebugReadStreamData",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.debugReadStreamDataTx(ctx, tx, streamId)
			return err
		},
		nil,
		"streamId", streamId,
	); err != nil {
		return nil, err
	}
	return ret, nil
}

func (s *PostgresStreamStore) debugReadStreamDataTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (*DebugReadStreamDataResult, error) {
	lastSnapshotMiniblock, err := s.lockStream(ctx, tx, streamId, false)
	if err != nil {
		return nil, err
	}

	result := &DebugReadStreamDataResult{
		StreamId:                   streamId,
		LatestSnapshotMiniblockNum: lastSnapshotMiniblock,
	}

	miniblocksRow, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT seq_num, blockdata FROM {{miniblocks}} WHERE stream_id = $1 ORDER BY seq_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}

	var mb MiniblockDescriptor
	if _, err := pgx.ForEachRow(miniblocksRow, []any{&mb.MiniblockNumber, &mb.Data}, func() error {
		result.Miniblocks = append(result.Miniblocks, mb)
		return nil
	}); err != nil {
		return nil, err
	}

	rows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT generation, slot_num, envelope FROM {{minipools}} WHERE stream_id = $1 ORDER BY generation, slot_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}

	var e EventDescriptor
	if _, err := pgx.ForEachRow(rows, []any{&e.Generation, &e.Slot, &e.Data}, func() error {
		result.Events = append(result.Events, e)
		return nil
	}); err != nil {
		return nil, err
	}

	candRows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT seq_num, block_hash, blockdata FROM {{miniblock_candidates}} WHERE stream_id = $1 ORDER BY seq_num",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, err
	}

	var num int64
	var hashStr string
	var data []byte
	if _, err := pgx.ForEachRow(candRows, []any{&num, &hashStr, &data}, func() error {
		result.MbCandidates = append(result.MbCandidates, MiniblockDescriptor{
			MiniblockNumber: num,
			Data:            data,
			Hash:            common.HexToHash(hashStr),
		})
		return nil
	}); err != nil {
		return nil, err
	}

	return result, nil
}

func (s *PostgresStreamStore) DebugReadStreamStatistics(
	ctx context.Context,
	streamId StreamId,
) (*DebugReadStreamStatisticsResult, error) {
	var ret *DebugReadStreamStatisticsResult
	if err := s.txRunner(
		ctx,
		"DebugReadStreamStatistics",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.debugReadStreamStatisticsTx(ctx, tx, streamId)
			return err
		},
		nil,
		"streamId", streamId,
	); err != nil {
		return nil, err
	}
	return ret, nil
}

func (s *PostgresStreamStore) debugReadStreamStatisticsTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
) (*DebugReadStreamStatisticsResult, error) {
	lastSnapshotMiniblock, err := s.lockStream(ctx, tx, streamId, false)
	if err != nil {
		return nil, err
	}

	result := &DebugReadStreamStatisticsResult{
		StreamId:                   streamId.String(),
		LatestSnapshotMiniblockNum: lastSnapshotMiniblock,
	}

	if err = tx.QueryRow(
		ctx,
		s.sqlForStream(
			"SELECT MAX(seq_num) from {{miniblocks}} WHERE stream_id = $1",
			streamId,
		),
		streamId,
	).Scan(&result.LatestMiniblockNum); err != nil {
		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).Tag("query", "latest_block")
	}

	if err = tx.QueryRow(
		ctx,
		s.sqlForStream(
			"SELECT count(*) FROM {{minipools}} WHERE stream_id = $1 AND slot_num <> -1",
			streamId,
		),
		streamId,
	).Scan(&result.NumMinipoolEvents); err != nil {
		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).Tag("query", "minipool_size")
	}

	candRows, err := tx.Query(
		ctx,
		s.sqlForStream(
			"SELECT seq_num, block_hash FROM {{miniblock_candidates}} WHERE stream_id = $1 ORDER BY seq_num, block_hash",
			streamId,
		),
		streamId,
	)
	if err != nil {
		return nil, AsRiverError(err, Err_DB_OPERATION_FAILURE).Tag("query", "candidates")
	}

	var candidate MiniblockCandidateStatisticsResult
	if _, err := pgx.ForEachRow(candRows, []any{&candidate.BlockNum, &candidate.Hash}, func() error {
		result.CurrentMiniblockCandidates = append(result.CurrentMiniblockCandidates, candidate)
		return nil
	}); err != nil {
		return nil, err
	}

	return result, nil
}

func (s *PostgresStreamStore) GetLastMiniblockNumber(
	ctx context.Context,
	streamID StreamId,
) (int64, error) {
	var ret int64
	err := s.txRunner(
		ctx,
		"GetLastMiniblockNumber",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			ret, err = s.getLastMiniblockNumberTx(ctx, tx, streamID)
			return err
		},
		nil,
		"streamId", streamID,
	)
	if err != nil {
		return 0, err
	}
	return ret, nil
}

func (s *PostgresStreamStore) getLastMiniblockNumberTx(
	ctx context.Context,
	tx pgx.Tx,
	streamID StreamId,
) (int64, error) {
	if _, err := s.lockStream(ctx, tx, streamID, false); err != nil {
		return 0, err
	}

	var maxSeqNum int64
	if err := tx.QueryRow(
		ctx,
		s.sqlForStream(
			"SELECT MAX(seq_num) FROM {{miniblocks}} WHERE stream_id = $1",
			streamID,
		),
		streamID,
	).Scan(&maxSeqNum); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, RiverError(Err_INTERNAL, "Stream exists in es table, but no miniblocks in DB")
		}
		return 0, err
	}

	return maxSeqNum, nil
}

func getCurrentNodeProcessInfo(currentSchemaName string) string {
	currentHostname, err := os.Hostname()
	if err != nil {
		currentHostname = "unknown"
	}
	currentPID := os.Getpid()
	return fmt.Sprintf("hostname=%s, pid=%d, schema=%s", currentHostname, currentPID, currentSchemaName)
}
