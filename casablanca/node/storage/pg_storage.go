package storage

import (
	. "casablanca/node/base"
	. "casablanca/node/protocol"
	"os"

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
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/sha3"
)

type PostgresEventStore struct {
	pool       *pgxpool.Pool
	schemaName string
	nodeUUID   string
	exitSignal chan error
}

const (
	PG_REPORT_INTERVAL = 3 * time.Minute
)

func (s *PostgresEventStore) CreateStream(ctx context.Context, streamId string, genesisMiniblock []byte) error {
	err := s.createStream(ctx, streamId, genesisMiniblock)
	if err != nil {
		return s.enrichErrorWithNodeInfo(AsRiverError(err).Func("pg.CreateStream").Tag("streamId", streamId))
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

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return err
	}

	//create record in es table
	err = s.createEventStreamInstance(ctx, tx, streamId)
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
		return nil, s.enrichErrorWithNodeInfo(AsRiverError(err).Func("pg.GetStreamFromLastSnapshot").Tag("streamId", streamId))
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

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return nil, err
	}

	var result GetStreamFromLastSnapshotResult

	//first let's check what is the last block with snapshot
	var latest_snapshot_miniblock_index int
	err = tx.
		QueryRow(ctx, "SELECT latest_snapshot_miniblock FROM es WHERE stream_id = $1", streamId).
		Scan(&latest_snapshot_miniblock_index)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, WrapRiverError(Err_NOT_FOUND, err).Message("stream not found in local storage")
		} else {
			return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error retrieving latest snapshot miniblock index")
		}
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
		return s.enrichErrorWithNodeInfo(AsRiverError(err).Func("pg.AddEvent").Tag("streamId", streamId).Tag("minipoolGeneration", minipoolGeneration).Tag("minipoolSlot", minipoolSlot))
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

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return err
	}

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
		return nil, s.enrichErrorWithNodeInfo(WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error starting transaction"))
	}

	defer rollbackTx(ctx, tx, "GetMiniblocks")

	miniblocks, err := s.GetMiniblocksWithExternalTx(ctx, tx, s.pool, streamId, fromIndex, toIndex)

	if err != nil {
		return nil, s.enrichErrorWithNodeInfo(WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetMiniblocks").Message("error retrieving miniblocks"))
	}

	err = tx.Commit(ctx)

	if err != nil {
		return nil, s.enrichErrorWithNodeInfo(WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetMiniblocks").Message("error committing transaction"))
	}

	return miniblocks, nil
}

func (s *PostgresEventStore) GetMiniblocksWithExternalTx(ctx context.Context, externalTx pgx.Tx, pool *pgxpool.Pool, streamId string, fromIndex int, toIndex int) ([][]byte, error) {
	miniblocks, err := s.getMiniblocksWithExternalTx(ctx, externalTx, pool, streamId, fromIndex, toIndex)

	if err != nil {
		return nil, s.enrichErrorWithNodeInfo(AsRiverError(err).Func("pg.GetMiniblocks").Tag("streamId", streamId).Tag("streamId", streamId).Tag("fromIndex", fromIndex).Tag("toIndex", toIndex))
	}

	return miniblocks, nil
}

func (s *PostgresEventStore) getMiniblocksWithExternalTx(ctx context.Context, externalTx pgx.Tx, pool *pgxpool.Pool, streamId string, fromIndex int, toIndex int) ([][]byte, error) {
	defer infra.StoreExecutionTimeMetrics("GetMiniblocksMs", time.Now())

	//TODO: do we want to validate here if blocks which are subject to read exist?
	var err error

	err = s.compareUUID(ctx, externalTx)
	if err != nil {
		return nil, err
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
		return s.enrichErrorWithNodeInfo(AsRiverError(err).Func("pg.CreateBlock").Tag("streamId", streamId).Tag("minipoolGeneration", minipoolGeneration).Tag("minipoolSize", minipoolSize).Tag("snapshotMiniblock", snapshotMiniblock))
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

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return err
	}

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
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Minipool generation missmatch", "latest_blocks_number", latest_blocks_number)
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
	defer infra.StoreExecutionTimeMetrics("GetStreamNumbersMs", time.Now())

	var count int
	row := s.pool.QueryRow(ctx, "SELECT COUNT(stream_id) FROM es")
	if err := row.Scan(&count); err != nil {
		return 0, s.enrichErrorWithNodeInfo(WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetStreamsNumber").Message("Getting streams number error"))
	}

	return count, nil
}

func (s *PostgresEventStore) compareUUID(ctx context.Context, tx pgx.Tx) error {
	log := dlog.CtxLog(ctx)
	//First we select UUID only assuming happy path
	rows, err := tx.Query(ctx, "SELECT uuid FROM singlenodekey")
	if err != nil {
		//TODO: We don't know exactly what goes wrong here. Should we kill the node or just throw error?
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error getting UUIDs during UUID compare at happy path")
	}
	defer rows.Close()

	var counter = 0
	var wrongNodeRecordsFlag bool = false

	for rows.Next() {
		if counter > 0 {
			//Something goes wrong as there is more than one record in the table and we swtich to error processing flow
			wrongNodeRecordsFlag = true
			break
		}
		counter++

		var storedUUID string

		err = rows.Scan(&storedUUID)
		if err != nil {
			//TODO: We don't know exactly what goes wrong here. Should we kill the node or just throw error?
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error getting UUID during UUID compare scan at happy path")
		}

		if storedUUID != s.nodeUUID {
			//Means that there is at least one more wrong node instance that running against DB
			wrongNodeRecordsFlag = true
			break
		}
	}

	if !wrongNodeRecordsFlag {
		return nil
	}

	//If we get here happy path failed - let's process error flow
	detailedRows, err := tx.Query(ctx, "SELECT uuid, storage_connection_time, info FROM singlenodekey")
	if err != nil {
		//We know that there are issues with number of nodes so we kill the node here
		riverError := s.enrichErrorWithNodeInfo(WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Node number mismatch - error getting UUIDs during UUID compare at error flow"))
		log.Error("compareUUID: Node number mismatch - error getting UUIDs during UUID compare at error flow", "error", riverError.Error(), "currentUUID", s.nodeUUID, "currentInfo", getCurrentNodeProcessInfo(s.schemaName))
		s.exitSignal <- riverError
		return riverError
	}
	defer detailedRows.Close()

	//Required for better error tracking
	var errorFlowUUID string
	var errorFlowTimestamp time.Time
	var errorFlowStoredInfo string

	var logRecordBuilder strings.Builder

	for detailedRows.Next() {
		err = rows.Scan(&errorFlowUUID, &errorFlowTimestamp, &errorFlowStoredInfo)
		if err != nil {
			//We know that there are issues with number of nodes so we kill the node here
			riverError := s.enrichErrorWithNodeInfo(WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Node number mismatch - error getting UUIDs during compare scan at error flow"))
			log.Error("compareUUID: Node number mismatch - error getting UUIDs during UUIDs compare scan at error flow", "error", riverError.Error(), "currentUUID", s.nodeUUID, "currentInfo", getCurrentNodeProcessInfo(s.schemaName))
			s.exitSignal <- riverError
			return riverError
		}
		logRecordBuilder.WriteString("Node UUID: ")
		logRecordBuilder.WriteString(errorFlowUUID)
		logRecordBuilder.WriteString("Node DB connection timestamp: ")
		logRecordBuilder.WriteString(errorFlowTimestamp.Format(time.RFC3339))
		logRecordBuilder.WriteString("Node info: ")
		logRecordBuilder.WriteString(errorFlowStoredInfo)
		logRecordBuilder.WriteString(";")
	}

	//We know that there are issues with number of nodes so we kill the node here
	multipleNodesError := s.enrichErrorWithNodeInfo(RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Node number mismatch"))
	log.Error("compareUUID: Node number mismatch", "error", multipleNodesError.Error(), "currentUUID", s.nodeUUID, "currentInfo", getCurrentNodeProcessInfo(s.schemaName), "detailedInfo", logRecordBuilder.String())
	s.exitSignal <- multipleNodesError
	return multipleNodesError
}

func (s *PostgresEventStore) CleanupStorage(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, "DELETE FROM singlenodekey WHERE uuid = $1", s.nodeUUID)

	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("pg.CleanupStorage").Message("singlenodekey clean up error").Tag("UUID", s.nodeUUID)
	}
	return nil
}

// Non-API helpers

func (s *PostgresEventStore) enrichErrorWithNodeInfo(err *RiverErrorImpl) *RiverErrorImpl {
	return err.Tag("currentUUID", s.nodeUUID).Tag("currentInfo", getCurrentNodeProcessInfo(s.schemaName))
}

// Creates record in es table for the stream
// Should always be used in scope of open transaction tx
func (s *PostgresEventStore) createEventStreamInstance(ctx context.Context, tx pgx.Tx, streamId string) error {
	defer infra.StoreExecutionTimeMetrics("createEventStreamInstance", time.Now())

	err := s.compareUUID(ctx, tx)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, 0)`, streamId)
	if err != nil {
		return s.enrichErrorWithNodeInfo(WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("createEventStreamInstance").Message("Create event stream instance error").Tag("streamId", streamId))
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

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return err
	}

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

func NewPostgresEventStore(ctx context.Context, database_url string, databaseSchemaName string, clean bool, exitSignal chan error) (*PostgresEventStore, error) {
	store, err := newPostgresEventStore(ctx, database_url, databaseSchemaName, clean, exitSignal)

	if err != nil {
		return nil, AsRiverError(err).Func("NewPostgresEventStore")
	}

	return store, nil
}

func newPostgresEventStore(ctx context.Context, database_url string, databaseSchemaName string, clean bool, exitSignal chan error) (*PostgresEventStore, error) {
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

	uuid, err := InitStorage(ctx, pool, databaseSchemaName)
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

	store := &PostgresEventStore{pool: pool, schemaName: databaseSchemaName, nodeUUID: uuid, exitSignal: exitSignal}

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

func InitStorage(ctx context.Context, pool *pgxpool.Pool, databaseSchemaName string) (string, error) {
	uuid, err := initStorage(ctx, pool, databaseSchemaName)

	if err != nil {
		return "", AsRiverError(err).Func("InitStorage").Tag("schema", schema).Tag("schemaName", databaseSchemaName)
	}

	return uuid, nil
}

func initStorage(ctx context.Context, pool *pgxpool.Pool, databaseSchemaName string) (string, error) {
	defer infra.StoreExecutionTimeMetrics("initStorageMs", time.Now())

	log := dlog.CtxLog(ctx)

	tx, err := pool.Begin(ctx)
	if err != nil {
		return "", WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("InitStorage startTx error")
	}

	defer rollbackTx(ctx, tx, "initStorage")

	//check if schema exists
	var schemaExists bool
	err = tx.QueryRow(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)",
		databaseSchemaName).Scan(&schemaExists)
	if err != nil {
		return "", WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error checking schema existence")
	}

	if !schemaExists {
		createSchemaQuery := fmt.Sprintf("CREATE SCHEMA \"%s\"", databaseSchemaName)
		_, err := tx.Exec(ctx, createSchemaQuery)
		if err != nil {
			return "", WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error creating schema")
		}
		log.Info("Schema created", "schema", databaseSchemaName)
	} else {
		log.Info("Schema already exists", "schema", databaseSchemaName)
	}

	_, err = tx.Exec(ctx, schema)
	if err != nil {
		return "", WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("InitStorage exec error")
	}

	rows, err := tx.Query(ctx, "SELECT uuid, storage_connection_time, info FROM singlenodekey")
	if err != nil {
		return "", WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error getting UUIDs during startup")
	}
	defer rows.Close()

	for rows.Next() {
		var storedUUID string
		var storedTimestamp time.Time
		var storedInfo string
		err := rows.Scan(&storedUUID, &storedTimestamp, &storedInfo)
		if err != nil {
			return "", WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error iterating over UUIDs during startup")
		}
		log.Info("Found UUID during startup", "uuid", storedUUID, "timestamp", storedTimestamp, "info", storedInfo)
	}

	_, err = tx.Exec(ctx, "DELETE FROM singlenodekey")

	if err != nil {
		return "", WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("singlenodekey clean up error")
	}

	nodeUUID := uuid.New().String()
	timestamp := time.Now()

	_, err = tx.Exec(ctx, "INSERT INTO singlenodekey (uuid, storage_connection_time, info) VALUES ($1, $2, $3)", nodeUUID, timestamp, getCurrentNodeProcessInfo(databaseSchemaName))
	if err != nil {
		return "", WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("singlenodekey UUID insert errorr")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return "", WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error committing transaction")
	}

	return nodeUUID, nil
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

func getCurrentNodeProcessInfo(currentSchemaName string) string {
	currentHostname, err := os.Hostname()
	if err != nil {
		log.Error("hostname retrieval error", "error", err)
		currentHostname = "unknown"
	}
	currentPID := os.Getpid()
	return fmt.Sprintf("hostname=%s, pid=%d, schema=%s", currentHostname, currentPID, currentSchemaName)
}
