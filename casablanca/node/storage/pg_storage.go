package storage

import (
	"context"
	_ "embed"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/protobuf/encoding/protojson"

	"strings"

	"casablanca/node/base"
	"casablanca/node/common"
	"casablanca/node/infra"
	"casablanca/node/protocol"

	log "github.com/sirupsen/logrus"
)

const (
	PG_EVENT_TABLE_NAME_PREFIX = "es_"
)

// implemnent the EventStore interface
type PGEventStore struct {
	pool     *pgxpool.Pool
	debugCtl chan struct{}
}

type PGEventNotificationEntry struct {
	StreamId  string `json:"es_name"`
	SeqNum    int64  `json:"seq_num"`
	Hash      string `json:"hash"`
	Signature string `json:"signature"`
	Event     string `json:"event"`
}

const (
	PG_REPORT_INTERVAL = 20 * time.Second
)

var (
	syncStreamsLongPoll = infra.NewCounter("sync_streams_long_poll", "Sync streams long poll invocations metric")
	longPollTimeout     = infra.NewCounter("sync_streams_long_poll_timeout", "Sync streams long poll timeout metric")
)

// NewPGEventStore creates a new PGEventStore
func NewPGEventStore(ctx context.Context, database_url string, clean bool) (*PGEventStore, error) {
	log := infra.GetLogger(ctx)

	pool_conf, err := pgxpool.ParseConfig(database_url)
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
				log.Debugf("PG pool stats: %d, %d, %d, %d", stats.AcquireCount(), stats.AcquiredConns(), stats.IdleConns(), stats.TotalConns())
			}
		}
	}()

	store := &PGEventStore{pool: pool, debugCtl: make(chan struct{})}

	go func() {
		ctx, log := infra.SetLoggerWithProcess(ctx, "debug-events-loop")
		for {
			select {
			case <-ctx.Done():
				log.Debug("Debug events dump: context done")
				return
			case <-store.debugCtl:
				log.Debug("Debug events stop")
				return
			}
		}
	}()

	return store, nil
}

// Close closes the connection to the database
func (s *PGEventStore) Close() error {
	close(s.debugCtl)
	s.pool.Close()
	return nil
}

func streamExists(ctx context.Context, tx pgx.Tx, streamId string) (bool, error) {
	rows, err := tx.Query(ctx, "SELECT name FROM es WHERE name = $1 LIMIT 1", streamId)
	if err != nil {
		return false, err
	}
	defer rows.Close()
	res := rows.Next()
	return res, nil
}

func createEventStreamInstance(ctx context.Context, tx pgx.Tx, streamId string) error {
	_, err := tx.Exec(ctx, `INSERT INTO es (name) VALUES ($1)`, streamId)
	if err != nil {
		return err
	}
	return nil
}

func startTx(ctx context.Context, pool *pgxpool.Pool) (pgx.Tx, error) {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, err
	}
	return tx, nil
}

func startConnTx(ctx context.Context, conn *pgxpool.Conn) (pgx.Tx, error) {
	tx, err := conn.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, err
	}
	return tx, nil
}

func lockTable(ctx context.Context, tx pgx.Tx, tableName string) error {
	_, err := tx.Exec(ctx, fmt.Sprintf("LOCK TABLE %s IN EXCLUSIVE MODE", tableName))
	if err != nil {
		return err
	}
	return nil
}

func addEvents(ctx context.Context, pool *pgxpool.Pool, streamId string, envelopes []*protocol.Envelope) (int64, error) {
	logger := infra.GetLogger(ctx)

	tx, err := startTx(ctx, pool)
	if err != nil {
		return -1, err
	}
	var commited = false
	defer func() {
		if !commited {
			err := tx.Rollback(ctx)
			if err != nil {
				log.Errorf("Rollback: %v", err)
			}
		}
	}()

	parsedEvents := base.FormatEnvelopeHashes(envelopes)

	if logger.Logger.GetLevel() >= log.DebugLevel {
		addDebugEventEntry(streamId, parsedEvents)
	}

	sb := strings.Builder{}
	params := make([]interface{}, 0, len(envelopes)*4)

	sb.WriteString(fmt.Sprintf("INSERT INTO %s (hash, signature, event) VALUES ", streamSqlName(streamId)))
	for idx := range envelopes {
		if idx > 0 {
			sb.WriteString(", ")
		}
		sb.WriteString(fmt.Sprintf("($%d, $%d, $%d)", idx*3+1, idx*3+2, idx*3+3))

		params = append(params, envelopes[idx].Hash)
		params = append(params, envelopes[idx].Signature)
		params = append(params, envelopes[idx].Event)

	}
	sb.WriteString(" RETURNING seq_num")

	err = lockTable(ctx, tx, streamSqlName(streamId))
	if err != nil {
		return -1, err
	}

	var seqNum int64
	err = tx.QueryRow(ctx, sb.String(), params...).Scan(&seqNum)
	if err != nil {
		return -1, err
	}
	err = tx.Commit(ctx)
	if err != nil {
		logger.Error("Commit error: ", err)
		return -1, err
	}
	commited = true
	logger.Debugf("inserted int streamId: %s message with seq_num: %d for events: %s", streamId, seqNum, parsedEvents)
	return seqNum, nil
}

