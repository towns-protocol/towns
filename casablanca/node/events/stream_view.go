package events

import (
	. "casablanca/node/base"
	. "casablanca/node/protocol"
	"fmt"
	"os"
	"runtime/debug"
	"sync"
)

type StreamView interface {
	Events() []*ParsedEvent
	EventsByHash() map[string]*ParsedEvent
	HasEvent(hash string) bool
	InceptionEvent() *ParsedEvent
	InceptionPayload() IsInceptionPayload
	JoinedUsers() (map[string]struct{}, error)
	LeafEventHashes() [][]byte
	LeafEvents() map[string]*ParsedEvent
	Envelopes() []*Envelope
}

var debugLogMutex = &sync.Mutex{}

func degugLogEvents(events []*ParsedEvent, markEvent string, problem error) {
	debugLogMutex.Lock()
	defer debugLogMutex.Unlock()
	for i, e := range events {
		var marker string
		if e.HashStr == markEvent {
			marker = " <=="
		}
		fmt.Printf("%3d %s%s\n", i, e.ShortDebugStr(), marker)
	}
	fmt.Printf("Error: %s\n", problem.Error())
	if DebugCorruptionExit() {
		fmt.Printf("%s", debug.Stack())
		os.Exit(1)
	}
}

func topologicalSort(events []*ParsedEvent, eventsByHash map[string]*ParsedEvent) (sorted []*ParsedEvent, err error) {
	visited := make(map[string]bool)

	for _, e := range events {
		if !visited[e.HashStr] {
			visited[e.HashStr] = true
			sorted, err = dfs(e, visited, events, eventsByHash, sorted)
			if err != nil {
				return
			}
		}
	}

	return
}

func dfs(e *ParsedEvent, visited map[string]bool, events []*ParsedEvent, eventsByHash map[string]*ParsedEvent, sorted []*ParsedEvent) ([]*ParsedEvent, error) {
	for _, p := range e.PrevEventStrs {
		if !visited[p] {
			pe := eventsByHash[p]
			if pe == nil {
				err := fmt.Errorf("MakeStreamView: prev event not found, prev_event_hash=%s, event=%s", FormatHashFromString(p), e.ShortDebugStr())
				if DebugCorruptionPrint() {
					fmt.Printf("%d\n", len(eventsByHash))
					degugLogEvents(events, e.HashStr, err)
				}
				return nil, err
			}
			visited[p] = true
			sorted2, err := dfs(pe, visited, events, eventsByHash, sorted)
			if err != nil {
				return nil, err
			}
			sorted = sorted2
		}
	}
	return append(sorted, e), nil
}

func MakeStreamView(envelopes []*Envelope) (*streamViewImpl, error) {
	unsortedEvents, err := ParseEvents(envelopes)
	if err != nil {
		return nil, err
	}

	if len(unsortedEvents) <= 0 {
		return nil, fmt.Errorf("MakeStreamView: No events")
	}

	eventsByHash := make(map[string]*ParsedEvent)
	for _, e := range unsortedEvents {
		if _, ok := eventsByHash[e.HashStr]; !ok {
			eventsByHash[e.HashStr] = e
		} else {
			err = fmt.Errorf("MakeStreamView: Duplicate event hash, event=%s", e.ShortDebugStr())
			if DebugCorruptionPrint() {
				degugLogEvents(unsortedEvents, e.HashStr, err)
			}
			return nil, err
		}

	}

	events, err := topologicalSort(unsortedEvents, eventsByHash)
	if err != nil {
		return nil, err
	}

	if events[0].Event.GetInceptionPayload() == nil {
		return nil, fmt.Errorf("MakeStreamView: First event is not inception")
	}

	streamId := events[0].Event.GetInceptionPayload().GetStreamId()

	leafEvents := make(map[string]*ParsedEvent)
	for _, event := range events {
		leafEvents[event.HashStr] = event
		for _, prev := range event.PrevEventStrs {
			delete(leafEvents, prev)
		}
	}

	if len(leafEvents) == 0 {
		return nil, fmt.Errorf("MakeStreamView: No leaf events, stream_id=%s", streamId)
	}

	return &streamViewImpl{
		events:       events,
		eventsByHash: eventsByHash,
		leafEvents:   leafEvents,
	}, nil
}

type streamViewImpl struct {
	events       []*ParsedEvent
	eventsByHash map[string]*ParsedEvent
	leafEvents   map[string]*ParsedEvent
}

func (r *streamViewImpl) Events() []*ParsedEvent {
	return r.events
}

func (r *streamViewImpl) EventsByHash() map[string]*ParsedEvent {
	return r.eventsByHash
}

func (r *streamViewImpl) HasEvent(hash string) bool {
	_, ok := r.eventsByHash[hash]
	return ok
}

func (r *streamViewImpl) InceptionEvent() *ParsedEvent {
	return r.events[0]
}

func (r *streamViewImpl) InceptionPayload() IsInceptionPayload {
	return r.InceptionEvent().Event.GetInceptionPayload()
}

func (r *streamViewImpl) JoinedUsers() (map[string]struct{}, error) {
	users := make(map[string]struct{})
	for _, e := range r.events {
		switch payload := e.Event.Payload.(type) {
		case *StreamEvent_SpacePayload:
			switch spacePayload := payload.SpacePayload.Content.(type) {
			case *SpacePayload_Membership:
				user := spacePayload.Membership.UserId
				if spacePayload.Membership.GetOp() == MembershipOp_SO_JOIN {
					users[user] = struct{}{}
				} else if spacePayload.Membership.GetOp() == MembershipOp_SO_LEAVE {
					delete(users, user)
				}
			default:
				break
			}
		case *StreamEvent_ChannelPayload:
			switch channelPayload := payload.ChannelPayload.Content.(type) {
			case *ChannelPayload_Membership:
				user := channelPayload.Membership.UserId
				if channelPayload.Membership.GetOp() == MembershipOp_SO_JOIN {
					users[user] = struct{}{}
				} else if channelPayload.Membership.GetOp() == MembershipOp_SO_LEAVE {
					delete(users, user)
				}
			default:
				break
			}
		}
	}
	return users, nil
}

func (r *streamViewImpl) LeafEventHashes() [][]byte {
	hashes := make([][]byte, 0, len(r.leafEvents))
	for _, e := range r.leafEvents {
		hashes = append(hashes, e.Hash)
	}
	return hashes
}

func (r *streamViewImpl) LeafEvents() map[string]*ParsedEvent {
	return r.leafEvents
}

func (r *streamViewImpl) Envelopes() []*Envelope {
	envelopes := make([]*Envelope, 0, len(r.events))
	for _, e := range r.events {
		envelopes = append(envelopes, e.Envelope)
	}
	return envelopes
}
