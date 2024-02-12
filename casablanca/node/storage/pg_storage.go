package storage

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	. "github.com/river-build/river/base"
	. "github.com/river-build/river/protocol"

	_ "embed"

	"github.com/river-build/river/dlog"
	"github.com/river-build/river/infra"

	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/sha3"
)

type PostgresEventStore struct {
	pool       *pgxpool.Pool
	schemaName string
	nodeUUID   string
	exitSignal chan error
	serverCtx  context.Context
}

var _ StreamStorage = (*PostgresEventStore)(nil)

const (
	PG_REPORT_INTERVAL = 3 * time.Minute
)

var dbCalls = infra.NewSuccessMetrics(infra.DB_CALLS_CATEGORY, nil)

func (s *PostgresEventStore) CreateStreamStorage(ctx context.Context, streamId string, genesisMiniblock []byte) error {
	err := s.createStream(ctx, streamId, genesisMiniblock)
	if err != nil {
		dbCalls.FailIncForChild("CreateStream")
		return s.enrichErrorWithNodeInfo(AsRiverError(err, Err_DB_OPERATION_FAILURE).Func("pg.CreateStream").Tag("streamId", streamId))
	}
	dbCalls.PassIncForChild("CreateStream")
	return nil
}

func (s *PostgresEventStore) createStream(ctx context.Context, streamId string, genesisMiniblock []byte) error {
	defer infra.StoreExecutionTimeMetrics("CreateStream", infra.DB_CALLS_CATEGORY, time.Now())

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return err
	}
	defer s.rollbackTx(tx, "createStream")

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return err
	}

	tableSuffix := createTableSuffix(streamId)
	sql := fmt.Sprintf(
		`INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, 0);
		CREATE TABLE miniblocks_%s PARTITION OF miniblocks FOR VALUES IN ($1);
		CREATE TABLE minipools_%s PARTITION OF minipools FOR VALUES IN ($1);
		INSERT INTO miniblocks (stream_id, seq_num, blockdata) VALUES ($1, 0, $2);
		INSERT INTO minipools (stream_id, generation, slot_num) VALUES ($1, 1, -1);`,
		tableSuffix,
		tableSuffix,
	)
	_, err = tx.Exec(ctx, sql, streamId, genesisMiniblock)
	if err != nil {
		if pgerr, ok := err.(*pgconn.PgError); ok {
			if pgerr.Code == pgerrcode.UniqueViolation {
				return WrapRiverError(Err_ALREADY_EXISTS, err).Message("stream already exists")
			}
		}
		return err
	}

	return tx.Commit(ctx)
}

func (s *PostgresEventStore) ReadStreamFromLastSnapshot(
	ctx context.Context,
	streamId string,
	precedingBlockCount int,
) (*ReadStreamFromLastSnapshotResult, error) {
	streamFromLastSnaphot, err := s.getStreamFromLastSnapshot(ctx, streamId, precedingBlockCount)
	if err != nil {
		dbCalls.FailIncForChild("GetStreamFromLastSnapshot")
		return nil, s.enrichErrorWithNodeInfo(AsRiverError(err).Func("pg.GetStreamFromLastSnapshot").Tag("streamId", streamId))
	}
	dbCalls.PassIncForChild("GetStreamFromLastSnapshot")
	return streamFromLastSnaphot, nil
}

