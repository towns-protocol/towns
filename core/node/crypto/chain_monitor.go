package crypto

import (
	"context"
	"math/big"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/linkdata/deadlock"
	"github.com/prometheus/client_golang/prometheus"
	"go.uber.org/zap/zapcore"

	"github.com/towns-protocol/towns/core/blockchain"
	"github.com/towns-protocol/towns/core/contracts/base"
	"github.com/towns-protocol/towns/core/node/infra"
	"github.com/towns-protocol/towns/core/node/logging"
)

type (
	// ChainMonitor monitors the EVM chain for new blocks and/or events.
	ChainMonitor interface {
		// Start starts the chain monitor in background. Goroutine is going to be running until the given ctx is
		// cancelled.
		Start(
			ctx context.Context,
			client BlockchainClient,
			initialBlock blockchain.BlockNumber,
			blockPeriod time.Duration,
			metrics infra.MetricsFactory,
		)

		// OnHeader adds a callback that is when a new header is received.
		// Note: it is not guaranteed to be called for every new header!
		OnHeader(cb OnChainNewHeader)
		// OnBlock adds a callback that is called for each new block
		OnBlock(cb OnChainNewBlock)
		// OnBlockWithLogs adds a callback that is called for each new block with the logs that were created in the
		// block.
		OnBlockWithLogs(from blockchain.BlockNumber, cb OnChainNewBlockWithLogs)
		// OnAllEvents matches all events for all contracts, e.g. all chain events.
		OnAllEvents(from blockchain.BlockNumber, cb OnChainEventCallback)
		// OnContractEvent matches all events created by the contract on the given address.
		OnContractEvent(from blockchain.BlockNumber, addr common.Address, cb OnChainEventCallback)
		// OnContractWithTopicsEvent matches events created by the contract on the given
		OnContractWithTopicsEvent(
			from blockchain.BlockNumber,
			addr common.Address,
			topics [][]common.Hash,
			cb OnChainEventCallback,
		)
		// OnStopped calls cb after the chain monitor stopped monitoring the chain
		OnStopped(cb OnChainMonitorStoppedCallback)
	}

	// OnChainEventCallback is called for each event that matches the filter.
	// Note that the monitor doesn't care about errors in the callback and doesn't
	// expect callbacks to change the received event.
	OnChainEventCallback = func(context.Context, *types.Log)

	// OnChainNewHeader is called when a new header is detected to be added to the chain.
	// Note, it is NOT guaranteed to be called for every new header.
	// It is called each time the chain is polled and a new header is detected, discarding intermediate headers.
	OnChainNewHeader = func(context.Context, *types.Header)

	// OnChainNewBlock is called for each new block that is added to the chain.
	OnChainNewBlock = func(context.Context, blockchain.BlockNumber)

	// OnChainNewBlockWithLogs is called for new block that is added to the chain with the logs
	// that were added to the all blocks that were created from the last call to this callback.
	// I.e. while some block numbers may be skipped, all logs for the skipped block numbers are
	// returned in the slice of logs on the next call to this callback.
	// If new block is observed, but there are no logs, the slice of logs will be empty.
	OnChainNewBlockWithLogs = func(context.Context, blockchain.BlockNumber, []*types.Log)

	// OnChainMonitorStoppedCallback is called after the chain monitor stopped monitoring the chain.
	OnChainMonitorStoppedCallback = func(context.Context)

	chainMonitor struct {
		mu        deadlock.Mutex
		builder   chainMonitorBuilder
		fromBlock *big.Int
		started   bool
	}

	// OnEntitlementRequestCallback is called when an entitlement check request is detected.
	OnEntitlementRequestCallback = func(context.Context, *base.IEntitlementCheckerEntitlementCheckRequested)

	// OnEntitlementRequestV2Callback is called when an entitlement check V2 request is detected.
	OnEntitlementRequestV2Callback = func(context.Context, *base.IEntitlementCheckerEntitlementCheckRequestedV2)

	// EntitlementCheckChainMonitor monitors the base chain for entitlement check request events
	// and calls the registered callbacks for each event.
	EntitlementCheckChainMonitor interface {
		OnEntitlementCheckRequest(from blockchain.BlockNumber, cb OnEntitlementRequestCallback)
		OnEntitlementCheckRequestV2(from blockchain.BlockNumber, cb OnEntitlementRequestV2Callback)
	}

	entitlementCheckChainMonitor struct {
		chainMonitor        ChainMonitor
		checkerContract     *bind.BoundContract
		checkerContractAddr common.Address
		checkerABI          *abi.ABI
	}

	// ChainMonitorPollInterval determines the next poll interval for the chain monitor
	ChainMonitorPollInterval interface {
		Interval(took time.Duration, gotBlock bool, hitBlockRangeLimit bool, gotErr bool) time.Duration
	}

	defaultChainMonitorPollIntervalCalculator struct {
		blockPeriod time.Duration
		// closeDownDuration is the duration that the poll interval is decreased to get closer to the block production
		// period/moment.
		closeDownDuration time.Duration
		errCounter        int64
		errSlowdownLimit  time.Duration
		noBlockCounter    int64
	}
)

