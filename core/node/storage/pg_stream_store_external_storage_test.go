package storage_test

import (
	"context"
	"crypto/rand"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"google.golang.org/protobuf/proto"

	"github.com/towns-protocol/towns/core/node/storage/external"

	"github.com/towns-protocol/towns/core/config"
	"github.com/towns-protocol/towns/core/config/builder"
	. "github.com/towns-protocol/towns/core/node/base"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/events"
	"github.com/towns-protocol/towns/core/node/infra"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/storage"
	"github.com/towns-protocol/towns/core/node/testutils"
	"github.com/towns-protocol/towns/core/node/testutils/dbtestutils"
	"github.com/towns-protocol/towns/core/node/testutils/mocks"

	"github.com/stretchr/testify/require"
)

// TestExternalMediaStreamStorage tests writing media streams to external storage.
func TestExternalMediaStreamStorage(t *testing.T) {
	t.Parallel()

	s3Enabled := os.Getenv("RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_AWS_S3_REGION") != ""
	gcsEnabled := os.Getenv("RIVER_EXTERNAL_MEDIA_STREAM_STORAGE_GCS_STORAGE_BUCKET") != ""

	ctx := t.Context()
	cfg := config.GetDefaultConfig()
	bld, err := builder.NewConfigBuilder(cfg, "RIVER")
	require.NoError(t, err)

	cfg, err = bld.Build()
	require.NoError(t, err)

	t.Cleanup(func() {
		http.DefaultClient.CloseIdleConnections() // make goleak happy
	})

	t.Run("AWS S3 Storage", func(t *testing.T) {
		t.Parallel()

		require := require.New(t)

		if !s3Enabled {
			t.Skip("AWS S3 Storage not enabled")
		}

		// ensure that GC Storage is disabled for AWS S3 tests
		extStorageConfig := cfg.ExternalMediaStreamStorage
		extStorageConfig.Gcs.Bucket = ""
		require.False(extStorageConfig.Gcs.Enabled())
		require.True(extStorageConfig.AwsS3.Enabled())

		userWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)
		nodeWallet, err := crypto.NewWallet(ctx)
		require.NoError(err, "Failed to load AWS S3 config")

		t.Run("Small stream", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(t, &extStorageConfig)

			streamID, chunks, miniblocks := createMediaStreamAndAddChunks(
				t,
				ctx,
				userWallet,
				nodeWallet,
				require,
				store,
				true,
				10,
				10*1024,
			)

			t.Cleanup(func() {
				if tstore, ok := store.(external.TestStorage); ok {
					_ = tstore.TestDeleteExternalObject(
						context.Background(),
						streamID,
					) // lint:ignore context.Background() is fine here
				}
			})

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external AWS S3 storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 30*time.Second, 100*time.Millisecond)
		})

		t.Run("Stream with many chunks", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(t, &extStorageConfig)

			streamID, chunks, miniblocks := createMediaStreamAndAddChunks(
				t,
				ctx,
				userWallet,
				nodeWallet,
				require,
				store,
				true,
				50,
				10,
			)

			t.Cleanup(func() {
				if tstore, ok := store.(external.TestStorage); ok {
					_ = tstore.TestDeleteExternalObject(
						context.Background(),
						streamID,
					) // lint:ignore context.Background() is fine here
				}
			})

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external AWS S3 storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 30*time.Second, 100*time.Millisecond)
		})

		t.Run("Stream range read", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(t, &extStorageConfig)

			streamID, chunks, expMiniblocks := createMediaStreamAndAddChunks(
				t,
				ctx,
				userWallet,
				nodeWallet,
				require,
				store,
				true,
				10,
				10,
			)

			defer func() {
				if tstore, ok := store.(external.TestStorage); ok {
					_ = tstore.TestDeleteExternalObject(
						context.Background(),
						streamID,
					) // lint:ignore context.Background() is fine here
				}
			}()

			require.EventuallyWithT(
				rangeReadTest(ctx, store, streamID, chunks, expMiniblocks),
				30*time.Second, 100*time.Millisecond)
		})

		t.Run("Stream with big chunks", func(t *testing.T) {
			t.Skip("Too big for CI")

			store := setupStreamStorageWithExternalStorage(t, &extStorageConfig)

			streamID, chunks, miniblocks := createMediaStreamAndAddChunks(
				t,
				ctx,
				userWallet,
				nodeWallet,
				require,
				store,
				true,
				5,
				2*1024*1024,
			)

			t.Cleanup(func() {
				if tstore, ok := store.(external.TestStorage); ok {
					_ = tstore.TestDeleteExternalObject(
						context.Background(),
						streamID,
					) // lint:ignore context.Background() is fine here
				}
			})

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external AWS S3 storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 30*time.Second, 100*time.Millisecond)
		})
	})

	t.Run("Google Cloud Storage", func(t *testing.T) {
		t.Parallel()

		if !gcsEnabled {
			t.Skip("Google Cloud storage not enabled")
		}

		// ensure that AWS S3 is disabled for GCS tests
		gcsConfig := &config.ExternalMediaStreamStorageConfig{
			Gcs: config.ExternalMediaStreamStorageGCStorageConfig{
				Bucket:          cfg.ExternalMediaStreamStorage.Gcs.Bucket,
				JsonCredentials: cfg.ExternalMediaStreamStorage.Gcs.JsonCredentials,
			},
		}

		require.False(t, gcsConfig.AwsS3.Enabled())
		require.True(t, gcsConfig.Gcs.Enabled())

		require := require.New(t)

		userWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)
		nodeWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)

		t.Run("Small stream", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(t, gcsConfig)

			streamID, chunks, miniblocks := createMediaStreamAndAddChunks(
				t,
				ctx,
				userWallet,
				nodeWallet,
				require,
				store,
				true,
				10,
				10,
			)

			t.Cleanup(func() {
				if tstore, ok := store.(external.TestStorage); ok {
					_ = tstore.TestDeleteExternalObject(
						context.Background(),
						streamID,
					) // lint:ignore context.Background() is fine here
				}
			})

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external GC storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 2*time.Minute, 100*time.Millisecond)
		})

		t.Run("Stream with many chunks", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(t, gcsConfig)

			streamID, chunks, miniblocks := createMediaStreamAndAddChunks(
				t,
				ctx,
				userWallet,
				nodeWallet,
				require,
				store,
				true,
				50,
				10,
			)

			t.Cleanup(func() {
				if tstore, ok := store.(external.TestStorage); ok {
					_ = tstore.TestDeleteExternalObject(
						context.Background(),
						streamID,
					) // lint:ignore context.Background() is fine here
				}
			})

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external GC storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 2*time.Minute, 100*time.Millisecond)
		})

		t.Run("Stream range read", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(t, gcsConfig)

			streamID, chunks, expMiniblocks := createMediaStreamAndAddChunks(
				t,
				ctx,
				userWallet,
				nodeWallet,
				require,
				store,
				true,
				10,
				10,
			)

			t.Cleanup(func() {
				if tstore, ok := store.(external.TestStorage); ok {
					_ = tstore.TestDeleteExternalObject(
						context.Background(),
						streamID,
					) // lint:ignore context.Background() is fine here
				}
			})

			require.EventuallyWithT(
				rangeReadTest(ctx, store, streamID, chunks, expMiniblocks),
				2*time.Minute, 100*time.Millisecond)
		})

		t.Run("Stream with big chunks", func(t *testing.T) {
			t.Skip("Too big for CI")

			store := setupStreamStorageWithExternalStorage(t, gcsConfig)

			streamID, chunks, miniblocks := createMediaStreamAndAddChunks(
				t,
				ctx,
				userWallet,
				nodeWallet,
				require,
				store,
				true,
				10,
				2*1024*1024,
			)

			t.Cleanup(func() {
				if tstore, ok := store.(external.TestStorage); ok {
					_ = tstore.TestDeleteExternalObject(
						context.Background(),
						streamID,
					) // lint:ignore context.Background() is fine here
				}
			})

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external GC storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 2*time.Minute, 100*time.Millisecond)
		})
	})

	t.Run("Migrate existing streams", func(t *testing.T) {
		if !gcsEnabled {
			t.Skip("Google Cloud storage not enabled")
		}

		gcsConfig := &config.ExternalMediaStreamStorageConfig{
			Gcs: config.ExternalMediaStreamStorageGCStorageConfig{
				Bucket:          cfg.ExternalMediaStreamStorage.Gcs.Bucket,
				JsonCredentials: cfg.ExternalMediaStreamStorage.Gcs.JsonCredentials,
			},
			EnableMigrationExistingStreams: true,
		}

		require.False(t, gcsConfig.AwsS3.Enabled())
		require.True(t, gcsConfig.Gcs.Enabled())

		require := require.New(t)

		userWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)
		nodeWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)

		store := setupStreamStorageWithExternalStorage(t, gcsConfig)

		// insert media stream direct in DB
		streamID, chunks, miniblocks := createMediaStreamAndAddChunks(
			t,
			ctx,
			userWallet,
			nodeWallet,
			require,
			store,
			false,
			1,
			50,
		)

		// normalize stream and bypass the store to call the onSealed on the ephemeral stream
		// monitor that normally would migrate the miniblock data to external storage.
		if tstore, ok := store.(external.TestStorage); ok {
			_, err = tstore.TestNormalizeStreamWithoutCallingEphemeralMonitor(ctx, streamID)
			require.NoError(err)
		} else {
			require.FailNow("store doesn't implement test support")
		}

		// the ephemeral stream monitor must pick up the normalized stream as it was an already
		// existing stream that became eligible for miniblock migration.
		require.EventuallyWithT(func(collect *assert.CollectT) {
			compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
		}, 2*time.Minute, 100*time.Millisecond)
	})

	t.Run("Miniblock range", func(t *testing.T) {
		tests := []struct {
			name          string
			fromInclusive int64
			toExclusive   int64
			allMiniblocks []external.MiniblockDescriptor
			expOffset     int64
			expSize       int64
			expMiniblocks []external.MiniblockDescriptor
			checkErr      func(t require.TestingT, err error, msgAndArgs ...interface{})
		}{
			{
				name:          "all miniblocks",
				fromInclusive: 0,
				toExclusive:   3,
				expOffset:     0,
				expSize:       45,
				checkErr:      require.NoError,
				allMiniblocks: []external.MiniblockDescriptor{
					{Number: 0, StartByte: 0, MiniblockDataLength: 10},
					{Number: 1, StartByte: 10, MiniblockDataLength: 15},
					{Number: 2, StartByte: 25, MiniblockDataLength: 20},
				},
				expMiniblocks: []external.MiniblockDescriptor{
					{Number: 0, StartByte: 0, MiniblockDataLength: 10},
					{Number: 1, StartByte: 10, MiniblockDataLength: 15},
					{Number: 2, StartByte: 25, MiniblockDataLength: 20},
				},
			},
			{
				name:          "partial miniblocks",
				fromInclusive: 1,
				toExclusive:   3,
				expOffset:     10,
				expSize:       35,
				checkErr:      require.NoError,
				allMiniblocks: []external.MiniblockDescriptor{
					{Number: 0, StartByte: 0, MiniblockDataLength: 10},
					{Number: 1, StartByte: 10, MiniblockDataLength: 15},
					{Number: 2, StartByte: 25, MiniblockDataLength: 20},
					{Number: 3, StartByte: 45, MiniblockDataLength: 25},
				},
				expMiniblocks: []external.MiniblockDescriptor{
					{Number: 1, StartByte: 0, MiniblockDataLength: 15},
					{Number: 2, StartByte: 15, MiniblockDataLength: 20},
				},
			},
			{
				name:          "single miniblock",
				fromInclusive: 2,
				toExclusive:   3,
				expOffset:     25,
				expSize:       20,
				checkErr:      require.NoError,
				allMiniblocks: []external.MiniblockDescriptor{
					{Number: 0, StartByte: 0, MiniblockDataLength: 10},
					{Number: 1, StartByte: 10, MiniblockDataLength: 15},
					{Number: 2, StartByte: 25, MiniblockDataLength: 20},
					{Number: 3, StartByte: 45, MiniblockDataLength: 25},
				},
				expMiniblocks: []external.MiniblockDescriptor{
					{Number: 2, StartByte: 0, MiniblockDataLength: 20},
				},
			},
			{
				name:          "from miniblock missing",
				fromInclusive: 1,
				toExclusive:   3,
				expOffset:     0,
				expSize:       0,
				checkErr:      require.Error,
				allMiniblocks: []external.MiniblockDescriptor{
					{Number: 0, StartByte: 0, MiniblockDataLength: 10},
					{Number: 2, StartByte: 25, MiniblockDataLength: 20},
					{Number: 3, StartByte: 45, MiniblockDataLength: 25},
				},
			},
			{
				name:          "miniblocks missing in range",
				fromInclusive: 1,
				toExclusive:   3,
				expOffset:     0,
				expSize:       0,
				checkErr:      require.Error,
				allMiniblocks: []external.MiniblockDescriptor{
					{Number: 0, StartByte: 0, MiniblockDataLength: 10},
					{Number: 1, StartByte: 10, MiniblockDataLength: 15},
				},
			},
			{
				name:          "zero length range",
				fromInclusive: 2,
				toExclusive:   2,
				expOffset:     0,
				expSize:       0,
				checkErr:      require.Error,
				allMiniblocks: []external.MiniblockDescriptor{
					{Number: 0, StartByte: 0, MiniblockDataLength: 10},
					{Number: 1, StartByte: 10, MiniblockDataLength: 15},
					{Number: 2, StartByte: 25, MiniblockDataLength: 20},
				},
			},
		}

		for _, tst := range tests {
			t.Run(tst.name, func(t *testing.T) {
				offset, size, downloadParts, err := external.ObjectRangeMiniblocks(
					tst.allMiniblocks,
					tst.fromInclusive,
					tst.toExclusive,
				)
				tst.checkErr(t, err)
				require.Equal(t, tst.expOffset, offset)
				require.Equal(t, tst.expSize, size)
				require.Empty(t, cmp.Diff(tst.expMiniblocks, downloadParts))
			})
		}
	})
}

