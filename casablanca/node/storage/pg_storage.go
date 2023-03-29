package storage

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/protobuf/encoding/protojson"

	"strings"

	"casablanca/node/events"
	"casablanca/node/infra"
	"casablanca/node/protocol"

	log "github.com/sirupsen/logrus"
)

const (
	PG_EVENT_TABLE_NAME_PREFIX = "es_"
)

// implemnent the EventStore interface
type PGEventStore struct {
	pool           *pgxpool.Pool
	consumers      *SubsMap
	multiplexerCtl chan bool
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

// NewPGEventStore creates a new PGEventStore
func NewPGEventStore(ctx context.Context, database_url string, clean bool) (*PGEventStore, error) {
	log := infra.GetLogger(ctx)

	pool, err := pgxpool.New(ctx, database_url)

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

	store := &PGEventStore{pool: pool, multiplexerCtl: make(chan bool), consumers: NewSmap()}
	err = store.startMultiplexer(ctx)
	if err != nil {
		return nil, err
	}

	go func() {
		ctx, log := infra.SetLoggerWithProcess(ctx, "debug-events-loop")
		for {
			select {
			case <-ctx.Done():
				log.Debug("Debug events dump: context done")
				return
			case <-time.After(1 * time.Second):
				err := dump(store, ctx)
				if err != nil {
					log.Errorf("Debug events dump error: %v", err)
				}
			}
		}
	}()

	return store, nil
}

func dump(store *PGEventStore, ctx context.Context) error {
	log := infra.GetLogger(ctx)
	streams, err := store.GetStreams(ctx)
	if err != nil {
		log.Errorf("GetStreams: %v", err)
		return err
	}

	tx, err := store.pool.Begin(ctx)
	if err != nil {
		log.Errorf("Begin: %v", err)
		return err
	}
	var committed = false
	defer func() {
		if !committed {
			err := tx.Rollback(ctx)
			if err != nil {
				log.Errorf("Rollback: %v", err)
			}
		}
	}()

	for _, stream := range streams {

		numEvents, err := addDebugEvents(ctx, tx, stream)
		if err != nil {
			log.Errorf("addDebugEvents: %v", err)
			rollbackErr := tx.Rollback(ctx)
			if rollbackErr != nil {
				log.Errorf("addDebugEvents Rollback: %v", rollbackErr)
			}
			return err
		}
		if numEvents > 0 {
			log.Debug("Debug events dump: ", numEvents)
		}
	}
	err = tx.Commit(ctx)
	if err != nil {
		log.Errorf("Commit: %v", err)
		return err
	}
	committed = true
	return nil
}

// Close closes the connection to the database
func (s *PGEventStore) Close() error {
	defer s.pool.Close()
	err := s.stopMultiplexer()
	if err != nil {
		return err
	}
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
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.ReadCommitted})
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

func addEvents(ctx context.Context, tx pgx.Tx, streamId string, envelopes []*protocol.Envelope) (int64, error) {
	log := infra.GetLogger(ctx)

	parsedEvents := events.FormatEventsToJson(envelopes)
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

	log.Debugf("inserting message with hashes: %s", parsedEvents)

	err := lockTable(ctx, tx, streamSqlName(streamId))
	if err != nil {
		return -1, err
	}

	var seqNum int64
	err = tx.QueryRow(ctx, sb.String(), params...).Scan(&seqNum)
	if err != nil {
		return -1, err
	}
	log.Debugf("inserted int streamId: %s message with seq_num: %d for events: %s", streamId, seqNum, parsedEvents)
	return seqNum, nil
}

