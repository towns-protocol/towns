package storage

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/contracts/river"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils"
)

func makeRegistryResults(streamIds ...StreamId) []*river.StreamWithId {
	results := make([]*river.StreamWithId, len(streamIds))
	for i, id := range streamIds {
		results[i] = &river.StreamWithId{Id: id}
	}
	return results
}

func TestCleanupOrphanedStreams_DeletesOrphans(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	// Create streams in DB
	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId3 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	err := store.CreateStreamStorage(ctx, streamId1, &MiniblockDescriptor{Data: []byte("genesis1")})
	require.NoError(err)
	err = store.CreateStreamStorage(ctx, streamId2, &MiniblockDescriptor{Data: []byte("genesis2")})
	require.NoError(err)
	err = store.CreateStreamStorage(ctx, streamId3, &MiniblockDescriptor{Data: []byte("genesis3")})
	require.NoError(err)

	// Verify all streams exist
	streams, err := store.GetStreams(ctx)
	require.NoError(err)
	require.Len(streams, 3)

	// Registry only has streamId1
	registryResults := makeRegistryResults(streamId1)

	CleanupOrphanedStreams(ctx, store, registryResults)

	// Verify only streamId1 remains in DB
	streams, err = store.GetStreams(ctx)
	require.NoError(err)
	require.Len(streams, 1)
	require.Equal(streamId1, streams[0])
}

func TestCleanupOrphanedStreams_NoOrphans(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	// Create streams in DB
	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	err := store.CreateStreamStorage(ctx, streamId1, &MiniblockDescriptor{Data: []byte("genesis1")})
	require.NoError(err)
	err = store.CreateStreamStorage(ctx, streamId2, &MiniblockDescriptor{Data: []byte("genesis2")})
	require.NoError(err)

	// Registry has all streams
	registryResults := makeRegistryResults(streamId1, streamId2)

	CleanupOrphanedStreams(ctx, store, registryResults)

	// Verify all streams still exist in DB
	streams, err := store.GetStreams(ctx)
	require.NoError(err)
	require.Len(streams, 2)
}

func TestCleanupOrphanedStreams_EmptyDb(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	// No streams in DB, registry has one
	registryResults := makeRegistryResults(testutils.FakeStreamId(STREAM_CHANNEL_BIN))

	CleanupOrphanedStreams(ctx, store, registryResults)

	// Verify DB is still empty
	streams, err := store.GetStreams(ctx)
	require.NoError(err)
	require.Len(streams, 0)
}

func TestCleanupOrphanedStreams_AllOrphaned(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	// Create streams in DB
	streamId1 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	streamId2 := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	err := store.CreateStreamStorage(ctx, streamId1, &MiniblockDescriptor{Data: []byte("genesis1")})
	require.NoError(err)
	err = store.CreateStreamStorage(ctx, streamId2, &MiniblockDescriptor{Data: []byte("genesis2")})
	require.NoError(err)

	// Empty registry - all streams are orphaned
	registryResults := []*river.StreamWithId{}

	CleanupOrphanedStreams(ctx, store, registryResults)

	// Verify no streams remain in DB
	streams, err := store.GetStreams(ctx)
	require.NoError(err)
	require.Len(streams, 0)
}

func TestCleanupOrphanedStreams_EmptyDbAndRegistry(t *testing.T) {
	params := setupStreamStorageTest(t)
	require := require.New(t)
	ctx := params.ctx
	store := params.pgStreamStore

	// Both empty
	registryResults := []*river.StreamWithId{}

	CleanupOrphanedStreams(ctx, store, registryResults)

	// Verify DB is still empty
	streams, err := store.GetStreams(ctx)
	require.NoError(err)
	require.Len(streams, 0)
}