func setupStreamStorageWithExternalStorage(
	t *testing.T,
	extStorageCfg *config.ExternalMediaStreamStorageConfig,
) storage.StreamStorage {
	require := require.New(t)
	ctx := test.NewTestContext(t)

	dbCfg, dbSchemaName, dbCloser, err := dbtestutils.ConfigureDB(ctx)
	require.NoError(err, "Error configuring db for test")

	dbCfg.StartupDelay = 2 * time.Millisecond
	dbCfg.Extra = strings.Replace(dbCfg.Extra, "pool_max_conns=1000", "pool_max_conns=3", 1)

	pool, err := storage.CreateAndValidatePgxPool(
		ctx,
		dbCfg,
		dbSchemaName,
		nil,
	)
	require.NoError(err, "Error creating pgx pool for test")

	instanceId := GenShortNanoid()
	exitSignal := make(chan error, 1)
	store, err := storage.NewPostgresStreamStore(
		ctx,
		pool,
		instanceId,
		exitSignal,
		infra.NewMetricsFactory(nil, "", ""),
		&mocks.MockOnChainCfg{
			Settings: &crypto.OnChainSettings{
				StreamEphemeralStreamTTL:           time.Minute * 10,
				StreamSnapshotIntervalInMiniblocks: 110,
			},
		},
		extStorageCfg,
		5,
	)
	require.NoError(err, "Error creating new postgres stream store")

	t.Cleanup(func() {
		store.Close(ctx)
		dbCloser()
	})

	return store
}