func addDebugEvents(ctx context.Context, tx pgx.Tx, streamId string) (int, error) {
	log := infra.GetLogger(ctx)
	rows, err := tx.Query(ctx, fmt.Sprintf("SELECT seq_num, hash, signature, event FROM %s e WHERE NOT EXISTS (SELECT 1 FROM es_events_debug d WHERE d.seq_num =  e.seq_num and es_name = $1)",
		streamSqlName(streamId)), streamId)
	if err != nil {
		log.Debug("error: ", err)
		return 0, err
	}
	defer rows.Close()

	parsedEvents := make(map[int64]*events.ParsedEvent)

	for rows.Next() {
		var seq_num int64
		var hash []byte
		var signature []byte
		var event []byte
		err = rows.Scan(&seq_num, &hash, &signature, &event)
		if err != nil {
			return 0, err
		}
		parsedEvent, err := events.ParseEvent(&protocol.Envelope{
			Hash:      hash,
			Signature: signature,
			Event:     event,
		})

		if err != nil {
			return 0, err
		}
		parsedEvents[seq_num] = parsedEvent
	}

	for seq_num, parsedEvent := range parsedEvents {
		// convert parsedEvents to json
		js, err := json.Marshal(parsedEvent)
		if err != nil {
			return 0, err
		}

		log.Debugf("inserting debug event: %s", hex.EncodeToString(parsedEvent.Envelope.Hash))
		_, err = tx.Exec(ctx, "INSERT INTO es_events_debug (es_name, seq_num, hash, signature, event) VALUES ($1, $2, $3, $4, $5::jsonb)",
			streamId, seq_num, parsedEvent.Envelope.Hash, parsedEvent.Envelope.Signature, string(js))
		if err != nil {
			return 0, err
		}

	}
	return len(parsedEvents), nil
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
	}

	sql := createStreamSql(streamID)
	_, err = tx.Exec(ctx, sql)
	if err != nil {
		log.Error("CreateStream createStreamSql error ", err)
		return nil, err
	}

	// add the inception events
	seqNum, err := addEvents(ctx, tx, streamID, inceptionEvents)
	if err != nil {
		log.Error("CreateStream addEvents error ", err)
		return nil, err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}
	committed = true
	log.Debug("committed stream: ", streamID, " with seq_num: ", seqNum)
	return SeqNumToBytes(seqNum, streamID), nil
}

func (s *PGEventStore) AddEvent(ctx context.Context, streamId string, event *protocol.Envelope) ([]byte, error) {
	err := infra.EnsureRequestId(ctx)
	if err != nil {
		return nil, err
	}

	log := infra.GetLogger(ctx)
	eventsAsString := events.FormatEventsToJson([]*protocol.Envelope{event})
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
	if !exists {
		return nil, fmt.Errorf("stream %s does not exist", streamId)
	}

	// add the event
	seqNum, err := addEvents(ctx, tx, streamId, []*protocol.Envelope{event})
	if err != nil {
		return nil, err
	}

	err = tx.Commit(ctx)
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
	log.Debug("events: ", seqNums.String(), " lastSeqNum: ", nextSeqNums)
	return events, nextSeqNums, nil
}

func send(ctx context.Context, id string, output chan<- StreamEventsBlock, block StreamEventsBlock) {
	log := infra.GetLogger(ctx)
	select {
	case output <- block:
		log.Debugf("Sent to id: %v block with syncCookie %s and %d events", id,
			hex.EncodeToString(block.SyncCookie), len(block.Events))
	case <-time.After(1 * time.Second):
		log.Debugf("Dropping block with %d events after timeout", len(block.Events))
	}
}

// TODO only select streams that have listeners
func (s *PGEventStore) getLastSeqNum(ctx context.Context) (map[string]int64, error) {
	streams, err := s.GetStreams(ctx)
	if err != nil {
		return nil, err
	}

	conn, err := s.pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Release()
	seqNums := make(map[string]int64)
	for _, stream := range streams {
		rows, err := conn.Query(ctx, fmt.Sprintf("SELECT COALESCE(max(seq_num), -1) FROM %s", streamSqlName(stream)))
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		var seqNum int64
		for rows.Next() {
			err = rows.Scan(&seqNum)
			if err != nil {
				return nil, err
			}
		}
		seqNums[stream] = seqNum
	}
	return seqNums, nil
}

/**
 * getLastEvents returns the last events from the event store
 * @param {context.Context} ctx - the context
 * @param {pgx.Tx} tx - the transaction
 * @param {int64} seqNum - the sequence number to start from
 * @param {int64} lastSeqNum - the last sequence number
 * @returns {map[string][]*FullEvent} - the events foir each stream sorted by sequence number (ascending)
 * @returns {error} - any error
 */