var (
	_ ChainMonitor                 = (*chainMonitor)(nil)
	_ EntitlementCheckChainMonitor = (*entitlementCheckChainMonitor)(nil)
	_ ChainMonitorPollInterval     = (*defaultChainMonitorPollIntervalCalculator)(nil)
)

// NewChainMonitor constructs an EVM chain monitor that can track state changes on an EVM chain.
func NewChainMonitor() *chainMonitor {
	return &chainMonitor{
		builder: chainMonitorBuilder{dirty: true},
	}
}

// NewEntitlementCheckChainMonitor constructs an EntitlementCheckChainMonitor that can monitor the base
// chain for entitlement request and calls the registered callbacks for each event.
func NewEntitlementCheckChainMonitor(
	chainMonitor ChainMonitor,
	entitlementChecker common.Address,
) *entitlementCheckChainMonitor {
	checkerABI, err := base.IEntitlementCheckerMetaData.GetAbi()
	if err != nil {
		logging.DefaultLogger(zapcore.InfoLevel).
			Panicw("IEntitlementChecker ABI invalid", "error", err)
	}

	checkerContract := bind.NewBoundContract(entitlementChecker, *checkerABI, nil, nil, nil)

	return &entitlementCheckChainMonitor{
		chainMonitor:        chainMonitor,
		checkerContract:     checkerContract,
		checkerContractAddr: entitlementChecker,
		checkerABI:          checkerABI,
	}
}

func NewChainMonitorPollIntervalCalculator(
	blockPeriod time.Duration,
	errSlowdownLimit time.Duration,
) *defaultChainMonitorPollIntervalCalculator {
	return &defaultChainMonitorPollIntervalCalculator{
		blockPeriod:       blockPeriod,
		closeDownDuration: max(25*time.Millisecond, blockPeriod/50), // 2s block period -> close down each poll by 40ms
		errCounter:        0,
		errSlowdownLimit:  max(errSlowdownLimit, time.Second),
	}
}

func (cm *entitlementCheckChainMonitor) OnEntitlementCheckRequest(
	from blockchain.BlockNumber,
	cb OnEntitlementRequestCallback,
) {
	entitlementCheckRequestedTopic := cm.checkerABI.Events["EntitlementCheckRequested"].ID
	cm.chainMonitor.OnContractWithTopicsEvent(
		from,
		cm.checkerContractAddr,
		[][]common.Hash{{entitlementCheckRequestedTopic}},
		func(ctx context.Context, log *types.Log) {
			var e base.IEntitlementCheckerEntitlementCheckRequested
			if err := cm.checkerABI.UnpackIntoInterface(&e, "EntitlementCheckRequested", log.Data); err == nil {
				e.Raw = *log
				cb(ctx, &e)
			} else {
				logging.FromCtx(ctx).Errorw("unable to unpack EntitlementCheckRequested event",
					"error", err, "tx", log.TxHash, "index", log.Index, "log", log)
			}
		},
	)
}

