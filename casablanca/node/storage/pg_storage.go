package storage

import (
	"casablanca/node/dlog"
	"casablanca/node/infra"
	"casablanca/node/protocol"
	"context"
	_ "embed"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/gologme/log"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresEventStore struct {
	pool       *pgxpool.Pool
	debugCtl   chan struct{}
	schemaName string
}

const (
	PG_REPORT_INTERVAL = 3 * time.Minute
)

func (s *PostgresEventStore) CreateStream(ctx context.Context, streamId string, genesisMiniblock []byte) error {
	defer infra.StoreExecutionTimeMetrics("CreateStreamMs", time.Now())

	err := validateStreamId(streamId)
	if err != nil {
		log.Error("Wrong streamId", streamId)
		return err
	}

	log := dlog.CtxLog(ctx)

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		log.Debug("CreateStream startTx error ", err)
		return err
	}

	defer func() {
		err = tx.Rollback(ctx)
		if err != nil {
			if errors.Is(err, pgx.ErrTxClosed) {
				return
			}
			log.Error("CreateStream: failed to rollback transaction", "error", err)
		}
	}()

	//create record in es table
	err = createEventStreamInstance(ctx, tx, streamId)
	if err != nil {
		log.Error("CreateStream createEventStreamInstance error ", err)
		return err
	}

	//create related miniblocks table and put there genesis block
	createMiniblockSql := createMiniblockSql(streamId)
	_, err = tx.Exec(ctx, createMiniblockSql)
	if err != nil {
		log.Debug("CreateStream createStreamSql error ", err)
		return err
	}

	_, err = tx.Exec(ctx, fmt.Sprintf(`INSERT INTO %s (seq_num, blockdata) VALUES ($1, $2)`, miniblockSqlName(streamId)), 0, genesisMiniblock)
	if err != nil {
		log.Debug("Adding genesis block error: ", err)
		return err
	}

	//create related minipool table and insert there -1 record
	createMinipoolSql := createMinipoolSql(streamId)
	_, err = tx.Exec(ctx, createMinipoolSql)
	if err != nil {
		log.Debug("CreateStream createStreamSql error ", err)
		return err
	}

	_, err = tx.Exec(ctx, fmt.Sprintf(`INSERT INTO %s (generation, slot_num, envelope) VALUES ($1, $2, $3)`, minipoolSqlName(streamId)), 1, -1, nil)
	if err != nil {
		log.Debug("Initial minipool generation  error: ", err)
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Error("Commit error: ", err)
		return err
	}

	return nil
}

func (s *PostgresEventStore) GetStreamFromLastSnapshot(ctx context.Context, streamId string) (*GetStreamFromLastSnapshotResult, error) {
	infra.StoreExecutionTimeMetrics("GetStreamFromLastSnapshotMs", time.Now())

	err := validateStreamId(streamId)
	if err != nil {
		log.Error("Wrong streamId", streamId)
		return nil, err
	}

	log := dlog.CtxLog(ctx)
	tx, err := startTx(ctx, s.pool)

	if err != nil {
		return nil, err
	}

	defer func() {
		err = tx.Rollback(ctx)
		if err != nil {
			if errors.Is(err, pgx.ErrTxClosed) {
				return
			}
			log.Error("GetStreamFromLastSnapshor: failed to rollback transaction", "error", err)
		}
	}()

	var result GetStreamFromLastSnapshotResult

	//first let's check what is the last block with snapshot
	//TODO: optimize in single query
	sb := strings.Builder{}
	//query to check number of events in minipool
	sb.WriteString(fmt.Sprintf("SELECT latest_snapshot_miniblock as latest_snapshot_miniblock FROM es WHERE stream_name = '%s'", streamId))
	row := tx.QueryRow(ctx, sb.String())

	var latest_snapshot_miniblock_index int
	err = row.Scan(&latest_snapshot_miniblock_index)
	if err != nil {
		log.Debug("error: ", err)
		return nil, err
	}

	result.StartMiniblockNumber = latest_snapshot_miniblock_index

	//Retrieve miniblocks starting from the latest miniblock with snapshot
	var miniblocks [][]byte

	miniblocks, err = s.GetMiniblocks(ctx, streamId, latest_snapshot_miniblock_index, -1)

	if err != nil {
		log.Debug("miniblocks retrieval error: ", err)
		return nil, err
	}

	result.Miniblocks = miniblocks
	//Retrieve events from minipool
	sb.Reset()

	//Comparison with -1 below is required to skip artificially added row with slot_num = -1 that stores minipool generation
	sb.WriteString(fmt.Sprintf("SELECT envelope FROM %s WHERE slot_num > -1", minipoolSqlName(streamId)))

	rows, err := s.pool.Query(ctx, sb.String())

	if err != nil {
		log.Error("Read events from minipool error: ", err)
		return nil, err
	}

	var envelopes [][]byte

	for rows.Next() {
		var envelope []byte
		err = rows.Scan(&envelope)
		if err != nil {
			log.Error("Read event from minipool error: ", err)
			return nil, err
		}
		envelopes = append(envelopes, envelope)
	}

	//TODO: Check if it is correct way of using rows.Close()?
	rows.Close()

	result.MinipoolEnvelopes = envelopes

	err = tx.Commit(ctx)
	if err != nil {
		log.Error("Commit error: ", err)
		return nil, err
	}

	return &result, nil
}