// Supported consistency checks:
// 1. There are no gaps in miniblocks sequence and it starts from latestsnaphot
// 2. There are no gaps in slot_num for envelopes in minipools and it starts from 0
// 3. For envelopes all generations are the same and equals to "max generation seq_num in miniblocks" + 1
func (s *PostgresEventStore) getStreamFromLastSnapshot(
	ctx context.Context,
	streamId string,
	precedingBlockCount int,
) (*ReadStreamFromLastSnapshotResult, error) {
	defer infra.StoreExecutionTimeMetrics("GetStreamFromLastSnapshot", infra.DB_CALLS_CATEGORY, time.Now())

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error starting transaction")
	}

	defer s.rollbackTx(tx, "getStreamFromLastSnapshot")

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return nil, err
	}

	var result ReadStreamFromLastSnapshotResult

	// first let's check what is the last block with snapshot
	var latest_snapshot_miniblock_index int64
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

	result.StartMiniblockNumber = max(0, latest_snapshot_miniblock_index-int64(max(0, precedingBlockCount)))

	miniblocksRow, err := tx.Query(
		ctx,
		"SELECT blockdata, seq_num FROM miniblocks WHERE seq_num >= $1 AND stream_id = $2 ORDER BY seq_num",
		latest_snapshot_miniblock_index,
		streamId,
	)
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error reading blocks")
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
			return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error scanning blocks")
		}
		if seqNum != latest_snapshot_miniblock_index+counter {
			return nil, WrapRiverError(
				Err_MINIBLOCKS_STORAGE_FAILURE,
				err,
			).Message("Miniblocks consistency violation - wrong block sequence number").
				Tag("ActualSeqNum", seqNum).
				Tag("ExpectedSeqNum", latest_snapshot_miniblock_index+counter)
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
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error retrieving minipool events")
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
			return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error scanning minipool events")
		}
		// Check that we don't have gaps in slot numbers
		if slotNum != slotNumsCounter {
			return nil, WrapRiverError(
				Err_MINIBLOCKS_STORAGE_FAILURE,
				err,
			).Message("Minipool consistency violation - slotNums are not sequential").
				Tag("ActualSlotNumber", slotNum).
				Tag("ExpectedSlotNumber", slotNumsCounter)
		}
		// Check that all events in minipool have proper generation
		if generation != seqNum+1 {
			return nil, WrapRiverError(
				Err_MINIBLOCKS_STORAGE_FAILURE,
				err,
			).Message("Minipool consistency violation - wrong event generation").
				Tag("ActualGeneration", generation).
				Tag("ExpectedGeneration", slotNum)
		}
		envelopes = append(envelopes, envelope)
		slotNumsCounter++
	}

	result.MinipoolEnvelopes = envelopes

	// End of new version
	err = tx.Commit(ctx)
	if err != nil {
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error committing transaction")
	}

	return &result, nil
}

// Adds event to the given minipool.
// Current generation of minipool should match minipoolGeneration,
// and there should be exactly minipoolSlot events in the minipool.
func (s *PostgresEventStore) WriteEvent(
	ctx context.Context,
	streamId string,
	minipoolGeneration int64,
	minipoolSlot int,
	envelope []byte,
) error {
	err := s.addEvent(ctx, streamId, minipoolGeneration, minipoolSlot, envelope)
	if err != nil {
		dbCalls.FailIncForChild("AddEvent")
		return s.enrichErrorWithNodeInfo(
			AsRiverError(
				err,
			).Func("pg.AddEvent").
				Tag("streamId", streamId).
				Tag("minipoolGeneration", minipoolGeneration).
				Tag("minipoolSlot", minipoolSlot),
		)
	}
	dbCalls.PassIncForChild("AddEvent")
	return nil
}

