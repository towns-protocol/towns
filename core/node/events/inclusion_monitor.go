package events

import (
	"github.com/ethereum/go-ethereum/common"
	"github.com/puzpuzpuz/xsync/v4"
)

type inclusionMonitorResult uint8

const (
	inclusionMonitorResultIncluded inclusionMonitorResult = iota
	inclusionMonitorResultRejected
)

type inclusionMonitorResultChan chan inclusionMonitorResult

type inclusionMonitorSub struct {
	eventHash common.Hash
	ch        inclusionMonitorResultChan
}

// inclusionMonitor is responsible for monitoring the inclusion of events in the stream miniblocks.
type inclusionMonitor struct {
	// subs is a map of streamId to slice of inclusionMonitorSub.
	subs *xsync.Map[common.Hash, []inclusionMonitorSub]
}

func newInclusionMonitor() *inclusionMonitor {
	return &inclusionMonitor{
		subs: xsync.NewMap[common.Hash, inclusionMonitorSub](),
	}
}

func (i *inclusionMonitor) subscribe(streamId common.Hash, eventHash common.Hash) inclusionMonitorResultChan {
	ch := make(inclusionMonitorResultChan, 1)
	prev, loaded := i.subs.LoadAndStore(streamId, ch)
	if loaded {
		close(prev)
	}
	return ch
}

func (i *inclusionMonitor) unsubscribe(streamId common.Hash, ch inclusionMonitorResultChan) {
	i.subs.Compute(streamId, func(prev inclusionMonitorResultChan, loaded bool) (inclusionMonitorResultChan, xsync.ComputeOp) {
		if loaded && prev == ch {
			close(ch)
			return nil, xsync.DeleteOp
		}
		return prev, xsync.CancelOp
	})
}

func (i *inclusionMonitor) processMiniblock(mb *MiniblockInfo) {
	for _, event := range mb.Events() {
		ch, loaded := i.subs.LoadAndDelete(event.Hash)
		if loaded {
			ch <- inclusionMonitorResultIncluded
			close(ch)
		}
	}

	// TODO: process rejected events
}