// Adds event to the given minipool.
// Current generation of minipool should match minipoolGeneration,
// and there should be exactly minipoolSlot events in the minipool.
func (s *PostgresEventStore) AddEvent(ctx context.Context, streamId string, minipoolGeneration int, minipoolSlot int, envelope []byte) error {
	defer infra.StoreExecutionTimeMetrics("AddEventMs", time.Now())

	err := validateStreamId(streamId)
	if err != nil {
		log.Error("Wrong streamId", streamId)
		return err
	}

	log := dlog.CtxLog(ctx)

	// Start transaction for making checks of minipool generation and slot
	// If everything is ok we will add event to minipool and commit transaction
	// TODO: Do we want to check here if stream exists?
	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return err
	}

	defer func() {
		err = tx.Rollback(ctx)
		if err != nil {
			if errors.Is(err, pgx.ErrTxClosed) {
				return
			}
			log.Error("AddEvent: Failed to rollback transaction", "error", err)
		}
	}()

	exists, err := streamExists(ctx, tx, streamId)
	if err != nil {
		log.Error("Stream existance check error during adding event to stream", "stream", streamId, "error", err)
		return err
	}
	if !exists {
		return fmt.Errorf("Adding event to stream error - stream %s does not exist", streamId)
	}

	//TODO: optimize in single query
	sb := strings.Builder{}
	//query to check number of events in minipool
	sb.WriteString(fmt.Sprintf("SELECT COUNT(envelope) as events_count FROM %s", minipoolSqlName(streamId)))
	row := tx.QueryRow(ctx, sb.String())

	var events_count int
	err = row.Scan(&events_count)
	if err != nil {
		log.Debug("error: ", err)
		return err
	}

	if events_count != minipoolSlot {
		return fmt.Errorf("Missmatch of event numbers in the minipool")
	}

	//If minipool is not empty we need to check if all events in minipool have proper generation
	//TODO: not sure if we want to store minipool generation in the minipool table
	if events_count > 0 {
		sb.Reset()
		sb.WriteString(fmt.Sprintf("SELECT COUNT(envelope) as events_count FROM %s WHERE generation = %d", minipoolSqlName(streamId), minipoolGeneration))
		row = tx.QueryRow(ctx, sb.String())

		err = row.Scan(&events_count)
		if err != nil {
			log.Debug("error: ", err)
			return err
		}

		if events_count != minipoolSlot {
			return fmt.Errorf("Missmatch of minipool generation")
		}
	}

	//All checks passed - we need to insert event into minipool
	//TODO: increment event number in in minippol and fix SQL query below
	sb.Reset()
	sb.WriteString(fmt.Sprintf("INSERT INTO %s (envelope, generation, slot_num) VALUES ($1, $2, $3) ", minipoolSqlName(streamId)))
	_, err = tx.Exec(ctx, sb.String(), envelope, minipoolGeneration, minipoolSlot)

	if err != nil {
		log.Debug("insert event into minipool error: ", err)
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Error("Commit error: ", err)
		return err
	}

	return nil
}

