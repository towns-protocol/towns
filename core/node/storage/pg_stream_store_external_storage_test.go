package storage_test

import (
	"context"
	"crypto/rand"
	"net/http"
	"strings"
	"testing"
	"time"

	gcpstorage "cloud.google.com/go/storage"
	awshttp "github.com/aws/aws-sdk-go-v2/aws/transport/http"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/ethereum/go-ethereum/common"
	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"google.golang.org/api/option"
	raw "google.golang.org/api/storage/v1"
	htransport "google.golang.org/api/transport/http"
	"google.golang.org/protobuf/proto"

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

// TestExternalMediaStreamStorage tests if media stream data can be written
// to external storage.
func TestExternalMediaStreamStorage(t *testing.T) {
	t.Parallel()

	ctx := t.Context()
	cfg := config.GetDefaultConfig()
	bld, err := builder.NewConfigBuilder(cfg, "RIVER")
	require.NoError(t, err)

	cfg, err = bld.Build()
	require.NoError(t, err)

	t.Run("AWS S3 Storage", func(t *testing.T) {
		t.Parallel()

		require := require.New(t)

		// ensure that GC Storage is disabled for AWS S3 tests
		extStorageConfig := cfg.ExternalMediaStreamStorage
		extStorageConfig.Gcs.Bucket = ""
		require.False(extStorageConfig.Gcs.Enabled())
		require.True(extStorageConfig.AwsS3.Enabled())

		userWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)
		nodeWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)

		// custom AWS client to disable keep-alive and max-idle connections to make goleak happy.
		cfg, err := awsconfig.LoadDefaultConfig(ctx,
			awsconfig.WithCredentialsProvider(
				credentials.NewStaticCredentialsProvider(
					extStorageConfig.AwsS3.AccessKeyID, extStorageConfig.AwsS3.SecretAccessKey, "")),
			awsconfig.WithRegion(extStorageConfig.AwsS3.Region),
			awsconfig.WithHTTPClient(awshttp.NewBuildableClient().WithTransportOptions(func(transport *http.Transport) {
				transport.DisableKeepAlives = true // http connections remain open and goleak detects leaks
			})))

		require.NoError(err, "Failed to load AWS S3 config")

		client := s3.NewFromConfig(cfg)

		t.Run("Small stream", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(
				t, &extStorageConfig, storage.WithCustomS3Client(client, extStorageConfig.AwsS3.Bucket))

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

			defer func() {
				_ = store.TestDeleteExternalObject(
					context.Background(), // lint:ignore context.Background() is fine here
					streamID,
					storage.MiniblockDataStorageLocationS3)
			}()

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external AWS S3 storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 2*time.Minute, time.Second)
		})

		t.Run("Stream with many chunks", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(
				t, &extStorageConfig, storage.WithCustomS3Client(client, extStorageConfig.AwsS3.Bucket))

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

			defer func() {
				_ = store.TestDeleteExternalObject(
					context.Background(), // lint:ignore context.Background() is fine here
					streamID,
					storage.MiniblockDataStorageLocationS3)
			}()

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external AWS S3 storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 2*time.Minute, time.Second)
		})

		t.Run("Stream with big chunks", func(t *testing.T) {
			t.Skip("Too big for CI")

			store := setupStreamStorageWithExternalStorage(
				t, &extStorageConfig, storage.WithCustomS3Client(client, extStorageConfig.AwsS3.Bucket))

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

			defer func() {
				_ = store.TestDeleteExternalObject(
					context.Background(), // lint:ignore context.Background() is fine here
					streamID,
					storage.MiniblockDataStorageLocationS3)
			}()

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external AWS S3 storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 2*time.Minute, time.Second)
		})
	})

	t.Run("Google Cloud Storage", func(t *testing.T) {
		t.Parallel()

		// ensure that AWS S3 is disabled for GCS tests
		gcsConfig := &config.ExternalMediaStreamStorageConfig{
			Gcs: config.ExternalMediaStreamStorageGCStorageConfig{
				Bucket:          cfg.ExternalMediaStreamStorage.Gcs.Bucket,
				JsonCredentials: cfg.ExternalMediaStreamStorage.Gcs.JsonCredentials,
			},
		}

		require.False(t, gcsConfig.AwsS3.Enabled())
		require.True(t, gcsConfig.Gcs.Enabled())

		// setup custom transport to disable keep-alive and max-idle connections to make goleak happy.
		base := http.DefaultTransport.(*http.Transport).Clone()
		base.DisableKeepAlives = true
		base.MaxIdleConns = -1
		defer http.DefaultTransport.(*http.Transport).CloseIdleConnections()
		defer base.CloseIdleConnections()

		trans, err := htransport.NewTransport(ctx, base,
			option.WithCredentialsJSON([]byte(gcsConfig.Gcs.JsonCredentials)),
			option.WithScopes(raw.DevstorageReadWriteScope))
		require.NoError(t, err)

		c := http.Client{Transport: trans}
		defer c.CloseIdleConnections()

		client, err := gcpstorage.NewClient(ctx, option.WithHTTPClient(&c))
		require.NoError(t, err)
		defer client.Close()

		bucket := client.Bucket(gcsConfig.Gcs.Bucket)

		require := require.New(t)

		userWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)
		nodeWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)

		t.Run("Small stream", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(t, gcsConfig, storage.WithCustomGcsClient(bucket))

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

			defer func() {
				_ = store.TestDeleteExternalObject(
					context.Background(), // lint:ignore context.Background() is fine here
					streamID,
					storage.MiniblockDataStorageLocationGCS)
			}()

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external AWS S3 storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 2*time.Minute, time.Second)
		})

		t.Run("Stream with many chunks", func(t *testing.T) {
			store := setupStreamStorageWithExternalStorage(t, gcsConfig, storage.WithCustomGcsClient(bucket))

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

			defer func() {
				_ = store.TestDeleteExternalObject(
					context.Background(), // lint:ignore context.Background() is fine here
					streamID,
					storage.MiniblockDataStorageLocationGCS)
			}()

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external AWS S3 storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 2*time.Minute, time.Second)
		})

		t.Run("Stream with big chunks", func(t *testing.T) {
			t.Skip("Too big for CI")

			store := setupStreamStorageWithExternalStorage(t, gcsConfig, storage.WithCustomGcsClient(bucket))

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

			defer func() {
				_ = store.TestDeleteExternalObject(
					context.Background(), // lint:ignore context.Background() is fine here
					streamID,
					storage.MiniblockDataStorageLocationGCS)
			}()

			// the ephemeral stream monitor must now migrate the normalized stream miniblocks from
			// DB to external AWS S3 storage under the object key streamID in the background.
			require.EventuallyWithT(func(collect *assert.CollectT) {
				compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
			}, 2*time.Minute, time.Second)
		})
	})

	t.Run("Migrate existing streams", func(t *testing.T) {
		gcsConfig := &config.ExternalMediaStreamStorageConfig{
			Gcs: config.ExternalMediaStreamStorageGCStorageConfig{
				Bucket:          cfg.ExternalMediaStreamStorage.Gcs.Bucket,
				JsonCredentials: cfg.ExternalMediaStreamStorage.Gcs.JsonCredentials,
			},
			EnableMigrationExistingStreams: true,
		}

		require.False(t, gcsConfig.AwsS3.Enabled())
		require.True(t, gcsConfig.Gcs.Enabled())

		// setup custom transport to disable keep-alive and max-idle connections to make goleak happy.
		base := http.DefaultTransport.(*http.Transport).Clone()
		base.DisableKeepAlives = true
		base.MaxIdleConns = -1
		defer http.DefaultTransport.(*http.Transport).CloseIdleConnections()
		defer base.CloseIdleConnections()

		trans, err := htransport.NewTransport(ctx, base,
			option.WithCredentialsJSON([]byte(gcsConfig.Gcs.JsonCredentials)),
			option.WithScopes(raw.DevstorageReadWriteScope))
		require.NoError(t, err)

		c := http.Client{Transport: trans}
		defer c.CloseIdleConnections()

		client, err := gcpstorage.NewClient(ctx, option.WithHTTPClient(&c))
		require.NoError(t, err)
		defer client.Close()

		bucket := client.Bucket(gcsConfig.Gcs.Bucket)

		require := require.New(t)

		userWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)
		nodeWallet, err := crypto.NewWallet(ctx)
		require.NoError(err)

		store := setupStreamStorageWithExternalStorage(t, gcsConfig, storage.WithCustomGcsClient(bucket))

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
		_, err = store.TestNormalizeStreamWithoutCallingEphemeralMonitor(ctx, streamID)
		require.NoError(err)

		// the ephemeral stream monitor must pick up the normalized stream as it was an already
		// existing stream that became eligible for miniblock migration.
		require.EventuallyWithT(func(collect *assert.CollectT) {
			compareExternallyFetchedMiniblocks(collect, store, ctx, streamID, chunks, miniblocks)
		}, 2*time.Minute, time.Second)
	})
}