func (s *PGEventStore) getLastEvents(ctx context.Context, tx pgx.Tx, selection map[string]int64) (map[string][]*events.FullEvent, error) {
	log := infra.GetLogger(ctx)
	log.Debugf("Fetching events from %v", selection)

	allEvents := make(map[string][]*events.FullEvent)
	for stream, seqNum := range selection {
		sql := fmt.Sprintf("SELECT seq_num, hash, signature, event FROM %s WHERE seq_num > $1 ORDER BY seq_num", streamSqlName(stream))
		log.Debugf("Fetching events from %s with sql %s [%d]", stream, sql, seqNum)
		rows, err := tx.Query(ctx, sql, seqNum)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		fullEvents := []*events.FullEvent{}
		for rows.Next() {
			var currentSeqNum int64
			var hash []byte
			var signature []byte
			var event_buf []byte
			err = rows.Scan(&currentSeqNum, &hash, &signature, &event_buf)
			if err != nil {
				return nil, err
			}
			parsedEvent, err := events.ParseEvent(&protocol.Envelope{
				Hash:      hash,
				Signature: signature,
				Event:     event_buf,
			})
			if err != nil {
				return nil, err
			}
			fullEvents = append(fullEvents, &events.FullEvent{
				StreamId:    stream,
				SeqNum:      currentSeqNum,
				ParsedEvent: parsedEvent,
			})
		}
		log.Debugf("Fetched %d events", len(fullEvents))
		allEvents[stream] = fullEvents
	}
	return allEvents, nil
}

const (
	// TODO make it configurable
	NOTIFICATIONS_LOOP_INTERVAL = 30 * time.Second
)

func (s *PGEventStore) startMultiplexer(ctx context.Context) error {
	ctx, log := infra.SetLoggerWithProcess(ctx, "multiplexer")

	go func() {
		// TODO handle reconnects
		conn, err := s.pool.Acquire(ctx)
		if err != nil {
			log.Error("Error acquiring connection: ", err)
			return
		}
		defer conn.Release()

		_, err = conn.Exec(ctx, "LISTEN es_newevent")
		if err != nil {
			log.Error("Error listening to es_events: ", err)
			return
		}

		lastKnownSeqNums, err := s.getLastSeqNum(ctx)
		if err != nil {
			log.Error("Error getting last seq num: ", err)
			return
		}

		// multiplexer loop - check for new events and notifies consumers
		// it is important that the only one instance of this function is running
		multiplexerIteration := func(ctx context.Context) error {

			lastEventNums, err := s.getLastSeqNum(ctx)
			if err != nil {
				return fmt.Errorf("failed to get last seq num: %w", err)
			}

			diff := seqNumsDiff(lastKnownSeqNums, lastEventNums)
			log.Debugf("Fetched new sequence numbers len(diff) %d diff %v", len(diff), diff)

			// some changes in the database, notify consumers immediately
			if len(diff) > 0 {
				tx, err := startTx(ctx, s.pool)
				if err != nil {
					return fmt.Errorf("failed to start a transaction: %w", err)
				}
				selection := s.consumers.getMinSeqNum(lastEventNums)
				lastEvents, err := s.getLastEvents(ctx, tx, selection)
				if err != nil {
					rollbackErr := tx.Rollback(ctx)
					if rollbackErr != nil {
						log.Errorf("Failed to rollback transaction: %v", rollbackErr)
					}
					return fmt.Errorf("failed to get last events: %w", err)
				}
				commitErr := tx.Commit(ctx)
				if commitErr != nil {
					log.Errorf("Failed to commit transaction: %v", commitErr)
					return commitErr
				}

				seqNums := strings.Builder{}
				for stream, events := range lastEvents {
					seqNums.WriteString(fmt.Sprintf("%s: ", stream))
					for _, event := range events {
						seqNums.WriteString(fmt.Sprintf("%d, ", event.SeqNum))
					}
				}
				log.Debugf("Events: %s", seqNums.String())
				for stream, events := range lastEvents {
					log.Debugf("Extracted %d events %s (start: %v last seq: %v)", len(events), stream, lastKnownSeqNums, lastEventNums)
				}

				readyBlocks := s.consumers.Filter(lastEvents)
				for id, block := range readyBlocks {
					rx, ok := s.consumers.GetByUUID(id)
					if ok {
						log.Debugf("Sending %d event(s) to sub %s", len(block.Events), id)
						go send(ctx, id, rx.notifyChan, block)
					}
				}
				lastKnownSeqNums = lastEventNums
			}

			// wait for the database notifications
			notification, err := conn.Conn().WaitForNotification(ctx)
			if errors.Is(err, context.DeadlineExceeded) {
				return nil
			}
			if err != nil {
				return fmt.Errorf("error waiting for notification: %w", err)
			}
			// Note: payload is not used for anything except debugging
			notificationStreamId := strings.ReplaceAll(strings.Split(notification.Payload, ":")[1], "_", "-")
			log.Debug("PID:", notification.PID, "Channel:", notification.Channel, "notificationStreamId:", notificationStreamId)
			return nil
		}

		// run the multiplexer loop

		// waiting group to make sure only once instance of the loop function is running
		wg := sync.WaitGroup{}
		retries := 0
		for {
			wg.Wait()
			ctx, cancel := context.WithTimeout(ctx, NOTIFICATIONS_LOOP_INTERVAL)
			iterationDone := make(chan bool)
			wg.Add(1)
			go func() {
				err := multiplexerIteration(ctx)
				if err != nil {
					log.Error(err)
					// TODO make it configurable
					timeout := backoff(retries, time.Second, 30*time.Second, 15)
					time.Sleep(timeout)
					retries++
				}
				wg.Done()
				close(iterationDone)
			}()

			select {
			case <-s.multiplexerCtl:
				log.Debug("Stopping multiplexer message")
				cancel()
				wg.Wait()
				return
			case <-ctx.Done():
				/* do nothing, restart the loop */
			case <-iterationDone:
				cancel()
				/* do nothing, restart the loop */
			}

		}
	}()

	return nil
}

