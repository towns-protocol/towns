//go:build !race

// This file contains tests that are skipped when the race detector is enabled
// because they are too resource-intensive.

package rpc

import (
	"context"
	"fmt"
	"testing"
	"time"

	. "github.com/towns-protocol/towns/core/node/base"
	. "github.com/towns-protocol/towns/core/node/protocol"
	. "github.com/towns-protocol/towns/core/node/shared"

	"github.com/stretchr/testify/assert"
)

func TestArchive100StreamsWithReplication_NoRace(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping TestArchive100StreamsWithReplication_NoRace in short mode")
	}
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 5, replicationFactor: 3, start: true})
	ctx := tester.ctx
	require := tester.require

	// Create stream
	// Create 100 streams
	streamIds := testCreate100Streams(
		ctx,
		require,
		tester.testClient(0),
		&StreamSettings{DisableMiniblockCreation: true},
	)

	// Kill 2/5 nodes. With a replication factor of 3, all streams are available on at least 1 node.
	tester.nodes[1].Close(ctx, tester.dbUrl)
	tester.nodes[3].Close(ctx, tester.dbUrl)

	archiveCfg := tester.getConfig()
	archiveCfg.Archive.ArchiveId = "arch" + GenShortNanoid()

	serverCtx, serverCancel := context.WithCancel(ctx)
	defer serverCancel()

	arch, err := StartServerInArchiveMode(
		serverCtx,
		archiveCfg,
		makeTestServerOpts(tester),
		false,
	)
	require.NoError(err)
	tester.t.Cleanup(arch.Close)

	arch.Archiver.WaitForStart()
	require.Len(arch.ExitSignal(), 0)

	require.EventuallyWithT(
		func(c *assert.CollectT) {
			for _, streamId := range streamIds {
				num, err := arch.Storage().GetMaxArchivedMiniblockNumber(ctx, streamId)
				assert.NoError(c, err)
				expectedMaxBlockNum := int64(0)
				// The first stream id is a user stream with 2 miniblocks. The rest are
				// space streams with a single block.
				if streamId == streamIds[0] {
					expectedMaxBlockNum = int64(1)
				}
				assert.Equal(
					c,
					expectedMaxBlockNum,
					num,
					fmt.Sprintf("Expected %d but saw %d miniblocks for stream %s", 0, num, streamId),
				)
			}
		},
		30*time.Second,
		100*time.Millisecond,
	)

	require.NoError(compareStreamsMiniblocks(t, ctx, streamIds, arch.Storage(), tester.testClient(0)))
	requireNoCorruptStreams(ctx, require, arch.Archiver)
}

func TestArchive20StreamsWithCorruption_NoRace(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping TestArchive20StreamsWithCorruption_NoRace in short mode")
	}
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 1, start: true})
	ctx := tester.ctx
	require := tester.require

	_, userStreamIds, err := createUserSettingsStreamsWithData(ctx, tester.testClient(0), 10, 10, 5)
	require.NoError(err)

	corruptStreamIds := createCorruptStreams(
		ctx,
		require,
		tester.nodes[0].service.wallet,
		tester.testClient(0),
		tester.nodes[0].service.storage,
	)

	archiveCfg := tester.getConfig()
	archiveCfg.Archive.ArchiveId = "arch" + GenShortNanoid()
	archiveCfg.Archive.ReadMiniblocksSize = 10
	archiveCfg.Archive.MaxFailedConsecutiveUpdates = 1

	serverCtx, serverCancel := context.WithCancel(ctx)
	defer serverCancel()

	arch, err := StartServerInArchiveMode(serverCtx, archiveCfg, makeTestServerOpts(tester), false)
	require.NoError(err)
	tester.t.Cleanup(arch.Close)

	arch.Archiver.WaitForStart()
	require.Len(arch.ExitSignal(), 0)

	require.EventuallyWithT(
		func(c *assert.CollectT) {
			for _, streamId := range userStreamIds {
				num, err := arch.Storage().GetMaxArchivedMiniblockNumber(ctx, streamId)
				assert.NoError(c, err, "stream %v getMaxArchivedMiniblockNumber", streamId)
				assert.Equal(c, int64(10), num, "stream %v behind", streamId)
			}
		},
		10*time.Second,
		10*time.Millisecond,
	)
	// Validate storage contents
	require.NoError(compareStreamsMiniblocks(t, ctx, userStreamIds, arch.Storage(), tester.testClient(0)))

	require.EventuallyWithT(
		func(c *assert.CollectT) {
			corruptStreams := arch.Archiver.GetCorruptStreams(ctx)
			assert.Len(c, corruptStreams, 10)
			corruptStreamsSet := map[StreamId]struct{}{}
			for _, record := range corruptStreams {
				corruptStreamsSet[record.StreamId] = struct{}{}
			}
			for _, streamId := range corruptStreamIds {
				_, ok := corruptStreamsSet[streamId]
				assert.True(c, ok, "Stream not in corrupt stream set: %v", streamId)
			}
		},
		10*time.Second,
		10*time.Millisecond,
	)
}