func (cm *entitlementCheckChainMonitor) OnEntitlementCheckRequestV2(
	from blockchain.BlockNumber,
	cb OnEntitlementRequestV2Callback,
) {
	entitlementCheckRequestedTopic := cm.checkerABI.Events["EntitlementCheckRequestedV2"].ID
	cm.chainMonitor.OnContractWithTopicsEvent(
		from,
		cm.checkerContractAddr,
		[][]common.Hash{{entitlementCheckRequestedTopic}},
		func(ctx context.Context, log *types.Log) {
			var e base.IEntitlementCheckerEntitlementCheckRequestedV2
			if err := cm.checkerABI.UnpackIntoInterface(&e, "EntitlementCheckRequestedV2", log.Data); err == nil {
				e.Raw = *log
				cb(ctx, &e)
			} else {
				logging.FromCtx(ctx).Errorw("unable to unpack EntitlementCheckRequestedV2 event",
					"error", err, "tx", log.TxHash, "index", log.Index, "log", log)
			}
		},
	)
}

func (p *defaultChainMonitorPollIntervalCalculator) Interval(
	took time.Duration,
	gotBlock bool,
	hitBlockRangeLimit bool,
	gotErr bool,
) time.Duration {
	if gotErr {
		// increments each time an error was encountered the time for the next poll until errSlowdownLimit
		p.errCounter = min(p.errCounter+1, 10000)
		return min(time.Duration(p.errCounter)*p.blockPeriod, p.errSlowdownLimit)
	}

	p.errCounter = 0

	if hitBlockRangeLimit { // fallen behind chain, fetch immediately next block range to catch up
		p.noBlockCounter = 0
		return time.Duration(0)
	}

	if gotBlock { // caught up with chain, try to get closer to block period
		p.noBlockCounter = 0
		return max(p.blockPeriod-took-p.closeDownDuration, 0)
	}

	p.noBlockCounter++

	if p.noBlockCounter <= 2 { // previous poll was too soon, wait a bit
		return 250 * time.Millisecond
	}

	// block period seem to be way off or the rpc node/chain has an issue and not receiving new blocks
	// wait block period and try to narrow down from that moment again
	return max(p.blockPeriod, 0)
}

// setFromBlock must be called with ecm.mu locked.
// onSubscribe is an indication if fromBlock is allowed to be in the past.
func (cm *chainMonitor) setFromBlock(fromBlock *big.Int, onSubscribe bool) {
	if cm.fromBlock == nil {
		cm.fromBlock = fromBlock
	} else if onSubscribe && cm.fromBlock.Cmp(fromBlock) > 0 { // can go back but not into the future
		cm.fromBlock = fromBlock
	} else if !onSubscribe && cm.fromBlock.Cmp(fromBlock) < 0 { // can only go into the future (chain monitor)
		cm.fromBlock = fromBlock
	}
}

func (cm *chainMonitor) OnHeader(cb OnChainNewHeader) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.builder.OnHeader(cb)
}

func (cm *chainMonitor) OnBlock(cb OnChainNewBlock) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.builder.OnBlock(cb)
}

func (cm *chainMonitor) OnBlockWithLogs(from blockchain.BlockNumber, cb OnChainNewBlockWithLogs) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.builder.OnBlockWithLogs(from, cb)
	cm.setFromBlock(from.AsBigInt(), true)
}

func (cm *chainMonitor) OnAllEvents(from blockchain.BlockNumber, cb OnChainEventCallback) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.builder.OnAllEvents(from, cb)
	cm.setFromBlock(from.AsBigInt(), true)
}

func (cm *chainMonitor) OnContractEvent(from blockchain.BlockNumber, addr common.Address, cb OnChainEventCallback) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.builder.OnContractEvent(from, addr, cb)
	cm.setFromBlock(from.AsBigInt(), true)
}

func (cm *chainMonitor) OnContractWithTopicsEvent(
	from blockchain.BlockNumber,
	addr common.Address,
	topics [][]common.Hash,
	cb OnChainEventCallback,
) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.builder.OnContractWithTopicsEvent(from, addr, topics, cb)
	cm.setFromBlock(from.AsBigInt(), true)
}

func (cm *chainMonitor) OnStopped(cb OnChainMonitorStoppedCallback) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.builder.OnChainMonitorStopped(cb)
}