func addDebugEventEntry(streamId string, parsedEvent string) {
	infra.EventsLogger.Debugf("stream: %s, event: %s", streamId, parsedEvent)
}

// CreateStream creates a new event stream
func (s *PGEventStore) CreateStream(ctx context.Context, streamID string, inceptionEvents []*protocol.Envelope) ([]byte, error) {
	err := infra.EnsureRequestId(ctx)
	if err != nil {
		return nil, err
	}

	log := infra.GetLogger(ctx)
	log.Debug("CreateStream creating stream: ", streamID)
	tx, err := startTx(ctx, s.pool)
	if err != nil {
		log.Debug("CreateStream startTx error ", err)
		return nil, err
	}
	committed := false
	defer func() {
		if !committed {
			err := tx.Rollback(ctx)
			if err != nil {
				log.Error("CreateStream rollback error ", err)
			}
		}
	}()

	err = lockTable(ctx, tx, "es")
	if err != nil {
		log.Debug("CreateStream lockTable error ", err)
		return nil, err
	}

	exists, err := streamExists(ctx, tx, streamID)
	if err != nil {
		log.Error("CreateStream streamExists error ", err)
		return nil, err
	}
	if !exists {
		err := createEventStreamInstance(ctx, tx, streamID)
		if err != nil {
			log.Error("CreateStream createEventStreamInstance error ", err)
			return nil, err
		}
		sql := createStreamSql(streamID)
		_, err = tx.Exec(ctx, sql)
		if err != nil {
			log.Debug("CreateStream createStreamSql error ", err)
			return nil, err
		}
		err = tx.Commit(ctx)
		if err != nil {
			log.Debug("CreateStream Commit error ", err)
			return nil, err
		}
		committed = true
	}

	// add the inception events
	seqNum, err := addEvents(ctx, s.pool, streamID, inceptionEvents)
	if err != nil {
		log.Error("CreateStream addEvents error ", err)
		return nil, err
	}
	log.Debug("committed stream: ", streamID, " with seq_num: ", seqNum)
	return SeqNumToBytes(seqNum, streamID), nil
}

func (s *PGEventStore) AddEvent(ctx context.Context, streamId string, event *protocol.Envelope) ([]byte, error) {
	err := infra.EnsureRequestId(ctx)
	if err != nil {
		return nil, err
	}

	log := infra.GetLogger(ctx)
	eventsAsString := base.FormatHashFromBytes(event.Hash)
	log.Debugf("Storage: AddEvent streamId: %s event %s", streamId, eventsAsString)
	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return nil, err
	}
	committed := false
	defer func() {
		if !committed {
			err := tx.Rollback(ctx)
			if err != nil {
				log.Error("CreateStream rollback error ", err)
			}
		}
	}()

	exists, err := streamExists(ctx, tx, streamId)
	if err != nil {
		return nil, err
	}
	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}
	committed = true
	if !exists {
		return nil, fmt.Errorf("stream %s does not exist", streamId)
	}

	// add the event
	seqNum, err := addEvents(ctx, s.pool, streamId, []*protocol.Envelope{event})
	if err != nil {
		log.Error("CreateStream commit error ", err)
		return nil, err
	}
	committed = true

	return SeqNumToBytes(seqNum, streamId), nil
}

