package crypto

import (
	"context"
	"slices"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// chainMonitorBuilder builds a chain monitor.
type chainMonitorBuilder struct {
	dirty            bool
	cachedQuery      ethereum.FilterQuery
	blockCallbacks   chainBlockCallbacks
	eventCallbacks   chainEventCallbacks
	headerCallbacks  chainHeaderCallbacks
	stoppedCallbacks chainMonitorStoppedCallbacks
}

func (lfb *chainMonitorBuilder) Query() ethereum.FilterQuery {
	if !lfb.dirty {
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

func (lfb *chainMonitorBuilder) OnAllEvents(cb OnChainEventCallback) {
	lfb.eventCallbacks = append(lfb.eventCallbacks, &chainEventCallback{handler: cb})
	lfb.dirty = true
}

func (lfb *chainMonitorBuilder) OnContractEvent(addr common.Address, cb OnChainEventCallback) {
	lfb.eventCallbacks = append(lfb.eventCallbacks, &chainEventCallback{handler: cb, address: &addr})
	lfb.dirty = true
}

func (lfb *chainMonitorBuilder) OnContractWithTopicsEvent(
	addr common.Address,
	topics [][]common.Hash,
	cb OnChainEventCallback,
) {
	lfb.eventCallbacks = append(lfb.eventCallbacks, &chainEventCallback{handler: cb, address: &addr, topics: topics})
	lfb.dirty = true
}

func (lfb *chainMonitorBuilder) OnChainMonitorStopped(cb OnChainMonitorStoppedCallback) {
	lfb.stoppedCallbacks = append(lfb.stoppedCallbacks, &chainMonitorStoppedCallback{handler: cb})
	lfb.dirty = true
}

type chainEventCallback struct {
	handler OnChainEventCallback
	address *common.Address
	topics  [][]common.Hash
}

type chainEventCallbacks []*chainEventCallback

// onLogReceived calls all callbacks in the ecb callback set that are interested
// in the given log.
func (ecb chainEventCallbacks) onLogReceived(ctx context.Context, log types.Log) {
	for _, cb := range ecb {
		if (cb.address == nil || *cb.address == log.Address) && matchTopics(cb.topics, log.Topics) {
			cb.handler(ctx, log)
		}
	}
}

type chainHeaderCallback struct {
	handler   OnChainNewHeader
	fromBlock BlockNumber
}

type chainHeaderCallbacks []*chainHeaderCallback

func (hcb chainHeaderCallbacks) onHeadReceived(ctx context.Context, header *types.Header) {
	headNumber := BlockNumber(header.Number.Uint64())
	for _, cb := range hcb {
		if cb.fromBlock < headNumber {
			cb.handler(ctx, header)
			cb.fromBlock = headNumber
		}
	}
}

type chainBlockCallback struct {
	handler   OnChainNewBlock
	fromBlock BlockNumber
}

type chainBlockCallbacks []*chainBlockCallback

func (ebc chainBlockCallbacks) onBlockReceived(ctx context.Context, blockNumber BlockNumber) {
	for _, cb := range ebc {
		if cb.fromBlock < blockNumber {
			cb.handler(ctx, blockNumber)
			cb.fromBlock = blockNumber
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