func (s *PostgresEventStore) GetMiniblocks(ctx context.Context, streamId string, fromIndex int, toIndex int) ([][]byte, error) {
	defer infra.StoreExecutionTimeMetrics("GetMiniblocksMs", time.Now())

	err := validateStreamId(streamId)
	if err != nil {
		log.Error("Wrong streamId", streamId)
		return nil, err
	}

	//TODO: do we want to validate here if blocks which are subject to read exist?
	log := dlog.CtxLog(ctx)

	//Read-only transactions does't require commit
	tx, err := startTx(ctx, s.pool)
	if err != nil {
		log.Error("Starting transaction error for getting miniblock for stream", "stream", streamId, "error", err)
		return nil, err
	}

	exists, err := streamExists(ctx, tx, streamId)
	if err != nil {
		log.Error("Miniblocks retrieval error during stream existence check for stream", "streamId", streamId, "error", err)
		return nil, err
	}

	if !exists {
		log.Error("Miniblocks retrieval error - stream doesn't exist", "streamId", streamId, "error", err)
	}

	sb := strings.Builder{}

	if toIndex != -1 {
		sb.WriteString(fmt.Sprintf("SELECT blockdata FROM %s WHERE seq_num >= %d AND seq_num < %d ORDER BY seq_num", miniblockSqlName(streamId), fromIndex, toIndex))
	} else {
		sb.WriteString(fmt.Sprintf("SELECT blockdata FROM %s WHERE seq_num >= %d ORDER BY seq_num", miniblockSqlName(streamId), fromIndex))
	}
	rows, err := s.pool.Query(ctx, sb.String())

	if err != nil {
		log.Error("Read blocks error: ", err)
		return nil, err
	}

	defer rows.Close()

	var blocks [][]byte

	for rows.Next() {
		var blockdata []byte
		err = rows.Scan(&blockdata)
		if err != nil {
			log.Error("Read block error: ", err)
			return nil, err
		}
		blocks = append(blocks, blockdata)
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Error("Commit error: ", err)
		return nil, err
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
	defer infra.StoreExecutionTimeMetrics("CreateBlockMs", time.Now())

	err := validateStreamId(streamId)
	if err != nil {
		log.Error("Wrong streamId", streamId)
		return err
	}

	log := dlog.CtxLog(ctx)

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		log.Debug("CreateBlock startTx error ", err)
		return err
	}

	defer func() {
		err = tx.Rollback(ctx)
		if err != nil {
			if errors.Is(err, pgx.ErrTxClosed) {
				return
			}
			log.Error("CreateBlock: Failed to rollback transaction", "error", err)
		}
	}()

	exists, err := streamExists(ctx, tx, streamId)
	if err != nil {
		log.Error("Block creation error during stream existence check for stream", "streamId", streamId, "error", err)
		return err
	}

	if !exists {
		log.Error("Block creation error - stream doesn't exist", "streamId", streamId, "error", err)
	}

	//check if stream has minipoolGeneration miniblocks
	sb := strings.Builder{}
	sb.WriteString(fmt.Sprintf("SELECT MAX(seq_num) as latest_blocks_number FROM %s", miniblockSqlName(streamId)))
	row := tx.QueryRow(ctx, sb.String())

	var latest_blocks_number int
	err = row.Scan(&latest_blocks_number)
	if err != nil {
		log.Debug("error: ", err)
		return err
	}

	if minipoolGeneration != latest_blocks_number+1 {
		return fmt.Errorf("Minipool generation missmatch for stream %s", streamId)
	}

	//clean up minipool
	sb.Reset()
	sb.WriteString(fmt.Sprintf("DELETE FROM %s WHERE slot_num > -1", minipoolSqlName(streamId)))
	_, err = tx.Exec(ctx, sb.String())
	if err != nil {
		log.Debug("Minipool clean error: ", err)
		return err
	}

	//update -1 record of minipool_<<name>> table to minipoolGeneration + 1
	sb.Reset()
	sb.WriteString(fmt.Sprintf("UPDATE %s SET generation = $1 WHERE slot_num = -1", minipoolSqlName(streamId)))
	_, err = tx.Exec(ctx, sb.String(), minipoolGeneration+1)
	if err != nil {
		log.Debug("Minipool generation update error: ", err)
		return err
	}

	//update stream_snapshots_index if needed
	if snapshotMiniblock {
		_, err := tx.Exec(ctx, `UPDATE es SET latest_snapshot_miniblock = $1 WHERE stream_name = $2`, minipoolGeneration, streamId)
		if err != nil {
			log.Debug("Snapshot index update error: ", err)
			return err
		}
	}

	//insert all minipool events into minipool
	for i, envelope := range envelopes {
		_, err = tx.Exec(ctx, fmt.Sprintf(`INSERT INTO %s (slot_num, generation, envelope) VALUES ($1, $2, $3)`, minipoolSqlName(streamId)), i, minipoolGeneration+1, envelope)
		if err != nil {
			log.Debug("Envelope insertion error: ", err)
			return err
		}
	}

	//insert new miniblock into miniblock_<<name>> table
	_, err = tx.Exec(ctx, fmt.Sprintf(`INSERT INTO %s (seq_num, blockdata) VALUES ($1, $2)`, miniblockSqlName(streamId)), minipoolGeneration, miniblock)
	if err != nil {
		log.Debug("Miniblock insertion error: ", err)
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Error("Miniblock creation error: ", err)
		return err
	}

	return nil
}