func makeGenesisMiniblockForMediaStream(
	t *testing.T,
	userWallet *crypto.Wallet,
	nodeWallet *crypto.Wallet,
	media *MediaPayload_Inception,
) *events.MiniblockInfo {
	inception, err := events.MakeParsedEventWithPayload(
		userWallet,
		events.Make_MediaPayload_Inception(media),
		&MiniblockRef{},
	)
	require.NoError(t, err)

	mb, err := events.MakeGenesisMiniblock(nodeWallet, []*events.ParsedEvent{inception})
	require.NoError(t, err)

	mbInfo, err := events.NewMiniblockInfoFromProto(
		mb, nil,
		events.NewParsedMiniblockInfoOpts().
			WithExpectedBlockNumber(0).
			WithDoNotParseEvents(true),
	)
	require.NoError(t, err)

	return mbInfo
}

func makeMediaStreamChunk(
	t *testing.T,
	nodeWallet *crypto.Wallet,
	mbRef MiniblockRef,
	i int,
	chunkSize int,
) *Miniblock {
	chunkData := make([]byte, chunkSize)
	if _, err := rand.Read(chunkData); err != nil {
		t.Fatalf("unable to prepare data chunk: %v", err)
	}

	payload := events.Make_MediaPayload_Chunk(chunkData, int32(i), nil)
	envelope, err := events.MakeEnvelopeWithPayload(nodeWallet, payload, &mbRef)
	require.NoError(t, err)

	header, err := events.MakeEnvelopeWithPayload(nodeWallet, events.Make_MiniblockHeader(&MiniblockHeader{
		MiniblockNum:      mbRef.Num + 1,
		PrevMiniblockHash: mbRef.Hash[:],
		EventHashes:       [][]byte{envelope.Hash},
	}), &mbRef)
	require.NoError(t, err)

	return &Miniblock{Events: []*Envelope{envelope}, Header: header}
}