func (s *PGEventStore) stopMultiplexer() error {
	s.multiplexerCtl <- true
	log.Debug("Stopping multiplexer")
	s.consumers.ForEach(func(sub *SmapEntry) {
		log.Debugf("Unsubscribing from subscriber %s", sub.id)
		close(sub.notifyChan)
	})
	return nil
}

func (s *PGEventStore) subscribe(ctx context.Context, streamId string, startCookie []byte) (*SmapEntry, error) {
	log := infra.GetLogger(ctx)
	sub := s.consumers.Add(streamId, startCookie, fmt.Sprintf("%s-%s", infra.GetRequestId(ctx), uuid.New().String()))
	log.Debugf("Subscribing to streamId:  %s as subId: %s", streamId, sub.id)
	return sub, nil
}

func (s *PGEventStore) unsubscribe(ctx context.Context, streamId string, id string) {
	log := infra.GetLogger(ctx)
	log.Debugf("Unsubscribing subId: %s from streamId: %s", id, streamId)
	s.consumers.Delete(streamId, id)
}

type syncEvent struct {
	streamId string
	events   StreamEventsBlock
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
			hashes.WriteString(events.FormatEventsToJson([]*protocol.Envelope{event}))
			if idx < len(block.Events)-1 {
				hashes.WriteString(",")
			}
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

	longStreams := map[string]struct{}{}

	streams := map[string]StreamEventsBlock{}
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
	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return nil, err
	}
	events, seqNums, err := fetchMessages(ctx, tx, streamPos, maxCount)
	if err != nil {
		return nil, err
	}
	defer func() {
		err := tx.Rollback(ctx)
		if err != nil {
			log.Errorf("Failed to rollback transaction: %s", err)
		}
	}()

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
			return nil, err
		}

		log.Debugf("SyncStreams return: %s", formatSyncResults(streams))
		return streams, nil
	}

	var results chan *syncEvent = make(chan *syncEvent, len(events))
	for _, pos := range syncPositions {
		streamId := pos.StreamId
		log.Debugf("SyncStreams: %s", streamId)
		var cookie []byte
		if pos.SyncCookie == nil {
			cookie = []byte{0}
		} else {
			cookie = pos.SyncCookie
		}
		// subscribe to stream
		rx, err := s.subscribe(ctx, streamId, cookie)
		if err != nil {
			return nil, err
		}
		longStreams[string(streamId)] = struct{}{}
		prod := func() {
			log.Debugf("SyncStreams: Waiting for events for stream: %s (TimeoutMs: %d)", streamId, TimeoutMs)
			select {
			case <-ctx.Done():
			case events := <-rx.notifyChan:
				results <- &syncEvent{streamId: streamId, events: events}
			case <-time.After(time.Duration(TimeoutMs) * time.Millisecond):
				log.Warn("SyncStreams: Timeout waiting for events for stream: ", string(streamId), " ", TimeoutMs)
				// log.Debug("Sending nil result")
				var result *syncEvent = nil
				if result == nil {
					results <- nil
				}
			}
			s.unsubscribe(ctx, streamId, rx.id)
		}
		go prod()
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	if len(longStreams) != 0 {
		log.Debug("SyncStreams: Waiting for long streams: ", longStreams)
	}

	log.Debugf("SyncStreams: Waiting for results for %d long poll", len(longStreams))
	// results guaranteed to have this amout of messages
	count := len(results)
	if count == 0 && len(longStreams) > 0 {
		// block for at least one message
		count = 1
	}
	for count > 0 {
		log.Debug("SyncStreams: Waiting for an event")
		result := <-results
		if result != nil {
			log.Debugf("SyncStreams: Got an event for %s", string(result.streamId))
			hashes := []string{}
			for _, event := range result.events.Events {
				hashes = append(hashes, hex.EncodeToString(event.Hash))
			}
			log.Debugf("SyncStreams: Got result for stream %s (%v)", result.streamId, hashes)
			streams[result.streamId] = result.events
		} else {
			log.Debug("SyncStreams: no events")
		}
		count = len(results)
	}
	err = validatePositions(syncPositions, streams)
	if err != nil {
		return nil, err
	}
	return streams, nil
}

