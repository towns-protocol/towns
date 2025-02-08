package crypto_test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/stretchr/testify/require"

	"github.com/towns-protocol/towns/core/contracts/river"
	"github.com/towns-protocol/towns/core/node/base/test"
	"github.com/towns-protocol/towns/core/node/crypto"
	"github.com/towns-protocol/towns/core/node/infra"
)

func TestChainMonitorBlocks(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{NumKeys: 1})
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
		require           = require.New(t)
		blockPeriod       = 2 * time.Second
		closeDownDuration = max(25*time.Millisecond, blockPeriod/50)
		errSlowdownLimit  = 10 * time.Second
		tests             = []struct {
			calc           crypto.ChainMonitorPollInterval
			took           time.Duration
			gotErr         bool
			gotBlock       bool
			multipleBlocks bool
			exp            time.Duration
		}{
			{
				calc:           crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, errSlowdownLimit),
				took:           50 * time.Millisecond,
				gotErr:         false,
				gotBlock:       true,
				multipleBlocks: false,
				exp:            blockPeriod - 50*time.Millisecond - closeDownDuration,
			},
			{
				calc:           crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, errSlowdownLimit),
				took:           50 * time.Millisecond,
				gotErr:         true,
				gotBlock:       false,
				multipleBlocks: false,
				exp:            blockPeriod,
			},
			{
				calc:           crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, errSlowdownLimit),
				took:           50 * time.Millisecond,
				gotErr:         false,
				gotBlock:       true,
				multipleBlocks: true,
				exp:            time.Duration(0),
			},
			{
				calc:           crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, errSlowdownLimit),
				took:           50 * time.Millisecond,
				gotErr:         true,
				gotBlock:       true,
				multipleBlocks: true,
				exp:            blockPeriod,
			},
		}
	)

	for i, tc := range tests {
		got := tc.calc.Interval(tc.took, tc.gotBlock, tc.multipleBlocks, tc.gotErr)
		require.Equal(tc.exp, got, fmt.Sprintf("test# %d", i))
	}

	// test scenarios that require multiple times to request
	var (
		slowdownLim = 5 * time.Second
		poll        = crypto.NewChainMonitorPollIntervalCalculator(blockPeriod, slowdownLim)
		took        = 50 * time.Millisecond
	)

	// multiple errors followed by a successful call that yielded no new blocks
	pollInterval := poll.Interval(took, false, false, true)
	require.Equal(blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, false, true)
	require.Equal(2*blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, false, true)
	require.Equal(slowdownLim, pollInterval)
	pollInterval = poll.Interval(took, true, false, false)
	require.Equal(blockPeriod-took-closeDownDuration, pollInterval)

	// multiple errors followed by a successful call that yielded one of just a couple of blocks
	pollInterval = poll.Interval(took, false, false, true)
	require.Equal(blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, false, true)
	require.Equal(2*blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, false, false, true)
	require.Equal(slowdownLim, pollInterval)
	pollInterval = poll.Interval(took, true, false, false)
	require.Equal(blockPeriod-took-closeDownDuration, pollInterval)

	// multiple errors followed by a successful call that yielded multiple blocks
	pollInterval = poll.Interval(took, true, false, true)
	require.Equal(blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, true, false, true)
	require.Equal(2*blockPeriod, pollInterval)
	pollInterval = poll.Interval(took, true, false, true)
	require.Equal(slowdownLim, pollInterval)
	pollInterval = poll.Interval(took, true, true, false)
	require.Equal(time.Duration(0), pollInterval)
}

func TestChainMonitorEvents(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()

	tc, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{NumKeys: 1})
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

		nodeRegistryABI, _ = abi.JSON(strings.NewReader(river.NodeRegistryV1ABI))

		urls  = []string{"https://river0.test"}
		addrs = []common.Address{tc.Wallets[0].Address}
	)

	tc.DeployerBlockchain.ChainMonitor.OnBlock(onBlockCallback)
	tc.DeployerBlockchain.ChainMonitor.OnAllEvents(owner.InitialBlockNum+1, allEventCallback)
	tc.DeployerBlockchain.ChainMonitor.OnContractEvent(
		owner.InitialBlockNum+1,
		tc.RiverRegistryAddress,
		contractEventCallback,
	)
	tc.DeployerBlockchain.ChainMonitor.OnContractWithTopicsEvent(
		owner.InitialBlockNum+1,
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
			return tc.NodeRegistry.RegisterNode(opts, addrs[0], urls[0], river.NodeStatus_NotInitialized)
		},
	)
	require.NoError(err)

	// generate some blocks
	N := 5
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	receipt, err := pendingTx.Wait(ctx)
	require.NoError(err)
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

