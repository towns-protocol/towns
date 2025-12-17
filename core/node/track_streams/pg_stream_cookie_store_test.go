package track_streams_test

import (
	"context"
	"crypto/rand"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/protocol"
	"github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/track_streams"
)

type testCookieStoreParams struct {
	ctx         context.Context
	cookieStore *track_streams.PostgresStreamCookieStore
	schema      string
	closer      func()
}

func setupCookieStoreTest(t *testing.T) *testCookieStoreParams {
	require := require.New(t)
	ctx := test.NewTestContext(t)

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDbWithPrefix(ctx, "cookie_")
	require.NoError(err, "Error configuring db for test")

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=10", 1)

	poolInfo, err := storage.CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(err, "Error creating pgx pool for test")

	// Run migrations to create the stream_sync_cookies table
	_, err = storage.NewPostgresAppRegistryStore(
		ctx,
		poolInfo,
		make(chan error, 1),
		infra.NewMetricsFactory(nil, "", ""),
	)
	require.NoError(err, "Error running migrations")

	cookieStore := track_streams.NewPostgresStreamCookieStore(poolInfo.Pool, "stream_sync_cookies")

	params := &testCookieStoreParams{
		ctx:         ctx,
		cookieStore: cookieStore,
		schema:      dbSchemaName,
		closer: func() {
			poolInfo.Pool.Close()
			dbCloser()
		},
	}

	t.Cleanup(params.closer)

	return params
}

func randomStreamId(t *testing.T) shared.StreamId {
	var id shared.StreamId
	_, err := rand.Read(id[:])
	require.NoError(t, err)
	// Set stream type to channel
	id[0] = shared.STREAM_CHANNEL_BIN
	return id
}

func TestGetStreamCookie_NotFound(t *testing.T) {
	params := setupCookieStoreTest(t)
	require := require.New(t)

	streamId := randomStreamId(t)

	// Getting a cookie that doesn't exist should return nil, zero time, nil
	cookie, updatedAt, err := params.cookieStore.GetSyncCookie(params.ctx, streamId)
	require.NoError(err, "GetSyncCookie should not return error for non-existent cookie")
	require.Nil(cookie, "Cookie should be nil for non-existent stream")
	require.True(updatedAt.IsZero(), "UpdatedAt should be zero for non-existent stream")
}

func TestPersistAndGetStreamCookie(t *testing.T) {
	params := setupCookieStoreTest(t)
	require := require.New(t)

	streamId := randomStreamId(t)

	// Create a cookie
	cookie := &protocol.SyncCookie{
		StreamId:          streamId[:],
		MinipoolGen:       42,
		PrevMiniblockHash: []byte{1, 2, 3, 4, 5, 6, 7, 8},
	}

	// Persist the cookie
	err := params.cookieStore.WriteSyncCookie(params.ctx, streamId, cookie)
	require.NoError(err, "WriteSyncCookie should succeed")

	// Retrieve the cookie
	retrieved, updatedAt, err := params.cookieStore.GetSyncCookie(params.ctx, streamId)
	require.NoError(err, "GetSyncCookie should succeed")
	require.NotNil(retrieved, "Retrieved cookie should not be nil")
	require.Equal(cookie.StreamId, retrieved.StreamId)
	require.Equal(cookie.MinipoolGen, retrieved.MinipoolGen)
	require.Equal(cookie.PrevMiniblockHash, retrieved.PrevMiniblockHash)
	require.False(updatedAt.IsZero(), "UpdatedAt should be set")
	require.WithinDuration(time.Now(), updatedAt, 5*time.Second, "UpdatedAt should be recent")
}

func TestPersistStreamCookie_Update(t *testing.T) {
	params := setupCookieStoreTest(t)
	require := require.New(t)

	streamId := randomStreamId(t)

	// Create initial cookie
	cookie1 := &protocol.SyncCookie{
		StreamId:          streamId[:],
		MinipoolGen:       10,
		PrevMiniblockHash: []byte{1, 1, 1, 1},
	}

	err := params.cookieStore.WriteSyncCookie(params.ctx, streamId, cookie1)
	require.NoError(err)

	// Update with new values
	cookie2 := &protocol.SyncCookie{
		StreamId:          streamId[:],
		MinipoolGen:       20,
		PrevMiniblockHash: []byte{2, 2, 2, 2},
	}

	err = params.cookieStore.WriteSyncCookie(params.ctx, streamId, cookie2)
	require.NoError(err)

	// Verify updated values
	retrieved, _, err := params.cookieStore.GetSyncCookie(params.ctx, streamId)
	require.NoError(err)
	require.NotNil(retrieved)
	require.Equal(int64(20), retrieved.MinipoolGen, "MinipoolGen should be updated")
	require.Equal([]byte{2, 2, 2, 2}, retrieved.PrevMiniblockHash, "PrevMiniblockHash should be updated")
}

func TestDeleteStreamCookie(t *testing.T) {
	params := setupCookieStoreTest(t)
	require := require.New(t)

	streamId := randomStreamId(t)

	// Create a cookie
	cookie := &protocol.SyncCookie{
		StreamId:          streamId[:],
		MinipoolGen:       5,
		PrevMiniblockHash: []byte{5, 5, 5, 5},
	}

	err := params.cookieStore.WriteSyncCookie(params.ctx, streamId, cookie)
	require.NoError(err)

	// Verify it exists
	retrieved, _, err := params.cookieStore.GetSyncCookie(params.ctx, streamId)
	require.NoError(err)
	require.NotNil(retrieved)

	// Delete the cookie
	err = params.cookieStore.DeleteStreamCookie(params.ctx, streamId)
	require.NoError(err)

	// Verify it's deleted
	retrieved, _, err = params.cookieStore.GetSyncCookie(params.ctx, streamId)
	require.NoError(err)
	require.Nil(retrieved, "Cookie should be nil after deletion")
}