func createMediaStreamAndAddChunks(
	t *testing.T,
	ctx context.Context,
	userWallet *crypto.Wallet,
	nodeWallet *crypto.Wallet,
	require *require.Assertions,
	store storage.StreamStorage,
	normalizeStream bool,
	chunkCount int,
	chunkSize int,
) (StreamId, int, []*storage.MiniblockDescriptor) {
	streamID := testutils.FakeStreamId(STREAM_MEDIA_BIN)
	channelId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)
	chunks := chunkCount

	genesisMiniblock := makeGenesisMiniblockForMediaStream(
		t,
		userWallet,
		nodeWallet,
		&MediaPayload_Inception{StreamId: streamID[:], ChannelId: channelId[:], ChunkCount: int32(chunks)},
	)

	genesisMiniblockDescriptor, err := genesisMiniblock.AsStorageMb()
	require.NoError(err)
	require.NoError(store.CreateEphemeralStreamStorage(ctx, streamID, genesisMiniblockDescriptor))

	miniblocks := []*storage.MiniblockDescriptor{genesisMiniblockDescriptor}
	mbRef := *genesisMiniblock.Ref
	for i := 0; i < chunks; i++ {
		miniblock := makeMediaStreamChunk(t, nodeWallet, mbRef, i, chunkSize)
		mbBytes, err := proto.Marshal(miniblock)
		require.NoError(err)

		mbDesc := &storage.MiniblockDescriptor{
			Number: mbRef.Num + 1,
			Hash:   common.BytesToHash(miniblock.Header.Hash),
			Data:   mbBytes,
		}
		err = store.WriteEphemeralMiniblock(ctx, streamID, mbDesc)
		require.NoError(err)

		miniblocks = append(miniblocks, mbDesc)

		mbRef.Num++
		mbRef.Hash = common.BytesToHash(miniblock.Header.Hash)
	}

	if normalizeStream {
		genesisMbHash, err := store.NormalizeEphemeralStream(ctx, streamID)
		require.NoError(err)
		require.Equal(genesisMiniblockDescriptor.Hash, genesisMbHash)
	}
	return streamID, chunks, miniblocks
}

