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
		client          = tc.Client()
		head, _         = client.HeaderByNumber(ctx, nil)
		headBlockNum    = head.Number.Uint64()
		collectedBlocks = make(chan crypto.BlockNumber, 10)
		onBlockCallback = func(blockNumber crypto.BlockNumber) {
			collectedBlocks <- blockNumber
		}
		monitor = crypto.NewChainMonitorBuilder(crypto.BlockNumber(head.Number.Uint64() + 1)).
			OnBlock(onBlockCallback).
			Build(50 * time.Millisecond)
	)

	// simulate some blocks before the monitor was started, the monitor must
	// pick these up as well.
	tc.Commit()
	tc.Commit()

	go monitor.Run(ctx, client)

	for i := 0; i < 2+10; i++ {
		tc.Commit()
		got := <-collectedBlocks
		require.Equal(headBlockNum+1+uint64(i), got.AsUint64())
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
		client  = tc.Client()
		owner   = tc.DeployerBlockchain
		head, _ = client.HeaderByNumber(ctx, nil)

		collectedBlocksCount atomic.Int64
		collectedBlocks      []crypto.BlockNumber
		onBlockCallback      = func(blockNumber crypto.BlockNumber) {
			collectedBlocks = append(collectedBlocks, blockNumber)
			collectedBlocksCount.Store(int64(len(collectedBlocks)))
		}

		allEventCallbackCapturedEvents []types.Log
		allEventCallback               = func(event types.Log) {
			allEventCallbackCapturedEvents = append(allEventCallbackCapturedEvents, event)
		}
		contractEventCallbackCapturedEvents []types.Log
		contractEventCallback               = func(event types.Log) {
			contractEventCallbackCapturedEvents = append(contractEventCallbackCapturedEvents, event)
		}
		contractWithTopicsEventCallbackCapturedEvents []types.Log
		contractWithTopicsEventCallback               = func(event types.Log) {
			contractWithTopicsEventCallbackCapturedEvents = append(contractWithTopicsEventCallbackCapturedEvents, event)
		}

		nodeRegistryABI, _ = abi.JSON(strings.NewReader(contracts.NodeRegistryV1ABI))

		monitor = crypto.NewChainMonitorBuilder(crypto.BlockNumber(head.Number.Uint64()+1)).
			OnBlock(onBlockCallback).
			OnAllEvents(allEventCallback).
			OnContractEvent(tc.RiverRegistryAddress, contractEventCallback).
			OnContractWithTopicsEvent(tc.RiverRegistryAddress, [][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}}, contractWithTopicsEventCallback).
			Build(50 * time.Millisecond)

		urls  = []string{"https://river0.test"}
		addrs = []common.Address{tc.Wallets[0].Address}
	)

	collectedBlocksCount.Store(0)

	go monitor.Run(ctx, client)

	_, err = owner.TxRunner.Submit(
		ctx,
		func(opts *bind.TransactOpts) (*types.Transaction, error) {
			return tc.NodeRegistry.RegisterNode(opts, addrs[0], urls[0], contracts.NodeStatus_NotInitialized)
		},
	)
	require.NoError(err)

	// generate some blocks
	N := 15
	for i := 0; i < N; i++ {
		tc.Commit()
	}

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
	require.Equal(1, len(contractWithTopicsEventCallbackCapturedEvents))
	require.Equal(nodeRegistryABI.Events["NodeAdded"].ID, contractWithTopicsEventCallbackCapturedEvents[0].Topics[0])
}