// GetStreams returns a list of all event streams
func (s *PGEventStore) GetStreams(ctx context.Context) ([]string, error) {
	err := infra.EnsureRequestId(ctx)
	if err != nil {
		return nil, err
	}

	streams := []string{}
	rows, err := s.pool.Query(ctx, "SELECT name FROM es")
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

func checkStream(ctx context.Context, tx pgx.Tx, streamId string) (bool, error) {
	rows, err := tx.Query(ctx, "SELECT name FROM es WHERE name = $1", streamId)
	if err != nil {
		return false, err
	}
	defer rows.Close()

	if rows.Next() {
		var streamName string
		err = rows.Scan(&streamName)
		if err != nil {
			return false, err
		}
		return true, nil
	}
	return false, nil

}

func (s *PGEventStore) GetStream(ctx context.Context, streamId string) (StreamPos, []*protocol.Envelope, error) {
	err := infra.EnsureRequestId(ctx)
	if err != nil {
		return StreamPos{}, nil, err
	}

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return StreamPos{}, nil, err
	}
	committed := false
	defer func() {
		if !committed {
			err := tx.Rollback(ctx)
			if err != nil {
				log.Error("CreateStream rollback error ", err)
			}
		}
	}()

	exists, err := checkStream(ctx, tx, streamId)
	if err != nil {
		return StreamPos{}, nil, err
	}
	if !exists {
		return StreamPos{}, nil, fmt.Errorf("stream %s does not exist", string(streamId))
	}

	pos := StreamPos{
		StreamId:   streamId,
		SyncCookie: SeqNumToBytes(-1, streamId),
	}
	events, seqNums, err := fetchMessages(ctx, tx, []StreamPos{pos}, -1)
	if err != nil {
		return StreamPos{}, nil, err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Error("GetStream commit error ", err)
		return StreamPos{}, nil, err
	}
	committed = true

	seqNum, ok := seqNums[streamId]
	if !ok {
		panic("stream exists, but has not events")
	}

	streamPos := StreamPos{
		StreamId:   streamId,
		SyncCookie: SeqNumToBytes(seqNum, streamId),
	}
	return streamPos, events[streamId], nil
}

func (s *PGEventStore) StreamExists(ctx context.Context, streamId string) (bool, error) {
	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return false, err
	}
	defer func() {
		err := tx.Rollback(ctx)
		if err != nil {
			log.Error("StreamExists rollback error ", err)
		}
	}()

	return checkStream(ctx, tx, streamId)
}

// DeleteStream deletes an event stream
func (s *PGEventStore) DeleteStream(ctx context.Context, streamID string) error {
	err := infra.EnsureRequestId(ctx)
	if err != nil {
		return err
	}

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, fmt.Sprintf("DROP TABLE %s CASCADE", streamSqlName(streamID)))
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, "DELETE FROM es WHERE name = $1", streamID)
	if err != nil {
		return err
	}
	err = tx.Commit(ctx)
	return err
}