func compareExternallyFetchedMiniblocks(
	collect *assert.CollectT,
	store storage.StreamStorage,
	ctx context.Context,
	streamID StreamId,
	chunks int,
	miniblocks []*storage.MiniblockDescriptor,
) {
	// ensure that miniblocks are stored in external storage
	location, err := store.StreamMiniblocksStoredLocation(ctx, streamID)
	if err != nil || location == external.MiniblockDataStorageLocationDB {
		collect.Errorf("unexpected miniblock location / err: %v", err)
		return
	}

	lastMbNum, err := store.GetLastMiniblockNumber(ctx, streamID)
	if err != nil {
		collect.Errorf("unable to get last miniblock number: %v", err)
		return
	}

	// ensure that store.ReadMiniblocks returns the correct miniblocks
	readMiniblocks, terminus, err := store.ReadMiniblocks(ctx, streamID, 0, int64(chunks)+1, true)
	if err != nil {
		collect.Errorf("unable to read miniblocks: %v", err)
		return
	}
	if !terminus {
		collect.Errorf("terminus should be true when reading from 0")
	}

	if int(lastMbNum)+1 != len(miniblocks) {
		collect.Errorf(
			"unexpected last number of miniblocks in ReadMiniblocks: %d != %d",
			lastMbNum,
			len(miniblocks),
		)
		return
	}

	if len(miniblocks) != len(readMiniblocks) {
		collect.Errorf(
			"unexpected number of miniblocks in ReadMiniblocks: %d != %d",
			len(miniblocks),
			len(readMiniblocks),
		)
		return
	}

	for i := range miniblocks {
		if !cmp.Equal(miniblocks[i].Number, readMiniblocks[i].Number) {
			collect.Errorf("unexpected miniblock number %d != %d",
				miniblocks[i].Number, readMiniblocks[i].Number)
		}
		if diff := cmp.Diff(miniblocks[i].Data, readMiniblocks[i].Data); diff != "" {
			collect.Errorf("unexpected miniblock data %s", diff)
		}
		if !cmp.Equal(miniblocks[i].Snapshot, readMiniblocks[i].Snapshot) {
			collect.Errorf("unexpected miniblock snapshot")
		}
	}

	// ensure that store.ReadStreamFromLastSnapshot returns the correct miniblocks
	readStreamFromLastSnapshotResult, err := store.ReadStreamFromLastSnapshot(ctx, streamID, chunks+1)
	if err != nil {
		collect.Errorf("unable to read miniblocks from last snapshot: %v", err)
		return
	}

	if len(readStreamFromLastSnapshotResult.MinipoolEnvelopes) != 0 {
		collect.Errorf(
			"expected no minipool events, but got %d events",
			len(readStreamFromLastSnapshotResult.MinipoolEnvelopes))
	}

	readMiniblocks = readStreamFromLastSnapshotResult.Miniblocks

	if int(lastMbNum)+1 != len(miniblocks) {
		collect.Errorf(
			"unexpected last number of miniblocks in ReadStreamFromLastSnapshot: %d != %d",
			lastMbNum,
			len(miniblocks),
		)
		return
	}

	if len(miniblocks) != len(readMiniblocks) {
		collect.Errorf(
			"unexpected number of miniblocks in ReadStreamFromLastSnapshot: %d != %d",
			len(miniblocks),
			len(readMiniblocks),
		)
		return
	}

	for i := range miniblocks {
		if !cmp.Equal(miniblocks[i].Number, readMiniblocks[i].Number) {
			collect.Errorf("unexpected miniblock number %d != %d",
				miniblocks[i].Number, readMiniblocks[i].Number)
		}
		if diff := cmp.Diff(miniblocks[i].Data, readMiniblocks[i].Data); diff != "" {
			collect.Errorf("unexpected miniblock data %s", diff)
		}
		if !cmp.Equal(miniblocks[i].Snapshot, readMiniblocks[i].Snapshot) {
			collect.Errorf("unexpected miniblock snapshot")
		}
	}
}

