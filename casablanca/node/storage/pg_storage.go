package storage

import (
	"context"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"strings"

	. "casablanca/node/events"
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

// NewPGEventStore creates a new PGEventStore
func NewPGEventStore(ctx context.Context, database_url string) (*PGEventStore, error) {
	pool, err := pgxpool.New(ctx, database_url)

	if err != nil {
		return nil, err
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
			case <-time.After(10 * time.Second):
				stats := pool.Stat()
				log.Debugf("PG pool stats: %d, %d, %d, %d", stats.AcquireCount(), stats.AcquiredConns(), stats.IdleConns(), stats.TotalConns())
			}
		}
	}()

	go func() {
		for {
			select {
			case <-ctx.Done():
				log.Debug("Debug events dump: context done")
				return
			case <-time.After(1 * time.Second):
				tx, err := pool.Begin(ctx)
				if err != nil {
					log.Errorf("Begin: %v", err)
					return
				}
				numEvents, err := addDebugEvents(ctx, tx)
				if err != nil {
					log.Errorf("addDebugEvents: %v", err)
					tx.Rollback(ctx)
					return
				}
				tx.Commit(ctx)
				if numEvents > 0 {
					log.Debug("Debug events dump: ", numEvents)
				}
			}
		}
	}()

	store := &PGEventStore{pool: pool, multiplexerCtl: make(chan bool), consumers: NewSmap()}
	store.startMultiplexer(ctx)
	return store, nil
}