// Supported consistency checks:
// 1. Minipool has proper number of records including service one (equal to minipoolSlot)
// 2. There are no gaps in seqNums and they start from 0 execpt service record with seqNum = -1
// 3. All events in minipool have proper generation
func (s *PostgresEventStore) addEvent(
	ctx context.Context,
	streamId string,
	minipoolGeneration int64,
	minipoolSlot int,
	envelope []byte,
) error {
	defer infra.StoreExecutionTimeMetrics("AddEvent", infra.DB_CALLS_CATEGORY, time.Now())

	// Start transaction for making checks of minipool generation and slot
	// If everything is ok we will add event to minipool and commit transaction
	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error starting transaction")
	}

	defer s.rollbackTx(tx, "addEvent")

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return err
	}

	envelopesRow, err := tx.Query(
		ctx,
		"SELECT generation, slot_num FROM minipools WHERE stream_id = $1 ORDER BY slot_num",
		streamId,
	)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error retrieving minipool events")
	}

	defer envelopesRow.Close()

	var counter int = -1 // counter is set to -1 as we have service record in the first row of minipool table

	for envelopesRow.Next() {
		var generation int64
		var slotNum int
		err = envelopesRow.Scan(&generation, &slotNum)
		if err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error scanning minipool events")
		}
		if generation != minipoolGeneration {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Wrong event generation in minipool").
				Tag("ExpectedGeneration", minipoolGeneration).Tag("ActualGeneration", generation).
				Tag("SlotNumber", slotNum)
		}
		if slotNum != counter {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Wrong slot number in minipool").
				Tag("ExpectedSlotNumber", counter).Tag("ActualSlotNumber", slotNum)
		}
		// Slots number for envelopes start from 1, so we skip counter equal to zero
		counter++
	}

	// At this moment counter should be equal to minipoolSlot otherwise it is discrepancy of actual and expected records in minipool
	// Keep in mind that there is service record with seqNum equal to -1
	if counter != minipoolSlot {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Wrong number of records in minipool").
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
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error inserting event into minipool")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error committing transaction")
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
	streamId string,
	fromInclusive int64,
	toExclusive int64,
) ([][]byte, error) {
	miniblocksRow, err := s.pool.Query(
		ctx,
		"SELECT blockdata, seq_num FROM miniblocks WHERE seq_num >= $1 AND seq_num < $2 AND stream_id = $3 ORDER BY seq_num",
		fromInclusive,
		toExclusive,
		streamId,
	)
	if err != nil {
		dbCalls.FailIncForChild("GetMiniblocks")
		return nil, s.enrichErrorWithNodeInfo(WrapRiverError(Err_DB_OPERATION_FAILURE, err).
			Func("pg.GetMiniblocks").Message("Error reading blocks").Tag("streamId", streamId))
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
			dbCalls.FailIncForChild("GetMiniblocks")
			return nil, WrapRiverError(
				Err_DB_OPERATION_FAILURE,
				err,
			).Func("pg.GetMiniblocks").
				Tag("streamId", streamId).
				Message("Error scanning blocks")
		}

		if (prevSeqNum != -1) && (seq_num != prevSeqNum+1) {
			// There is a gap in sequence numbers
			return nil, WrapRiverError(Err_MINIBLOCKS_STORAGE_FAILURE, err).Func("pg.GetMiniblocks").
				Message("Miniblocks consistency violation").
				Tag("ActualBlockNumber", seq_num).Tag("ExpectedBlockNumber", prevSeqNum+1).Tag("streamId", streamId)
		}
		prevSeqNum = seq_num

		miniblocks = append(miniblocks, blockdata)
	}

	dbCalls.PassIncForChild("GetMiniblocks")
	return miniblocks, nil
}

func (s *PostgresEventStore) WriteBlock(
	ctx context.Context,
	streamId string,
	minipoolGeneration int64,
	minipoolSize int,
	miniblock []byte,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	err := s.createBlock(ctx, streamId, minipoolGeneration, minipoolSize, miniblock, snapshotMiniblock, envelopes)
	if err != nil {
		dbCalls.FailIncForChild("CreateBlock")
		return s.enrichErrorWithNodeInfo(
			AsRiverError(
				err,
			).Func("pg.CreateBlock").
				Tag("streamId", streamId).
				Tag("minipoolGeneration", minipoolGeneration).
				Tag("minipoolSize", minipoolSize).
				Tag("snapshotMiniblock", snapshotMiniblock),
		)
	}

	dbCalls.PassIncForChild("CreateBlock")
	return nil
}

