package crypto_test

import (
	"context"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/river-build/river/core/node/base/test"
	"github.com/river-build/river/core/node/contracts"
	"github.com/river-build/river/core/node/crypto"
	"github.com/stretchr/testify/require"
)

func TestChainMonitorBlocks(t *testing.T) {
	var (
		require     = require.New(t)
		ctx, cancel = context.WithCancel(test.NewTestContext())
	)
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, 1)
	require.NoError(err)
	defer tc.Close()

	var (
		collectedBlocks = make(chan uint64, 10)
		onBlockCallback = func(ctx context.Context, bn crypto.BlockNumber) {
			collectedBlocks <- bn.AsUint64()
		}
	)

	tc.ChainMonitor.OnBlock(onBlockCallback)

	var prev uint64
	for i := 0; i < 5; i++ {
		tc.Commit()
		got := <-collectedBlocks
		if prev != 0 {
			require.Equal(prev+1, got, "unexpected block number")
		}
		prev = got
	}
}

func TestChainMonitorEvents(t *testing.T) {
	var (
		require     = require.New(t)
		ctx, cancel = context.WithCancel(test.NewTestContext())
	)
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, 1)
	require.NoError(err)
	defer tc.Close()

	var (
		owner = tc.DeployerBlockchain

		collectedBlocksCount atomic.Int64
		collectedBlocks      []crypto.BlockNumber
		onBlockCallback      = func(ctx context.Context, blockNumber crypto.BlockNumber) {
			collectedBlocks = append(collectedBlocks, blockNumber)
			collectedBlocksCount.Store(int64(len(collectedBlocks)))
		}

		allEventCallbackCapturedEvents = make(chan types.Log, 1024)
		allEventCallback               = func(ctx context.Context, event types.Log) {
			allEventCallbackCapturedEvents <- event
		}
		contractEventCallbackCapturedEvents = make(chan types.Log, 1024)
		contractEventCallback               = func(ctx context.Context, event types.Log) {
			contractEventCallbackCapturedEvents <- event
		}
		contractWithTopicsEventCallbackCapturedEvents = make(chan types.Log, 1024)
		contractWithTopicsEventCallback               = func(ctx context.Context, event types.Log) {
			contractWithTopicsEventCallbackCapturedEvents <- event
		}

		nodeRegistryABI, _ = abi.JSON(strings.NewReader(contracts.NodeRegistryV1ABI))

		urls  = []string{"https://river0.test"}
		addrs = []common.Address{tc.Wallets[0].Address}
	)

	tc.ChainMonitor.OnBlock(onBlockCallback)
	tc.ChainMonitor.OnAllEvents(allEventCallback)
	tc.ChainMonitor.OnContractEvent(tc.RiverRegistryAddress, contractEventCallback)
	tc.ChainMonitor.OnContractWithTopicsEvent(
		tc.RiverRegistryAddress,
		[][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}},
		contractWithTopicsEventCallback,
	)

	collectedBlocksCount.Store(0)

	pendingTx, err := owner.TxPool.Submit(ctx, func(opts *bind.TransactOpts) (*types.Transaction, error) {
		return tc.NodeRegistry.RegisterNode(opts, addrs[0], urls[0], contracts.NodeStatus_NotInitialized)
	})
	require.NoError(err)

	// generate some blocks
	N := 5
	for i := 0; i < N; i++ {
		tc.Commit()
	}

	receipt := <-pendingTx.Wait()
	require.Equal(uint64(1), receipt.Status)

	// wait a bit for the monitor to catch up and has called the callbacks
	for collectedBlocksCount.Load() < int64(N) {
		time.Sleep(10 * time.Millisecond)
	}

	firstBlock := collectedBlocks[0]
	for i := range collectedBlocks {
		require.Exactly(firstBlock+crypto.BlockNumber(i), collectedBlocks[i])
	}

	require.GreaterOrEqual(len(allEventCallbackCapturedEvents), 1)
	require.GreaterOrEqual(len(contractEventCallbackCapturedEvents), 1)
	event := <-contractWithTopicsEventCallbackCapturedEvents
	require.Equal(nodeRegistryABI.Events["NodeAdded"].ID, event.Topics[0])
}
