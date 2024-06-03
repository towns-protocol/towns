package events

import (
	"github.com/ethereum/go-ethereum/common"
	. "github.com/river-build/river/core/node/utils"
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

func (m *minipoolInstance) copyAndAddEvent(event *ParsedEvent) *minipoolInstance {
	m = &minipoolInstance{
		events:         m.events.Copy(1),
		generation:     m.generation,
		eventNumOffset: m.eventNumOffset,
	}
	m.events.Set(event.Hash, event)
	return m
}

func (m *minipoolInstance) forEachEvent(
	op func(e *ParsedEvent, minibockNum int64, eventNum int64) (bool, error),
) error {
	eventNum := m.eventNumOffset
	for _, e := range m.events.Values {
		cont, err := op(e, m.generation, eventNum)
		eventNum++
		if !cont {
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
