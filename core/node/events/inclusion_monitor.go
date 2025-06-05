package events

import (
	"slices"

	"github.com/ethereum/go-ethereum/common"
)

type EventInclusionResult int

const (
	EventInclusionIncluded EventInclusionResult = iota
	EventInclusionRejected
)

type inclusionMonitorChan chan EventInclusionResult

type inclusionMonitor struct {
	subs map[common.Hash][]inclusionMonitorChan
}

func (m *inclusionMonitor) subscribe(e common.Hash) inclusionMonitorChan {
	ch := make(inclusionMonitorChan, 1)
	m.subs[e] = append(m.subs[e], ch)
	return ch
}

func (m *inclusionMonitor) unsubscribe(e common.Hash, ch inclusionMonitorChan) {
	chans, ok := m.subs[e]
	if !ok {
		return
	}

	if len(chans) == 1 && chans[0] == ch {
		delete(m.subs, e)
		return
	}

	m.subs[e] = slices.DeleteFunc(chans, func(c inclusionMonitorChan) bool {
		return c == ch
	})
}

func (m *inclusionMonitor) processMiniblock(mb *MiniblockInfo) {
	// Process included events
	for _, event := range mb.Events() {
		chans, ok := m.subs[event.Hash]
		if !ok {
			continue
		}
		for _, ch := range chans {
			ch <- EventInclusionIncluded
			close(ch)
		}
		delete(m.subs, event.Hash)
		return
	}

	// Process rejected events
	for _, hashBytes := range mb.Header().GetRejectedEventHashes() {
		eventHash := common.Hash(hashBytes)
		chans, ok := m.subs[eventHash]
		if !ok {
			continue
		}
		for _, ch := range chans {
			ch <- EventInclusionRejected
			close(ch)
		}
		delete(m.subs, eventHash)
		return
	}
}