// DeleteAllStreams deletes all event streams
func (s *PGEventStore) DeleteAllStreams(ctx context.Context) error {
	err := infra.EnsureRequestId(ctx)
	if err != nil {
		return err
	}

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

func (s *PGEventStore) GetRoomInfo(ctx context.Context, roomId string) (*common.RoomInfo, error) {
	err := infra.EnsureRequestId(ctx)
	if err != nil {
		return nil, err
	}
	// TODO implement with real values
	roomType, err := common.RoomTypeFromStreamId(roomId)
	if err != nil {
		return nil, err
	}
	return &common.RoomInfo{
		SpaceId:   roomId,
		ChannelId: roomId,
		RoomType:  roomType,
		IsOwner:   false,
	}, nil
}

/**
 * fetchMessages fetches messages from the event store
 * @param {context.Context} ctx - the context
 * @param {pgx.Tx} tx - the transaction
 * @param {[]StreamPos} positions - the positions to fetch from
 * @param {int} maxCount - the maximum number of messages to fetch
 * @returns {map[string][]*protocol.Envelope} - the messages
 * @returns {int64} - the watermark
 * @returns {error} - any error
 */
func fetchMessages(ctx context.Context, tx pgx.Tx, positions []StreamPos, maxCount int) (map[string][]*protocol.Envelope, map[string]int64, error) {
	log := infra.GetLogger(ctx)

	log.Debug("fetchMessages: ", len(positions))

	nextSeqNums := make(map[string]int64)

	sql := strings.Builder{}
	for i, pos := range positions {
		seqNum, targetStreamId := BytesToSeqNum(pos.SyncCookie)
		if targetStreamId != pos.StreamId {
			return nil, nil, fmt.Errorf("invalid sync cookie for stream %s expected %s", targetStreamId, pos.StreamId)
		}
		// if no new events, report the original position
		nextSeqNums[pos.StreamId] = seqNum
		sql.WriteString(fmt.Sprintf("SELECT '%s' as name, hash, signature, event, seq_num FROM %s", pos.StreamId, streamSqlName(pos.StreamId)))
		sql.WriteString(" WHERE seq_num > ")
		sql.WriteString(fmt.Sprintf("%d", seqNum))
		if i < len(positions)-1 {
			sql.WriteString(" UNION ALL ")
		}
	}
	if maxCount > 0 {
		sql.WriteString(fmt.Sprintf(" LIMIT %d", maxCount))
	}

	log.Debug("sql: ", sql.String())

	rows, err := tx.Query(ctx, sql.String())
	if err != nil {
		log.Debug("error: ", err)
		return nil, nil, err
	}
	defer rows.Close()

	events := map[string][]*protocol.Envelope{}
	count := 0
	seqNums := strings.Builder{}

	var currName string
	var currLastSeqNum int64
	for rows.Next() {
		var name string
		var hash []byte
		var signature []byte
		var event_buf []byte
		var seqNum int64
		err = rows.Scan(&name, &hash, &signature, &event_buf, &seqNum)
		if err != nil {
			return nil, nil, err
		}

		if currName != name {
			nextSeqNums[currName] = currLastSeqNum
			currName = name
			currLastSeqNum = seqNum
		} else {
			if currLastSeqNum < seqNum {
				currLastSeqNum = seqNum
			}
		}

		if _, ok := events[string(name)]; !ok {
			events[string(name)] = []*protocol.Envelope{}
		}
		events[string(name)] = append(events[string(name)], &protocol.Envelope{
			Hash:      hash,
			Signature: signature,
			Event:     event_buf,
		})
		seqNums.WriteString(fmt.Sprintf("%s %d,", name, seqNum))
		count++
	}
	if currName != "" {
		nextSeqNums[currName] = currLastSeqNum
	}
	log.Debug("events(", count, "): ", seqNums.String(), " lastSeqNum: ", nextSeqNums)
	return events, nextSeqNums, nil
}

func listenNotifications(ctx context.Context, conn *pgxpool.Conn, notificationStream string) error {
	log := infra.GetLogger(ctx)
	log.Debug("listenNotifications: ", notificationStream)
	_, err := conn.Exec(ctx, fmt.Sprintf("LISTEN %s", notificationStream))
	if err != nil {
		return err
	}
	return err
}

func unlistenNotifications(ctx context.Context, conn *pgxpool.Conn, notificationStream string) {
	log := infra.GetLogger(ctx)
	log.Debug("unlistenNotifications: ", notificationStream)
	_, err := conn.Exec(ctx, fmt.Sprintf("UNLISTEN %s", notificationStream))
	if err != nil {
		// TODO check for context deadline exceeded error
		log.Trace("Error unlistening to notifications: ", err)
	}
}

func formatSyncPostisions(syncPositions []*protocol.SyncPos) string {
	sb := strings.Builder{}
	sb.WriteString("[")
	for idx, event := range syncPositions {
		sb.WriteString(protojson.Format(event))
		if idx < len(syncPositions)-1 {
			sb.WriteString(",")
		}
	}
	sb.WriteString("]")
	return sb.String()
}

func formatSyncResults(streams map[string]StreamEventsBlock) string {
	hashes := strings.Builder{}
	hashes.WriteString("[")
	var streamIdx = 0
	for streamId, block := range streams {
		hashes.WriteString("{\"streamId\":\"")
		hashes.WriteString(streamId)
		hashes.WriteString("\",\"events\":")
		hashes.WriteString("[")
		for idx, event := range block.Events {
			if idx > 0 {
				hashes.WriteString(",")
			}
			base.FormatHashFromBytesToSB(&hashes, event.Hash)
		}
		hashes.WriteString("]")
		if streamIdx < len(streams)-1 {
			hashes.WriteString(",")
		}
		hashes.WriteString("}")

		streamIdx++
	}
	hashes.WriteString("]")
	return hashes.String()

}

func (s *PGEventStore) SyncStreams(ctx context.Context, syncPositions []*protocol.SyncPos, maxCount int, TimeoutMs uint32) (map[string]StreamEventsBlock, error) {
	log := infra.GetLogger(ctx)
	log.Debugf("SyncStreams start: %s", formatSyncPostisions(syncPositions))

	err := infra.EnsureRequestId(ctx)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, time.Duration(TimeoutMs)*time.Millisecond)
	defer cancel()

	streamPos := make([]StreamPos, len(syncPositions))
	positions := make(map[string][]byte)
	startSeqNum := int64(math.MaxInt64)
	for i, pos := range syncPositions {
		var cookie []byte
		if pos.SyncCookie == nil {
			cookie = []byte{0}
		} else {
			cookie = pos.SyncCookie
		}
		streamPos[i] = StreamPos{StreamId: pos.StreamId, SyncCookie: cookie}
		positions[string(pos.StreamId)] = cookie
		cookieSeqNum, _ := BytesToSeqNum(cookie)
		if startSeqNum > cookieSeqNum {
			startSeqNum = cookieSeqNum
		}
	}

	conn, err := s.pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Release()

	for _, pos := range streamPos {
		streamName := string(pos.StreamId)
		pgNotficationStream := fmt.Sprintf("es_newevent_%s", sanitizeSqlName(streamName))

		err = listenNotifications(ctx, conn, pgNotficationStream)
		if err != nil {
			return nil, err
		}
		defer unlistenNotifications(ctx, conn, pgNotficationStream)
	}

	for {
		streams, retry, err := longFetch(ctx, conn, streamPos, maxCount, positions)
		if err != nil {
			return nil, err
		}
		if !retry {
			log.Debugf("SyncStreams end: %s", formatSyncResults(streams))
			return streams, nil
		}
		log.Debugf("SyncStreams retry: %s", formatSyncResults(streams))
	}
}

