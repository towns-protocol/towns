package events

import (
	"github.com/ethereum/go-ethereum/common"

	"github.com/towns-protocol/towns/core/node/crypto"

	. "github.com/towns-protocol/towns/core/node/utils"
)

type eventMap = *OrderedMap[common.Hash, *ParsedEvent]

type minipoolInstance struct {
	events         eventMap
	generation     int64
	eventNumOffset int64
}

func newMiniPoolInstance(events eventMap, generation int64, eventNumOffset int64) *minipoolInstance {
	return &minipoolInstance{
		events:         events,
		generation:     generation,
		eventNumOffset: eventNumOffset,
	}
}

func (m *minipoolInstance) tryCopyAndAddEvent(event *ParsedEvent) *minipoolInstance {
	m = &minipoolInstance{
		events:         m.events.Copy(1),
		generation:     m.generation,
		eventNumOffset: m.eventNumOffset,
	}
	if !m.events.Set(event.Hash, event) {
		return nil
	}
	return m
}

func (m *minipoolInstance) forEachEvent(
	op func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error),
) error {
	eventNum := m.eventNumOffset
	for _, e := range m.events.Values {
		cont, err := op(e, m.generation, eventNum)
		eventNum++
		if err != nil || !cont {
			return err
		}
	}
	return nil
}

func (m *minipoolInstance) lastEvent() *ParsedEvent {
	if len(m.events.Values) > 0 {
		return m.events.Values[len(m.events.Values)-1]
	} else {
		return nil
	}
}

func (m *minipoolInstance) nextSlotNumber() int {
	return m.events.Len()
}

func (m *minipoolInstance) size() int {
	return m.events.Len()
}

func (m *minipoolInstance) getEnvelopeBytes() ([][]byte, error) {
	bytes := make([][]byte, m.events.Len())
	for i, e := range m.events.Values {
		b, err := e.GetEnvelopeBytes()
		if err != nil {
			return nil, err
		}
		bytes[i] = b
	}
	return bytes, nil
}

// proposalEvents returns all events from m that can be included in a proposal.
func (m *minipoolInstance) proposalEvents() []mbProposalEvent {
	events := make([]mbProposalEvent, 0, m.events.Len())
	for _, e := range m.events.Values {
		events = append(events, mbProposalEvent{Hash: e.Hash, Size: len(e.Envelope.Event)})
	}
	return events
}

// proposalEventsWithMiniblockLimits returns events from m that can be included in a proposal
// until the limits as specified in the given cfg are reached.
func (m *minipoolInstance) proposalEventsWithMiniblockLimits(cfg *crypto.OnChainSettings) []mbProposalEvent {
	maxEventsPerMiniblock, maxEventCombinedSize := MiniblockEventLimits(cfg)
	events := make([]mbProposalEvent, 0, m.events.Len())
	totalEventsSize := 0
	for _, e := range m.events.Values {
		eventSize := len(e.Envelope.Event)
		// Check if adding the next event would exceed limits before appending
		if len(events) >= maxEventsPerMiniblock || totalEventsSize+eventSize > maxEventCombinedSize {
			return events
		}
		events = append(events, mbProposalEvent{Hash: e.Hash, Size: eventSize})
		totalEventsSize += eventSize
	}
	return events
}

// eventHashesAsBytes returns all event hashes from m.
func (m *minipoolInstance) eventHashesAsBytes() [][]byte {
	hashes := make([][]byte, m.events.Len())
	for i, e := range m.events.Values {
		hashes[i] = e.Hash[:]
	}
	return hashes
}