func TestDeleteStreamCookie_NonExistent(t *testing.T) {
	params := setupCookieStoreTest(t)
	require := require.New(t)

	streamId := randomStreamId(t)

	// Deleting a non-existent cookie should not error
	err := params.cookieStore.DeleteStreamCookie(params.ctx, streamId)
	require.NoError(err, "Deleting non-existent cookie should not error")
}

func TestGetAllStreamCookies(t *testing.T) {
	params := setupCookieStoreTest(t)
	require := require.New(t)

	// Initially empty
	cookies, err := params.cookieStore.GetAllStreamCookies(params.ctx)
	require.NoError(err)
	require.Empty(cookies, "Should have no cookies initially")

	// Create multiple cookies
	streamIds := make([]shared.StreamId, 3)
	for i := range streamIds {
		streamIds[i] = randomStreamId(t)
		cookie := &protocol.SyncCookie{
			StreamId:          streamIds[i][:],
			MinipoolGen:       int64(i + 1),
			PrevMiniblockHash: []byte{byte(i), byte(i), byte(i), byte(i)},
		}
		err := params.cookieStore.WriteSyncCookie(params.ctx, streamIds[i], cookie)
		require.NoError(err)
	}

	// Get all cookies
	cookies, err = params.cookieStore.GetAllStreamCookies(params.ctx)
	require.NoError(err)
	require.Len(cookies, 3, "Should have 3 cookies")

	// Verify each cookie is present
	for i, streamId := range streamIds {
		cookie, exists := cookies[streamId]
		require.True(exists, "Cookie for stream %d should exist", i)
		require.Equal(int64(i+1), cookie.MinipoolGen)
		require.Equal([]byte{byte(i), byte(i), byte(i), byte(i)}, cookie.PrevMiniblockHash)
	}
}

func TestMultipleStreams(t *testing.T) {
	params := setupCookieStoreTest(t)
	require := require.New(t)

	// Create cookies for multiple streams
	numStreams := 10
	streamIds := make([]shared.StreamId, numStreams)
	for i := range streamIds {
		streamIds[i] = randomStreamId(t)
		cookie := &protocol.SyncCookie{
			StreamId:          streamIds[i][:],
			MinipoolGen:       int64(i * 100),
			PrevMiniblockHash: make([]byte, 32),
		}
		copy(cookie.PrevMiniblockHash, streamIds[i][:])

		err := params.cookieStore.WriteSyncCookie(params.ctx, streamIds[i], cookie)
		require.NoError(err)
	}

	// Verify each stream has its own cookie
	for i, streamId := range streamIds {
		retrieved, _, err := params.cookieStore.GetSyncCookie(params.ctx, streamId)
		require.NoError(err)
		require.NotNil(retrieved)
		require.Equal(int64(i*100), retrieved.MinipoolGen)
	}

	// Delete some cookies
	err := params.cookieStore.DeleteStreamCookie(params.ctx, streamIds[0])
	require.NoError(err)
	err = params.cookieStore.DeleteStreamCookie(params.ctx, streamIds[5])
	require.NoError(err)

	// Verify deletion
	cookies, err := params.cookieStore.GetAllStreamCookies(params.ctx)
	require.NoError(err)
	require.Len(cookies, numStreams-2)

	// Verify deleted ones are gone
	_, exists := cookies[streamIds[0]]
	require.False(exists, "Stream 0 cookie should be deleted")
	_, exists = cookies[streamIds[5]]
	require.False(exists, "Stream 5 cookie should be deleted")

	// Verify others still exist
	for i := 1; i < numStreams; i++ {
		if i == 5 {
			continue
		}
		_, exists := cookies[streamIds[i]]
		require.True(exists, "Stream %d cookie should exist", i)
	}
}

func TestLargePrevMiniblockHash(t *testing.T) {
	params := setupCookieStoreTest(t)
	require := require.New(t)

	streamId := randomStreamId(t)

	// Create a cookie with a large hash (typical miniblock hash size is 32 bytes)
	largeHash := make([]byte, 32)
	for i := range largeHash {
		largeHash[i] = byte(i)
	}

	cookie := &protocol.SyncCookie{
		StreamId:          streamId[:],
		MinipoolGen:       999,
		PrevMiniblockHash: largeHash,
	}

	err := params.cookieStore.WriteSyncCookie(params.ctx, streamId, cookie)
	require.NoError(err)

	retrieved, _, err := params.cookieStore.GetSyncCookie(params.ctx, streamId)
	require.NoError(err)
	require.NotNil(retrieved)
	require.Equal(largeHash, retrieved.PrevMiniblockHash)
}

func TestDefaultTableName(t *testing.T) {
	require := require.New(t)

	// Test that empty string defaults to "stream_sync_cookies"
	// We can't easily test this without DB access, but we can verify the constructor behavior
	// by creating with empty string and checking it doesn't panic
	cookieStore := track_streams.NewPostgresStreamCookieStore(nil, "")
	require.NotNil(cookieStore, "Should create store with empty table name (uses default)")
}
