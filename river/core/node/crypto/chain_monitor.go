package crypto

import (
	"context"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	. "github.com/river-build/river/core/node/base"
	"github.com/river-build/river/core/node/dlog"
	. "github.com/river-build/river/core/node/protocol"
)

type (
	// ChainMonitor monitors the EVM chain for new blocks and/or events.
	ChainMonitor interface {
		// Run the monitor until the given ctx expires using the client to interact
		// with the chain. It tries to determine the block period.
		Run(ctx context.Context, client BlockchainClient, initialBlock BlockNumber)
		// RunWithBlockPeriod the monitor until the given ctx expires using the client to interact
		// with the chain.
		RunWithBlockPeriod(
			ctx context.Context,
			client BlockchainClient,
			initialBlock BlockNumber,
			blockPeriod time.Duration,
		)
		// OnHeader adds a callback that is when a new header is received.
		// Note: it is not guaranteed to be called for every new header!
		OnHeader(cb OnChainNewHeader)
		// OnBlock adds a callback that is called for each new block
		OnBlock(cb OnChainNewBlock)
		// OnAllEvents matches all events for all contracts, e.g. all chain events.
		OnAllEvents(cb OnChainEventCallback)
		// Contract matches all events created by the contract on the given address.
		OnContractEvent(addr common.Address, cb OnChainEventCallback)
		// ContractWithTopics matches events created by the contract on the given
		OnContractWithTopicsEvent(addr common.Address, topics [][]common.Hash, cb OnChainEventCallback)
	}

	// OnChainEventCallback is called for each event that matches the filter.
	// Note that the monitor doesn't care about errors in the callback and doesn't
	// expect callbacks to change the received event.
	OnChainEventCallback = func(context.Context, types.Log)

	// OnChainNewHeader is called when a new header is detected to be added to the chain.
	// Note, it is NOT guaranteed to be called for every new header.
	// It is called each time the chain is polled and a new header is detected, discarding intermediate headers.
	OnChainNewHeader = func(context.Context, *types.Header)

	// OnChainNewBlock is called for each new block that is added to the chain.
	OnChainNewBlock = func(context.Context, BlockNumber)

	chainMonitor struct {
		muBuilder sync.Mutex
		builder   chainMonitorBuilder
	}
)

// EstimateBlockPeriod tries to estimate the block period from the chain the given client is connected to.
func EstimateBlockPeriod(ctx context.Context, client BlockchainClient) (time.Duration, error) {
	log := dlog.FromCtx(ctx)

	// try to determine block period from the last 2 blocks
	for {
		head, err := client.HeaderByNumber(ctx, nil)
		if err != nil || head.Number.Uint64() < 2 {
			log.Warn("unable to retrieve block header to determine block period", "error", err)
			if wait(ctx, 2*time.Second) {
				return 0, RiverError(Err_DEADLINE_EXCEEDED, "Unable to determine chain block period")
			}
			continue
		}

		prev, err := client.HeaderByNumber(ctx, big.NewInt(head.Number.Int64()-1))
		if err != nil {
			log.Warn("unable to retrieve block header to determine block period", "error", err)
			if wait(ctx, 2*time.Second) {
				return 0, RiverError(Err_DEADLINE_EXCEEDED, "Unable to determine chain block period")
			}
			continue
		}

		blockTime := head.Time - prev.Time
		if blockTime != 0 {
			return time.Duration(blockTime) * time.Second, nil
		}

		return 0, RiverError(Err_BAD_CONFIG,
			"Unable to determine chain block period, last 2 blocks have same timestamp")
	}
}

// NewChainMonitorBuilder constructs a chain monitor that implements ChainMinotor
// and starts to monitor the chain on the given block.
func NewChainMonitor() *chainMonitor {
	return &chainMonitor{
		builder: chainMonitorBuilder{dirty: true},
	}
}

// Run monitors the chain the given client is connected to and calls the
// associated callback for each event that matches its filter. It will finish
// when the given ctx is cancelled. It will start monitoring from the given
// fromBlock block number. Callbacks are called in the order they were added and
// aren't called concurrently to ensure that events are processed in the order
// they were received.
func (ecm *chainMonitor) Run(ctx context.Context, client BlockchainClient, initialBlock BlockNumber) {
	var (
		blockPeriod time.Duration
		err         error
	)

	for {
		if blockPeriod, err = EstimateBlockPeriod(ctx, client); err == nil {
			break
		}

		select {
		case <-ctx.Done():
			return
		case <-time.After(2 * time.Second):
			continue
		}
	}
	ecm.runWithPolling(ctx, client, initialBlock, blockPeriod)
}

func (ecm *chainMonitor) RunWithBlockPeriod(
	ctx context.Context,
	client BlockchainClient,
	initialBlock BlockNumber,
	blockPeriod time.Duration,
) {
	ecm.runWithPolling(ctx, client, initialBlock, blockPeriod)
}

func (ecm *chainMonitor) OnHeader(cb OnChainNewHeader) {
	ecm.muBuilder.Lock()
	defer ecm.muBuilder.Unlock()
	ecm.builder.OnHeader(cb)
}

