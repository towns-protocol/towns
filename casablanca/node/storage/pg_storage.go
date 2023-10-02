package storage

import (
	. "casablanca/node/base"
	. "casablanca/node/protocol"

	"casablanca/node/dlog"
	"casablanca/node/infra"
	"context"
	_ "embed"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/gologme/log"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/sha3"
)

type PostgresEventStore struct {
	pool       *pgxpool.Pool
	schemaName string
}

const (
	PG_REPORT_INTERVAL = 3 * time.Minute
)

func (s *PostgresEventStore) CreateStream(ctx context.Context, streamId string, genesisMiniblock []byte) error {
	err := s.createStream(ctx, streamId, genesisMiniblock)
	if err != nil {
		return AsRiverError(err).Func("pg.CreateStream").Tag("streamId", streamId)
	}
	return nil
}

func (s *PostgresEventStore) createStream(ctx context.Context, streamId string, genesisMiniblock []byte) error {
	defer infra.StoreExecutionTimeMetrics("CreateStreamMs", time.Now())

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error starting transaction")
	}

	defer rollbackTx(ctx, tx, "createStream")

	//create record in es table
	err = createEventStreamInstance(ctx, tx, streamId)
	if err != nil {
		return WrapRiverError(Err_MINIBLOCKS_STORAGE_FAILURE, err).Message("error creating stream instance")
	}

	//create related miniblocks table and put there genesis block
	tableSuffix := createTableSuffix(streamId)

	//Create partition in miniblocks table for new stream
	_, err = tx.Exec(ctx, fmt.Sprintf(`CREATE TABLE miniblocks_%s PARTITION OF miniblocks FOR VALUES IN ($1)`, tableSuffix), streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error creating miniblock table")
	}

	//Insert genesis miniblock
	_, err = tx.Exec(ctx, `INSERT INTO miniblocks (stream_id, seq_num, blockdata) VALUES ($1, $2, $3)`, streamId, 0, genesisMiniblock)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error inserting genesis miniblock")
	}

	//create related minipool table and insert there -1 record
	_, err = tx.Exec(ctx, fmt.Sprintf(`CREATE TABLE minipools_%s PARTITION OF minipools FOR VALUES IN ($1)`, tableSuffix), streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error creating minipool table")
	}

	_, err = tx.Exec(ctx, `INSERT INTO minipools (stream_id, generation, slot_num, envelope) VALUES ($1, $2, $3, $4)`, streamId, 1, -1, nil)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error inserting minipool record")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error committing transaction")
	}

	return nil
}

func (s *PostgresEventStore) GetStreamFromLastSnapshot(ctx context.Context, streamId string) (*GetStreamFromLastSnapshotResult, error) {
	streamFromLastSnaphot, err := s.getStreamFromLastSnapshot(ctx, streamId)
	if err != nil {
		return nil, AsRiverError(err).Func("pg.GetStreamFromLastSnapshot").Tag("streamId", streamId)
	}
	return streamFromLastSnaphot, nil
}

func (s *PostgresEventStore) getStreamFromLastSnapshot(ctx context.Context, streamId string) (*GetStreamFromLastSnapshotResult, error) {
	infra.StoreExecutionTimeMetrics("GetStreamFromLastSnapshotMs", time.Now())

	tx, err := startTx(ctx, s.pool)

	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error starting transaction")
	}

	defer rollbackTx(ctx, tx, "getStreamFromLastSnapshot")

	var result GetStreamFromLastSnapshotResult

	//first let's check what is the last block with snapshot
	var latest_snapshot_miniblock_index int

	row := tx.QueryRow(ctx, "SELECT latest_snapshot_miniblock FROM es WHERE stream_id = $1", streamId)

	err = row.Scan(&latest_snapshot_miniblock_index)

	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error retrieving latest snapshot miniblock index")
	}

	result.StartMiniblockNumber = latest_snapshot_miniblock_index

	//Retrieve miniblocks starting from the latest miniblock with snapshot
	var miniblocks [][]byte

	miniblocks, err = s.GetMiniblocksWithExternalTx(ctx, tx, s.pool, streamId, -1, -1)

	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error retrieving miniblocks")
	}

	result.Miniblocks = miniblocks

	//Retrieve events from minipool
	rows, err := tx.Query(ctx, "SELECT envelope FROM minipools WHERE slot_num > -1 AND stream_id = $1", streamId)
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error retrieving minipool events")
	}

	var envelopes [][]byte

	for rows.Next() {
		var envelope []byte
		err = rows.Scan(&envelope)
		if err != nil {
			return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error scanning minipool events")
		}
		envelopes = append(envelopes, envelope)
	}

	//TODO: Check if it is correct way of using rows.Close()?
	rows.Close()

	result.MinipoolEnvelopes = envelopes

	//End of new version
	err = tx.Commit(ctx)
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error committing transaction")

	}

	return &result, nil
}

