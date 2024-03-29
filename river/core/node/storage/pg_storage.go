package storage

import (
	"context"
	"embed"
	"encoding/hex"
	"fmt"
	"os"
	"strings"
	"time"

	. "github.com/river-build/river/core/node/base"
	. "github.com/river-build/river/core/node/protocol"
	. "github.com/river-build/river/core/node/shared"

	"github.com/river-build/river/core/node/dlog"
	"github.com/river-build/river/core/node/infra"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/sha3"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

type PostgresEventStore struct {
	pool       *pgxpool.Pool
	schemaName string
	nodeUUID   string
	exitSignal chan error
	dbUrl      string
}

var _ StreamStorage = (*PostgresEventStore)(nil)

const (
	PG_REPORT_INTERVAL = 3 * time.Minute
)

var dbCalls = infra.NewSuccessMetrics(infra.DB_CALLS_CATEGORY, nil)

type txRunnerOpts struct {
	disableCompareUUID bool
}

func rollbackTx(ctx context.Context, tx pgx.Tx) {
	_ = tx.Rollback(ctx)
}

func (s *PostgresEventStore) txRunnerInner(
	ctx context.Context,
	accessMode pgx.TxAccessMode,
	txFn func(context.Context, pgx.Tx) error,
	opts *txRunnerOpts,
) error {
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
) error {
	log := dlog.FromCtx(ctx)

	if accessMode == pgx.ReadWrite {
		// For write transactions context should not be cancelled if a client connection drops. Cancellations due to lost client connections can cause
		// operations on the PostgresEventStore to fail even if transactions commit, leading to a corruption in cached state.
		ctx = context.WithoutCancel(ctx)
	}

	for {
		err := s.txRunnerInner(ctx, accessMode, txFn, opts)
		if err != nil {
			if pgErr, ok := err.(*pgconn.PgError); ok {
				if pgErr.Code == pgerrcode.SerializationFailure {
					log.Warn(
						"pg.txRunner: retrying transaction due to serialization failure",
						"name",
						name,
						"pgErr",
						pgErr,
					)
					continue
				}
				log.Warn("pg.txRunner: transaction failed", "name", name, "pgErr", pgErr)
			} else {
				log.Warn("pg.txRunner: transaction failed", "name", name, "err", err)
			}
			return WrapRiverError(
				Err_DB_OPERATION_FAILURE,
				err,
			).Func("pg.txRunner").
				Message("transaction failed").
				Tag("name", name)
		}
		return nil
	}
}

func (s *PostgresEventStore) txRunnerWithMetrics(
	ctx context.Context,
	name string,
	accessMode pgx.TxAccessMode,
	txFn func(context.Context, pgx.Tx) error,
	opts *txRunnerOpts,
	tags ...any,
) error {
	log := dlog.FromCtx(ctx)
	logTags := append(tags, "name", name, "currentUUID", s.nodeUUID, "dbSchema", s.schemaName)
	log.Debug("pg.txRunnerWithMetrics: START", logTags...)

	defer infra.StoreExecutionTimeMetrics(name, infra.DB_CALLS_CATEGORY, time.Now())

	err := s.txRunner(
		ctx,
		name,
		accessMode,
		txFn,
		opts,
	)
	if err != nil {
		dbCalls.FailIncForChild(name)
		return AsRiverError(err, Err_DB_OPERATION_FAILURE).Message("pg.txRunnerWithMetrics: FAILED").Func(name).
			Tags(tags...).Tag("currentUUID", s.nodeUUID).Tag("dbSchema", s.schemaName).LogDebug(log)
	}
	dbCalls.PassIncForChild(name)
	log.Debug("pg.txRunnerWithMetrics: SUCCESS", logTags...)
	return nil
}

func (s *PostgresEventStore) CreateStreamStorage(
	ctx context.Context,
	streamId StreamId,
	genesisMiniblock []byte,
) error {
	return s.txRunnerWithMetrics(
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

func (s *PostgresEventStore) ReadStreamFromLastSnapshot(
	ctx context.Context,
	streamId StreamId,
	precedingBlockCount int,
) (*ReadStreamFromLastSnapshotResult, error) {
	var ret *ReadStreamFromLastSnapshotResult
	err := s.txRunnerWithMetrics(
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
	return s.txRunnerWithMetrics(
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
	err := s.txRunnerWithMetrics(
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

func (s *PostgresEventStore) WriteBlock(
	ctx context.Context,
	streamId StreamId,
	minipoolGeneration int64,
	minipoolSize int,
	miniblock []byte,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	return s.txRunnerWithMetrics(
		ctx,
		"WriteBlock",
		pgx.ReadWrite,
		func(ctx context.Context, tx pgx.Tx) error {
			return s.writeBlockTx(
				ctx,
				tx,
				streamId,
				minipoolGeneration,
				minipoolSize,
				miniblock,
				snapshotMiniblock,
				envelopes,
			)
		},
		nil,
		"streamId", streamId,
		"minipoolGeneration", minipoolGeneration,
		"minipoolSize", minipoolSize,
		"snapshotMiniblock", snapshotMiniblock,
	)
}

// Supported consistency checks:
// 1. Stream has minipoolGeneration-1 miniblocks
func (s *PostgresEventStore) writeBlockTx(
	ctx context.Context,
	tx pgx.Tx,
	streamId StreamId,
	minipoolGeneration int64,
	minipoolSize int,
	miniblock []byte,
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
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Minipool generation missmatch").
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

	// insert new miniblock into miniblocks table
	_, err = tx.Exec(
		ctx,
		"INSERT INTO miniblocks (stream_id, seq_num, blockdata) VALUES ($1, $2, $3)",
		streamId,
		minipoolGeneration,
		miniblock,
	)
	if err != nil {
		return err
	}
	return nil
}

func (s *PostgresEventStore) GetStreamsNumber(ctx context.Context) (int, error) {
	var count int
	err := s.txRunnerWithMetrics(
		ctx,
		"GetStreamsNumber",
		pgx.ReadOnly,
		func(ctx context.Context, tx pgx.Tx) error {
			var err error
			count, err = s.getStreamsNumberTx(ctx)
			return err
		},
		nil,
	)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (s *PostgresEventStore) getStreamsNumberTx(ctx context.Context) (int, error) {
	var count int
	row := s.pool.QueryRow(ctx, "SELECT COUNT(stream_id) FROM es")
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
	return s.txRunnerWithMetrics(
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
	err := s.txRunnerWithMetrics(
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
	return s.txRunnerWithMetrics(
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

func NewPostgresEventStore(
	ctx context.Context,
	database_url string,
	databaseSchemaName string,
	instanceId string,
	exitSignal chan error,
) (*PostgresEventStore, error) {
	store, err := newPostgresEventStore(ctx, database_url, databaseSchemaName, instanceId, exitSignal)
	if err != nil {
		return nil, AsRiverError(err).Func("NewPostgresEventStore")
	}

	return store, nil
}

func newPostgresEventStore(
	ctx context.Context,
	database_url string,
	databaseSchemaName string,
	instanceId string,
	exitSignal chan error,
) (*PostgresEventStore, error) {
	log := dlog.FromCtx(ctx)

	pool_conf, err := pgxpool.ParseConfig(database_url)
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error parsing config")
	}

	// In general, it should be possible to add database schema name into database url as a parameter search_path (&search_path=database_schema_name)
	// For some reason it doesn't work so have to put it into config explicitly
	pool_conf.ConnConfig.RuntimeParams["search_path"] = databaseSchemaName

	pool_conf.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, pool_conf)
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("New with config error")
	}

	store := &PostgresEventStore{
		pool:       pool,
		schemaName: databaseSchemaName,
		nodeUUID:   instanceId,
		exitSignal: exitSignal,
		dbUrl:      database_url,
	}

	err = store.InitStorage(ctx)
	if err != nil {
		return nil, err
	}

	// stats thread
	go func() {
		for {
			timer := time.NewTimer(PG_REPORT_INTERVAL)
			select {
			case <-ctx.Done():
				timer.Stop()
				return
			case <-timer.C:
				stats := pool.Stat()
				log.Debug("PG pool stats",
					"acquireCount", stats.AcquireCount(),
					"acquiredConns", stats.AcquiredConns(),
					"idleConns", stats.IdleConns(),
					"totalConns", stats.TotalConns(),
				)
			}
		}
	}()

	return store, nil
}

// Close removes instance record from singlenodekey table and closes the connection pool
func (s *PostgresEventStore) Close(ctx context.Context) {
	_ = s.CleanupStorage(ctx)
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

func (s *PostgresEventStore) runMigrations(ctx context.Context) error {
	// Run migrations
	iofsMigrationsDir, err := iofs.New(migrationsDir, "migrations")
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error loading migrations")
	}

	dbUrlWithSchema := strings.Split(s.dbUrl, "?")[0] + fmt.Sprintf("?sslmode=disable&search_path=%v", s.schemaName)
	migration, err := migrate.NewWithSourceInstance("iofs", iofsMigrationsDir, dbUrlWithSchema)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error creating migration instance")
	}

	if err = migration.Up(); err != nil && err != migrate.ErrNoChange {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error running migrations")
	}

	return nil
}

func (s *PostgresEventStore) initializeSingleNodeKeyTx(ctx context.Context, tx pgx.Tx) error {
	log := dlog.FromCtx(ctx)

	rows, err := tx.Query(ctx, "SELECT uuid, storage_connection_time, info FROM singlenodekey")
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var storedUUID string
		var storedTimestamp time.Time
		var storedInfo string
		err := rows.Scan(&storedUUID, &storedTimestamp, &storedInfo)
		if err != nil {
			return err
		}
		log.Info("Found UUID during startup", "uuid", storedUUID, "timestamp", storedTimestamp, "info", storedInfo)
	}

	_, err = tx.Exec(ctx, "DELETE FROM singlenodekey")
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

func (s *PostgresEventStore) initStorage(ctx context.Context) error {
	if err := s.txRunnerWithMetrics(
		ctx,
		"createSchema",
		pgx.ReadWrite,
		s.createSchemaTx,
		&txRunnerOpts{disableCompareUUID: true},
	); err != nil {
		return err
	}

	if err := s.runMigrations(ctx); err != nil {
		return err
	}

	return s.txRunnerWithMetrics(
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