func rangeReadTest(
	ctx context.Context,
	store storage.StreamStorage,
	streamID StreamId,
	chunks int,
	expMiniblocks []*storage.MiniblockDescriptor,
) func(collect *assert.CollectT) {
	return func(collect *assert.CollectT) {
		// ensure that miniblocks are stored in external storage
		location, err := store.StreamMiniblocksStoredLocation(ctx, streamID)
		if err != nil || location == external.MiniblockDataStorageLocationDB {
			collect.Errorf("unexpected miniblock location / err: %v", err)
			return
		}

		for _, tst := range []struct {
			fromInclusive    int64
			toExclusive      int64
			expectedTerminus bool
		}{
			{fromInclusive: 0, toExclusive: 1, expectedTerminus: true},
			{fromInclusive: 0, toExclusive: 5, expectedTerminus: true},
			{fromInclusive: 0, toExclusive: int64(chunks + 1), expectedTerminus: true},
			{fromInclusive: 3, toExclusive: int64(7 + 1), expectedTerminus: false},
			{fromInclusive: 3, toExclusive: int64(chunks + 1), expectedTerminus: false},
		} {
			expNumberOfMiniblocks := int(tst.toExclusive - tst.fromInclusive)
			gotMiniblocks, terminus, err := store.ReadMiniblocks(
				ctx,
				streamID,
				tst.fromInclusive,
				tst.toExclusive,
				true,
			)
			if err != nil {
				collect.Errorf("unable to read miniblocks: %v", err)
				return
			}
			if terminus != tst.expectedTerminus {
				collect.Errorf("unexpected terminus value for fromInclusive=%d: got %v, expected %v",
					tst.fromInclusive, terminus, tst.expectedTerminus)
				return
			}

			if len(gotMiniblocks) != expNumberOfMiniblocks {
				collect.Errorf(
					"unexpected number of miniblocks in ReadMiniblocks: %d != %d",
					len(gotMiniblocks),
					expNumberOfMiniblocks,
				)
				return
			}

			for i := range gotMiniblocks {
				expMiniblock := expMiniblocks[tst.fromInclusive+int64(i)]
				if !cmp.Equal(expMiniblock.Number, gotMiniblocks[i].Number) {
					collect.Errorf("unexpected miniblock number %d != %d",
						expMiniblock.Number, gotMiniblocks[i].Number)
				}
				if !cmp.Equal(expMiniblock.Data, gotMiniblocks[i].Data) {
					collect.Errorf(
						"unexpected miniblock data, want %x \n\n got: %x",
						expMiniblock.Data,
						gotMiniblocks[i].Data,
					)
				}
				if !cmp.Equal(expMiniblock.Snapshot, gotMiniblocks[i].Snapshot) {
					collect.Errorf("unexpected miniblock snapshot")
				}
			}
		}
	}
}
