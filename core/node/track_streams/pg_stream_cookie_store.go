package track_streams

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
)

// PostgresStreamCookieStore implements SyncCookieStore using PostgreSQL.
// This is a shared implementation that can be used by any service (App Registry, Notifications, etc.)
// that needs to persist sync cookies for stream resumption.
type PostgresStreamCookieStore struct {
	pool      *pgxpool.Pool
	tableName string
}

var _ SyncCookieStore = (*PostgresStreamCookieStore)(nil)

// NewPostgresStreamCookieStore creates a new PostgresStreamCookieStore.
// The tableName parameter allows different services to use different tables if needed,
// but typically "stream_sync_cookies" is used.
func NewPostgresStreamCookieStore(pool *pgxpool.Pool, tableName string) *PostgresStreamCookieStore {
	if tableName == "" {
		tableName = "stream_sync_cookies"
	}
	return &PostgresStreamCookieStore{
		pool:      pool,
		tableName: tableName,
	}
}

// GetSyncCookie retrieves a stored cookie for a stream.
// Returns (nil, zero time, nil) if no cookie exists for the stream.
func (s *PostgresStreamCookieStore) GetSyncCookie(
	ctx context.Context,
	streamID shared.StreamId,
) (*protocol.SyncCookie, time.Time, error) {
	var (
		minipoolGen       int64
		prevMiniblockHash []byte
		updatedAt         time.Time
	)

	err := s.pool.QueryRow(
		ctx,
		`SELECT minipool_gen, prev_miniblock_hash, updated_at
		 FROM `+s.tableName+`
		 WHERE stream_id = $1`,
		streamID,
	).Scan(&minipoolGen, &prevMiniblockHash, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, time.Time{}, nil // No cookie exists, return nil without error
		}
		return nil, time.Time{}, base.WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("failed to get sync cookie").
			Tag("streamId", streamID)
	}

	return &protocol.SyncCookie{
		StreamId:          streamID[:],
		MinipoolGen:       minipoolGen,
		PrevMiniblockHash: prevMiniblockHash,
	}, updatedAt, nil
}

// WriteSyncCookie stores or updates the sync cookie for a stream.
func (s *PostgresStreamCookieStore) WriteSyncCookie(
	ctx context.Context,
	streamID shared.StreamId,
	cookie *protocol.SyncCookie,
) error {
	if cookie == nil {
		return base.RiverError(protocol.Err_INVALID_ARGUMENT, "nil cookie").
			Tag("streamId", streamID)
	}

	_, err := s.pool.Exec(
		ctx,
		`INSERT INTO `+s.tableName+` (stream_id, minipool_gen, prev_miniblock_hash, updated_at)
		 VALUES ($1, $2, $3, NOW())
		 ON CONFLICT (stream_id)
		 DO UPDATE SET
		     minipool_gen = EXCLUDED.minipool_gen,
		     prev_miniblock_hash = EXCLUDED.prev_miniblock_hash,
		     updated_at = NOW()`,
		streamID,
		cookie.MinipoolGen,
		cookie.PrevMiniblockHash,
	)
	if err != nil {
		return base.WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("failed to persist sync cookie").
			Tag("streamId", streamID)
	}

	return nil
}

// DeleteStreamCookie removes a cookie when it's no longer needed.
// This is useful for cleanup when bots leave channels or are deactivated.
func (s *PostgresStreamCookieStore) DeleteStreamCookie(
	ctx context.Context,
	streamID shared.StreamId,
) error {
	_, err := s.pool.Exec(
		ctx,
		`DELETE FROM `+s.tableName+` WHERE stream_id = $1`,
		streamID,
	)
	if err != nil {
		return base.WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("failed to delete sync cookie").
			Tag("streamId", streamID)
	}

	return nil
}

// GetAllStreamCookies loads all stored cookies.
// This can be useful for bulk operations or debugging.
func (s *PostgresStreamCookieStore) GetAllStreamCookies(
	ctx context.Context,
) (map[shared.StreamId]*protocol.SyncCookie, error) {
	rows, err := s.pool.Query(
		ctx,
		`SELECT stream_id, minipool_gen, prev_miniblock_hash
		 FROM `+s.tableName+`
		 ORDER BY stream_id`,
	)
	if err != nil {
		return nil, base.WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("failed to load sync cookies")
	}
	defer rows.Close()

	cookies := make(map[shared.StreamId]*protocol.SyncCookie)

	for rows.Next() {
		var (
			streamID          shared.StreamId
			minipoolGen       int64
			prevMiniblockHash []byte
		)

		if err := rows.Scan(&streamID, &minipoolGen, &prevMiniblockHash); err != nil {
			return nil, base.WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
				Message("failed to scan sync cookie row")
		}

		cookies[streamID] = &protocol.SyncCookie{
			StreamId:          streamID[:],
			MinipoolGen:       minipoolGen,
			PrevMiniblockHash: prevMiniblockHash,
		}
	}

	if err := rows.Err(); err != nil {
		return nil, base.WrapRiverError(protocol.Err_DB_OPERATION_FAILURE, err).
			Message("error iterating sync cookie rows")
	}

	return cookies, nil
}