// Adds event to the given minipool.
// Current generation of minipool should match minipoolGeneration,
// and there should be exactly minipoolSlot events in the minipool.
func (s *PostgresEventStore) AddEvent(ctx context.Context, streamId string, minipoolGeneration int, minipoolSlot int, envelope []byte) error {
	err := s.addEvent(ctx, streamId, minipoolGeneration, minipoolSlot, envelope)
	if err != nil {
		return AsRiverError(err).Func("pg.AddEvent").Tag("streamId", streamId).Tag("minipoolGeneration", minipoolGeneration).Tag("minipoolSlot", minipoolSlot)
	}
	return nil
}

func (s *PostgresEventStore) addEvent(ctx context.Context, streamId string, minipoolGeneration int, minipoolSlot int, envelope []byte) error {
	defer infra.StoreExecutionTimeMetrics("AddEventMs", time.Now())

	// Start transaction for making checks of minipool generation and slot
	// If everything is ok we will add event to minipool and commit transaction
	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error starting transaction")
	}

	defer rollbackTx(ctx, tx, "addEvent")

	//query to check number of events in minipool
	row := tx.QueryRow(ctx, "SELECT COUNT(envelope) as events_count FROM minipools WHERE stream_id = $1", streamId)
	var events_count int
	err = row.Scan(&events_count)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error checking number of events in minipool")
	}

	if events_count != minipoolSlot {
		return WrapRiverError(Err_MINIBLOCKS_STORAGE_FAILURE, err).Message("Missmatch of events number in the minipool")
	}

	//If minipool is not empty we need to check if all events in minipool have proper generation
	if events_count > 0 {
		row = tx.QueryRow(ctx, "SELECT COUNT(envelope) as events_count FROM minipools WHERE generation = $1 AND stream_id = $2", minipoolGeneration, streamId)
		err = row.Scan(&events_count)
		if err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error of query to checking events generation in minipool")
		}

		if events_count != minipoolSlot {
			return WrapRiverError(Err_MINIBLOCKS_STORAGE_FAILURE, err).Message("Missmatch of minipool generation")
		}
	}

	//All checks passed - we need to insert event into minipool
	_, err = tx.Exec(ctx, "INSERT INTO minipools (stream_id, envelope, generation, slot_num) VALUES ($1, $2, $3, $4)", streamId, envelope, minipoolGeneration, minipoolSlot)

	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error inserting event into minipool")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error committing transaction")
	}

	return nil
}

func (s *PostgresEventStore) GetMiniblocks(ctx context.Context, streamId string, fromIndex int, toIndex int) ([][]byte, error) {
	//TODO: questionable if transaction is required here at all, though as we use here GetMiniblocksWithExternalTx to avoid code duplication
	//We have to use transaction for now. May be we need to refactor it.
	tx, err := startTx(ctx, s.pool)

	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error starting transaction")
	}

	defer rollbackTx(ctx, tx, "GetMiniblocks")

	miniblocks, err := s.GetMiniblocksWithExternalTx(ctx, tx, s.pool, streamId, fromIndex, toIndex)

	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetMiniblocks").Message("error retrieving miniblocks")
	}

	err = tx.Commit(ctx)

	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetMiniblocks").Message("error committing transaction")
	}

	return miniblocks, nil
}

func (s *PostgresEventStore) GetMiniblocksWithExternalTx(ctx context.Context, externalTx pgx.Tx, pool *pgxpool.Pool, streamId string, fromIndex int, toIndex int) ([][]byte, error) {
	miniblocks, err := s.getMiniblocksWithExternalTx(ctx, externalTx, pool, streamId, fromIndex, toIndex)

	if err != nil {
		return nil, AsRiverError(err).Func("pg.GetMiniblocks").Tag("streamId", streamId).Tag("streamId", streamId).Tag("fromIndex", fromIndex).Tag("toIndex", toIndex)
	}

	return miniblocks, nil
}