func TestContractAllEventsFromFuture(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{})
	require.NoError(err)
	defer tc.Close()

	var (
		owner                                         = tc.DeployerBlockchain
		chainMonitor                                  = tc.DeployerBlockchain.ChainMonitor
		nodeCount                                     = 5
		contractWithTopicsEventCallbackCapturedEvents = make(chan types.Log, nodeCount)
		contractWithTopicsEventCallback               = func(ctx context.Context, event types.Log) {
			contractWithTopicsEventCallbackCapturedEvents <- event
		}
		futureContractEventsCallbackCapturedEvents = make(chan types.Log, nodeCount)
		futureContractEventsCallback               = func(ctx context.Context, event types.Log) {
			futureContractEventsCallbackCapturedEvents <- event
		}
		nodeRegistryABI, _ = abi.JSON(strings.NewReader(river.NodeRegistryV1MetaData.ABI))
		readCapturedEvents = func(captured <-chan types.Log) []types.Log {
			var logs []types.Log
			for i := 0; i < nodeCount; i++ {
				logs = append(logs, <-captured)
			}
			return logs
		}
	)

	chainMonitor.OnContractWithTopicsEvent(
		0,
		tc.RiverRegistryAddress,
		[][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}},
		contractWithTopicsEventCallback,
	)

	// register several nodes
	var (
		pendingTx     crypto.TransactionPoolPendingTransaction
		nodeAddresses = make([]common.Address, nodeCount)
	)
	for i := range nodeCount {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(err, "new wallet")
		nodeAddresses[i] = wallet.Address
		pendingTx, err = owner.TxPool.Submit(
			ctx,
			"RegisterNode",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return tc.NodeRegistry.RegisterNode(
					opts,
					wallet.Address,
					fmt.Sprintf("https://node%d.river.test", i),
					river.NodeStatus_NotInitialized,
				)
			},
		)
		require.NoError(err, "register node")
	}

	require.NoError(err)

	// generate some blocks
	N := 5
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	receipt, err := pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt.Status)

	var (
		events                  = readCapturedEvents(contractWithTopicsEventCallbackCapturedEvents)
		lastRegisteredNodeEvent = events[nodeCount-1]
	)

	require.Equal(nodeCount, len(events), "unexpected NodeAdded logs count")

	// generate extra blocks to ensure that the chain monitor is past the existing set of blocks and needs to look at
	// historical blocks to find the NodeAdded events.
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	for {
		blockNum := tc.BlockNum(ctx)
		if blockNum.AsUint64() > lastRegisteredNodeEvent.BlockNumber {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	futureBlockNum := 2 + tc.BlockNum(ctx)
	chainMonitor.OnAllEvents(futureBlockNum, futureContractEventsCallback)

	// mine some blocks to get past the future block
	for {
		time.Sleep(10 * time.Millisecond)
		tc.Commit(ctx)
		if tc.BlockNum(ctx).AsUint64() > futureBlockNum.AsUint64() {
			break
		}
	}

	// ensure that futureContractEventsCallback receives new node added events
	for i := range nodeCount {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(err, "new wallet")
		nodeAddresses[i] = wallet.Address
		pendingTx, err = owner.TxPool.Submit(
			ctx,
			"RegisterNode",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return tc.NodeRegistry.RegisterNode(
					opts,
					wallet.Address,
					fmt.Sprintf("https://node%d.river.test", i),
					river.NodeStatus_NotInitialized,
				)
			},
		)
		require.NoError(err, "register node")
	}

	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	receipt, err = pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt.Status)

	// ensure that futureContractEventsCallbackCapturedEvents received old NodeAdded events
	futureEvents := readCapturedEvents(futureContractEventsCallbackCapturedEvents)

	// make sure we received the node added events after the future block
	require.Equal(nodeCount, len(futureEvents), "unexpected NodeAdded logs count")
}

