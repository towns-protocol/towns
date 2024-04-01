package storage

import (
	"context"
	"embed"
	"encoding/hex"
	"fmt"
	"testing"

	"github.com/ethereum/go-ethereum/common"
	"github.com/jackc/pgx/v5"
	"github.com/river-build/river/core/node/base/test"
	. "github.com/river-build/river/core/node/shared"
	"github.com/river-build/river/core/node/testutils"
	"github.com/river-build/river/core/node/testutils/dbtestutils"
	"github.com/stretchr/testify/require"
)

//go:embed migrations/000001*
var initialMigrations embed.FS

//go:embed migrations/00000[12]*
var miniblockCandidateMigrations embed.FS

func TestMigrateExistingDb(t *testing.T) {
	_, _, c1 := setupTest()
	defer c1()
	_, _, c2 := setupTest()
	defer c2()
}

func migrateAndExecute(
	t *testing.T,
	migrations embed.FS,
	executeFunc func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore),
) {
	ctx, pgEventStore, closer := setupTestWithMigration(testSchemaName+"-migrations", migrations)
	defer closer()

	executeFunc(t, ctx, pgEventStore)
}

func TestMiniblockCandidateMigration(t *testing.T) {
	require := require.New(t)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	ctx := test.NewTestContext()
	defer func() {
		_ = dbtestutils.DeleteTestSchema(ctx, testDatabaseUrl, testSchemaName+"-migrations")
	}()

	// Write a stream to db after initial migration with a manual insert directly into the db.
	// Unfortunately, we cannot use the public API because it will try to create a stream partition in the miniblock candidates table.
	migrateAndExecute(
		t,
		initialMigrations,
		func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) {
			genesisMiniblock := []byte("genesisMiniblock")
			tableSuffix := createTableSuffix(streamId)
			sql := fmt.Sprintf(
				`INSERT INTO es (stream_id, latest_snapshot_miniblock) VALUES ($1, 0);
				CREATE TABLE miniblocks_%[1]s PARTITION OF miniblocks FOR VALUES IN ($1);
				CREATE TABLE minipools_%[1]s PARTITION OF minipools FOR VALUES IN ($1);
				INSERT INTO miniblocks (stream_id, seq_num, blockdata) VALUES ($1, 0, $2);
				INSERT INTO minipools (stream_id, generation, slot_num) VALUES ($1, 1, -1);`,
				tableSuffix,
			)
			_, err := pgEventStore.pool.Exec(ctx, sql, streamId, genesisMiniblock)
			require.NoError(err)

			// Sanity check
			numStreams, err := pgEventStore.GetStreamsNumber(ctx)
			require.NoError(err)
			require.Equal(1, numStreams)
		},
	)

	// Apply 2nd migration (miniblock candidates table creation) and check that a stream partition is created for the existing stream.
	migrateAndExecute(
		t,
		miniblockCandidateMigrations,
		func(t *testing.T, ctx context.Context, pgEventStore *PostgresEventStore) {
			// We should have no trouble writing a block proposal for this stream, which is inserted into the partiion, due to the migration.
			err := pgEventStore.WriteBlockProposal(
				ctx,
				streamId,
				common.BytesToHash([]byte("block_hash")),
				1,
				[]byte("miniblock"),
			)
			require.NoError(err)

			// Explicitly check that stream partition in miniblock candidates table exists for pre-existing stream after migration, and that
			// the block proposal candidate was written there.
			sql := fmt.Sprintf(
				"SELECT stream_id, seq_num, block_hash, blockdata FROM miniblock_candidates_%[1]s WHERE stream_id = $1",
				createTableSuffix(streamId),
			)
			txn, err := pgEventStore.pool.BeginTx(ctx, pgx.TxOptions{})
			require.NoError(err)
			rows, err := txn.Query(ctx, sql, streamId)
			require.NoError(err)
			require.True(rows.Next(), "Expected 1 row to be returned")
			var streamIdFromDb []byte
			var seqNum int64
			var blockHash []byte
			var blockData []byte
			err = rows.Scan(&streamIdFromDb, &seqNum, &blockHash, &blockData)
			require.NoError(err)
			require.False(rows.Next())

			require.NoError(txn.Rollback(ctx)) // Clean up transaction for test case termination.

			require.Equal(streamId.Bytes(), common.Hex2BytesFixed(string(streamIdFromDb), STREAM_ID_BYTES_LENGTH))
			require.Equal(int64(1), seqNum)
			require.Equal(hex.EncodeToString(common.BytesToHash([]byte("block_hash")).Bytes()), string(blockHash))
			require.Equal([]byte("miniblock"), blockData)
		},
	)
	require.NoError(nil)
}
