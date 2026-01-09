package crypto

import (
	"context"
	"slices"
	"sync"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"

	"github.com/towns-protocol/towns/core/blockchain"
)

// chainMonitorBuilder builds a chain monitor.
type chainMonitorBuilder struct {
	dirty                  bool
	cachedQuery            ethereum.FilterQuery
	blockCallbacks         chainBlockCallbacks
	blockWithLogsCallbacks chainBlockWithLogsCallbacks
	eventCallbacks         chainEventCallbacks
	headerCallbacks        chainHeaderCallbacks
	stoppedCallbacks       chainMonitorStoppedCallbacks
}

func (lfb *chainMonitorBuilder) Query() ethereum.FilterQuery {
	if !lfb.dirty {
		return lfb.cachedQuery
	}

	if len(lfb.blockWithLogsCallbacks) > 0 { // wants all events
		lfb.dirty = false
		lfb.cachedQuery = ethereum.FilterQuery{}
		return lfb.cachedQuery
	}

	query := ethereum.FilterQuery{}
	for _, cb := range lfb.eventCallbacks {
		if cb.address == nil && len(cb.topics) == 0 { // wants all events
			lfb.dirty = false
			lfb.cachedQuery = ethereum.FilterQuery{}
			return lfb.cachedQuery
		}
		if cb.address != nil && !slices.Contains(query.Addresses, *cb.address) {
			query.Addresses = append(query.Addresses, *cb.address)
		}
	}

	lfb.dirty = false
	lfb.cachedQuery = query
	return query
}

func (lfb *chainMonitorBuilder) OnHeader(cb OnChainNewHeader) {
	lfb.headerCallbacks = append(lfb.headerCallbacks, &chainHeaderCallback{handler: cb})
	lfb.dirty = true
}

func (lfb *chainMonitorBuilder) OnBlock(cb OnChainNewBlock) {
	lfb.blockCallbacks = append(lfb.blockCallbacks, &chainBlockCallback{handler: cb})
	lfb.dirty = true
}

func (lfb *chainMonitorBuilder) OnBlockWithLogs(from blockchain.BlockNumber, cb OnChainNewBlockWithLogs) {
	lfb.blockWithLogsCallbacks = append(
		lfb.blockWithLogsCallbacks,
		&chainBlockWithLogsCallback{handler: cb, nextBlock: from},
	)
	lfb.dirty = true
}

func (lfb *chainMonitorBuilder) OnAllEvents(from blockchain.BlockNumber, cb OnChainEventCallback) {
	lfb.eventCallbacks = append(
		lfb.eventCallbacks,
		&chainEventCallback{handler: cb, logProcessed: false, fromBlock: from},
	)
	lfb.dirty = true
}

func (lfb *chainMonitorBuilder) OnContractEvent(
	from blockchain.BlockNumber,
	addr common.Address,
	cb OnChainEventCallback,
) {
	lfb.eventCallbacks = append(
		lfb.eventCallbacks,
		&chainEventCallback{handler: cb, address: &addr, logProcessed: false, fromBlock: from},
	)
	lfb.dirty = true
}

func (lfb *chainMonitorBuilder) OnContractWithTopicsEvent(
	from blockchain.BlockNumber,
	addr common.Address,
	topics [][]common.Hash,
	cb OnChainEventCallback,
) {
	lfb.eventCallbacks = append(lfb.eventCallbacks, &chainEventCallback{
		handler:            cb,
		address:            &addr,
		topics:             topics,
		logProcessed:       false,
		lastProcessedBlock: from.AsUint64(),
	})
	lfb.dirty = true
}

func (lfb *chainMonitorBuilder) OnChainMonitorStopped(cb OnChainMonitorStoppedCallback) {
	lfb.stoppedCallbacks = append(lfb.stoppedCallbacks, &chainMonitorStoppedCallback{handler: cb})
	lfb.dirty = true
}

