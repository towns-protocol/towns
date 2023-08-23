package events

import (
	. "casablanca/node/base"
	. "casablanca/node/utils"
)

type eventMap = *OrderedMap[string, *ParsedEvent]

type minipoolInstance struct {
	events   eventMap
	instance string
}

func newMiniPoolInstance(events eventMap) *minipoolInstance {
	return &minipoolInstance{
		events:   events,
		instance: GenNanoid(),
	}
}

func (m *minipoolInstance) copyAndAddEvent(event *ParsedEvent) *minipoolInstance {
	m = &minipoolInstance{
		events:   m.events.Copy(1),
		instance: m.instance,
	}
	m.events.Set(event.HashStr, event)
	return m
}

func (m *minipoolInstance) forEachEvent(op func(e *ParsedEvent) (bool, error)) error {
	for _, e := range m.events.Values {
		cont, err := op(e)
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