func validatePositions(initialPosition []*protocol.SyncPos, resultPositions map[string]StreamEventsBlock) error {
	positions := make(map[string]*protocol.SyncPos)
	for _, pos := range initialPosition {
		positions[string(pos.StreamId)] = pos
	}
	for str, pos := range resultPositions {
		if _, ok := positions[str]; !ok {
			return fmt.Errorf("stream %s not found in initial position", str)
		}
		if !bytes.Equal(positions[str].SyncCookie, pos.OriginalSyncCookie) {
			return fmt.Errorf("syncCookie mismatch for stream %s", str)
		}
	}
	return nil
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
				log.Errorf("Failed to rollback transaction: %s", err)
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
				log.Errorf("Failed to rollback transaction: %s", err)
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
		strings.ReplaceAll(streamId, "-", "_"))
}

func streamSqlName(streamId string) string {
	return fmt.Sprintf("stream_%s", strings.ReplaceAll(streamId, "-", "_"))

}

/*
This function returns watermarks for all updated streams.
*/
func seqNumsDiff(origMap map[string]int64, newMap map[string]int64) map[string]int64 {

	diff := map[string]int64{}
	for streamId, seqNum := range newMap {
		oldVal, ok := origMap[streamId]
		if !ok || oldVal != seqNum {
			diff[streamId] = seqNum
		}
	}
	return diff
}

// exponential backoff with min/max timeout and jitter (1s)
// min/max timeouts are suggestive (with correction for the jitter)
// the calculated timeout is growing (mostly) exponentially starting with minTimeout and should reach maxTimeout after retriesAtMax retries
func backoff(retries int, minTimeout time.Duration, maxTimeout time.Duration, retriesAtMax int) time.Duration {
	timeout := maxTimeout
	alpha := math.Log(float64(maxTimeout)/float64(minTimeout)) / float64(retriesAtMax)
	// timeout is capped using effective retries cap
	if retries < retriesAtMax {
		timeout = time.Duration(math.Pow(math.E, float64(retries)*alpha)) * minTimeout
	}
	timeout += time.Duration(rand.Intn(1000)) * time.Millisecond
	return timeout
}