// Supported consistency checks:
// 1. Stream has minipoolGeneration-1 miniblocks
func (s *PostgresEventStore) createBlock(
	ctx context.Context,
	streamId string,
	minipoolGeneration int64,
	minipoolSize int,
	miniblock []byte,
	snapshotMiniblock bool,
	envelopes [][]byte,
) error {
	defer infra.StoreExecutionTimeMetrics("CreateBlock", infra.DB_CALLS_CATEGORY, time.Now())

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error starting transaction")
	}

	defer s.rollbackTx(tx, "createBlock")

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return err
	}

	var seqNum *int64

	err = tx.QueryRow(ctx, "SELECT MAX(seq_num) as latest_blocks_number FROM miniblocks WHERE stream_id = $1", streamId).
		Scan(&seqNum)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error getting seqNum")
	}

	if seqNum == nil {
		return WrapRiverError(Err_NOT_FOUND, err).Message("No blocks for the stream found in block storage")
	}

	if minipoolGeneration != *seqNum+1 {
		return RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Minipool generation missmatch").
			Tag("ExpectedNewMinipoolGeneration", minipoolGeneration).Tag("ActualNewMinipoolGeneration", *seqNum+1)
	}

	// clean up minipool
	_, err = tx.Exec(ctx, "DELETE FROM minipools WHERE slot_num > -1 AND stream_id = $1", streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Minipool clean error")
	}

	// update -1 record of minipools table to minipoolGeneration + 1
	_, err = tx.Exec(
		ctx,
		"UPDATE minipools SET generation = $1 WHERE slot_num = -1 AND stream_id = $2",
		minipoolGeneration+1,
		streamId,
	)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Minipool generation update error")
	}

	// update stream_snapshots_index if needed
	if snapshotMiniblock {
		_, err := tx.Exec(ctx, `UPDATE es SET latest_snapshot_miniblock = $1 WHERE stream_id = $2`, minipoolGeneration, streamId)
		if err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Snapshot index update error")
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
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Envelope insertion error")
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
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Miniblock insertion error")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error committing transaction")
	}

	return nil
}

func (s *PostgresEventStore) GetStreamsNumber(ctx context.Context) (int, error) {
	defer infra.StoreExecutionTimeMetrics("GetStreamNumbers", infra.DB_CALLS_CATEGORY, time.Now())

	var count int
	row := s.pool.QueryRow(ctx, "SELECT COUNT(stream_id) FROM es")
	if err := row.Scan(&count); err != nil {
		dbCalls.FailIncForChild("GetStreamsNumber")
		return 0, s.enrichErrorWithNodeInfo(
			WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetStreamsNumber").Message("Getting streams number error"),
		)
	}

	dbCalls.PassIncForChild("GetStreamsNumber")
	return count, nil
}

