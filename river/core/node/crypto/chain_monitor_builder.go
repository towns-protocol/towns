package crypto

import (
	"slices"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

// ChainMonitorBuilder defines the interface for building a chain monitor that
// tracks chain state changes and calls the configured callbacks to process
// these changes.
type ChainMonitorBuilder interface {
	// OnBlock adds a callback that is called for each new block
	OnBlock(cb OnChainNewBlock) ChainMonitorBuilder
	// OnAllEvents matches all events for all contracts, e.g. all chain events.
	OnAllEvents(cb OnChainEventCallback) ChainMonitorBuilder
	// Contract matches all events created by the contract on the given address.
	OnContractEvent(addr common.Address, cb OnChainEventCallback) ChainMonitorBuilder
	// ContractWithTopics matches events created by the contract on the given
	OnContractWithTopicsEvent(addr common.Address, topics [][]common.Hash, cb OnChainEventCallback) ChainMonitorBuilder
	// FromBlock returns the block number from which the filter will start
	// monitoring the chain.
	FromBlock() BlockNumber
	// Query returns the ethereum logs query to retrieve chain event logs.
	// The caller is reponsible to set the from and to block criteria.
	Query() ethereum.FilterQuery
	// BuildQuery creates the chain monitor for the installed callbacks.
	Build(blockPeriod time.Duration) ChainMonitor
}

// chainMonitorBuilder builds a chain monitor.
type chainMonitorBuilder struct {
	fromBlock      BlockNumber
	blockCallbacks chainBlockCallbacks
	eventCallbacks chainEventCallbacks
}

// NewChainMonitorBuilder constructs a chain monitor that implements ChainMinotor
// and starts to monitor the chain on the given block.
func NewChainMonitorBuilder(block BlockNumber) *chainMonitorBuilder {
	return &chainMonitorBuilder{block, nil, nil}
}

func (lfb *chainMonitorBuilder) Build(blockPeriod time.Duration) ChainMonitor {
	return &chainMonitor{lfb.FromBlock(), lfb.Query(), lfb.blockCallbacks, lfb.eventCallbacks, blockPeriod}
}

func (lfb *chainMonitorBuilder) Query() ethereum.FilterQuery {
	query := ethereum.FilterQuery{}
	for _, cb := range lfb.eventCallbacks {
		if cb.address == nil && len(cb.topics) == 0 { // wants all events
			return ethereum.FilterQuery{}
		}
		if cb.address != nil && !slices.Contains(query.Addresses, *cb.address) {
			query.Addresses = append(query.Addresses, *cb.address)
		}
	}

	return query
}

func (lfb *chainMonitorBuilder) OnBlock(cb OnChainNewBlock) ChainMonitorBuilder {
	lfb.blockCallbacks = append(lfb.blockCallbacks, &chainBlockCallback{handler: cb})
	return lfb
}

func (lfb *chainMonitorBuilder) OnAllEvents(cb OnChainEventCallback) ChainMonitorBuilder {
	lfb.eventCallbacks = append(lfb.eventCallbacks, &chainEventCallback{handler: cb})
	return lfb
}

func (lfb *chainMonitorBuilder) OnContractEvent(addr common.Address, cb OnChainEventCallback) ChainMonitorBuilder {
	lfb.eventCallbacks = append(lfb.eventCallbacks, &chainEventCallback{handler: cb, address: &addr})
	return lfb
}

func (lfb *chainMonitorBuilder) OnContractWithTopicsEvent(addr common.Address, topics [][]common.Hash, cb OnChainEventCallback) ChainMonitorBuilder {
	lfb.eventCallbacks = append(lfb.eventCallbacks, &chainEventCallback{handler: cb, address: &addr, topics: topics})
	return lfb
}

func (lfb *chainMonitorBuilder) FromBlock() BlockNumber {
	return lfb.fromBlock
}

type chainEventCallback struct {
	handler OnChainEventCallback
	address *common.Address
	topics  [][]common.Hash
}

type chainEventCallbacks []*chainEventCallback

// onLogReceived calls all callbacks in the ecb callback set that are interested
// in the given log.
func (ecb chainEventCallbacks) onLogReceived(log types.Log) {
	for _, cb := range ecb {
		if (cb.address == nil || *cb.address == log.Address) && matchTopics(cb.topics, log.Topics) {
			cb.handler(log)
		}
	}
}

type chainBlockCallback struct {
	handler   OnChainNewBlock
	fromBlock BlockNumber
}

type chainBlockCallbacks []*chainBlockCallback

func (ebc chainBlockCallbacks) onBlockReceived(blockNumber BlockNumber) {
	for _, cb := range ebc {
		if cb.fromBlock <= blockNumber {
			cb.handler(blockNumber)
			cb.fromBlock = blockNumber
		}
	}
}