func (s *PostgresEventStore) getMiniblocksWithExternalTx(ctx context.Context, externalTx pgx.Tx, pool *pgxpool.Pool, streamId string, fromIndex int, toIndex int) ([][]byte, error) {
	defer infra.StoreExecutionTimeMetrics("GetMiniblocksMs", time.Now())

	//TODO: do we want to validate here if blocks which are subject to read exist?
	var err error

	exists, err := streamExists(ctx, externalTx, streamId)
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error checking stream existence")
	}

	if !exists {
		return nil, RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "stream does not exist")
	}

	var rows pgx.Rows
	if toIndex != -1 {
		if fromIndex != -1 {
			rows, err = externalTx.Query(ctx, "SELECT blockdata FROM miniblocks WHERE seq_num >= $1 AND seq_num < $2 AND stream_id = $3 ORDER BY seq_num", fromIndex, toIndex, streamId)
		} else {
			rows, err = externalTx.Query(ctx, "SELECT blockdata FROM miniblocks WHERE seq_num >= (SELECT latest_snapshot_miniblock FROM es WHERE stream_id = $1) AND seq_num < $2 AND stream_id = $3 ORDER BY seq_num", streamId, toIndex, streamId)
		}
	} else {
		if fromIndex != -1 {
			rows, err = externalTx.Query(ctx, "SELECT blockdata FROM miniblocks WHERE seq_num >= $1 AND stream_id = $2 ORDER BY seq_num", fromIndex, streamId)
		} else {
			rows, err = externalTx.Query(ctx, "SELECT blockdata FROM miniblocks WHERE seq_num >= (SELECT latest_snapshot_miniblock FROM es WHERE stream_id = $1) AND stream_id = $2 ORDER BY seq_num", streamId, streamId)
		}
	}

	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error reading blocks")
	}

	defer rows.Close()

	var blocks [][]byte

	for rows.Next() {
		var blockdata []byte
		err = rows.Scan(&blockdata)
		if err != nil {
			return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error scanning blocks")
		}
		blocks = append(blocks, blockdata)
	}

	return blocks, nil
}

func (s *PostgresEventStore) CreateBlock(
	ctx context.Context,
	streamId string,
	minipoolGeneration int,
	minipoolSize int,
	miniblock []byte,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	err := s.createBlock(ctx, streamId, minipoolGeneration, minipoolSize, miniblock, snapshotMiniblock, envelopes)

	if err != nil {
		return AsRiverError(err).Func("pg.CreateBlock").Tag("streamId", streamId).Tag("minipoolGeneration", minipoolGeneration).Tag("minipoolSize", minipoolSize).Tag("snapshotMiniblock", snapshotMiniblock)
	}

	return nil
}

func (s *PostgresEventStore) createBlock(
	ctx context.Context,
	streamId string,
	minipoolGeneration int,
	minipoolSize int,
	miniblock []byte,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	defer infra.StoreExecutionTimeMetrics("CreateBlockMs", time.Now())

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error starting transaction")
	}

	defer rollbackTx(ctx, tx, "createBlock")

	//check if stream has minipoolGeneration miniblocks. We return -100 if there are no streams with such id - it is a hack to address missing streams
	row := tx.QueryRow(ctx, "SELECT COALESCE(MAX(seq_num), -100) as latest_blocks_number FROM miniblocks WHERE stream_id = $1", streamId)

	var latest_blocks_number int
	err = row.Scan(&latest_blocks_number)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Block creation selecting max seq_num error")
	}

	if latest_blocks_number == -100 {
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Stream does not exist")
	}

	if minipoolGeneration != latest_blocks_number+1 {
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Minipool generation missmatch")
	}

	//clean up minipool
	_, err = tx.Exec(ctx, "DELETE FROM minipools WHERE slot_num > -1 AND stream_id = $1", streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Minipool clean error")
	}

	//update -1 record of minipool_<<name>> table to minipoolGeneration + 1
	_, err = tx.Exec(ctx, "UPDATE minipools SET generation = $1 WHERE slot_num = -1 AND stream_id = $2", minipoolGeneration+1, streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Minipool generation update error")
	}

	//update stream_snapshots_index if needed
	if snapshotMiniblock {
		_, err := tx.Exec(ctx, `UPDATE es SET latest_snapshot_miniblock = $1 WHERE stream_id = $2`, minipoolGeneration, streamId)
		if err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Snapshot index update error")
		}
	}

	//insert all minipool events into minipool
	for i, envelope := range envelopes {
		_, err = tx.Exec(ctx, "INSERT INTO minipools (stream_id, slot_num, generation, envelope) VALUES ($1, $2, $3, $4)", streamId, i, minipoolGeneration+1, envelope)
		if err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Envelope insertion error")
		}
	}

	//insert new miniblock into miniblock_<<name>> table
	_, err = tx.Exec(ctx, "INSERT INTO miniblocks (stream_id, seq_num, blockdata) VALUES ($1, $2, $3)", streamId, minipoolGeneration, miniblock)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Miniblock insertion error")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error committing transaction")
	}

	return nil
}