// Close closes the connection to the database
func (s *PGEventStore) Close() error {
	s.stopMultiplexer()
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

func byteToPgHex(b []byte) string {
	return fmt.Sprintf("\\x%s", hex.EncodeToString(b))
}

func pgHexToByte(in string) ([]byte, error) {
	if len(in) < 3 {
		return nil, errors.New("invalid hex string")
	}
	return hex.DecodeString(in[2:])
}

func addEvents(ctx context.Context, tx pgx.Tx, streamId string, events []*protocol.Envelope) (int64, error) {
	sb := strings.Builder{}
	sb.WriteString("INSERT INTO es_events (es_name, hash, signature, event) VALUES ")
	for idx := range events {
		if idx > 0 {
			sb.WriteString(", ")
		}
		sb.WriteString("('")
		sb.WriteString(streamId)
		sb.WriteString("', '")
		sb.WriteString(byteToPgHex(events[idx].Hash))
		sb.WriteString("', '")
		sb.WriteString(byteToPgHex(events[idx].Signature))
		sb.WriteString("', '")
		sb.WriteString(byteToPgHex(events[idx].Event))
		sb.WriteString("')")
	}
	sb.WriteString(" RETURNING seq_num")

	var seqNum int64
	sql := sb.String()
	log.Debug("sql: ", sql)
	err := tx.QueryRow(ctx, sb.String()).Scan(&seqNum)
	if err != nil {
		return -1, err
	}
	return seqNum, nil
}

func addDebugEvents(ctx context.Context, tx pgx.Tx) (int, error) {
	rows, err := tx.Query(ctx, "SELECT es_name, seq_num, hash, signature, event FROM es_events e WHERE NOT EXISTS (SELECT 1 FROM es_events_debug d WHERE d.seq_num =  e.seq_num)")
	if err != nil {
		log.Debug("error: ", err)
		return 0, err
	}
	defer rows.Close()

	events := make(map[int64]*ParsedEvent)

	for rows.Next() {
		var es_name string
		var seq_num int64
		var hash []byte
		var signature []byte
		var event []byte
		err = rows.Scan(&es_name, &seq_num, &hash, &signature, &event)
		if err != nil {
			return 0, err
		}
		parsedEvent, err := ParseEvent(es_name, &protocol.Envelope{
			Hash:      hash,
			Signature: signature,
			Event:     event,
		})

		if err != nil {
			return 0, err
		}
		events[seq_num] = parsedEvent
	}

	for seq_num, parsedEvent := range events {
		// convert parsedEvents to json
		js, err := json.Marshal(parsedEvent)
		if err != nil {
			return 0, err
		}

		log.Debugf("inserting debug event: %s", string(js))
		_, err = tx.Exec(ctx, "INSERT INTO es_events_debug (es_name, seq_num, hash, signature, event) VALUES ($1, $2, $3, $4, $5::jsonb)",
			parsedEvent.StreamId, seq_num, parsedEvent.Envelope.Hash, parsedEvent.Envelope.Signature, string(js))
		if err != nil {
			return 0, err
		}

	}
	return len(events), nil
}

// CreateStream creates a new event stream
func (s *PGEventStore) CreateStream(ctx context.Context, streamID string, inceptionEvents []*protocol.Envelope) ([]byte, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	exists, err := streamExists(ctx, tx, streamID)
	if err != nil {
		return nil, err
	}
	if !exists {
		err := createEventStreamInstance(ctx, tx, streamID)
		if err != nil {
			return nil, err
		}
	}

	// add the inception events
	seqNum, err := addEvents(ctx, tx, streamID, inceptionEvents)
	if err != nil {
		return nil, err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	return SeqNumToBytes(seqNum), nil
}

func (s *PGEventStore) AddEvent(ctx context.Context, streamID string, event *protocol.Envelope) ([]byte, error) {
	log.Debug("Storage: AddEvent: ", string(streamID), " ", hex.EncodeToString(event.Hash))
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	exists, err := streamExists(ctx, tx, streamID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, fmt.Errorf("stream %s does not exist", string(streamID))
	}

	// add the event
	seqNum, err := addEvents(ctx, tx, streamID, []*protocol.Envelope{event})
	if err != nil {
		return nil, err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	return SeqNumToBytes(seqNum), nil
}

// GetStreams returns a list of all event streams
func (s *PGEventStore) GetStreams(ctx context.Context) ([]string, error) {
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

func getStream(ctx context.Context, tx pgx.Tx, streamId string) (string, error) {
	rows, err := tx.Query(ctx, "SELECT name FROM es WHERE name = $1", streamId)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	if rows.Next() {
		var streamName string
		err = rows.Scan(&streamName)
		if err != nil {
			return "", err
		}
		return streamName, nil
	}
	return "", errors.New("stream not found")

}

func (s *PGEventStore) GetStream(ctx context.Context, streamId string) (StreamPos, []*protocol.Envelope, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return StreamPos{}, nil, err
	}
	defer tx.Rollback(ctx)

	streamName, err := getStream(ctx, tx, streamId)
	if err != nil {
		return StreamPos{}, nil, err
	}

	pos := StreamPos{
		StreamId:   streamName,
		SyncCookie: SeqNumToBytes(-1),
	}
	events, seqNum, err := fetchMessages(ctx, tx, []StreamPos{pos})
	if err != nil {
		return StreamPos{}, nil, err
	}
	streamPos := StreamPos{
		StreamId:   streamName,
		SyncCookie: SeqNumToBytes(seqNum),
	}
	return streamPos, events[string(streamId)], nil
}

func (s *PGEventStore) StreamInfo(ctx context.Context, streamId string) (StreamPos, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return StreamPos{}, err
	}
	defer tx.Rollback(ctx)

	streamName, err := getStream(ctx, tx, streamId)
	if err != nil {
		return StreamPos{}, err
	}

	pos := StreamPos{
		StreamId:   streamName,
		SyncCookie: SeqNumToBytes(-1),
	}
	return pos, nil
}

// DeleteStream deletes an event stream
func (s *PGEventStore) DeleteStream(ctx context.Context, streamID string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, "DELETE FROM es_events WHERE es_name = $1", streamID)
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

// AddEvents adds events to an event stream
func (s *PGEventStore) AddEvents(ctx context.Context, streamID string, events []*protocol.Envelope) ([]byte, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	seqNum, err := addEvents(ctx, tx, streamID, events)
	if err != nil {
		return nil, err
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	return SeqNumToBytes(seqNum), nil
}

func fetchMessages(ctx context.Context, tx pgx.Tx, positions []StreamPos) (map[string][]*protocol.Envelope, int64, error) {

	log.Debug("fetchMessages: ", len(positions))
	sql := strings.Builder{}
	for i, pos := range positions {
		seqNum := BytesToSeqNum(pos.SyncCookie)
		sql.WriteString(fmt.Sprintf("SELECT es_name, hash, signature, event, seq_num FROM es_events WHERE es_name = $%d", i+1))
		sql.WriteString(" AND seq_num > ")
		sql.WriteString(fmt.Sprintf("%d", seqNum))
		if i < len(positions)-1 {
			sql.WriteString(" UNION ALL ")
		}
	}
	if len(positions) != 0 {
		sql.WriteString(" ORDER BY seq_num")
	}

	params := make([]interface{}, len(positions))
	log.Debug("sql: ", sql.String(), " params: ", params)
	for i, pos := range positions {
		params[i] = pos.StreamId
	}
	rows, err := tx.Query(ctx, sql.String(), params...)
	if err != nil {
		log.Debug("error: ", err)
		return nil, -1, err
	}
	defer rows.Close()

	events := map[string][]*protocol.Envelope{}
	var lastSeqNum int64
	for rows.Next() {
		var name []byte
		var hash []byte
		var signature []byte
		var event_buf []byte
		var seqNum int64
		err = rows.Scan(&name, &hash, &signature, &event_buf, &seqNum)
		if err != nil {
			return nil, -1, err
		}
		if seqNum > lastSeqNum {
			lastSeqNum = seqNum
		}
		if _, ok := events[string(name)]; !ok {
			events[string(name)] = []*protocol.Envelope{}
		}
		events[string(name)] = append(events[string(name)], &protocol.Envelope{
			Hash:      hash,
			Signature: signature,
			Event:     event_buf,
		})
	}
	log.Debug("events: ", events, " lastSeqNum: ", lastSeqNum)
	return events, lastSeqNum, nil
}

func send(output chan<- StreamEventsBlock, block StreamEventsBlock) {
	select {
	case output <- block:
		log.Debug("Sent block", block)
	case <-time.After(1 * time.Second):
		log.Debug("Dropping block after timeout", block)
	}
}

func (s *PGEventStore) getLastSeqNum(ctx context.Context, conn *pgxpool.Conn) (int64, error) {
	rows, err := conn.Query(ctx, "SELECT COALESCE(max(seq_num), -1) FROM es_events")
	if err != nil {
		return -1, err
	}
	defer rows.Close()
	var seqNum int64
	for rows.Next() {
		err = rows.Scan(&seqNum)
		if err != nil {
			return -1, err
		}
	}
	return seqNum, nil
}

func (s *PGEventStore) getLastEvents(ctx context.Context, conn *pgxpool.Conn, seqNum int64, lastSeqNum int64) (map[int64]*ParsedEvent, error) {
	log.Debugf("Fetching events from %d to %d", seqNum, lastSeqNum)
	rows, err := conn.Query(ctx, "SELECT seq_num, es_name, hash, signature, event FROM es_events WHERE seq_num > $1 and seq_num <= $2 ORDER BY seq_num", seqNum, lastSeqNum)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := map[int64]*ParsedEvent{}
	for rows.Next() {
		var currentSeqNum int64
		var esName string
		var hash []byte
		var signature []byte
		var event_buf []byte
		err = rows.Scan(&currentSeqNum, &esName, &hash, &signature, &event_buf)
		if err != nil {
			return nil, err
		}
		parsedEvent, err := ParseEvent(esName, &protocol.Envelope{
			Hash:      hash,
			Signature: signature,
			Event:     event_buf,
		})
		if err != nil {
			return nil, err
		}
		events[currentSeqNum] = parsedEvent
	}
	log.Debugf("Fetched %d events", len(events))
	return events, nil
}

func (s *PGEventStore) startMultiplexer(ctx context.Context) error {

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

		seqNum, err := s.getLastSeqNum(ctx, conn)
		if err != nil {
			log.Error("Error getting last seq num: ", err)
			return
		}

		log.Debug("Starting multiplexer")

		for {

			select {
			case <-s.multiplexerCtl:
				log.Debug("Stopping multiplexer message")
				return
			default:
			}

			ctx, cancel := context.WithTimeout(ctx, 1*time.Second)
			defer cancel()

			notification, err := conn.Conn().WaitForNotification(ctx)
			if errors.Is(err, context.DeadlineExceeded) {
				continue
			}
			if err != nil {
				log.Error("Error waiting for notification: ", err)
				return
			}
			log.Debug("PID:", notification.PID, "Channel:", notification.Channel, "Payload:", notification.Payload)

			pg_event := PGEventNotificationEntry{}
			err = json.Unmarshal([]byte(notification.Payload), &pg_event)
			if err != nil {
				log.Error("Error parsing notification: ", err)
			} else {

				if pg_event.SeqNum <= seqNum {
					log.Debug("Skipping event: ", pg_event.SeqNum, " <= ", seqNum)
					continue
				}

				lastEvents, err := s.getLastEvents(ctx, conn, seqNum, pg_event.SeqNum)
				if err != nil {
					log.Error("Error getting last events: ", err)
					continue
				}
				log.Debugf("Extracted %d events (last seq: %d)", len(lastEvents), pg_event.SeqNum)
				seqNum = pg_event.SeqNum

				readyBlocks := s.consumers.Filter(lastEvents, SeqNumToBytes(seqNum))
				for id, block := range readyBlocks {
					rx, ok := s.consumers.GetByUUID(id)
					if ok {
						log.Debugf("Sending %d event(s) to sub %s", len(block.Events), id)
						go send(rx.notifyChan, block)
					}
				}
			}
		}
	}()

	return nil
}

func (s *PGEventStore) stopMultiplexer() error {
	s.multiplexerCtl <- true
	log.Debug("Stopping multiplexer")
	s.consumers.ForEach(func(sub *SmapEntry) {
		log.Debugf("Unsubscribing from subscriber %s", sub.id.String())
		close(sub.notifyChan)
	})
	return nil
}

func (s *PGEventStore) subscribe(streamId string, startCookie []byte) (*SmapEntry, error) {
	sub := s.consumers.Add(streamId, startCookie)
	log.Debugf("Subscribing to stream %s - %s", string(streamId), sub.id.String())
	return sub, nil
}

func (s *PGEventStore) unsubscribe(streamId string, id uuid.UUID) {
	log.Debugf("Unsubscribing %s from stream: %v", id, string(streamId))
	s.consumers.Delete(streamId, id)
}

type syncEvent struct {
	streamId string
	events   StreamEventsBlock
}

func (s *PGEventStore) SyncStreams(ctx context.Context, syncPositions []*protocol.SyncPos, TimeoutMs uint32) (map[string]StreamEventsBlock, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	longStreams := map[string]struct{}{}

	streams := map[string]StreamEventsBlock{}
	streamPos := make([]StreamPos, len(syncPositions))
	positions := make(map[string][]byte)
	for i, pos := range syncPositions {
		var cookie []byte
		if pos.SyncCookie == nil {
			cookie = []byte{0}
		} else {
			cookie = pos.SyncCookie
		}
		streamPos[i] = StreamPos{StreamId: pos.StreamId, SyncCookie: cookie}
		positions[string(pos.StreamId)] = cookie
	}
	events, seqNum, err := fetchMessages(ctx, tx, streamPos)
	if err != nil {
		return nil, err
	}

	if len(events) != 0 {
		for streamId, events := range events {
			streams[string(streamId)] = StreamEventsBlock{
				OriginalSyncCookie: positions[string(streamId)],
				SyncCookie:         SeqNumToBytes(seqNum),
				Events:             events,
			}
		}
		err := tx.Commit(ctx)
		if err != nil {
			return nil, err
		}
		return streams, nil
	}
	var results chan *syncEvent = make(chan *syncEvent, len(events))
	for _, pos := range syncPositions {
		streamId := pos.StreamId
		log.Debugf("SyncStreams: %s", string(streamId))
		var cookie []byte
		if pos.SyncCookie == nil {
			cookie = []byte{0}
		} else {
			cookie = pos.SyncCookie
		}
		// subscribe to stream
		rx, err := s.subscribe(streamId, cookie)
		if err != nil {
			return nil, err
		}
		longStreams[string(streamId)] = struct{}{}
		prod := func() {
			log.Debug("Waiting for events for stream: ", streamId)
			select {
			case <-ctx.Done():
			case events := <-rx.notifyChan:
				results <- &syncEvent{streamId: streamId, events: events}
			case <-time.After(time.Duration(TimeoutMs) * time.Millisecond):
				log.Error("Timeout waiting for events for stream: ", string(streamId), " ", TimeoutMs)
				// log.Debug("Sending nil result")
				var result *syncEvent = nil
				if result == nil {
					results <- nil
				}
			}
			s.unsubscribe(streamId, rx.id)
		}
		go prod()
	}

	err = tx.Commit(ctx)
	if err != nil {
		return nil, err
	}

	if len(longStreams) != 0 {
		log.Debug("Waiting for long streams: ", longStreams)
	}

	log.Debugf("Waiting for results for %d long poll", len(longStreams))
	// results guaranteed to have this amout of messages
	count := len(results)
	if count == 0 && len(longStreams) > 0 {
		// block for at least one message
		count = 1
	}
	for i := 0; i < count; i++ {
		log.Debug("Waiting for an event")
		result := <-results
		if result != nil {
			log.Debugf("Got an event for %s", string(result.streamId))
			hashes := []string{}
			for _, event := range result.events.Events {
				hashes = append(hashes, hex.EncodeToString(event.Hash))
			}
			log.Debugf("Got result for stream %s (%v)", string(result.streamId), hashes)
			streams[string(result.streamId)] = result.events
		} else {
			log.Debug("no events")
		}
	}
	return streams, nil
}

//go:embed init_db.sql
var schema string

func initStorage(ctx context.Context, pool *pgxpool.Pool) error {

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(context.Background(), schema)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
