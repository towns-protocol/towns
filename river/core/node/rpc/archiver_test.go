package rpc_test

import (
	"context"
	"net"
	"sync"
	"testing"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/crypto"
	"github.com/river-build/river/core/node/nodes"
	"github.com/river-build/river/core/node/protocol/protocolconnect"
	"github.com/river-build/river/core/node/registries"
	"github.com/river-build/river/core/node/storage"
	"github.com/river-build/river/core/node/testutils/dbtestutils"

	"github.com/river-build/river/core/node/contracts"

	"github.com/river-build/river/core/node/rpc"
	. "github.com/river-build/river/core/node/shared"
)

func fillUserSettingsStreamWithData(
	ctx context.Context,
	streamId StreamId,
	wallet *crypto.Wallet,
	client protocolconnect.StreamServiceClient,
	numMBs int,
	numEventsPerMB int,
	optionalHashBytes []byte,
) ([]byte, error) {
	var err error
	for i := 0; i < numMBs; i++ {
		for j := 0; j < numEventsPerMB; j++ {
			err = addUserBlockedFillerEvent(ctx, wallet, client, streamId, optionalHashBytes)
			if err != nil {
				return nil, err
			}
		}
		optionalHashBytes, err = makeMiniblock(ctx, client, streamId, false)
		if err != nil {
			return nil, err
		}
	}
	return optionalHashBytes, nil
}

func createUserSettingsStreamsWithData(
	ctx context.Context,
	client protocolconnect.StreamServiceClient,
	numStreams int,
	numMBs int,
	numEventsPerMB int,
) ([]*crypto.Wallet, []StreamId, error) {
	wallets := make([]*crypto.Wallet, numStreams)
	streamIds := make([]StreamId, numStreams)
	errChan := make(chan error, numStreams)

	var wg sync.WaitGroup
	wg.Add(numStreams)

	for i := 0; i < numStreams; i++ {
		go func(i int) {
			defer wg.Done()
			wallet, err := crypto.NewWallet(ctx)
			if err != nil {
				errChan <- err
				return
			}
			wallets[i] = wallet

			streamId, _, _, err := createUserSettingsStream(ctx, wallet, client)
			if err != nil {
				errChan <- err
				return
			}
			streamIds[i] = streamId

			_, err = fillUserSettingsStreamWithData(ctx, streamId, wallet, client, numMBs, numEventsPerMB, nil)
			if err != nil {
				errChan <- err
				return
			}
		}(i)
	}

	wg.Wait()
	if len(errChan) > 0 {
		return nil, nil, <-errChan
	}
	return wallets, streamIds, nil
}

func TestArchiveOneStream(t *testing.T) {
	tester := newServiceTesterAndStart(t, 1)
	ctx := tester.ctx
	require := tester.require

	// Create stream
	client := tester.testClient(0)
	wallet, err := crypto.NewWallet(ctx)
	require.NoError(err)
	streamId, _, _, err := createUserSettingsStream(ctx, wallet, client)
	require.NoError(err)

	archiveCfg := tester.getConfig()
	archiveCfg.Archive.ArchiveId = "arch" + GenShortNanoid()
	archiveCfg.Archive.ReadMiniblcocksSize = 3

	chainMonitor := tester.btc.ChainMonitor
	bc := tester.btc.NewWalletAndBlockchain(ctx)

	registryContract, err := registries.NewRiverRegistryContract(ctx, bc, &archiveCfg.RegistryContract)
	require.NoError(err)

	var nodeRegistry nodes.NodeRegistry
	nodeRegistry, err = nodes.LoadNodeRegistry(ctx, registryContract, common.Address{}, bc.InitialBlockNum, chainMonitor)
	require.NoError(err)

	dbCfg, schema, schemaDeleter, err := dbtestutils.StartDB(ctx)
	require.NoError(err)
	defer schemaDeleter()

	pool, err := storage.CreateAndValidatePgxPool(ctx, dbCfg, schema)
	require.NoError(err)

	streamStorage, err := storage.NewPostgresEventStore(
		ctx,
		pool,
		GenShortNanoid(),
		make(chan error, 1),
	)
	require.NoError(err)

	arch := rpc.NewArchiver(&archiveCfg.Archive, registryContract, nodeRegistry, streamStorage)

	callOpts := &bind.CallOpts{
		Context: ctx,
	}

	streamRecord, err := registryContract.StreamRegistry.GetStream(callOpts, streamId)
	require.NoError(err)
	require.Zero(streamRecord.LastMiniblockNum) // Only genesis miniblock is created

	err = arch.ArchiveStream(
		ctx,
		&contracts.StreamWithId{
			Id:     streamId,
			Stream: streamRecord,
		},
	)
	require.NoError(err)

	num, err := streamStorage.GetMaxArchivedMiniblockNumber(ctx, streamId)
	require.NoError(err)
	require.Zero(num) // Only genesis miniblock is created

	// Add event to the stream, create miniblock, and archive it
	err = addUserBlockedFillerEvent(ctx, wallet, client, streamId, streamRecord.LastMiniblockHash[:])
	require.NoError(err)

	hashBytes, err := makeMiniblock(ctx, client, streamId, false)
	require.NoError(err)

	streamRecord, err = registryContract.StreamRegistry.GetStream(callOpts, streamId)
	require.NoError(err)
	require.Equal(uint64(1), streamRecord.LastMiniblockNum)

	err = arch.ArchiveStream(
		ctx,
		&contracts.StreamWithId{
			Id:     streamId,
			Stream: streamRecord,
		},
	)
	require.NoError(err)

	num, err = streamStorage.GetMaxArchivedMiniblockNumber(ctx, streamId)
	require.NoError(err)
	require.Equal(int64(1), num)

	// Test pagination: create at least 10 miniblocks.
	_, err = fillUserSettingsStreamWithData(ctx, streamId, wallet, client, 10, 5, hashBytes)
	require.NoError(err)

	streamRecord, err = registryContract.StreamRegistry.GetStream(callOpts, streamId)
	require.NoError(err)
	require.GreaterOrEqual(streamRecord.LastMiniblockNum, uint64(10))

	err = arch.ArchiveStream(
		ctx,
		&contracts.StreamWithId{
			Id:     streamId,
			Stream: streamRecord,
		},
	)
	require.NoError(err)

	num, err = streamStorage.GetMaxArchivedMiniblockNumber(ctx, streamId)
	require.NoError(err)
	require.Equal(int64(streamRecord.LastMiniblockNum), num)

	streamCount, _, _ := arch.GetStats()
	require.Equal(uint64(1), streamCount)
}