func TestContractAllEventsFromPast(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{})
	require.NoError(err)
	defer tc.Close()

	var (
		owner                                         = tc.DeployerBlockchain
		chainMonitor                                  = tc.DeployerBlockchain.ChainMonitor
		nodeCount                                     = 5
		contractWithTopicsEventCallbackCapturedEvents = make(chan types.Log, nodeCount)
		contractWithTopicsEventCallback               = func(ctx context.Context, event types.Log) {
			contractWithTopicsEventCallbackCapturedEvents <- event
		}
		historicalContractAllEventsCallbackCapturedEvents = make(chan types.Log, nodeCount)
		historicalContractAllEventsCallback               = func(ctx context.Context, event types.Log) {
			historicalContractAllEventsCallbackCapturedEvents <- event
		}
		historicalContractEventsCallbackCapturedEvents = make(chan types.Log, nodeCount)
		historicalContractEventsCallback               = func(ctx context.Context, event types.Log) {
			historicalContractEventsCallbackCapturedEvents <- event
		}
		nodeRegistryABI, _ = abi.JSON(strings.NewReader(river.NodeRegistryV1MetaData.ABI))
		readCapturedEvents = func(captured <-chan types.Log) []types.Log {
			var logs []types.Log
			for i := 0; i < nodeCount; i++ {
				logs = append(logs, <-captured)
			}
			return logs
		}
	)

	chainMonitor.OnContractWithTopicsEvent(
		0,
		tc.RiverRegistryAddress,
		[][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}},
		contractWithTopicsEventCallback,
	)

	// register several nodes
	var (
		pendingTx     crypto.TransactionPoolPendingTransaction
		nodeAddresses = make([]common.Address, nodeCount)
	)
	for i := range nodeCount {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(err, "new wallet")
		nodeAddresses[i] = wallet.Address
		pendingTx, err = owner.TxPool.Submit(
			ctx,
			"RegisterNode",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return tc.NodeRegistry.RegisterNode(
					opts,
					wallet.Address,
					fmt.Sprintf("https://node%d.river.test", i),
					river.NodeStatus_NotInitialized,
				)
			},
		)
		require.NoError(err, "register node")
	}

	require.NoError(err)

	// generate some blocks
	N := 5
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	receipt, err := pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt.Status)

	var (
		events                   = readCapturedEvents(contractWithTopicsEventCallbackCapturedEvents)
		firstRegisteredNodeEvent = events[0]
		lastRegisteredNodeEvent  = events[nodeCount-1]
	)

	require.Equal(nodeCount, len(events), "unexpected NodeAdded logs count")

	// generate extra blocks to ensure that the chain monitor is past the existing set of blocks and needs to look at
	// historical blocks to find the NodeAdded events.
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	for {
		blockNum := tc.BlockNum(ctx)
		if blockNum.AsUint64() > lastRegisteredNodeEvent.BlockNumber {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	// register a callback for the NodeAdded event on an old block.
	// Ensure that historicalContractAllEventsCallback and historicalContractEventsCallback receive all node added
	// events from the past.
	chainMonitor.OnAllEvents(
		crypto.BlockNumber(firstRegisteredNodeEvent.BlockNumber),
		historicalContractAllEventsCallback,
	)

	chainMonitor.OnContractEvent(
		crypto.BlockNumber(firstRegisteredNodeEvent.BlockNumber),
		tc.RiverRegistryAddress,
		historicalContractEventsCallback,
	)

	// ensure that historicalContractWithTopicsEventCallback received old NodeAdded events
	historicalAllEvents := readCapturedEvents(historicalContractAllEventsCallbackCapturedEvents)
	historicalContractEvents := readCapturedEvents(historicalContractEventsCallbackCapturedEvents)

	// make sure all logs match and that contractWithTopicsEventCallback didn't receive the same logs again
	require.Equal(nodeCount, len(historicalAllEvents), "unexpected NodeAdded logs count")
	require.EqualValues(events, historicalContractEvents, "unexpected logs")
	require.Equal(nodeCount, len(historicalAllEvents), "unexpected NodeAdded logs count")
	require.EqualValues(events, historicalContractEvents, "unexpected logs")
}

func TestContracEventsWithTopicsBeforeStart(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{})
	require.NoError(err)
	defer tc.Close()

	var (
		owner     = tc.DeployerBlockchain
		nodeCount = 5

		nodeRegistryABI, _ = abi.JSON(strings.NewReader(river.NodeRegistryV1MetaData.ABI))
	)

	// register several nodes
	var (
		pendingTx     crypto.TransactionPoolPendingTransaction
		nodeAddresses = make([]common.Address, nodeCount)
	)
	for i := range nodeCount {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(err, "new wallet")
		nodeAddresses[i] = wallet.Address
		pendingTx, err = owner.TxPool.Submit(
			ctx,
			"RegisterNode",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return tc.NodeRegistry.RegisterNode(
					opts,
					wallet.Address,
					fmt.Sprintf("https://node%d.river.test", i),
					river.NodeStatus_NotInitialized,
				)
			},
		)
		require.NoError(err, "register node")
	}

	require.NoError(err)

	// generate some blocks
	N := 5
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	receipt, err := pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt.Status)

	events1C := make(chan types.Log, nodeCount)
	tc.DeployerBlockchain.ChainMonitor.OnContractWithTopicsEvent(
		0,
		tc.RiverRegistryAddress,
		[][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}},
		func(ctx context.Context, event types.Log) {
			events1C <- event
		},
	)

	events1 := []types.Log{}
	require.Eventually(func() bool {
		for {
			select {
			case event := <-events1C:
				events1 = append(events1, event)
			default:
				return len(events1) == nodeCount
			case <-ctx.Done():
				panic("context cancelled")
			}
		}
	}, 10*time.Second, 10*time.Millisecond, "unexpected NodeAdded logs count: first monitor reading historical events")

	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	// Create a new chain monitor and start it.
	chainMonitor := crypto.NewChainMonitor()
	chainMonitor.Start(ctx, tc.Client(), tc.BlockNum(ctx), 100*time.Millisecond, infra.NewMetricsFactory(nil, "", ""))

	events2C := make(chan types.Log, nodeCount)

	// register a callback from block 0, which is before starting block for the new monitor
	chainMonitor.OnContractWithTopicsEvent(
		crypto.BlockNumber(0),
		tc.RiverRegistryAddress,
		[][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}},
		func(ctx context.Context, event types.Log) {
			events2C <- event
		},
	)

	events2 := []types.Log{}
	require.Eventually(func() bool {
		for {
			select {
			case event := <-events2C:
				events2 = append(events2, event)
			default:
				return len(events2) == nodeCount
			case <-ctx.Done():
				panic("context cancelled")
			}
		}
	}, 10*time.Second, 10*time.Millisecond, "unexpected NodeAdded logs count: second monitor reading pre-start events")

	require.EqualValues(events1, events2, "historical events mismatch pre-start events")

	require.Empty(events1C, "unexpected events")
	require.Empty(events2C, "unexpected events")
}

