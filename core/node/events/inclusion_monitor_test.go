package events

import (
	"testing"

	"github.com/ethereum/go-ethereum/common"
)

func TestInclusionMonitor(t *testing.T) {
	monitor := newInclusionMonitor()

	// Test subscribing to an event
	eventHash := common.HexToHash("0x123")
	ch := monitor.subscribe(eventHash)

	// Test processing a miniblock with the event
	mb := &MiniblockInfo{
		events: []*Envelope{
			{Hash: eventHash},
		},
	}
	monitor.processMiniblock(mb)

	// Verify the event was included
	result := <-ch
	if result != inclusionMonitorResultIncluded {
		t.Errorf("Expected event to be included, got %v", result)
	}

	// Test unsubscribing
	eventHash2 := common.HexToHash("0x456")
	ch2 := monitor.subscribe(eventHash2)
	monitor.unsubscribe(eventHash2, ch2)

	// Verify channel is closed after unsubscribe
	_, ok := <-ch2
	if ok {
		t.Error("Expected channel to be closed after unsubscribe")
	}

	// Test multiple subscribers for same event
	eventHash3 := common.HexToHash("0x789")
	ch3 := monitor.subscribe(eventHash3)
	ch4 := monitor.subscribe(eventHash3)

	// First subscriber should be closed when second subscribes
	_, ok = <-ch3
	if ok {
		t.Error("Expected first subscriber channel to be closed when second subscribes")
	}

	// Process event for second subscriber
	mb2 := &MiniblockInfo{
		events: []*Envelope{
			{Hash: eventHash3},
		},
	}
	monitor.processMiniblock(mb2)

	// Verify second subscriber receives result
	result = <-ch4
	if result != inclusionMonitorResultIncluded {
		t.Errorf("Expected event to be included for second subscriber, got %v", result)
	}
}