func (s *PostgresEventStore) GetStreamsNumber(ctx context.Context) (int, error) {
	defer infra.StoreExecutionTimeMetrics("GetStreamNumbers", time.Now())

	var count int
	row := s.pool.QueryRow(ctx, "SELECT COUNT(stream_id) FROM es")
	if err := row.Scan(&count); err != nil {
		return 0, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetStreamsNumber").Message("Getting streams number error")
	}

	return count, nil
}

// Non-API helpers
//
// Checks if stream exists in the database
// Should always be used in scope of open transaction tx
func streamExists(ctx context.Context, tx pgx.Tx, streamId string) (bool, error) {
	defer infra.StoreExecutionTimeMetrics("streamExistsMs", time.Now())

	rows, err := tx.Query(ctx, "SELECT stream_id FROM es WHERE stream_id = $1 LIMIT 1", streamId)
	if err != nil {
		return false, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("streamExists").Message("Stream existance check error").Tag("streamId", streamId)
	}
	defer rows.Close()

	return rows.Next(), nil
}

// Creates record in es table for the stream
// Should always be used in scope of open transaction tx
func createEventStreamInstance(ctx context.Context, tx pgx.Tx, streamId string) error {
	defer infra.StoreExecutionTimeMetrics("createEventStreamInstance", time.Now())

	_, err := tx.Exec(ctx, `INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, 0)`, streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("createEventStreamInstance").Message("Create event stream instance error").Tag("streamId", streamId)
	}

	return nil
}

// GetStreams returns a list of all event streams
func (s *PostgresEventStore) GetStreams(ctx context.Context) ([]string, error) {
	defer infra.StoreExecutionTimeMetrics("GetStreamsMs", time.Now())

	streams := []string{}
	rows, err := s.pool.Query(ctx, "SELECT stream_id FROM es")
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetStreams").Message("Getting streams error")
	}
	defer rows.Close()
	for rows.Next() {
		var streamName string
		err = rows.Scan(&streamName)
		if err != nil {
			return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetStreams").Message("Getting streams error (scan phase)")
		}
		streams = append(streams, streamName)
	}
	return streams, nil
}

/*
* Delete stream with specified streamId
*
* Delete minipool and miniblock tables associated with the stream and stream record from streams table
 */
func (s *PostgresEventStore) DeleteStream(ctx context.Context, streamId string) error {
	err := s.deleteStream(ctx, streamId)

	if err != nil {
		return AsRiverError(err).Func("pg.DeleteStream").Tag("streamId", streamId)
	}

	return nil
}

func (s *PostgresEventStore) deleteStream(ctx context.Context, streamId string) error {
	defer infra.StoreExecutionTimeMetrics("DeleteStreamMs", time.Now())

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error starting transaction")
	}

	defer rollbackTx(ctx, tx, "deleteStream")

	_, err = tx.Exec(ctx, "DELETE FROM miniblocks WHERE stream_id = $1", streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Delete miniblocks error")
	}

	//create related miniblocks table and put there genesis block
	tableSuffix := createTableSuffix(streamId)

	//Delete partition in miniblocks table for new strea
	_, err = tx.Exec(ctx, fmt.Sprintf(`DROP TABLE miniblocks_%s`, tableSuffix))

	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Delete miniblocks partition")
	}

	_, err = tx.Exec(ctx, "DELETE FROM minipools WHERE stream_id = $1", streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Delete minipools error")
	}

	//Delete partition in minipools table for new strea
	_, err = tx.Exec(ctx, fmt.Sprintf(`DROP TABLE minipools_%s`, tableSuffix))

	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Delete miniblocks partition")
	}

	_, err = tx.Exec(ctx, "DELETE FROM es WHERE stream_id = $1", streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Delete stream error")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error committing transaction")
	}

	return nil
}

/*
* Storage infrastructure functions
 */

func startTx(ctx context.Context, pool *pgxpool.Pool) (pgx.Tx, error) {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("startTx").Message("error starting transaction")
	}
	return tx, nil
}

func DbSchemaNameFromAddress(address string) string {
	return "s" + strings.ToLower(address)
}

func NewPostgresEventStore(ctx context.Context, database_url string, databaseSchemaName string, clean bool) (*PostgresEventStore, error) {
	store, err := newPostgresEventStore(ctx, database_url, databaseSchemaName, clean)

	if err != nil {
		return nil, AsRiverError(err).Func("NewPostgresEventStore")
	}

	return store, nil
}