type onBlockCollector struct {
	lastBlockNumber crypto.BlockNumber
	allLogs         []*types.Log
	mu              sync.Mutex
}

func (c *onBlockCollector) onBlock(ctx context.Context, blockNumber crypto.BlockNumber, logs []*types.Log) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.lastBlockNumber = blockNumber
	c.allLogs = append(c.allLogs, logs...)
}

func (c *onBlockCollector) lastBlock() crypto.BlockNumber {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.lastBlockNumber
}

func (c *onBlockCollector) logs() []*types.Log {
	c.mu.Lock()
	defer c.mu.Unlock()
	return slices.Clone(c.allLogs)
}

func registerNodes(
	t *testing.T,
	ctx context.Context,
	tc *crypto.BlockchainTestContext,
	owner *crypto.Blockchain,
	nodeCount int,
) {
	require := require.New(t)
	// register several nodes
	var pendingTx crypto.TransactionPoolPendingTransaction
	for i := range nodeCount {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(err, "new wallet")
		pendingTx, err = owner.TxPool.Submit(
			ctx,
			"RegisterNode",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return tc.NodeRegistry.RegisterNode(
					opts,
					wallet.Address,
					fmt.Sprintf("https://node%d.river.test", i),
					river.NodeStatus_NotInitialized,
				)
			},
		)
		require.NoError(err, "register node")
	}

	// generate some blocks
	N := 5
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	receipt, err := pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt.Status)
}