// Non-API helpers
//
// Checks if stream exists in the database
// Should always be used in scope of open transaction tx
func streamExists(ctx context.Context, tx pgx.Tx, streamId string) (bool, error) {
	defer infra.StoreExecutionTimeMetrics("streamExistsMs", time.Now())

	err := validateStreamId(streamId)
	if err != nil {
		log.Error("Wrong streamId", streamId)
		return false, err
	}

	rows, err := tx.Query(ctx, "SELECT stream_name FROM es WHERE stream_name = $1 LIMIT 1", streamId)
	if err != nil {
		return false, err
	}
	defer rows.Close()
	res := rows.Next()
	return res, nil
}

// Creates record in es table for the stream
// Should always be used in scope of open transaction tx
func createEventStreamInstance(ctx context.Context, tx pgx.Tx, streamId string) error {
	defer infra.StoreExecutionTimeMetrics("createEventStreamInstance", time.Now())

	err := validateStreamId(streamId)
	if err != nil {
		log.Error("Wrong streamId", streamId)
		return err
	}

	_, err = tx.Exec(ctx, `INSERT INTO es (stream_name, latest_snapshot_miniblock) VALUES ($1, 0)`, streamId)
	if err != nil {
		return err
	}
	return nil
}

// GetStreams returns a list of all event streams
func (s *PostgresEventStore) GetStreams(ctx context.Context) ([]string, error) {
	defer infra.StoreExecutionTimeMetrics("GetStreamsMs", time.Now())

	streams := []string{}
	rows, err := s.pool.Query(ctx, "SELECT stream_name FROM es")
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
	return streams, nil
}

/*
* Delete stream with specified streamId
*
* Delete minipool and miniblock tables associated with the stream and stream record from streams table
 */
func (s *PostgresEventStore) DeleteStream(ctx context.Context, streamId string) error {
	defer infra.StoreExecutionTimeMetrics("DeleteStreamMs", time.Now())

	err := validateStreamId(streamId)
	if err != nil {
		log.Error("Wrong streamId", streamId)
		return err
	}

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return err
	}

	defer func() {
		err = tx.Rollback(ctx)
		if err != nil {
			if errors.Is(err, pgx.ErrTxClosed) {
				return
			}
			log.Error("InitStorage: Failed to rollback transaction", "error", err)
		}
	}()

	_, err = tx.Exec(ctx, fmt.Sprintf("DROP TABLE %s CASCADE", miniblockSqlName(streamId)))
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, fmt.Sprintf("DROP TABLE %s CASCADE", minipoolSqlName(streamId)))
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, "DELETE FROM es WHERE stream_name = $1", streamId)
	if err != nil {
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return err
	}

	return nil
}

/*
* Deletes all event streams
 */
func (s *PostgresEventStore) DeleteAllStreams(ctx context.Context) error {
	defer infra.StoreExecutionTimeMetrics("DeleteAllStreamsMs", time.Now())

	streams, err := s.GetStreams(ctx)
	if err != nil {
		return err
	}
	for _, stream := range streams {
		err := s.DeleteStream(ctx, stream)
		if err != nil {
			return err
		}
	}
	return nil
}

/*
* Storage infrastructure functions
 */

func startTx(ctx context.Context, pool *pgxpool.Pool) (pgx.Tx, error) {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, err
	}
	return tx, nil
}

func NewPostgresEventStore(ctx context.Context, database_url string, database_schema_name string, clean bool) (*PostgresEventStore, error) {
	defer infra.StoreExecutionTimeMetrics("NewPostgresEventStoreMs", time.Now())

	log := dlog.CtxLog(ctx)

	pool_conf, err := pgxpool.ParseConfig(database_url)

	//In general, it should be possible to add database schema name into database url as a parameter search_path (&search_path=database_schema_name)
	//For some reason it doesn't work so have to put it into config explicitly
	pool_conf.ConnConfig.RuntimeParams["search_path"] = database_schema_name
	if err != nil {
		return nil, err
	}
	pool_conf.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, pool_conf)

	if err != nil {
		return nil, err
	}

	if clean {
		err = cleanStorage(ctx, pool)
		if err != nil {
			return nil, err
		}
	}

	err = initStorage(ctx, pool)
	if err != nil {
		return nil, err
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

	store := &PostgresEventStore{pool: pool, debugCtl: make(chan struct{}), schemaName: database_schema_name}

	return store, nil
}