func newPostgresEventStore(ctx context.Context, database_url string, databaseSchemaName string, clean bool) (*PostgresEventStore, error) {
	defer infra.StoreExecutionTimeMetrics("NewPostgresEventStoreMs", time.Now())

	log := dlog.CtxLog(ctx)

	pool_conf, err := pgxpool.ParseConfig(database_url)
	if err != nil {
		return nil, WrapRiverError(Err_MINIBLOCKS_STORAGE_FAILURE, err).Message("Error parsing config")
	}

	//In general, it should be possible to add database schema name into database url as a parameter search_path (&search_path=database_schema_name)
	//For some reason it doesn't work so have to put it into config explicitly
	pool_conf.ConnConfig.RuntimeParams["search_path"] = databaseSchemaName

	pool_conf.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, pool_conf)
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("New with config error")
	}

	if clean {
		err = cleanStorage(ctx, pool)
		if err != nil {
			return nil, WrapRiverError(Err_MINIBLOCKS_STORAGE_FAILURE, err).Message("CleanStorage error")
		}
	}

	err = InitStorage(ctx, pool, databaseSchemaName)
	if err != nil {
		return nil, WrapRiverError(Err_MINIBLOCKS_STORAGE_FAILURE, err).Message("InitStorage error")
	}

	// stats thread
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-time.After(PG_REPORT_INTERVAL):
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

	store := &PostgresEventStore{pool: pool, schemaName: databaseSchemaName}

	return store, nil
}

// Close closes the connection to the database
func (s *PostgresEventStore) Close() error {
	s.pool.Close()
	return nil
}

func cleanStorage(ctx context.Context, pool *pgxpool.Pool) error {
	defer infra.StoreExecutionTimeMetrics("cleanStorageMs", time.Now())

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}

	defer rollbackTx(ctx, tx, "cleanStorage")

	//TODO: fix approach to the query - not critical as it is pure internal, though to bring the right order it is helpful
	_, err = tx.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", pool.Config().ConnConfig.Config.RuntimeParams["search_path"]))
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("cleanStorage").Message("Schema deletion transaction error")
	}

	//TODO: fix approach to the query - not critical as it is pure internal, though to bring the right order it is helpful
	_, err = tx.Exec(ctx, fmt.Sprintf("CREATE SCHEMA %s", pool.Config().ConnConfig.Config.RuntimeParams["search_path"]))
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("cleanStorage").Message("Schema creation transaction error")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("cleanStorage").Message("error committing transaction")
	}

	return nil
}

//go:embed init_db.sql
var schema string

func InitStorage(ctx context.Context, pool *pgxpool.Pool, databaseSchemaName string) error {
	err := initStorage(ctx, pool, databaseSchemaName)

	if err != nil {
		return AsRiverError(err).Func("InitStorage").Tag("schema", schema).Tag("schemaName", databaseSchemaName)
	}

	return nil
}

func initStorage(ctx context.Context, pool *pgxpool.Pool, databaseSchemaName string) error {
	defer infra.StoreExecutionTimeMetrics("initStorageMs", time.Now())

	log := dlog.CtxLog(ctx)

	tx, err := pool.Begin(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("InitStorage startTx error")
	}

	defer rollbackTx(ctx, tx, "initStorage")

	//check if schema exists
	var schemaExists bool
	err = tx.QueryRow(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)",
		databaseSchemaName).Scan(&schemaExists)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error checking schema existence")
	}

	if !schemaExists {
		createSchemaQuery := fmt.Sprintf("CREATE SCHEMA \"%s\"", databaseSchemaName)
		_, err := tx.Exec(ctx, createSchemaQuery)
		if err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error creating schema")
		}
		log.Info("Schema created", "schema", databaseSchemaName)
	} else {
		log.Info("Schema already exists", "schema", databaseSchemaName)
	}

	_, err = tx.Exec(ctx, schema)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("InitStorage exec error")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error committing transaction")
	}

	return nil
}

func rollbackTx(ctx context.Context, tx pgx.Tx, funcName string) {
	err := tx.Rollback(context.Background())
	if err != nil {
		if errors.Is(err, pgx.ErrTxClosed) {
			return
		}
		log.Warn(funcName+": error starting transaction", "error", err)
	}
}

func createTableSuffix(streamId string) string {
	sum := sha3.Sum224([]byte(streamId))
	return hex.EncodeToString(sum[:])
}