func TestOnBlockWithLogs(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{})
	require.NoError(err)
	defer tc.Close()

	owner := tc.DeployerBlockchain
	chainMonitor := tc.DeployerBlockchain.ChainMonitor
	nodeCount := 5

	var collector onBlockCollector
	fromBlock := tc.BlockNum(ctx) + 1
	chainMonitor.OnBlockWithLogs(fromBlock, collector.onBlock)

	registerNodes(t, ctx, tc, owner, nodeCount)

	currentBlock := tc.BlockNum(ctx)
	// wait for the collector to receive the current block
	require.Eventually(func() bool {
		return collector.lastBlock() >= currentBlock
	}, 10*time.Second, 10*time.Millisecond)

	require.Len(collector.logs(), nodeCount, "unexpected NodeAdded logs count")

	var futureCollector onBlockCollector
	chainMonitor.OnBlockWithLogs(tc.BlockNum(ctx)+3, futureCollector.onBlock)

	// get past futureCollector block
	N := 5
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	registerNodes(t, ctx, tc, owner, nodeCount)

	currentBlock = tc.BlockNum(ctx)
	// wait for the collectors to receive the current block
	require.Eventually(func() bool {
		return futureCollector.lastBlock() >= currentBlock && collector.lastBlock() >= currentBlock
	}, 10*time.Second, 10*time.Millisecond)

	require.Len(futureCollector.logs(), nodeCount, "unexpected NodeAdded logs count")
	require.Len(collector.logs(), nodeCount*2, "unexpected NodeAdded logs count")

	var pastCollector onBlockCollector
	chainMonitor.OnBlockWithLogs(fromBlock, pastCollector.onBlock)
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}
	require.Eventually(func() bool {
		return pastCollector.lastBlock() >= currentBlock
	}, 10*time.Second, 10*time.Millisecond)

	require.Len(pastCollector.logs(), nodeCount*2, "unexpected NodeAdded logs count")

	registerNodes(t, ctx, tc, owner, nodeCount)

	currentBlock = tc.BlockNum(ctx)
	require.Eventually(func() bool {
		return pastCollector.lastBlock() >= currentBlock && futureCollector.lastBlock() >= currentBlock &&
			collector.lastBlock() >= currentBlock
	}, 10*time.Second, 10*time.Millisecond)

	require.Len(pastCollector.logs(), nodeCount*3, "unexpected NodeAdded logs count")
	require.Len(futureCollector.logs(), nodeCount*2, "unexpected NodeAdded logs count")
	require.Len(collector.logs(), nodeCount*3, "unexpected NodeAdded logs count")
}

func TestContractEventsWithTopicsFromPast(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{})
	require.NoError(err)
	defer tc.Close()

	var (
		owner                                         = tc.DeployerBlockchain
		chainMonitor                                  = tc.DeployerBlockchain.ChainMonitor
		nodeCount                                     = 5
		contractWithTopicsEventCallbackCapturedEvents = make(chan types.Log, nodeCount)
		contractWithTopicsEventCallback               = func(ctx context.Context, event types.Log) {
			contractWithTopicsEventCallbackCapturedEvents <- event
		}
		historicalContractWithTopicsEventCallbackCapturedEvents = make(chan types.Log, nodeCount)
		historicalContractWithTopicsEventCallback               = func(ctx context.Context, event types.Log) {
			historicalContractWithTopicsEventCallbackCapturedEvents <- event
		}
		nodeRegistryABI, _ = abi.JSON(strings.NewReader(river.NodeRegistryV1MetaData.ABI))
		readCapturedEvents = func(captured <-chan types.Log) []types.Log {
			var logs []types.Log
			for i := 0; i < nodeCount; i++ {
				logs = append(logs, <-captured)
			}
			return logs
		}
	)

	chainMonitor.OnContractWithTopicsEvent(
		0,
		tc.RiverRegistryAddress,
		[][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}},
		contractWithTopicsEventCallback,
	)

	// register several nodes
	var (
		pendingTx     crypto.TransactionPoolPendingTransaction
		nodeAddresses = make([]common.Address, nodeCount)
	)
	for i := range nodeCount {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(err, "new wallet")
		nodeAddresses[i] = wallet.Address
		pendingTx, err = owner.TxPool.Submit(
			ctx,
			"RegisterNode",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return tc.NodeRegistry.RegisterNode(
					opts,
					wallet.Address,
					fmt.Sprintf("https://node%d.river.test", i),
					river.NodeStatus_NotInitialized,
				)
			},
		)
		require.NoError(err, "register node")
	}

	require.NoError(err)

	// generate some blocks
	N := 5
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	receipt, err := pendingTx.Wait(ctx)
	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt.Status)

	var (
		events                   = readCapturedEvents(contractWithTopicsEventCallbackCapturedEvents)
		firstRegisteredNodeEvent = events[0]
		lastRegisteredNodeEvent  = events[nodeCount-1]
	)

	require.Equal(nodeCount, len(events), "unexpected NodeAdded logs count")

	// generate extra blocks to ensure that the chain monitor is past the existing set of blocks and needs to look at
	// historical blocks to find the NodeAdded events.
	for i := 0; i < N; i++ {
		tc.Commit(ctx)
	}

	for {
		blockNum := tc.BlockNum(ctx)
		if blockNum.AsUint64() > lastRegisteredNodeEvent.BlockNumber {
			break
		}
		time.Sleep(10 * time.Millisecond)
	}

	// register a callback for the NodeAdded event on an old block.
	// Ensure that historicalContractWithTopicsEventCallback receives all node added events from the past.
	chainMonitor.OnContractWithTopicsEvent(
		crypto.BlockNumber(firstRegisteredNodeEvent.BlockNumber),
		tc.RiverRegistryAddress,
		[][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}},
		historicalContractWithTopicsEventCallback,
	)

	// ensure that historicalContractWithTopicsEventCallback received old NodeAdded events
	historicalEvents := readCapturedEvents(historicalContractWithTopicsEventCallbackCapturedEvents)

	// make sure all logs match and that contractWithTopicsEventCallback didn't receive the same logs again
	require.Equal(nodeCount, len(historicalEvents), "unexpected NodeAdded logs count")
	require.EqualValues(events, historicalEvents, "unexpected logs")
}