func setupStreamStorageWithExternalStorage(
	t *testing.T,
	extStorageCfg *config.ExternalMediaStreamStorageConfig,
	options ...storage.PostgresStreamStoreOption,
) *storage.PostgresStreamStore {
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
		options...,
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
	store *storage.PostgresStreamStore,
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
	for i := range chunks {
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
	store *storage.PostgresStreamStore,
	ctx context.Context,
	streamID StreamId,
	chunks int,
	miniblocks []*storage.MiniblockDescriptor,
) {
	// ensure that miniblocks are stored in external storage
	location, err := store.StreamMiniblocksStoredLocation(ctx, streamID)
	if err != nil || location == storage.MiniblockDataStorageLocationDB {
		collect.Errorf("unexpected miniblock location")
		return
	}

	// ensure that store.ReadMiniblocks returns the correct miniblocks
	readMiniblocks, err := store.ReadMiniblocks(ctx, streamID, 0, int64(chunks)+1, true)
	if err != nil {
		collect.Errorf("unable to read miniblocks")
		return
	}

	if len(miniblocks) != len(readMiniblocks) {
		collect.Errorf("unexpected number of miniblocks in ReadMiniblocks")
		return
	}

	for i := range miniblocks {
		if !cmp.Equal(miniblocks[i].Number, readMiniblocks[i].Number) {
			collect.Errorf("unexpected miniblock number")
		}
		if !cmp.Equal(miniblocks[i].Data, readMiniblocks[i].Data) {
			collect.Errorf("unexpected miniblock data")
		}
		if !cmp.Equal(miniblocks[i].Snapshot, readMiniblocks[i].Snapshot) {
			collect.Errorf("unexpected miniblock snapshot")
		}
	}

	readMiniblocks = nil

	// ensure that store.ReadMiniblocksByStream returns the correct miniblocks
	if err = store.ReadMiniblocksByStream(ctx, streamID, true, func(blockdata []byte, seqNum int64, snapshot []byte) error {
		readMiniblocks = append(readMiniblocks, &storage.MiniblockDescriptor{
			Number:   seqNum,
			Data:     blockdata,
			Snapshot: snapshot,
		})
		return nil
	}); err != nil {
		collect.Errorf("unable to read miniblocks %v", err)
		return
	}

	if len(miniblocks) != len(readMiniblocks) {
		collect.Errorf("unexpected number of miniblocks in ReadMiniblocksByStream")
		return
	}

	for i := range miniblocks {
		if !cmp.Equal(miniblocks[i].Number, readMiniblocks[i].Number) {
			collect.Errorf("unexpected miniblock number")
		}
		if !cmp.Equal(miniblocks[i].Data, readMiniblocks[i].Data) {
			collect.Errorf("unexpected miniblock data")
		}
		if !cmp.Equal(miniblocks[i].Snapshot, readMiniblocks[i].Snapshot) {
			collect.Errorf("unexpected miniblock snapshot")
		}
	}

	readMiniblocks = nil

	// ensure that store.ReadMiniblocksByIds returns the correct miniblocks
	var mbIDs []int64
	for _, mb := range miniblocks {
		mbIDs = append(mbIDs, mb.Number)
	}
	if err = store.ReadMiniblocksByIds(ctx, streamID, mbIDs, true, func(blockdata []byte, seqNum int64, snapshot []byte) error {
		readMiniblocks = append(readMiniblocks, &storage.MiniblockDescriptor{
			Number:   seqNum,
			Data:     blockdata,
			Snapshot: snapshot,
		})
		return nil
	}); err != nil {
		collect.Errorf("unable to read miniblocks %v", err)
		return
	}

	if len(miniblocks) != len(readMiniblocks) {
		collect.Errorf("unexpected number of miniblocks in ReadMiniblocksByIds")
		return
	}

	for i := range miniblocks {
		if !cmp.Equal(miniblocks[i].Number, readMiniblocks[i].Number) {
			collect.Errorf("unexpected miniblock number")
		}
		if !cmp.Equal(miniblocks[i].Data, readMiniblocks[i].Data) {
			collect.Errorf("unexpected miniblock data")
		}
		if !cmp.Equal(miniblocks[i].Snapshot, readMiniblocks[i].Snapshot) {
			collect.Errorf("unexpected miniblock snapshot")
		}
	}
}
