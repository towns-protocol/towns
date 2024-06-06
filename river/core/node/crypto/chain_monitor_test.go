package crypto_test

import (
	"context"
	"fmt"
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
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, 1, false)
	require.NoError(err)
	defer tc.Close()

	var (
		collectedBlocks = make(chan uint64, 10)
		onBlockCallback = func(ctx context.Context, bn crypto.BlockNumber) {
			collectedBlocks <- bn.AsUint64()
		}
	)

	tc.DeployerBlockchain.ChainMonitor.OnBlock(onBlockCallback)

	var prev uint64
	for i := 0; i < 5; i++ {
		tc.Commit(ctx)
		got := <-collectedBlocks
		if prev != 0 {
			require.Equal(prev+1, got, "unexpected block number")
		}
		prev = got
	}
}

func TestNextPollInterval(t *testing.T) {
	var (
		require          = require.New(t)
		blockPeriod      = 2 * time.Second
		errSlowdownLimit = 10 * time.Second
		tests            = []struct {
			calc           crypto.ChainMonitorPollInterval
			took           time.Duration
			gotErr         bool
			multipleBlocks bool
			exp            time.Duration
		}{
			{
				calc:           crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, errSlowdownLimit),
				took:           50 * time.Millisecond,
				gotErr:         false,
				multipleBlocks: false,
				exp:            blockPeriod - 50*time.Millisecond,
			},
			{
				calc:           crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, errSlowdownLimit),
				took:           50 * time.Millisecond,
				gotErr:         true,
				multipleBlocks: false,
				exp:            blockPeriod,
			},
			{
				calc:           crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, errSlowdownLimit),
				took:           50 * time.Millisecond,
				gotErr:         false,
				multipleBlocks: true,
				exp:            time.Duration(0),
			},
			{
				calc:           crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, errSlowdownLimit),
				took:           50 * time.Millisecond,
				gotErr:         true,
				multipleBlocks: true,
				exp:            blockPeriod,
			},
		}
	)

	for i, tc := range tests {
		require.Equal(tc.exp,
			tc.calc.Interval(tc.took, tc.multipleBlocks, tc.gotErr), fmt.Sprintf("test# %d", i))
	}

	// test scenarios that require multiple times to request
	var (
		slowdownLim = 5 * time.Second
		poll        = crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, slowdownLim)
		took        = 50 * time.Millisecond
	)

	// multiple errors followed by a successful call that yielded no new blocks
	pollInterval := poll.Interval(took, false, true)
	require.Equal(blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, true)
	require.Equal(2*blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, true)
	require.Equal(slowdownLim, pollInterval)
	pollInterval = poll.Interval(took, false, false)
	require.Equal(blockPeriod-took, pollInterval)

	// multiple errors followed by a successful call that yielded one of just a couple of blocks
	pollInterval = poll.Interval(took, false, true)
	require.Equal(blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, true)
	require.Equal(2*blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, true)
	require.Equal(slowdownLim, pollInterval)
	pollInterval = poll.Interval(took, false, false)
	require.Equal(blockPeriod-took, pollInterval)

	// multiple errors followed by a successful call that yielded multiple blocks
	pollInterval = poll.Interval(took, false, true)
	require.Equal(blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, true)
	require.Equal(2*blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, true)
	require.Equal(slowdownLim, pollInterval)
	pollInterval = poll.Interval(took, true, false)
	require.Equal(time.Duration(0), pollInterval)
}

func TestChainMonitorEvents(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()

	tc, err := crypto.NewBlockchainTestContext(ctx, 1, false)
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

		onMonitorStoppedCount = make(chan struct{})
		onMonitorStopped      = func(context.Context) {
			close(onMonitorStoppedCount)
		}

		nodeRegistryABI, _ = abi.JSON(strings.NewReader(contracts.NodeRegistryV1ABI))

		urls  = []string{"https://river0.test"}
		addrs = []common.Address{tc.Wallets[0].Address}
	)

	tc.DeployerBlockchain.ChainMonitor.OnBlock(onBlockCallback)
	tc.DeployerBlockchain.ChainMonitor.OnAllEvents(allEventCallback)
	tc.DeployerBlockchain.ChainMonitor.OnContractEvent(tc.RiverRegistryAddress, contractEventCallback)
	tc.DeployerBlockchain.ChainMonitor.OnContractWithTopicsEvent(
		tc.RiverRegistryAddress,
		[][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}},
		contractWithTopicsEventCallback,
	)
	tc.DeployerBlockchain.ChainMonitor.OnStopped(onMonitorStopped)

	collectedBlocksCount.Store(0)

	pendingTx, err := owner.TxPool.Submit(
		ctx,
		"RegisterNode",
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.NodeRegistry.RegisterNode(opts, addrs[0], urls[0], contracts.NodeStatus_NotInitialized)
		},
	)
	require.NoError(err)

	// generate some blocks
	N := 5
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
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

	cancel()
	<-onMonitorStoppedCount // if the on stop callback isn't called this will time out
}
