package storage

import (
	"context"
	_ "embed"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"strings"

	"casablanca/node/base"
	"casablanca/node/dlog"
	"casablanca/node/protocol"
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
	PG_REPORT_INTERVAL = 3 * time.Minute
)

// NewPGEventStore creates a new PGEventStore
func NewPGEventStore(ctx context.Context, database_url string, clean bool) (*PGEventStore, error) {
	log := dlog.CtxLog(ctx)

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
				log.Debug("PG pool stats",
					"acquireCount", stats.AcquireCount(),
					"acquiredConns", stats.AcquiredConns(),
					"idleConns", stats.IdleConns(),
					"totalConns", stats.TotalConns(),
				)
			}
		}
	}()

	store := &PGEventStore{pool: pool, debugCtl: make(chan struct{})}

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

func lockTable(ctx context.Context, tx pgx.Tx, tableName string) error {
	_, err := tx.Exec(ctx, fmt.Sprintf("LOCK TABLE %s IN EXCLUSIVE MODE", tableName))
	if err != nil {
		return err
	}
	return nil
}

func addEvents(ctx context.Context, pool *pgxpool.Pool, streamId string, envelopes []*protocol.Envelope) (int64, error) {
	log := dlog.CtxLog(ctx)

	tx, err := startTx(ctx, pool)
	if err != nil {
		return -1, err
	}
	var commited = false
	defer func() {
		if !commited {
			err := tx.Rollback(ctx)
			if err != nil {
				log.Error("addEvents Rollback", "error", err)
			}
		}
	}()

	parsedEvents := base.FormatEnvelopeHashes(envelopes)

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
		log.Error("Commit error: ", err)
		return -1, err
	}
	commited = true
	log.Debug("PGEventStore.addEvents", "streamId", streamId, "seqNum", seqNum, "parsedEvents", parsedEvents)
	return seqNum, nil
}

// CreateStream creates a new event stream
func (s *PGEventStore) CreateStream(ctx context.Context, streamID string, inceptionEvents []*protocol.Envelope) error {
	log := dlog.CtxLog(ctx)

	tx, err := startTx(ctx, s.pool)
	if err != nil {
		log.Debug("CreateStream startTx error ", err)
		return err

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
		return err

	}

	exists, err := streamExists(ctx, tx, streamID)
	if err != nil {
		log.Error("CreateStream streamExists error ", err)
		return err

	}
	if !exists {
		err := createEventStreamInstance(ctx, tx, streamID)
		if err != nil {
			log.Error("CreateStream createEventStreamInstance error ", err)
			return err

		}
		sql := createStreamSql(streamID)
		_, err = tx.Exec(ctx, sql)
		if err != nil {
			log.Debug("CreateStream createStreamSql error ", err)
			return err

		}
		err = tx.Commit(ctx)
		if err != nil {
			log.Debug("CreateStream Commit error ", err)
			return err

		}
		committed = true
	}

	// add the inception events
	_, err = addEvents(ctx, s.pool, streamID, inceptionEvents)
	if err != nil {
		log.Error("CreateStream addEvents error ", err)
		return err

	}
	return nil
}

func (s *PGEventStore) AddEvent(ctx context.Context, streamId string, event *protocol.Envelope) error {
	log := dlog.CtxLog(ctx)
	tx, err := startTx(ctx, s.pool)
	if err != nil {
		return err
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
		return err
	}
	err = tx.Commit(ctx)
	if err != nil {
		return err
	}
	committed = true
	if !exists {
		return &ErrNotFound{streamId}
	}

	// add the event
	_, err = addEvents(ctx, s.pool, streamId, []*protocol.Envelope{event})
	if err != nil {
		log.Error("CreateStream commit error ", err)
		return err
	}
	committed = true

	return nil
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

func (s *PGEventStore) GetStream(ctx context.Context, streamId string) ([]*protocol.Envelope, error) {
	log := dlog.CtxLog(ctx)

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

	exists, err := checkStream(ctx, tx, streamId)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, &ErrNotFound{streamId}
	}

	pos := StreamPos{
		StreamId:   streamId,
		SyncCookie: -1,
	}
	events, _, err := fetchMessages(ctx, tx, []StreamPos{pos}, -1)
	if err != nil {
		return nil, err
	}

	err = tx.Commit(ctx)
	if err != nil {
		log.Error("GetStream commit error ", err)
		return nil, err
	}
	committed = true

	return events[streamId], nil
}

// DeleteStream deletes an event stream
func (s *PGEventStore) DeleteStream(ctx context.Context, streamID string) error {
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
	log := dlog.CtxLog(ctx)

	nextSeqNums := make(map[string]int64)

	sql := strings.Builder{}
	for i, pos := range positions {
		seqNum := pos.SyncCookie
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
	return events, nextSeqNums, nil
}

//go:embed init_db.sql
var schema string

func initStorage(ctx context.Context, pool *pgxpool.Pool) error {
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

func cleanStorage(ctx context.Context, pool *pgxpool.Pool) error {
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

	_, err = tx.Exec(ctx, "DROP SCHEMA public CASCADE")
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, "CREATE SCHEMA public")
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
