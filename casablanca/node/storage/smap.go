package storage

import (
	"sync"

	"github.com/google/uuid"

	. "casablanca/node/events"
	"casablanca/node/protocol"
)

type SubsMap struct {
	entries map[string][]*SmapEntry
	mtx     sync.Locker
}

type SmapEntry struct {
	id         uuid.UUID
	seqNum     int64
	notifyChan chan StreamEventsBlock
}

func NewSmap() *SubsMap {
	return &SubsMap{
		entries: make(map[string][]*SmapEntry),
		mtx:     &sync.Mutex{},
	}
}

func (s *SubsMap) Add(streamId string, cookie []byte) *SmapEntry {
	key := streamId
	seqNum := BytesToSeqNum(cookie)
	s.mtx.Lock()
	defer s.mtx.Unlock()
	entry := &SmapEntry{
		id:         uuid.New(),
		seqNum:     seqNum,
		notifyChan: make(chan StreamEventsBlock),
	}
	subs, ok := s.entries[key]
	if !ok {
		subs = make([]*SmapEntry, 0)
	}
	subs = append(subs, entry)
	s.entries[key] = subs
	return entry
}

func (s *SubsMap) Delete(streamId string, id uuid.UUID) {
	key := streamId
	s.mtx.Lock()
	defer s.mtx.Unlock()
	subs, ok := s.entries[key]
	if !ok {
		return
	}
	for i, sub := range subs {
		if sub.id == id {
			subs = append(subs[:i], subs[i+1:]...)
			break
		}
	}
	if len(subs) == 0 {
		delete(s.entries, key)
	} else {
		s.entries[key] = subs
	}
}

func (s *SubsMap) Get(streamId string) ([]*SmapEntry, bool) {
	key := streamId
	s.mtx.Lock()
	defer s.mtx.Unlock()
	subs, ok := s.entries[key]
	return subs, ok
}

func (s *SubsMap) GetByUUID(id uuid.UUID) (*SmapEntry, bool) {
	s.mtx.Lock()
	defer s.mtx.Unlock()
	for _, subs := range s.entries {
		for _, sub := range subs {
			if sub.id == id {
				return sub, true
			}
		}
	}
	return nil, false
}

func (s *SubsMap) ForEach(thunk func(*SmapEntry)) {

	s.mtx.Lock()
	defer s.mtx.Unlock()
	for _, subs := range s.entries {
		for _, sub := range subs {
			thunk(sub)
		}
	}
}

/**
 * Filter the events by current subscriptions
 * @param events the events to filter indexed by seq number
 * @return a map of subs ids to events for the input events
 */
func (s SubsMap) Filter(events map[int64]*ParsedEvent, CurrentCookie []byte) map[uuid.UUID]StreamEventsBlock {

	res := make(map[uuid.UUID]StreamEventsBlock)

	s.mtx.Lock()
	defer s.mtx.Unlock()

	for seqNum, e := range events {
		subs, ok := s.entries[e.StreamId]
		if !ok {
			// nobody is subscribed to this stream
			continue
		}
		for _, sub := range subs {
			if sub.seqNum >= seqNum {
				// this sub is up to date
				continue
			}
			if block, ok := res[sub.id]; ok {
				block.Events = append(res[sub.id].Events, e.Envelope)
				// current cookie grows with each event, so it is guaranteed to be larger than the previous one
				block.SyncCookie = CurrentCookie
				res[sub.id] = block
			} else {
				res[sub.id] = StreamEventsBlock{
					OriginalSyncCookie: SeqNumToBytes(sub.seqNum),
					SyncCookie:         CurrentCookie,
					Events:             []*protocol.Envelope{e.Envelope},
				}
			}
		}
	}
	return res
}