func TestEventsOrder(t *testing.T) {
	require := require.New(t)
	ctx, cancel := test.NewTestContext()
	defer cancel()

	tc, err := crypto.NewBlockchainTestContext(ctx, crypto.TestParams{})
	require.NoError(err)
	defer tc.Close()

	var (
		owner                           = tc.DeployerBlockchain
		chainMonitor                    = tc.DeployerBlockchain.ChainMonitor
		nodeCount                       = 100
		capturedEvents                  = make(chan types.Log, nodeCount)
		contractWithTopicsEventCallback = func(ctx context.Context, event types.Log) {
			capturedEvents <- event
		}

		nodeRegistryABI, _ = abi.JSON(strings.NewReader(river.NodeRegistryV1MetaData.ABI))
		readCapturedEvents = func(captured <-chan types.Log) []types.Log {
			var logs []types.Log
			for i := 0; i < nodeCount; i++ {
				logs = append(logs, <-captured)
			}
			return logs
		}
	)

	chainMonitor.OnContractWithTopicsEvent(
		0,
		tc.RiverRegistryAddress,
		[][]common.Hash{{nodeRegistryABI.Events["NodeAdded"].ID}},
		contractWithTopicsEventCallback,
	)

	// register several nodes
	var (
		pendingTx     crypto.TransactionPoolPendingTransaction
		nodeAddresses = make([]common.Address, nodeCount)
	)
	for i := range nodeCount {
		wallet, err := crypto.NewWallet(ctx)
		require.NoError(err, "new wallet")
		nodeAddresses[i] = wallet.Address
		pendingTx, err = owner.TxPool.Submit(
			ctx,
			"RegisterNode",
			func(opts *bind.TransactOpts) (*types.Transaction, error) {
				return tc.NodeRegistry.RegisterNode(
					opts,
					wallet.Address,
					fmt.Sprintf("https://node%d.river.test", i),
					river.NodeStatus_NotInitialized,
				)
			},
		)
		require.NoError(err, "register node")
	}

	require.NoError(err)

	// generate blocks until last tx is processed
	done := make(chan struct{})
	go func() {
		for {
			select {
			case <-time.After(10 * time.Millisecond):
				tc.Commit(ctx)
			case <-done:
				return
			}
		}
	}()

	receipt, err := pendingTx.Wait(ctx)
	close(done)

	require.NoError(err)
	require.Equal(crypto.TransactionResultSuccess, receipt.Status)

	// make sure that the event callback is called in the correct order
	for i, event := range readCapturedEvents(capturedEvents) {
		if nodeRegistryABI.Events["NodeAdded"].ID != event.Topics[0] {
			continue
		}
		var e river.NodeRegistryV1NodeAdded
		if err := tc.NodeRegistry.BoundContract().UnpackLog(&e, "NodeAdded", event); err != nil {
			require.NoError(err, "OnNodeAdded: unable to decode NodeAdded event")
		}
		require.Equal(nodeAddresses[i], e.NodeAddress, "unexpected node added order")
	}
}