// Close closes the connection to the database
func (s *PostgresEventStore) Close() error {
	close(s.debugCtl)
	s.pool.Close()
	return nil
}

func cleanStorage(ctx context.Context, pool *pgxpool.Pool) error {
	defer infra.StoreExecutionTimeMetrics("cleanStorageMs", time.Now())

	log := dlog.CtxLog(ctx)

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			err := tx.Rollback(ctx)
			if err != nil {
				if errors.Is(err, pgx.ErrTxClosed) {
					return
				}
				log.Error("CleanStorage: Failed to rollback transaction: %s", err)
			}
		}
	}()

	//TODO: fix approach to the query - not critical as it is pure internal, though to bring the right order it is helpful
	_, err = tx.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", pool.Config().ConnConfig.Config.RuntimeParams["search_path"]))
	if err != nil {
		return err
	}

	//TODO: fix approach to the query - not critical as it is pure internal, though to bring the right order it is helpful
	_, err = tx.Exec(ctx, fmt.Sprintf("CREATE SCHEMA %s", pool.Config().ConnConfig.Config.RuntimeParams["search_path"]))
	if err != nil {
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Error("Failed to commit transaction: %s", err)
		return err
	}
	committed = true
	return nil
}

//go:embed init_db.sql
var schema string

func initStorage(ctx context.Context, pool *pgxpool.Pool) error {
	defer infra.StoreExecutionTimeMetrics("initStorageMs", time.Now())

	log := dlog.CtxLog(ctx)

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	committed := false
	defer func() {
		if !committed {
			err := tx.Rollback(ctx)
			if err != nil {
				if errors.Is(err, pgx.ErrTxClosed) {
					return
				}
				log.Error("InitStorage: Failed to rollback transaction", "error", err)
			}
		}
	}()

	//check if schema exists
	var schemaExists bool
	err = tx.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)", pool.Config().ConnConfig.Config.RuntimeParams["search_path"]).Scan(&schemaExists)
	if err != nil {
		log.Error("Error checking schema existence:", err)
	}

	if !schemaExists {
		createSchemaQuery := fmt.Sprintf("CREATE SCHEMA \"%s\"", pool.Config().ConnConfig.Config.RuntimeParams["search_path"])
		_, err := tx.Exec(context.Background(), createSchemaQuery)
		if err != nil {
			log.Error("Error creating schema:", pool.Config().ConnConfig.Config.RuntimeParams["search_path"], err)
			return err
		}
		fmt.Println("Schema created successfully")
	} else {
		fmt.Println("Schema already exists")
	}

	_, err = tx.Exec(context.Background(), schema)
	if err != nil {
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Error("InitStorage: Failed to commit transaction", "error", err)
		return err
	}
	committed = true
	return nil
}

//go:embed create_minipool.sql
var createMinipool string

func createMinipoolSql(streamId string) string {
	return strings.ReplaceAll(createMinipool, "<<name>>",
		sanitizeSqlName(streamId))
}

func minipoolSqlName(streamId string) string {
	return fmt.Sprintf("minipool_%s", sanitizeSqlName(streamId))
}

//go:embed create_miniblock.sql
var createMiniblock string

func createMiniblockSql(streamId string) string {
	return strings.ReplaceAll(createMiniblock, "<<name>>",
		sanitizeSqlName(streamId))
}

func miniblockSqlName(streamId string) string {
	return fmt.Sprintf("miniblock_%s", sanitizeSqlName(streamId))
}

func sanitizeSqlName(name string) string {
	return strings.ReplaceAll(name, "-", "_")
}

func GetStream(ctx context.Context, streamId string) ([]*protocol.Envelope, error) {
	return nil, nil
}

func validateStreamId(streamId string) error {
	pattern := `^(00-|11-|22-|33-|44-)[\w\d_-]*$`
	match, _ := regexp.MatchString(pattern, streamId)
	if !match {
		return fmt.Errorf("Wrong stream id %s", streamId)
	}
	return nil
}