func (ecm *chainMonitor) OnBlock(cb OnChainNewBlock) {
	ecm.muBuilder.Lock()
	defer ecm.muBuilder.Unlock()
	ecm.builder.OnBlock(cb)
}

func (ecm *chainMonitor) OnAllEvents(cb OnChainEventCallback) {
	ecm.muBuilder.Lock()
	defer ecm.muBuilder.Unlock()
	ecm.builder.OnAllEvents(cb)
}

func (ecm *chainMonitor) OnContractEvent(addr common.Address, cb OnChainEventCallback) {
	ecm.muBuilder.Lock()
	defer ecm.muBuilder.Unlock()
	ecm.builder.OnContractEvent(addr, cb)
}

func (ecm *chainMonitor) OnContractWithTopicsEvent(
	addr common.Address,
	topics [][]common.Hash,
	cb OnChainEventCallback,
) {
	ecm.muBuilder.Lock()
	defer ecm.muBuilder.Unlock()
	ecm.builder.OnContractWithTopicsEvent(addr, topics, cb)
}

func (ecm *chainMonitor) runWithPolling(
	ctx context.Context,
	client BlockchainClient,
	initialBlock BlockNumber,
	blockPeriod time.Duration,
) {
	var (
		fromBlock        = initialBlock.AsBigInt()
		lastHead         *types.Header
		shortBlockPeriod = blockPeriod / 20
		one              = big.NewInt(1)
		errCounter       = 0
		errSlowdownLimit = 5
		nextPollInterval = func(took time.Duration, gotBlock bool, gotErr bool) time.Duration {
			if !gotErr {
				errCounter = 0
				if !gotBlock && took < blockPeriod {
					return blockPeriod - took
				}
				return shortBlockPeriod
			}

			errCounter++
			if errCounter > errSlowdownLimit { // RPC node down for some time, slow down to a max of 30s
				interval := time.Duration(5*(errCounter-errSlowdownLimit))*time.Second + blockPeriod
				if interval > 30*time.Second {
					interval = 30 * time.Second
				}
				return interval
			}
			return blockPeriod
		}
		pollInterval = blockPeriod
		log          = dlog.FromCtx(ctx)
	)

	log.Info("chain monitor started", "blockPeriod", blockPeriod, "fromBlock", initialBlock)

	for {
		select {
		case <-ctx.Done():
			log.Info("chain monitor shutdown")
			return

		case <-time.After(pollInterval):
			start := time.Now()

			head, err := client.HeaderByNumber(ctx, nil)
			if err != nil {
				log.Warn("block monitor is unable to retrieve chain head", "error", err)
				pollInterval = nextPollInterval(time.Since(start), false, true)
				continue
			}

			if lastHead != nil && lastHead.Number.Cmp(head.Number) >= 0 { // no new block
				pollInterval = nextPollInterval(time.Since(start), false, false)
				continue
			}

			lastHead = head

			ecm.muBuilder.Lock()
			ecm.builder.headerCallbacks.onHeadReceived(ctx, head)

			var (
				newBlocks         []BlockNumber
				collectedLogs     []types.Log
				toBlock           = new(big.Int).Set(head.Number)
				callbacksExecuted sync.WaitGroup
			)

			// ensure that the search range isn't too big because RPC providers
			// often have limitations on the block range and/or response size.
			if head.Number.Uint64()-fromBlock.Uint64() > 25 {
				toBlock.SetUint64(fromBlock.Uint64() + 25)
			}

			query := ecm.builder.Query()
			query.FromBlock, query.ToBlock = fromBlock, toBlock

			if len(ecm.builder.blockCallbacks) > 0 {
				for i := query.FromBlock.Uint64(); i <= query.ToBlock.Uint64(); i++ {
					newBlocks = append(newBlocks, BlockNumber(i))
				}
			}

			if len(ecm.builder.eventCallbacks) > 0 { // collect events in new blocks
				collectedLogs, err = client.FilterLogs(ctx, query)
				if err != nil {
					log.Warn("unable to retrieve logs", "error", err)
					pollInterval = nextPollInterval(time.Since(start), false, true)
					ecm.muBuilder.Unlock()
					continue
				}
			}

			if len(ecm.builder.blockCallbacks) > 0 {
				callbacksExecuted.Add(1)
				go func() {
					for _, header := range newBlocks {
						ecm.builder.blockCallbacks.onBlockReceived(ctx, header)
					}
					callbacksExecuted.Done()
				}()
			}

			if len(ecm.builder.eventCallbacks) > 0 {
				callbacksExecuted.Add(1)
				go func() {
					for _, log := range collectedLogs {
						ecm.builder.eventCallbacks.onLogReceived(ctx, log)
					}
					callbacksExecuted.Done()
				}()
			}

			callbacksExecuted.Wait()
			ecm.muBuilder.Unlock()

			took := time.Since(start)

			log.Debug("EVM chain monitor work iteration",
				"from", query.FromBlock.Uint64(),
				"to", query.ToBlock.Uint64(),
				"count", len(collectedLogs),
				"took", took,
			)

			// from and toBlocks are inclusive, start at the next block on next iteration
			fromBlock = new(big.Int).Add(query.ToBlock, one)
			pollInterval = nextPollInterval(took, true, false)
		}
	}
}
