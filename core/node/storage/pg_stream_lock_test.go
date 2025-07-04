package storage

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/require"

	// . "github.com/towns-protocol/towns/core/node/base"

	"github.com/towns-protocol/towns/core/node/testutils"

	// . "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"
	"github.com/towns-protocol/towns/core/node/testutils/testfmt"
)

func TestDbLocking(t *testing.T) {
	params := setupStreamStorageTest(t)
	defer params.closer()
	ctx := params.ctx
	require := require.New(t)

	pool := params.pgStreamStore.pool

	var version string
	err := pool.QueryRow(ctx, "SELECT version()").Scan(&version)
	require.NoError(err)
	testfmt.Println(t, "PostgreSQL version:", version)

	var majorVersion int
	err = pool.QueryRow(ctx, "SELECT current_setting('server_version_num')::integer").Scan(&majorVersion)
	require.NoError(err)
	require.GreaterOrEqual(majorVersion, 170000)

	streamId := testutils.FakeStreamId(STREAM_CHANNEL_BIN)

	_, err = pool.Exec(
		ctx,
		`INSERT INTO es (stream_id, latest_snapshot_miniblock, migrated, ephemeral) VALUES ($1, 0, true, false);
		INSERT INTO miniblocks_r00 (stream_id, seq_num, blockdata) VALUES ($1, 0, $2);
		INSERT INTO minipools_r00 (stream_id, generation, slot_num) VALUES ($1, 1, -1);`,
		streamId,
		[]byte("miniblock_data"),
	)
	require.NoError(err)

	conn1, err := pool.Acquire(ctx)
	require.NoError(err)
	defer conn1.Release()

	require.Equal(pgx.ReadCommitted, params.pgStreamStore.isolationLevel)

	tx1, err := conn1.BeginTx(
		ctx,
		pgx.TxOptions{IsoLevel: params.pgStreamStore.isolationLevel, AccessMode: pgx.ReadWrite},
	)
	require.NoError(err)
	defer rollbackTx(ctx, tx1)

	conn2, err := pool.Acquire(ctx)
	require.NoError(err)
	defer conn2.Release()

	tx2, err := conn2.BeginTx(
		ctx,
		pgx.TxOptions{IsoLevel: params.pgStreamStore.isolationLevel, AccessMode: pgx.ReadWrite},
	)
	require.NoError(err)
	defer rollbackTx(ctx, tx2)

	var lastSnapshotMiniblock int64
	err = tx1.QueryRow(
		ctx,
		"SELECT latest_snapshot_miniblock from es WHERE stream_id = $1 FOR UPDATE",
		streamId,
	).Scan(&lastSnapshotMiniblock)
	require.NoError(err)
	require.Equal(lastSnapshotMiniblock, int64(0))

	ctx2, cancel2 := context.WithTimeout(ctx, 100*time.Millisecond)
	defer cancel2()
	err = tx2.QueryRow(
		ctx2,
		"SELECT latest_snapshot_miniblock from es WHERE stream_id = $1 FOR UPDATE",
		streamId,
	).Scan(&lastSnapshotMiniblock)
	require.ErrorIs(err, context.DeadlineExceeded)
}