func longFetch(ctx context.Context, conn *pgxpool.Conn, streamPos []StreamPos, maxCount int, positions map[string][]byte) (map[string]StreamEventsBlock, bool, error) {
	tx, err := startConnTx(ctx, conn)
	if err != nil {
		return nil, false, err
	}
	defer func() {
		err := tx.Rollback(ctx)
		if err != nil {
			if errors.Is(err, pgx.ErrTxClosed) {
				return
			}
			log.Errorf("SyncStream: Failed to rollback transaction: %s", err)
		}
	}()

	events, seqNums, err := fetchMessages(ctx, tx, streamPos, maxCount)
	if err != nil {
		return nil, false, err
	}

	streams := map[string]StreamEventsBlock{}
	if len(events) != 0 {
		for streamId, events := range events {
			streams[streamId] = StreamEventsBlock{
				OriginalSyncCookie: positions[streamId],
				SyncCookie:         SeqNumToBytes(seqNums[streamId], streamId),
				Events:             events,
			}
		}
		err := tx.Commit(ctx)
		if err != nil {
			return nil, false, err
		}

		log.Debugf("SyncStreams return: %s", formatSyncResults(streams))
		return streams, false, nil
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, false, err
	}

	syncStreamsLongPoll.Inc()
	// wait for the database notifications
	log.Debug("SyncStreams wait for notification ...")
	_, err = conn.Conn().WaitForNotification(ctx)
	if errors.Is(err, context.DeadlineExceeded) {
		log.Debug("SyncStreams wait for notification timeout")
		longPollTimeout.Inc()
		return nil, false, nil
	}
	if err != nil {
		log.Debug("SyncStreams wait for notification error %w", err)
		if errors.Is(err, context.Canceled) {
			return nil, false, nil
		}
		return nil, false, fmt.Errorf("error waiting for notification: %w", err)
	}
	log.Debug("SyncStreams wait for notification done")
	return nil, true, nil
}

//go:embed init_db.sql
var schema string

func initStorage(ctx context.Context, pool *pgxpool.Pool) error {

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
				log.Errorf("InitStorage: Failed to rollback transaction: %s", err)
			}
		}
	}()

	_, err = tx.Exec(context.Background(), schema)
	if err != nil {
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Errorf("Failed to commit transaction: %s", err)
		return err
	}
	committed = true
	return nil
}

func cleanStorage(ctx context.Context, pool *pgxpool.Pool) error {

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
				log.Errorf("CleanStorage: Failed to rollback transaction: %s", err)
			}
		}
	}()

	_, err = tx.Exec(context.Background(), "DROP SCHEMA public CASCADE")
	if err != nil {
		return err
	}

	_, err = tx.Exec(context.Background(), "CREATE SCHEMA public")
	if err != nil {
		return err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Errorf("Failed to commit transaction: %s", err)
		return err
	}
	committed = true
	return nil
}

//go:embed create_stream.sql
var createStream string

func createStreamSql(streamId string) string {
	return strings.ReplaceAll(createStream, "<<name>>",
		sanitizeSqlName(streamId))
}

func streamSqlName(streamId string) string {
	return fmt.Sprintf("stream_%s", sanitizeSqlName(streamId))
}

func sanitizeSqlName(name string) string {
	return strings.ReplaceAll(name, "-", "_")
}