func (cm *chainMonitor) Start(
	ctx context.Context,
	client BlockchainClient,
	initialBlock blockchain.BlockNumber,
	blockPeriod time.Duration,
	metrics infra.MetricsFactory,
) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	if cm.started {
		logging.FromCtx(ctx).Errorw("chain monitor already started")
		return
	}
	cm.started = true

	go cm.runWithBlockPeriod(ctx, client, initialBlock, blockPeriod, metrics)
}

// RunWithBlockPeriod monitors the chain the given client is connected to and calls the
// associated callback for each event that matches its filter.
//
// It will finish when the given ctx is cancelled.
//
// It will start monitoring from the given initialBlock block number (inclusive).
//
// Callbacks are called in the order they were added and
// aren't called concurrently to ensure that events are processed in the order
// they were received.
func (cm *chainMonitor) runWithBlockPeriod(
	ctx context.Context,
	client BlockchainClient,
	initialBlock blockchain.BlockNumber,
	blockPeriod time.Duration,
	metrics infra.MetricsFactory,
) {
	var (
		chainBaseFee = metrics.NewGaugeVecEx(
			"chain_monitor_base_fee_wei", "Current EIP-1559 base fee as obtained from the block header",
			"chain_id",
		)
		chainMonitorHeadBlock = metrics.NewGaugeVecEx(
			"chain_monitor_head_block", "Latest block available for the chain monitor",
			"chain_id",
		)
		chainMonitorProcessedBlock = metrics.NewGaugeVecEx(
			"chain_monitor_processed_block", "Latest block processed by the chain monitor",
			"chain_id",
		)
		chainMonitorRecvEvents = metrics.NewCounterVecEx(
			"chain_monitor_received_events", "Chain monitor total received events",
			"chain_id",
		)
		chainMonitorPollCounter = metrics.NewCounterVecEx(
			"chain_monitor_pollcounter", "How many times the chain monitor poll loop has run",
			"chain_id",
		)
	)

	var (
		log                   = logging.FromCtx(ctx)
		one                   = big.NewInt(1)
		pollInterval          = time.Duration(0)
		poll                  = NewChainMonitorPollIntervalCalculator(blockPeriod, 30*time.Second)
		baseFeeGauge          prometheus.Gauge
		headBlockGauge        prometheus.Gauge
		processedBlockGauge   prometheus.Gauge
		receivedEventsCounter prometheus.Counter
		pollIntervalCounter   prometheus.Counter
	)

	if chainID := loadChainID(ctx, client); chainID != nil {
		curryLabels := prometheus.Labels{"chain_id": chainID.String()}
		baseFeeGauge = chainBaseFee.With(curryLabels)
		headBlockGauge = chainMonitorHeadBlock.With(curryLabels)
		processedBlockGauge = chainMonitorProcessedBlock.With(curryLabels)
		receivedEventsCounter = chainMonitorRecvEvents.With(curryLabels)
		pollIntervalCounter = chainMonitorPollCounter.With(curryLabels)
	} else {
		return
	}

	cm.mu.Lock()
	cm.setFromBlock(initialBlock.AsBigInt(), true)
	cm.mu.Unlock()

	log.Debugw("chain monitor started", "blockPeriod", blockPeriod, "fromBlock", initialBlock)

	for {
		pollIntervalCounter.Inc()

		select {
		case <-ctx.Done():
			log.Debugw("initiate chain monitor shutdown")
			ctx2, cancel := context.WithTimeout(context.WithoutCancel(ctx), time.Minute)
			cm.builder.stoppedCallbacks.onChainMonitorStopped(ctx2)
			cancel()
			log.Debugw("chain monitor stopped")
			return

		case <-time.After(pollInterval):
			var (
				start       = time.Now()
				fromBlock   uint64
				gotNewBlock = false
			)

			head, err := client.HeaderByNumber(ctx, nil)
			if err != nil {
				log.Warnw("chain monitor is unable to retrieve chain head", "error", err)
				pollInterval = poll.Interval(time.Since(start), gotNewBlock, false, true)
				continue
			}

			headBlockGauge.Set(float64(head.Number.Uint64()))
			if head.BaseFee != nil {
				baseFee, _ := head.BaseFee.Float64()
				baseFeeGauge.Set(baseFee)
			}

			cm.mu.Lock()
			if frmBlock := cm.fromBlock; frmBlock == nil || frmBlock.Uint64() > head.Number.Uint64() { // no new block
				cm.mu.Unlock()
				pollInterval = poll.Interval(time.Since(start), gotNewBlock, false, false)
				continue
			} else {
				fromBlock = frmBlock.Uint64()
				cm.mu.Unlock()
			}

			gotNewBlock = true

			var (
				newBlocks           []blockchain.BlockNumber
				collectedLogs       []types.Log
				toBlock             = new(big.Int).Set(head.Number)
				moreBlocksAvailable = false
				callbacksExecuted   sync.WaitGroup
			)

			// ensure that the search range isn't too big because RPC providers
			// often have limitations on the block range and/or response size.
			if head.Number.Uint64()-fromBlock > 25 {
				moreBlocksAvailable = true
				toBlock.SetUint64(fromBlock + 25)
			}

			// log when the chain monitor is fetching more than several blocks it indicates that either the chain
			// monitor isn't able to keep up or the rpc node is having issues and importing chain segments instead
			// of single blocks.
			if (fromBlock < toBlock.Uint64() && toBlock.Uint64()-fromBlock >= 3) &&
				blockPeriod >= 750*time.Millisecond {
				log.Infow("process chain segment", "from", fromBlock, "to", toBlock.Uint64())
			}

			cm.mu.Lock()
			query := cm.builder.Query()
			query.FromBlock, query.ToBlock = new(big.Int).SetUint64(fromBlock), toBlock

			if len(cm.builder.blockCallbacks) > 0 {
				for i := query.FromBlock.Uint64(); i <= query.ToBlock.Uint64(); i++ {
					newBlocks = append(newBlocks, blockchain.BlockNumber(i))
				}
			}

			if len(cm.builder.eventCallbacks) > 0 ||
				len(cm.builder.blockWithLogsCallbacks) > 0 { // collect events in new blocks
				collectedLogs, err = client.FilterLogs(ctx, query)
				if err != nil {
					log.Warnw("unable to retrieve logs", "error", err, "from", query.FromBlock, "to", query.ToBlock)
					pollInterval = poll.Interval(time.Since(start), gotNewBlock, false, true)
					cm.mu.Unlock()
					continue
				}
				receivedEventsCounter.Add(float64(len(collectedLogs)))
			}

			if len(cm.builder.headerCallbacks) > 0 {
				callbacksExecuted.Add(1)
				go func() {
					cm.builder.headerCallbacks.onHeadReceived(ctx, head)
					callbacksExecuted.Done()
				}()
			}

			if len(cm.builder.blockCallbacks) > 0 {
				callbacksExecuted.Add(1)
				go func() {
					for _, header := range newBlocks {
						cm.builder.blockCallbacks.onBlockReceived(ctx, header)
					}
					callbacksExecuted.Done()
				}()
			}

			if len(cm.builder.blockWithLogsCallbacks) > 0 {
				cm.builder.blockWithLogsCallbacks.onBlockReceived(
					ctx,
					blockchain.BlockNumberFromBigInt(query.ToBlock),
					collectedLogs,
					&callbacksExecuted,
				)
			}

			if len(cm.builder.eventCallbacks) > 0 {
				callbacksExecuted.Add(1)
				go func() {
					for _, log := range collectedLogs {
						cm.builder.eventCallbacks.onLogReceived(ctx, &log)
					}
					callbacksExecuted.Done()
				}()
			}

			callbacksExecuted.Wait()

			// from and toBlocks are inclusive, start at the next block on next iteration
			cm.setFromBlock(new(big.Int).Add(query.ToBlock, one), false)
			cm.mu.Unlock()

			processedBlockGauge.Set(float64(query.ToBlock.Uint64()))
			pollInterval = poll.Interval(time.Since(start), gotNewBlock, moreBlocksAvailable, false)
		}
	}
}