type chainEventCallback struct {
	handler               OnChainEventCallback
	address               *common.Address
	topics                [][]common.Hash
	logProcessed          bool
	lastProcessedBlock    uint64
	lastProcessedTxIndex  uint
	lastProcessedLogIndex uint
	fromBlock             blockchain.BlockNumber
}

// alreadyProcessed returns an indication if cb already processed the given log.
func (cb chainEventCallback) alreadyProcessed(log *types.Log) bool {
	return !(!cb.logProcessed || cb.lastProcessedBlock < log.BlockNumber ||
		(cb.lastProcessedBlock == log.BlockNumber && (cb.lastProcessedTxIndex < log.TxIndex ||
			(cb.lastProcessedTxIndex == log.TxIndex && cb.lastProcessedLogIndex < log.Index))))
}

type chainEventCallbacks []*chainEventCallback

// onLogReceived calls all callbacks in the ecb callback set that are interested
// in the given log.
func (ecb chainEventCallbacks) onLogReceived(ctx context.Context, log *types.Log) {
	for _, cb := range ecb {
		if !cb.alreadyProcessed(log) {
			if (cb.address == nil || *cb.address == log.Address) && matchTopics(cb.topics, log.Topics) {
				cb.handler(ctx, log)
			}
			cb.logProcessed = true
			cb.lastProcessedBlock = log.BlockNumber
			cb.lastProcessedTxIndex = log.TxIndex
			cb.lastProcessedLogIndex = log.Index
		}
	}
}

type chainHeaderCallback struct {
	handler   OnChainNewHeader
	fromBlock blockchain.BlockNumber
}

type chainHeaderCallbacks []*chainHeaderCallback

func (hcb chainHeaderCallbacks) onHeadReceived(ctx context.Context, header *types.Header) {
	headNumber := blockchain.BlockNumber(header.Number.Uint64())
	for _, cb := range hcb {
		if cb.fromBlock < headNumber {
			cb.handler(ctx, header)
			cb.fromBlock = headNumber
		}
	}
}

type chainBlockCallback struct {
	handler   OnChainNewBlock
	fromBlock blockchain.BlockNumber
}

type chainBlockCallbacks []*chainBlockCallback

func (ebc chainBlockCallbacks) onBlockReceived(ctx context.Context, blockNumber blockchain.BlockNumber) {
	for _, cb := range ebc {
		if cb.fromBlock < blockNumber {
			cb.handler(ctx, blockNumber)
			cb.fromBlock = blockNumber
		}
	}
}

type chainBlockWithLogsCallback struct {
	handler   OnChainNewBlockWithLogs
	nextBlock blockchain.BlockNumber
}

type chainBlockWithLogsCallbacks []*chainBlockWithLogsCallback

func (ebc chainBlockWithLogsCallbacks) onBlockReceived(
	ctx context.Context,
	toBlock blockchain.BlockNumber,
	logs []types.Log,
	wg *sync.WaitGroup,
) {
	l := make([]*types.Log, len(logs))
	for i := range logs {
		l[i] = &logs[i]
	}
	for _, cb := range ebc {
		if cb.nextBlock <= toBlock {
			wg.Add(1)
			go func(nextBlock uint64) {
				defer wg.Done()
				// Filter logs for the blocks < cb.nextBlock
				shouldFilterOut := func(log *types.Log) bool {
					return log.BlockNumber < nextBlock
				}
				filteredLogs := l
				if slices.ContainsFunc(filteredLogs, shouldFilterOut) {
					filteredLogs = slices.Clone(filteredLogs)
					filteredLogs = slices.DeleteFunc(filteredLogs, shouldFilterOut)
				}
				cb.handler(ctx, toBlock, filteredLogs)
			}(cb.nextBlock.AsUint64())
			cb.nextBlock = toBlock + 1
		}
	}
}

type chainMonitorStoppedCallback struct {
	handler OnChainMonitorStoppedCallback
}

type chainMonitorStoppedCallbacks []*chainMonitorStoppedCallback

func (cmsc chainMonitorStoppedCallbacks) onChainMonitorStopped(ctx context.Context) {
	for _, cb := range cmsc {
		cb.handler(ctx)
	}
}