func TestArchive100Streams(t *testing.T) {
	tester := newServiceTesterAndStart(t, 10)
	ctx := tester.ctx
	require := tester.require

	// Create 100 streams
	streamIds := testCreate100Streams(ctx, require, tester.testClient(0))

	archiveCfg := tester.getConfig()
	archiveCfg.Archive.ArchiveId = "arch" + GenShortNanoid()

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(err)

	archiverBC := tester.btc.NewWalletAndBlockchain(ctx)
	serverCtx, serverCancel := context.WithCancel(ctx)
	arch, err := rpc.StartServerInArchiveMode(serverCtx, archiveCfg, archiverBC, listener)
	require.NoError(err)

	arch.Archiver.WaitForStart()
	require.Len(arch.ExitSignal(), 0)

	arch.Archiver.WaitForTasks()

	for _, streamId := range streamIds {
		_, err := arch.Storage().GetMaxArchivedMiniblockNumber(ctx, streamId)
		require.NoError(err)
	}

	serverCancel()
	arch.Archiver.WaitForWorkers()

	streamCount, succeed, failed := arch.Archiver.GetStats()
	require.Equal(uint64(100), streamCount)
	require.GreaterOrEqual(succeed, uint64(100))
	require.Zero(failed)
}

func TestArchive100StreamsWithData(t *testing.T) {
	tester := newServiceTesterAndStart(t, 10)
	ctx := tester.ctx
	require := tester.require

	_, streamIds, err := createUserSettingsStreamsWithData(ctx, tester.testClient(0), 100, 10, 5)
	require.NoError(err)

	archiveCfg := tester.getConfig()
	archiveCfg.Archive.ArchiveId = "arch" + GenShortNanoid()
	archiveCfg.Archive.ReadMiniblcocksSize = 3

	listener, err := net.Listen("tcp", "localhost:0")
	require.NoError(err)

	archiverBC := tester.btc.NewWalletAndBlockchain(ctx)
	serverCtx, serverCancel := context.WithCancel(ctx)
	arch, err := rpc.StartServerInArchiveMode(serverCtx, archiveCfg, archiverBC, listener)
	require.NoError(err)

	arch.Archiver.WaitForStart()
	require.Len(arch.ExitSignal(), 0)

	arch.Archiver.WaitForTasks()

	//client := tester.testClient(5)
	for _, streamId := range streamIds {
		// TODO: fix non-determinism in MakeMiniblock (never was intended for test usage)
		// and then re-enable this part
		// num, err := arch.Storage().GetMaxArchivedMiniblockNumber(ctx, streamId)
		// require.NoError(err)

		// resp, err := client.GetLastMiniblockHash(ctx, connect.NewRequest(&GetLastMiniblockHashRequest{
		// 	StreamId: streamId[:],
		// }))
		// require.NoError(err)
		// require.Equal(num, resp.Msg.MiniblockNum)
		num, err := arch.Storage().GetMaxArchivedMiniblockNumber(ctx, streamId)
		require.NoError(err)
		require.GreaterOrEqual(num, int64(5))
	}

	serverCancel()
	arch.Archiver.WaitForWorkers()

	streamCount, succeed, failed := arch.Archiver.GetStats()
	require.Equal(uint64(100), streamCount)
	require.GreaterOrEqual(succeed, uint64(100))
	require.Zero(failed)
}