func (s *PostgresEventStore) compareUUID(ctx context.Context, tx pgx.Tx) error {
	log := dlog.FromCtx(ctx)
	// First we select UUID only assuming happy path
	rows, err := tx.Query(ctx, "SELECT uuid FROM singlenodekey")
	if err != nil {
		// TODO: We don't know exactly what goes wrong here. Should we kill the node or just throw error?
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error getting UUIDs during UUID compare at happy path")
	}
	defer rows.Close()

	counter := 0
	var wrongNodeRecordsFlag bool = false

	for rows.Next() {
		if counter > 0 {
			// Something goes wrong as there is more than one record in the table and we swtich to error processing flow
			wrongNodeRecordsFlag = true
			break
		}
		counter++

		var storedUUID string

		err = rows.Scan(&storedUUID)
		if err != nil {
			// TODO: We don't know exactly what goes wrong here. Should we kill the node or just throw error?
			return WrapRiverError(
				Err_DB_OPERATION_FAILURE,
				err,
			).Message("Error getting UUID during UUID compare scan at happy path")
		}

		if storedUUID != s.nodeUUID {
			// Means that there is at least one more wrong node instance that running against DB
			wrongNodeRecordsFlag = true
			break
		}
	}

	if !wrongNodeRecordsFlag {
		return nil
	}

	// If we get here happy path failed - let's process error flow
	detailedRows, err := tx.Query(ctx, "SELECT uuid, storage_connection_time, info FROM singlenodekey")
	if err != nil {
		// We know that there are issues with number of nodes so we kill the node here
		riverError := s.enrichErrorWithNodeInfo(
			WrapRiverError(
				Err_DB_OPERATION_FAILURE,
				err,
			).Message("Node number mismatch - error getting UUIDs during UUID compare at error flow"),
		)
		log.Error(
			"compareUUID: Node number mismatch - error getting UUIDs during UUID compare at error flow",
			"error",
			riverError.Error(),
			"currentUUID",
			s.nodeUUID,
			"currentInfo",
			getCurrentNodeProcessInfo(s.schemaName),
		)
		s.exitSignal <- riverError
		return riverError
	}
	defer detailedRows.Close()

	// Required for better error tracking
	var errorFlowUUID string
	var errorFlowTimestamp time.Time
	var errorFlowStoredInfo string

	var logRecordBuilder strings.Builder

	for detailedRows.Next() {
		err = rows.Scan(&errorFlowUUID, &errorFlowTimestamp, &errorFlowStoredInfo)
		if err != nil {
			// We know that there are issues with number of nodes so we kill the node here
			riverError := s.enrichErrorWithNodeInfo(
				WrapRiverError(
					Err_DB_OPERATION_FAILURE,
					err,
				).Message("Node number mismatch - error getting UUIDs during compare scan at error flow"),
			)
			log.Error(
				"compareUUID: Node number mismatch - error getting UUIDs during UUIDs compare scan at error flow",
				"error",
				riverError.Error(),
				"currentUUID",
				s.nodeUUID,
				"currentInfo",
				getCurrentNodeProcessInfo(s.schemaName),
			)
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

	// We know that there are issues with number of nodes so we kill the node here
	multipleNodesError := s.enrichErrorWithNodeInfo(RiverError(Err_MINIBLOCKS_STORAGE_FAILURE, "Node number mismatch"))
	log.Error(
		"compareUUID: Node number mismatch",
		"error",
		multipleNodesError.Error(),
		"currentUUID",
		s.nodeUUID,
		"currentInfo",
		getCurrentNodeProcessInfo(s.schemaName),
		"detailedInfo",
		logRecordBuilder.String(),
	)
	s.exitSignal <- multipleNodesError
	return multipleNodesError
}

func (s *PostgresEventStore) CleanupStorage(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, "DELETE FROM singlenodekey WHERE uuid = $1", s.nodeUUID)
	if err != nil {
		dbCalls.FailIncForChild("CleanupStorage")
		return WrapRiverError(
			Err_DB_OPERATION_FAILURE,
			err,
		).Func("pg.CleanupStorage").
			Message("singlenodekey clean up error").
			Tag("UUID", s.nodeUUID)
	}
	dbCalls.PassIncForChild("CleanupStorage")
	return nil
}

// Non-API helpers

func (s *PostgresEventStore) enrichErrorWithNodeInfo(err *RiverErrorImpl) *RiverErrorImpl {
	return err.Tag("currentUUID", s.nodeUUID).Tag("currentInfo", getCurrentNodeProcessInfo(s.schemaName))
}

// GetStreams returns a list of all event streams
func (s *PostgresEventStore) GetStreams(ctx context.Context) ([]string, error) {
	defer infra.StoreExecutionTimeMetrics("GetStreams", infra.DB_CALLS_CATEGORY, time.Now())

	streams := []string{}
	rows, err := s.pool.Query(ctx, "SELECT stream_id FROM es")
	if err != nil {
		dbCalls.FailIncForChild("GetStreams")
		return nil, WrapRiverError(Err_DB_OPERATION_FAILURE, err).Func("GetStreams").Message("Getting streams error")
	}
	defer rows.Close()
	for rows.Next() {
		var streamName string
		err = rows.Scan(&streamName)
		if err != nil {
			dbCalls.FailIncForChild("GetStreams")
			return nil, WrapRiverError(
				Err_DB_OPERATION_FAILURE,
				err,
			).Func("GetStreams").
				Message("Getting streams error (scan phase)")
		}
		streams = append(streams, streamName)
	}
	dbCalls.PassIncForChild("GetStreams")
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
		dbCalls.FailIncForChild("DeleteStream")
		return AsRiverError(err).Func("pg.DeleteStream").Tag("streamId", streamId)
	}

	dbCalls.PassIncForChild("DeleteStream")
	return nil
}