func TestArchive100Streams_NoRace(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping TestArchive100Streams_NoRace in short mode")
	}
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 10, start: true})
	ctx := tester.ctx
	require := tester.require

	// Create 100 streams
	streamIds := testCreate100Streams(
		ctx,
		require,
		tester.testClient(0),
		&StreamSettings{DisableMiniblockCreation: true},
	)

	archiveCfg := tester.getConfig()
	archiveCfg.Archive.ArchiveId = "arch" + GenShortNanoid()

	serverCtx, serverCancel := context.WithCancel(ctx)
	arch, err := StartServerInArchiveMode(
		serverCtx,
		archiveCfg,
		makeTestServerOpts(tester),
		true,
	)
	require.NoError(err)
	tester.t.Cleanup(arch.Close)

	arch.Archiver.WaitForStart()
	require.Len(arch.ExitSignal(), 0)

	arch.Archiver.WaitForTasks()

	require.NoError(compareStreamsMiniblocks(t, ctx, streamIds, arch.Storage(), tester.testClient(3)))
	requireNoCorruptStreams(ctx, require, arch.Archiver)

	serverCancel()
	arch.Archiver.WaitForWorkers()

	stats := arch.Archiver.GetStats()
	require.Equal(uint64(100), stats.StreamsExamined)
	require.GreaterOrEqual(stats.SuccessOpsCount, uint64(100))
	require.Zero(stats.FailedOpsCount)
}

func TestArchive100StreamsWithData_NoRace(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping TestArchive100StreamsWithData_NoRace in short mode")
	}
	tester := newServiceTester(t, serviceTesterOpts{numNodes: 10, start: true})
	ctx := tester.ctx
	require := tester.require

	_, streamIds, err := createUserSettingsStreamsWithData(ctx, tester.testClient(0), 100, 10, 5)
	require.NoError(err)

	archiveCfg := tester.getConfig()
	archiveCfg.Archive.ArchiveId = "arch" + GenShortNanoid()
	archiveCfg.Archive.ReadMiniblocksSize = 3

	serverCtx, serverCancel := context.WithCancel(ctx)
	arch, err := StartServerInArchiveMode(serverCtx, archiveCfg, makeTestServerOpts(tester), true)
	require.NoError(err)
	tester.t.Cleanup(arch.Close)

	arch.Archiver.WaitForStart()
	require.Len(arch.ExitSignal(), 0)

	arch.Archiver.WaitForTasks()

	require.NoError(compareStreamsMiniblocks(t, ctx, streamIds, arch.Storage(), tester.testClient(5)))
	requireNoCorruptStreams(ctx, require, arch.Archiver)

	serverCancel()
	arch.Archiver.WaitForWorkers()

	stats := arch.Archiver.GetStats()
	require.Equal(uint64(100), stats.StreamsExamined)
	require.GreaterOrEqual(stats.SuccessOpsCount, uint64(100))
	require.Zero(stats.FailedOpsCount)
}
