package crypto

import (
	"context"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/river-build/river/core/node/dlog"
)

// OnChainEventCallback is called for each event that matches the filter.
// Note that the monitor doesn't care about errors in the callback and doesn't
// expect callbacks to change the received event.
type OnChainEventCallback = func(event types.Log)

// OnChainNewBlock is called for each new block that is added to the chain.
type OnChainNewBlock = func(BlockNumber)

type chainMonitor struct {
	fromBlock      BlockNumber
	filter         ethereum.FilterQuery
	blockCallbacks chainBlockCallbacks
	eventCallbacks chainEventCallbacks
	blockPeriod    time.Duration
}

// EvmChainMonitor monitors the EVM chain for new blocks and/or events.
type ChainMonitor interface {
	// Run the monitor until the given ctx expires using the client to interact
	// with the chain.
	Run(ctx context.Context, client BlockchainClient)
}

// Run monitors the chain the given client is connected to and calls the
// associated callback for each event that matches its filter. It will finish
// when the given ctx is cancelled. It will start monitoring from the given
// fromBlock block number. Callbacks are called in the order they were added and
// aren't called concurrently to ensure that events are processed in the order
// they were received.
func (ecm *chainMonitor) Run(ctx context.Context, client BlockchainClient) {
	ecm.runWithPolling(ctx, client)
}

func (ecm *chainMonitor) runWithPolling(ctx context.Context, client BlockchainClient) {
	var (
		fromBlock        = ecm.fromBlock.AsBigInt()
		blockPeriod      = ecm.estimateBlockPeriod(ctx, client)
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
		query        = ecm.filter
		log          = dlog.FromCtx(ctx)
	)

	log.Info("chain monitor started", "blockPeriod", blockPeriod)

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

			if head.Number.Cmp(fromBlock) < 0 { // no new block
				pollInterval = nextPollInterval(time.Since(start), false, false)
				continue
			}

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

			query.FromBlock, query.ToBlock = fromBlock, toBlock

			if len(ecm.blockCallbacks) > 0 {
				for i := query.FromBlock.Uint64(); i <= query.ToBlock.Uint64(); i++ {
					newBlocks = append(newBlocks, BlockNumber(i))
				}
			}

			if len(ecm.eventCallbacks) > 0 { // collect events in new blocks
				collectedLogs, err = client.FilterLogs(ctx, query)
				if err != nil {
					log.Warn("unable to retrieve logs", "error", err)
					pollInterval = nextPollInterval(time.Since(start), false, true)
					continue
				}
			}

			if len(ecm.blockCallbacks) > 0 {
				callbacksExecuted.Add(1)
				go func() {
					for _, header := range newBlocks {
						ecm.blockCallbacks.onBlockReceived(header)
					}
					callbacksExecuted.Done()
				}()
			}

			if len(ecm.eventCallbacks) > 0 {
				callbacksExecuted.Add(1)
				go func() {
					for _, log := range collectedLogs {
						ecm.eventCallbacks.onLogReceived(log)
					}
					callbacksExecuted.Done()
				}()
			}

			callbacksExecuted.Wait()

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

func (ecm *chainMonitor) estimateBlockPeriod(ctx context.Context, client BlockchainClient) time.Duration {
	if ecm.blockPeriod != 0 {
		return ecm.blockPeriod
	}
	log := dlog.FromCtx(ctx)

	// try to determine block period from the last 2 blocks
	for {
		head, err := client.HeaderByNumber(ctx, nil)
		if err != nil {
			log.Warn("unable to retrieve block header to determine block period", "error", err)
			if wait(ctx, 2*time.Second) {
				return time.Hour
			}
			continue
		}
		if head.Number.Uint64() == 0 {
			log.Warn("unable to determine chain block period, falling back to 2 seconds")
			return 2 * time.Second
		}

		prev, err := client.HeaderByNumber(ctx, big.NewInt(head.Number.Int64()-1))
		if err != nil {
			log.Warn("unable to retrieve block header to determine block period", "error", err)
			if wait(ctx, 2*time.Second) {
				return time.Hour
			}
			continue
		}

		blockTime := head.Time - prev.Time
		if blockTime != 0 {
			return time.Duration(blockTime) * time.Second
		}

		log.Warn("latest 2 block have the same timestamp, falling back to 2 seconds")
		return 2 * time.Second
	}
}