func (s *PostgresEventStore) deleteStream(ctx context.Context, streamId string) error {
	defer infra.StoreExecutionTimeMetrics("DeleteStream", infra.DB_CALLS_CATEGORY, time.Now())

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error starting transaction")
	}

	defer s.rollbackTx(tx, "deleteStream")

	err = s.compareUUID(ctx, tx)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, "DELETE FROM miniblocks WHERE stream_id = $1", streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Delete miniblocks error")
	}

	// create related miniblocks table and put there genesis block
	tableSuffix := createTableSuffix(streamId)

	// Delete partition in miniblocks table for new strea
	_, err = tx.Exec(ctx, fmt.Sprintf(`DROP TABLE miniblocks_%s`, tableSuffix))

	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Delete miniblocks partition")
	}

	_, err = tx.Exec(ctx, "DELETE FROM minipools WHERE stream_id = $1", streamId)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Delete minipools error")
	}

	// Delete partition in minipools table for new strea
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
	defer infra.StoreExecutionTimeMetrics("NewPostgresEventStore", infra.DB_CALLS_CATEGORY, time.Now())

	log := dlog.FromCtx(ctx)

	pool_conf, err := pgxpool.ParseConfig(database_url)
	if err != nil {
		return nil, WrapRiverError(Err_MINIBLOCKS_STORAGE_FAILURE, err).Message("Error parsing config")
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
		serverCtx:  ctx,
	}

	err = store.InitStorage(ctx)
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

	return store, nil
}

// Close closes the connection to the database
func (s *PostgresEventStore) Close() {
	s.pool.Close()
}

//go:embed init_db.sql
var schema string

func (s *PostgresEventStore) InitStorage(ctx context.Context) error {
	err := s.initStorage(ctx)
	if err != nil {
		return AsRiverError(err).Func("InitStorage").Tag("schema", schema).Tag("schemaName", s.schemaName)
	}

	return nil
}

func (s *PostgresEventStore) initStorage(ctx context.Context) error {
	defer infra.StoreExecutionTimeMetrics("initStorage", infra.DB_CALLS_CATEGORY, time.Now())

	log := dlog.FromCtx(ctx)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("InitStorage startTx error")
	}

	defer s.rollbackTx(tx, "initStorage")

	// check if schema exists
	var schemaExists bool
	err = tx.QueryRow(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = $1)",
		s.schemaName).Scan(&schemaExists)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error checking schema existence")
	}

	if !schemaExists {
		createSchemaQuery := fmt.Sprintf("CREATE SCHEMA \"%s\"", s.schemaName)
		_, err := tx.Exec(ctx, createSchemaQuery)
		if err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error creating schema")
		}
		log.Info("DB Schema created", "schema", s.schemaName)
	} else {
		log.Info("DB Schema already exists", "schema", s.schemaName)
	}

	_, err = tx.Exec(ctx, schema)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("InitStorage exec error")
	}

	rows, err := tx.Query(ctx, "SELECT uuid, storage_connection_time, info FROM singlenodekey")
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error getting UUIDs during startup")
	}
	defer rows.Close()

	for rows.Next() {
		var storedUUID string
		var storedTimestamp time.Time
		var storedInfo string
		err := rows.Scan(&storedUUID, &storedTimestamp, &storedInfo)
		if err != nil {
			return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("Error iterating over UUIDs during startup")
		}
		log.Info("Found UUID during startup", "uuid", storedUUID, "timestamp", storedTimestamp, "info", storedInfo)
	}

	_, err = tx.Exec(ctx, "DELETE FROM singlenodekey")

	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("singlenodekey clean up error")
	}

	timestamp := time.Now()

	_, err = tx.Exec(
		ctx,
		"INSERT INTO singlenodekey (uuid, storage_connection_time, info) VALUES ($1, $2, $3)",
		s.nodeUUID,
		timestamp,
		getCurrentNodeProcessInfo(s.schemaName),
	)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("singlenodekey UUID insert errorr")
	}

	err = tx.Commit(ctx)
	if err != nil {
		return WrapRiverError(Err_DB_OPERATION_FAILURE, err).Message("error committing transaction")
	}

	return nil
}

func (s *PostgresEventStore) rollbackTx(tx pgx.Tx, funcName string) {
	err := tx.Rollback(s.serverCtx)
	if err != nil {
		if errors.Is(err, pgx.ErrTxClosed) {
			return
		}
	}
}

func createTableSuffix(streamId string) string {
	sum := sha3.Sum224([]byte(streamId))
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
